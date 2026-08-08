# Single image for both the "web" and "worker" containers (see docker-compose.yml).
# Same build, different CMD - this is what keeps the render pipeline in the monolith
# instead of a separate service/repo.

FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

# `prisma generate` only reads the schema (never connects), and `next build` evaluates
# route modules enough to run our env validation at module load time - neither needs a
# real database, but both need the env schema to be satisfiable. The real values come
# from docker-compose at container runtime, not from this build-time placeholder.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV REDIS_URL="redis://localhost:6379"

RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/.next ./.next
COPY --from=build /app/src ./src
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json

EXPOSE 3000
CMD ["npm", "run", "start"]
