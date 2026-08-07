# PRD & Arsitektur — Content Planner + Reel Auto-Generator
**Nama kerja: "Momenta"** (nama produk final masih boleh diganti sebelum public launch — tidak memengaruhi arsitektur teknis di dokumen ini)

Versi: 1.0 (**Final — Terkunci**)
Status: **Disetujui untuk implementasi.** Perubahan scope setelah dokumen ini dikunci dibuat lewat ticket/RFC baru, bukan dengan mengedit ulang PRD ini.
Terakhir dikunci: 2026-08-07

---

## 1. Ringkasan Produk

Aplikasi web yang secara otomatis menyiapkan **script + video reel siap pakai** untuk UMKM dan solo content creator, berbasis momen kalender bulanan (hari libur nasional, gajian, awal bulan, weekend, dll). Script dibuat lewat mesin template deterministik (bukan AI generatif), lalu dirangkai jadi video lewat modul `reelkit` (stock footage dari Pexels/Pixabay) dengan tampilan yang bisa dikustomisasi penuh oleh user (warna, font, posisi teks, logo).

Inti produk: **user tinggal buka kalender, pencet generate, download, upload.** Tidak perlu mikir ide, tidak perlu edit.

---

## 2. Latar Belakang & Masalah

- UMKM dan content creator kecil kesulitan konsisten posting karena dua hambatan utama: **kehabisan ide** dan **tidak punya waktu/skill edit**.
- Tools yang ada di pasar saat ini terbagi dua ekstrem: (a) editor AI generatif yang mahal dan berat (OpusClip, Vizard, FluxNote), atau (b) tools generik global yang tidak nyambung ke ritme kalender lokal Indonesia.
- Ide konten yang paling gampang dieksekusi justru sering nyambung ke **momen** (hari besar, gajian, weekend) — tapi tidak ada tools yang otomatis menghubungkan momen ini dengan produk/niche spesifik user tanpa biaya AI generatif.

---

## 3. Tujuan & Non-Tujuan

### Tujuan (v1 / MVP)
- Generate script otomatis per tanggal dalam sebulan, tanpa AI, berbasis kalender momen + niche bisnis user.
- Kombinasikan script dengan `reelkit` untuk menghasilkan video reel siap pakai (9:16).
- Brand kit yang bisa dikustomisasi penuh oleh user (warna, font, posisi teks, logo) di level frontend.
- Tampilan planner kalender bulanan sebagai pusat kendali.

### Non-Tujuan (di luar scope v1)
- Tidak ada auto-post ke media sosial (user tetap download & upload manual) — menghindari kebutuhan approval API posting yang rumit dan berisiko.
- Tidak menggunakan AI generatif untuk teks maupun visual di versi awal (biaya jalan harus mendekati nol).
- Tidak menyasar analitik tren real-time TikTok (topik terpisah, sumber datanya tidak feasible untuk MVP).
- Belum multi-bahasa; fokus Bahasa Indonesia dulu.
- Tidak ada model bisnis/monetisasi yang dikunci di dokumen ini — lihat Bagian 15.

---

## 4. Target Pengguna

- **UMKM mikro/kecil** (kuliner, fashion, jasa, kerajinan tangan) yang jualan di media sosial tapi tidak punya tim konten.
- **Solo content creator** yang jualan produk sendiri atau butuh konsistensi posting tapi sering kehabisan ide.

Karakteristik bersama: tidak punya waktu riset atau skill edit video, tapi ingin tampil konsisten dan terlihat rapi/estetik sesuai selera masing-masing (bukan template yang keliatan generik/seragam).

---

## 5. Ruang Lingkup Fungsional (MVP)

