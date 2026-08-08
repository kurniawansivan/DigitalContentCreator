# 03. Reelkit Video Assembly

**Status:** Proposed
**PRD source:** [PRD.md §5.3](../../PRD.md#53-reelkit-integration-video-assembly)
**Depends on:** [02. Script Generation Engine](./02-script-generation-engine.md)

## Summary

Turn a generated script into a rendered 9:16 video: source stock clips per sentence,
cache them permanently, composite them with brand-kit styling and text overlay, and hand
the user a downloadable file - all through an asynchronous job queue, never inline in an
HTTP request.

## Functional requirements

- [ ] Pexels is the default/primary stock source; Pixabay is secondary with its own
      stricter per-window quota (see locked decisions below).
- [ ] Every clip is downloaded and cached to the product's own storage before use - never
      hotlinked from the provider.
- [ ] Per-clip provenance is stored: provider, contributor name, license snapshot,
      download timestamp.
- [ ] No endpoint ever exposes a raw, unmodified clip for download. Only the final
      rendered/composited video is downloadable by a user.
- [ ] `POST /api/v1/render-jobs` only validates and enqueues; it returns `202` with a
      `jobId` and never blocks on render completion.
- [ ] `GET /api/v1/render-jobs/:id` reports job status
      (`queued` / `downloading` / `rendering` / `ready` / `failed`) and the result file URL
      once ready.
- [ ] Rendering for v1 uses ffmpeg (compositing, text overlay, logo watermark, 9:16 crop) -
      not Remotion (see PRD §5.3 rationale).
- [ ] Multi-format output (reel, carousel, story) is out of scope for this requirement -
      tracked as a v1.5 nice-to-have (PRD §14).

## Locked decisions (PRD §15)

- Cache-then-composite is safe under both providers' current licenses, conditioned on
  never exposing the raw clip. Rate-limit increases must be requested from Pexels/Pixabay
  before scaling user count - see PRD §12 for the full guardrail.

## Related tickets

- (none yet)
