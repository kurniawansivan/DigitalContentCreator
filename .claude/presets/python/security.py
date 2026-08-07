"""Reference implementation of the authentication rules in the security standard.

Copy to src/modules/auth/ and adapt to your repository interfaces. The parts that are easy
to get subtly wrong - refresh rotation with reuse detection, timing-equalised login, and
hashed token storage - are written out in full here on purpose.

Install: uv add argon2-cffi pyjwt
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Protocol

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from ..shared.errors import ApplicationError, ErrorCode, InvalidCredentialsError

if TYPE_CHECKING:
    from .models import RefreshTokenRecord, User

ACCESS_TOKEN_LIFETIME = timedelta(minutes=15)
REFRESH_TOKEN_LIFETIME = timedelta(days=30)
REFRESH_TOKEN_BYTES = 32  # 256 bits
MINIMUM_PASSWORD_LENGTH = 12
MAXIMUM_PASSWORD_LENGTH = 128

# OWASP minimum for Argon2id: 19 MiB, 2 iterations, 1 degree of parallelism.
password_hasher = PasswordHasher(
    time_cost=2, memory_cost=19_456, parallelism=1, hash_len=32, salt_len=16
)

# Verified against when the account does not exist, so the response time does not disclose
# existence. Generated once at import time.
_DUMMY_PASSWORD_HASH = password_hasher.hash("this account does not exist")


# Passwords
def hash_password(plain_text_password: str) -> str:
    return password_hasher.hash(plain_text_password)


def verify_password(stored_hash: str, plain_text_password: str) -> bool:
    try:
        password_hasher.verify(stored_hash, plain_text_password)
    except (VerifyMismatchError, InvalidHashError):
        return False
    return True


def needs_rehash(stored_hash: str) -> bool:
    """True when the hash was made with weaker parameters than the current ones."""
    return password_hasher.check_needs_rehash(stored_hash)


def burn_time_for_unknown_account() -> None:
    """Spend the same time hashing whether or not the account exists.

    Without this, an attacker distinguishes "no such account" from "wrong password" by
    measuring the response time, which is user enumeration with extra steps.
    """
    verify_password(_DUMMY_PASSWORD_HASH, "any value at all")


# Access tokens
@dataclass(frozen=True, slots=True)
class AccessTokenClaims:
    subject: str
    token_id: str
    issued_at: datetime
    expires_at: datetime


def issue_access_token(*, user_id: str, private_key: str, issuer: str, audience: str) -> str:
    issued_at = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": user_id,
            "jti": str(uuid.uuid4()),
            "iat": issued_at,
            "exp": issued_at + ACCESS_TOKEN_LIFETIME,
            "iss": issuer,
            "aud": audience,
            # Without this claim a refresh token could be presented as an access token.
            "tokenType": "access",
        },
        private_key,
        algorithm="RS256",
    )


def decode_access_token(
    token: str, *, public_key: str, issuer: str, audience: str
) -> AccessTokenClaims:
    try:
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],  # never accept the algorithm from the token header
            issuer=issuer,
            audience=audience,
            options={"require": ["exp", "iat", "sub", "iss", "aud"]},
        )
    except jwt.ExpiredSignatureError as expired:
        raise ApplicationError(
            ErrorCode.ACCESS_TOKEN_EXPIRED, 401, "Your session has expired"
        ) from expired
    except jwt.InvalidTokenError as invalid:
        raise ApplicationError(
            ErrorCode.ACCESS_TOKEN_INVALID, 401, "Invalid credentials"
        ) from invalid

    if payload.get("tokenType") != "access":
        raise ApplicationError(
            ErrorCode.ACCESS_TOKEN_INVALID, 401, "Invalid credentials"
        )

    return AccessTokenClaims(
        subject=str(payload["sub"]),
        token_id=str(payload["jti"]),
        issued_at=datetime.fromtimestamp(payload["iat"], UTC),
        expires_at=datetime.fromtimestamp(payload["exp"], UTC),
    )


# Refresh tokens: opaque, hashed at rest, rotated, with reuse detection
def generate_refresh_token() -> str:
    return secrets.token_urlsafe(REFRESH_TOKEN_BYTES)


def hash_refresh_token(raw_token: str) -> str:
    """Stored form. A database leak must not hand over live sessions."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