### 5.1 Moment & Calendar Engine
- Data hari libur nasional & cuti bersama disimpan sebagai **file JSON yang di-vendor di dalam repo**, per tahun kalender, bukan dipanggil live ke API pihak ketiga saat runtime produk berjalan. Ini menghilangkan risiko downtime/perubahan sumber pihak ketiga di jam operasional.
- Proses refresh data ini **sekali setahun, manual**: dataset `APIHariLibur_V2` (GitHub, guangrei) dipakai sebagai sumber utama untuk mengisi file JSON tahun berikutnya, `api-harilibur.vercel.app` (kresnasatya) dipakai sebagai cross-check sekunder, dan keduanya divalidasi ulang terhadap rilis resmi **SKB 3 Menteri** (Kemenag/Kemenaker/Menpan-RB, biasanya terbit September untuk tahun berikutnya, dipublikasikan lewat kemenkopmk.go.id). Tidak ada sumber JSON/API resmi pemerintah yang machine-readable, jadi cross-check manual terhadap PDF SKB ini wajib tiap refresh tahunan.
- Momen buatan sendiri (murni hitungan tanggal, tidak butuh sumber eksternal): gajian (tgl 25 & 1), awal bulan, akhir bulan, weekend.
- Setiap tanggal diklasifikasikan ke satu atau lebih **kategori momen**: `hari_besar_keagamaan`, `hari_besar_nasional`, `gajian`, `awal_bulan`, `weekend`, `generic_promo`.

### 5.2 Script Generation Engine (tanpa AI)
- **Bank template**: kumpulan kalimat dengan slot variabel per kategori momen, disimpan sebagai data di database (bukan hardcode di kode).
- **Kamus niche**: tiap kategori bisnis (kuliner, fashion, jasa, kerajinan, dst) punya isian sendiri untuk tiap slot variabel (`ctaVerb`, `promoType`, dst).
- **Algoritma pilih & isi**: untuk setiap tanggal → tentukan kategori momen → pilih 1 template secara acak dari pool yang match (exclude template yang baru dipakai user dalam N hari terakhir) → isi slot dengan kamus niche + data produk milik user.
- Output: `{ text, keywords[], momentId, category }` — keywords dipetakan dari nama momen + niche ke istilah pencarian bahasa Inggris (tabel lookup statis) untuk dipakai query Pexels/Pixabay.

### 5.3 Reelkit Integration (Video Assembly)
- **Sumber stock terkunci**: Pexels adalah sumber utama/default (lisensinya paling jelas untuk kasus ini, request limit lebih longgar untuk pemakaian yang wajar, riwayat enforcement paling predictable untuk SaaS). Pixabay dipakai sebagai sumber sekunder/cadangan dengan kuota ketat tersendiri per jendela waktu, supaya tidak mendekati klausul "bulk/systematic copying" di ToS mereka.
- **Cache wajib**: setiap klip yang diambil dari Pexels/Pixabay didownload dan disimpan permanen di storage sendiri. Tidak pernah hotlink langsung ke URL provider (Pixabay bahkan melarang hotlinking secara eksplisit di ToS-nya).
- **Provenance wajib disimpan** per klip: provider, nama kontributor, snapshot lisensi saat diambil, waktu download — supaya bisa dibuktikan kepatuhan lisensi kalau terms provider berubah di kemudian hari.
- **Guardrail produk**: tidak ada endpoint yang mengekspos klip mentah untuk didownload user. Output yang bisa didownload user hanya video hasil render (composited) — ini yang membedakan produk dari "menjual ulang stock footage" (dilarang di kedua lisensi).
- **Alur render asinkron**: request generate hanya enqueue job (BullMQ + Redis), tidak menunggu render selesai di request yang sama. Worker mengambil job → query & cache klip → render dengan ffmpeg → upload hasil ke storage → update status. Klien polling status job (`queued` → `downloading` → `rendering` → `ready`/`failed`).
- **Rendering engine v1**: ffmpeg (via `fluent-ffmpeg` atau CLI langsung lewat `execa`) — bukan Remotion. Kebutuhan v1 murni compositing klip + text overlay + logo watermark + crop 9:16, itu domain filter-graph ffmpeg, jauh lebih cepat & ringan dibanding render lewat headless Chromium (Remotion). Remotion dipertimbangkan lagi di v2 kalau produk butuh motion graphics/animasi teks custom.
- Output multi-format sekaligus (reel 9:16, carousel, story) tetap **nice-to-have v1.5**, tidak berubah dari draft.

### 5.4 Brand Kit / Kustomisasi Style (FE, per user)
- Setting yang bisa diatur user: warna utama, warna aksen, font (dari daftar terbatas yang sudah divalidasi tampilannya), posisi teks (atas/tengah/bawah), logo watermark (upload + posisi).
- **Validasi kontras warna otomatis masuk MVP**: saat user pilih warna utama+aksen, sistem hitung rasio kontras (WCAG AA) dan tampilkan warning non-blocking kalau kombinasinya sulit dibaca. Ini advisory, tidak menghalangi user menyimpan pilihannya — sekadar mencegah kesalahan tanpa membatasi kreativitas.
- Disimpan sebagai satu objek JSON per user, dipakai `reelkit` saat render sebagai parameter styling — bukan hardcoded di template video.
- Sediakan beberapa preset "vibe" (misal: pastel playful, bold minimal, earthy warm) sebagai starting point sebelum user custom manual, supaya tidak blank di awal.

