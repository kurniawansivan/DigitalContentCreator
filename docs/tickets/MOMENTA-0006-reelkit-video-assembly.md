# MOMENTA-0006: Reelkit Video Assembly

**Status:** Proposed
**Requirement area:** [docs/requirements/03-reelkit-video-assembly.md](../requirements/03-reelkit-video-assembly.md)
**Depends on:** MOMENTA-0005 (script engine), MOMENTA-0004 (brand kit), MOMENTA-0001 (queue/worker infra)

## Phase 1 - Scope

**Goal:** a generated script becomes a downloadable 9:16 video, styled with the user's
brand kit, without ever blocking the HTTP request that started it.

**Acceptance criteria**

- [ ] `POST /api/v1/render-jobs` (`{ scriptId, brandKitId, format }`) only validates and
      enqueues; it returns `202` with a `jobId` immediately, never waiting for the
      render to finish.
- [ ] `GET /api/v1/render-jobs/:id` reports status
      (`queued | downloading | rendering | ready | failed`) and the result file URL once
      `ready`.
- [ ] The worker resolves each sentence's keywords to a stock clip: Pexels first, Pixabay
      only as a secondary source with its own stricter per-window quota (locked
      decision, PRD §15).
- [ ] Every clip is downloaded and cached to the product's own storage before use -
      never composited directly from a hotlinked provider URL.
- [ ] Per-clip provenance is stored: provider, contributor name, license snapshot,
      download timestamp (`mediaCache` table).
- [ ] No endpoint anywhere in the product allows downloading a raw, unmodified clip -
      only the final rendered asset is ever downloadable (this is the licensing
      guardrail from PRD §5.3/§15, testable as "no route exists", not just "hidden in
      the UI").
- [ ] The rendered video composites clips in order, burns in the script's text per
      sentence, applies the brand kit's colors/font/text position/logo, and crops/scales
      to 9:16 - via ffmpeg (not Remotion, per PRD §5.3 rationale).
- [ ] A failed render (e.g. no clips found for a keyword) sets status `failed` with a
      user-safe reason, never leaves a job stuck in `rendering` forever (a timeout marks
      it `failed`).
- [ ] Background job processing is idempotent: processing the same job twice (at-least-
      once delivery) does not produce two billed renders or two stored assets.

**Out of scope**

- Multi-format output in one generate (reel + carousel + story) - PRD §14 nice-to-have,
  v1.5.
- Clip re-roll (swap one mismatched clip) - PRD §5.5 dashboard feature, tracked under
  MOMENTA-0007.
- Rate-limit-increase requests to Pexels/Pixabay themselves - an operational task
  (PRD §12), not application code.

**Affected surface**

- New tables: `mediaCache`, `renderJobs`, `generatedAssets` (PRD §9).
- New module: `src/modules/render/*` (enqueue side) and the worker's job processor
  (consuming side, in the worker entrypoint scaffolded by MOMENTA-0001).
- First real use of the S3-compatible storage client scaffolded in MOMENTA-0001
  (clip cache + rendered output, both write here).

**Risks**

- Licensing: this ticket is where the PRD §15 guardrail becomes enforceable code, not
  just a policy statement. The "no raw clip download endpoint" acceptance criterion must
  have a test that actually tries to find such a route and fails to.
- Idempotency: BullMQ guarantees at-least-once delivery, so a processor that is not
  idempotent will double-charge storage/CPU on redelivery - this is called out
  explicitly in `backend-standard`'s concurrency section, not optional here.

## Phase 2 - Contract

**`POST /api/v1/render-jobs`** - body `{ scriptId, brandKitId, format }` -> `202`,
`data: { jobId, status: "queued" }`.

**`GET /api/v1/render-jobs/:id`** -> `200`,
`data: { jobId, status, resultFileUrl, errorMessage }` (`resultFileUrl` and
`errorMessage` are `null` until the job resolves).

**Migration:**

```prisma
model MediaCache {
  id               String   @id @default(cuid())
  keyword          String
  provider         String
  sourceUrl        String   @map("source_url")
  cacheUrl         String   @map("cache_url")
  contributorName  String?  @map("contributor_name")
  licenseSnapshot  String   @map("license_snapshot")
  downloadedAt     DateTime @default(now()) @map("downloaded_at")

  @@index([keyword, provider])
  @@map("media_cache")
}

model RenderJob {
  id                String   @id @default(cuid())
  userId            String   @map("user_id")
  scriptId          String   @map("script_id")
  format            String
  status            String   @default("queued")
  brandKitSnapshot  Json     @map("brand_kit_snapshot")
  resultFileUrl     String?  @map("result_file_url")
  errorMessage      String?  @map("error_message")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@index([userId, status])
  @@map("render_jobs")
}

model GeneratedAsset {
  id               String   @id @default(cuid())
  userId           String   @map("user_id")
  scriptId         String   @map("script_id")
  renderJobId      String   @unique @map("render_job_id")
  format           String
  fileUrl          String   @map("file_url")
  brandKitSnapshot Json     @map("brand_kit_snapshot")
  createdAt        DateTime @default(now()) @map("created_at")

  @@map("generated_assets")
}
```

**Error codes used:** `RESOURCE_NOT_FOUND` (404, unknown script/brand kit id),
`UPSTREAM_UNAVAILABLE` / `UPSTREAM_TIMEOUT` (Pexels/Pixabay unreachable, surfaced as job
`status: "failed"` with a safe `errorMessage`, not as the enqueue response's error) -
already in the shared enum.

## Phase 3 - Test plan

| Acceptance criterion | Test level | Test name |
| --- | --- | --- |
| Enqueue returns immediately without waiting for render | Integration | returns 202 with a jobId in under the request timeout regardless of render duration |
| Status transitions reflect real progress | Integration | reports queued, then rendering, then ready as the worker processes a real job |
| Clip is downloaded and cached before use | Unit | never composites a clip URL that has not gone through the cache step |
| Pexels tried before Pixabay | Unit | queries Pixabay only when Pexels returns no usable clip for a keyword |
| Provenance recorded per clip | Integration | stores provider, contributor, license snapshot, and download timestamp for every cached clip |
| No route exposes a raw clip | Integration | finds no endpoint in the router that returns an unmodified cached clip file |
| Brand kit styling applied to the render | Unit | passes the brand kit's color, font, position, and logo into the render command |
| Failed render sets a safe status, not a stuck job | Integration | marks the job failed with a user-safe message when no clips are found for a keyword |
| Redelivered job does not double-render | Unit | processing the same job payload twice produces exactly one stored asset |
| Full generate-to-download flow | End-to-end | a user generates a script, starts a render, and downloads the finished video once ready |

## Phase 4 - Implementation notes

Not started.