def refresh_tokens_match(stored_hash: str, raw_token: str) -> bool:
    return hmac.compare_digest(stored_hash, hash_refresh_token(raw_token))


class RefreshTokenRepository(Protocol):
    async def find_by_hash(self, token_hash: str) -> RefreshTokenRecord | None: ...
    async def insert(self, record: RefreshTokenRecord) -> None: ...
    async def mark_used(self, token_id: str, replaced_by_id: str) -> None: ...
    async def revoke_family(self, family_id: str) -> None: ...


class AuthenticationService:
    def __init__(self, refresh_tokens: RefreshTokenRepository) -> None:
        self._refresh_tokens = refresh_tokens

    async def rotate_refresh_token(self, presented_token: str) -> tuple[str, str]:
        """Exchange a refresh token for a new pair, detecting reuse.

        Returns (user_id, new_refresh_token). Raises when the token is unknown, expired,
        or already used.
        """
        record = await self._refresh_tokens.find_by_hash(
            hash_refresh_token(presented_token)
        )

        if record is None:
            raise ApplicationError(
                ErrorCode.REFRESH_TOKEN_INVALID, 401, "Please sign in again"
            )

        if record.used_at is not None:
            # This token was already exchanged. Someone is replaying a stolen token, so
            # every descendant of that login is now suspect.
            await self._refresh_tokens.revoke_family(record.family_id)
            raise ApplicationError(
                ErrorCode.REFRESH_TOKEN_REUSED,
                401,
                "Your session was ended for security reasons. Please sign in again.",
            )

        if record.revoked_at is not None or record.expires_at <= datetime.now(UTC):
            raise ApplicationError(
                ErrorCode.REFRESH_TOKEN_EXPIRED, 401, "Please sign in again"
            )

        replacement_token = generate_refresh_token()
        replacement_id = str(uuid.uuid4())

        await self._refresh_tokens.insert(
            RefreshTokenRecord(
                id=replacement_id,
                user_id=record.user_id,
                family_id=record.family_id,  # same login lineage
                token_hash=hash_refresh_token(replacement_token),
                expires_at=datetime.now(UTC) + REFRESH_TOKEN_LIFETIME,
                used_at=None,
                revoked_at=None,
            )
        )
        await self._refresh_tokens.mark_used(record.id, replaced_by_id=replacement_id)

        return record.user_id, replacement_token


class SupportsSetCookie(Protocol):
    """The one method this module needs from a framework response object."""

    def set_cookie(
        self,
        key: str,
        value: str,
        *,
        httponly: bool,
        secure: bool,
        samesite: str,
        path: str,
        max_age: int,
    ) -> None: ...


# Cookie for the refresh token. Never localStorage.
def set_refresh_token_cookie(
    response: SupportsSetCookie, raw_token: str, *, is_production: bool
) -> None:
    response.set_cookie(
        key="refreshToken",
        value=raw_token,
        httponly=True,
        secure=is_production,
        samesite="strict",
        path="/api/v1/auth/refresh",
        max_age=int(REFRESH_TOKEN_LIFETIME.total_seconds()),
    )


# Login: one path, one response, one duration
async def authenticate(
    *,
    email_address: str,
    password: str,
    find_user: Callable[[str], Awaitable[User | None]],
) -> User:
    user = await find_user(email_address)

    if user is None:
        burn_time_for_unknown_account()
        raise InvalidCredentialsError()

    if not verify_password(user.hashed_password, password):
        raise InvalidCredentialsError()

    if not user.is_verified:
        raise ApplicationError(
            ErrorCode.ACCOUNT_NOT_VERIFIED, 403, "Please verify your email address first"
        )

    return user