### 5.5 Content Planner Dashboard
- Tampilan kalender bulanan: tiap tanggal menunjukkan status (belum digenerate / job berjalan / draft siap / sudah didownload), sinkron dengan status job render (`queued`/`downloading`/`rendering`/`ready`/`failed`).
- Tombol "generate sebulan penuh" — generate semua script+video sekaligus untuk bulan berjalan.
- Halaman preview per tanggal: user bisa baca ulang teks, reroll 1 klip yang tidak cocok, lalu download.

---

## 6. Non-Functional Requirements

- **Biaya jalan rendah**: seluruh mesin script adalah lookup/template, tidak ada panggilan LLM di runtime inti. Biaya utama ada di storage media & rendering video.
- **Reliabilitas sumber media**: klip dari Pexels/Pixabay wajib di-cache ke storage sendiri sejak hari pertama (bukan optimisasi nanti), dengan provenance tercatat per klip dan tanpa endpoint yang mengekspos klip mentah ke user (lihat 5.3).
- **Isolasi beban CPU render**: proses render video (CPU-heavy, bisa 5–60+ detik) berjalan di worker process terpisah dari web request handler (via job queue), supaya request HTTP biasa tidak pernah blocking atau kena timeout.
- **Skalabilitas trend/template**: refresh momen & pool template dilakukan per kategori, bukan per user, supaya tidak boros proses saat user bertambah banyak.
- **Privasi aset**: logo dan aset brand milik user disimpan terpisah per akun, tidak dibagi ke user lain.
- **Kepatuhan lisensi**: cache permanen + commercial derivative use aman di lisensi Pexels & Pixabay saat ini, selama produk tidak pernah mengekspos klip mentah tanpa modifikasi ke pengguna akhir (lihat 5.3 dan Bagian 15).

---

## 7. Alur Pengguna Utama

1. Onboarding: user pilih niche bisnis, isi nama produk/brand, atur brand kit (atau pakai preset).
2. Buka dashboard kalender bulan berjalan.
3. Pencet "generate sebulan" → sistem enqueue job script+video draft untuk tiap tanggal bermomen di bulan itu; dashboard menunjukkan status berjalan per tanggal secara real-time/polling.
4. User buka tiap tanggal, baca script, reroll klip kalau perlu, lalu download begitu status `ready`.
5. (Opsional) Dapat notifikasi H-1 pengingat "konten besok sudah siap."

---

## 8. High-Level Architecture (HLD)

```
                         ┌────────────────────────────────────────┐
                         │              Next.js App                │
                         │        (monolith, satu codebase)        │
                         │  ┌────────────────────────────────────┐ │
                         │  │  Frontend (App Router, React)       │ │
                         │  │  - Dashboard kalender                │ │
                         │  │  - Brand kit editor + contrast check │ │
                         │  │  - Preview & edit                    │ │
                         │  └───────────────┬──────────────────────┘ │
                         │                  │ internal fetch          │
                         │  ┌───────────────▼──────────────────────┐ │
                         │  │  Route Handlers (Controller layer)   │ │
                         │  │  - Terjemahkan HTTP <-> Service       │ │
                         │  │  - Tidak menyentuh DB, tidak ada      │ │
                         │  │    business rule                     │ │
                         │  └───────────────┬──────────────────────┘ │
                         └──────────────────┼──────────────────────────┘
                                            ▼
                         ┌────────────────────────────────────────┐
                         │           Service layer                 │
                         │  MomentService · ScriptService ·         │
                         │  BrandKitService · RenderJobService      │
                         │  (business rules, tidak lihat req/res,   │
                         │   tidak menulis SQL)                     │
                         └───┬───────────┬───────────┬─────────────┘
                             │           │           │
             ┌───────────────┘           │           └────────────────┐
             ▼                           ▼                            ▼
  ┌──────────────────────┐   ┌───────────────────────┐   ┌──────────────────────┐
  │ Repository layer       │   │ Script Template        │   │ Media Sourcing        │
  │ - Prisma + PostgreSQL   │   │ Repository/Engine      │   │ Repository            │
  │ - Momen (JSON vendored) │   │ - Pilih template       │   │ - Query Pexels        │
  │ - Sinkron sekali/tahun   │   │ - Isi slot niche        │   │   (utama) / Pixabay   │
  │   (manual)               │   │ - Anti-repetisi/user    │   │   (sekunder)          │
  └──────────────────────┘   └───────────────────────┘   │ - Cache wajib ke S3    │
                                                            │ - Simpan provenance   │
                                                            └───────────┬───────────┘
                                                                        ▼
                             ┌───────────────────────────────────────────────┐
                             │  BullMQ Queue (Redis)                          │
                             │  render-video job: enqueue only dari Route      │
                             │  Handler, respons 202 + jobId, tidak menunggu   │
                             └───────────────────────┬─────────────────────────┘
                                                       ▼
                             ┌───────────────────────────────────────────────┐
                             │  Worker container (image sama dgn web,         │
                             │  CMD beda) — "reelkit" render pipeline         │
                             │  - Download & cache klip                       │
                             │  - Render ffmpeg (concat + drawtext + overlay  │
                             │    + crop 9:16) + brand kit styling             │
                             │  - Upload hasil, update status di Postgres      │
                             └───────────────────────┬─────────────────────────┘
                                                       ▼
                             ┌───────────────────────────────────────────────┐
                             │  Storage S3-compatible                          │
                             │  (MinIO dev / Cloudflare R2 prod)               │
                             │  - Media cache, aset user, hasil render         │
                             └───────────────────────────────────────────────┘
```

Cron/scheduler ringan (BullMQ repeatable job atau `node-cron`) menjalankan notifikasi pengingat harian. Sinkronisasi kalender hari libur **tidak berjalan otomatis di runtime** — dilakukan manual sekali setahun sesuai Bagian 5.1.

---

## 9. Skema Data (Final)

Penamaan field pakai camelCase (konvensi Prisma/TypeScript), konsisten dengan yang akan dipakai di kode dan di response API.

| Tabel | Field utama |
|---|---|
| `users` | id, email, niche, brandName, createdAt |
| `brandKits` | id, userId, primaryColor, accentColor, font, textPosition, logoUrl |
| `moments` | id, date, name, category, source (`vendoredJson` \| `manual`) |
| `templates` | id, momentCategory, niche, templateText, isActive |
| `nicheDictionaries` | id, niche, variableKey, value |
| `userTemplateHistory` | id, userId, templateId, usedAt |
| `generatedScripts` | id, userId, momentId, date, finalText, keywords, createdAt |
| `mediaCache` | id, keyword, provider (`pexels` \| `pixabay`), sourceUrl, cacheUrl, contributorName, licenseSnapshot, downloadedAt |
| `renderJobs` | id, userId, scriptId, format, status (`queued`\|`downloading`\|`rendering`\|`ready`\|`failed`), brandKitSnapshot, resultFileUrl, errorMessage, createdAt, updatedAt |
| `generatedAssets` | id, userId, scriptId, renderJobId, format (`reel`\|`carousel`\|`story`), fileUrl, brandKitSnapshot, createdAt |

`renderJobs` adalah tabel baru dibanding draft awal — merepresentasikan status job antrean BullMQ di Postgres, supaya API bisa dipoll tanpa bergantung ke state Redis secara langsung.

---

## 10. Desain API (Final)

Semua response memakai envelope tetap standar repo (`status`, `statusCode`, `message`, `data`, `meta`, `errors`, `requestId`, `timestamp`), key camelCase, versi di path.

```
GET  /api/v1/moments?month=&year=            → daftar momen bulan tsb

POST /api/v1/scripts/generate                → { date, niche } → generate 1 script (sinkron, murni lookup, cepat)
POST /api/v1/scripts/generate-month           → generate semua script sebulan
GET  /api/v1/scripts/:id
POST /api/v1/scripts/:id/regenerate          → reroll template untuk tanggal itu

GET  /api/v1/brand-kit
PUT  /api/v1/brand-kit                        → update warna/font/logo/posisi (response menyertakan hasil contrast check)

POST /api/v1/render-jobs                     → { scriptId, brandKitId, format } → 202 Accepted + { jobId }, hanya enqueue
GET  /api/v1/render-jobs/:id                 → status job (queued/downloading/rendering/ready/failed) + resultFileUrl kalau ready

GET  /api/v1/calendar?month=                  → status tiap tanggal (draft/job berjalan/siap/didownload)
```

Contoh envelope sukses untuk `POST /api/v1/render-jobs`:

```jsonc
{
  "status": "success",
  "statusCode": 202,
  "message": "Render job dibuat",
  "data": { "jobId": "rjb_01hz...", "status": "queued" },
  "meta": null,
  "errors": null,
  "requestId": "0f1c8a2e-...",
  "timestamp": "2026-08-07T10:00:00.000Z"
}
```

---

## 11. Tech Stack (Terkunci)

- **Bahasa**: TypeScript end-to-end, strict mode, tanpa `any`.
- **Framework monolith**: Next.js (App Router) — frontend (React) dan backend (Route Handlers) dalam satu codebase, satu unit deploy. Ini memenuhi kebutuhan "monolith BE+FE" tanpa memisah jadi repo/service berbeda.
- **Database**: PostgreSQL 16.
- **ORM**: Prisma — schema-first, migration bawaan, tipe TypeScript ter-generate otomatis dari schema.
- **Validasi**: Zod di boundary API (request & response), sumber tunggal untuk tipe request/response yang dipakai controller.
- **Job queue**: BullMQ + Redis. Route Handler hanya validasi input + enqueue + insert row `renderJobs` (status `queued`), langsung balas 202 — tidak pernah menunggu render selesai di request yang sama.
- **Worker render**: proses Node terpisah (`worker.ts`, BullMQ `Worker`), dijalankan dari **image Docker yang sama** dengan web, hanya beda command (`next start` vs `node dist/worker.js`). Ini tetap satu codebase/monolith — bukan microservice — cuma beda command container untuk isolasi beban CPU.
- **Rendering engine**: ffmpeg via `fluent-ffmpeg`/`execa` untuk v1 (bukan Remotion — lihat 5.3).
- **Storage media**: S3-compatible — MinIO untuk dev lokal, Cloudflare R2 untuk production (SDK S3 yang sama, tinggal ganti env `S3_ENDPOINT`/`S3_BUCKET`/kredensial, tanpa ubah kode).
- **Scheduler**: BullMQ repeatable job (atau `node-cron`) untuk notifikasi pengingat H-1. Sinkron kalender hari libur dilakukan manual tahunan (bukan cron), sesuai Bagian 5.1.
- **Containerization**: Docker Compose — services `web`, `worker` (image sama, command beda), `postgres`, `redis`, `minio` (dev only; digantikan R2 langsung di production).
- **Testing**: Vitest (unit/integration), Playwright (end-to-end) — sesuai `testing-standard` skill.
- **Lint/format/type enforcement**: preset `.claude/presets/node-typescript` + `.claude/presets/react` (preset `svelte`/`vue` tidak dipakai, sesuai keputusan stack).

Contoh service list `docker-compose.yml`:

```yaml
services:
  web:
    build: .
    command: next start
    ports: ["3000:3000"]
    depends_on: [postgres, redis]

  worker:
    build: .
    command: node dist/worker.js
    depends_on: [postgres, redis, minio]

  postgres:
    image: postgres:16-alpine
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"

volumes:
  pgdata:
```

---

## 12. Risiko & Mitigasi (Terkunci)

| Risiko | Mitigasi terkunci |
|---|---|
| Ketergantungan sumber hari libur pihak ketiga | File JSON di-vendor di repo, refresh manual tahunan, cross-check ke SKB 3 Menteri. Tidak ada call runtime ke API eksternal (Bagian 5.1). |
| Rate limit Pexels/Pixabay | Cache wajib sejak hari 1 (bukan nanti-nanti). Pexels jadi sumber utama; minta kenaikan limit gratis ke Pexels sejak awal. Pixabay sekunder dengan cap ketat per jendela waktu, hormati 100 req/60 detik + minimum cache respons 24 jam. |
| Risiko lisensi kalau klip mentah terekspos ke user | Guardrail arsitektur: tidak ada endpoint yang mengizinkan download klip asli. Output ke user hanya video hasil render. Provenance per klip disimpan di `mediaCache` untuk pembuktian kepatuhan (Bagian 5.3, 9). |
| Kualitas & variasi template menurun seiring waktu | Bukan risiko teknis — proses kerja rutin tim konten untuk terus menambah variasi template & kamus niche. Dicatat sebagai proses operasional, bukan item arsitektur. |
| Konsistensi visual antar klip dari sumber acak | Residual risk, mitigasi heuristik sederhana: prioritaskan klip dari kontributor/koleksi yang sama per keyword kalau tersedia (bukan ML). Dipantau di fase produksi, bukan blocker rilis MVP. |

---

## 13. Roadmap

**MVP (Fase 1)**
- Moment engine (file JSON hari libur ter-vendor + momen buatan sendiri)
- Script engine dasar (template + kamus niche untuk 3-4 kategori bisnis)
- Render pipeline end-to-end: BullMQ + Redis + worker + ffmpeg, cache media wajib, 1 format (reel 9:16)
- Brand kit dasar (warna + font + logo + validasi kontras advisory)
- Dashboard kalender + generate per tanggal + polling status job

**Fase 2**
- Generate sebulan penuh sekaligus
- Preview & reroll klip
- Notifikasi pengingat H-1

**Fase 3 (Nice-to-have, lihat Bagian 14)**

---

## 14. Nice-to-Have / Ide Lanjutan

- **Multi-format sekali generate**: dari script+brand kit yang sama, langsung hasilkan reel, carousel feed, dan story sekaligus.
- **Panel isi template mudah**: template & kamus niche dikelola lewat spreadsheet yang di-sync otomatis, supaya nambah variasi tidak perlu deploy ulang kode.
- **Ranking template berbasis pemakaian**: template yang paling sering di-download otomatis lebih sering muncul, yang jarang dipilih otomatis jarang dimunculkan lagi (murni hitungan, bukan ML).
- **Marketplace template komunitas**: user lain bisa share bank template/kamus niche mereka sendiri, jadi variasi tumbuh dari komunitas, bukan cuma dari tim internal.
- **Dashboard performa manual-input**: user bisa masukkan jumlah views/likes setelah upload, sistem highlight kategori momen/template mana yang secara historis paling sering dipakai user itu — feedback loop sederhana tanpa AI.
- **Integrasi pengingat via WhatsApp** (bukan cuma notifikasi in-app), karena UMKM kecil biasanya lebih sering cek WA daripada buka aplikasi terpisah.
- **Mode "isi cepat" untuk momen custom milik bisnis sendiri** (ulang tahun toko, launching produk baru, dll) di luar kalender nasional.
- **Export batch ke ZIP** — sekali klik download semua konten sebulan, buat yang mau nyicil upload manual belakangan.
- **Remotion untuk motion graphics custom** — kalau kebutuhan styling melampaui filter graph ffmpeg (animasi teks kompleks, dst).

---

## 15. Keputusan Terkunci (dulu "Pertanyaan Terbuka")

Tiga pertanyaan di draft awal sudah diriset dan dikunci jadi keputusan berikut. Semuanya berlaku per 2026-08-07 dan tidak menghalangi implementasi.

1. **Lisensi Pexels/Pixabay untuk skala besar** — Aman untuk cache permanen + penggunaan komersial derivatif di kedua lisensi, selama produk tidak pernah menjual/mengekspos klip mentah tanpa modifikasi (larangan "standalone use" di kedua ToS). Guardrail: Pexels utama, Pixabay sekunder dengan kuota ketat, provenance per klip tersimpan, tidak ada endpoint expose klip mentah. Rate limit default (Pexels 200/jam·20k/bulan, Pixabay 100/60 detik) tidak cukup untuk produksi — ajukan kenaikan limit gratis ke masing-masing provider sebelum scale up user.
2. **Batas kustomisasi brand kit demi estetika/aksesibilitas** — Masuk MVP: validasi kontras warna otomatis (WCAG AA), non-blocking/advisory saja (lihat 5.4).
3. **Model bisnis (gratis dengan limit vs berbayar dari awal)** — **Sengaja tidak dikunci di PRD ini.** Ini keputusan bisnis/GTM, bukan keputusan teknis, dan tidak menghalangi implementasi engineering. Default aman kalau tim butuh mulai development sekarang: gratis dengan limit jumlah generate/bulan, dicek di `RenderJobService` sebelum enqueue — upgrade ke tier berbayar nanti tidak butuh perubahan arsitektur, cuma ubah nilai limit & tambah tabel `subscriptions` saat modelnya sudah diputuskan tim produk/bisnis.
