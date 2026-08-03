# career-os

Professional infrastructure as software. This repository is the **single source
of truth** for one professional identity: structured YAML data compiles into
multiple ATS-friendly resumes (PDF, HTML, DOCX, Markdown) and the static
website behind [cv.orozcoh.com](https://cv.orozcoh.com).

Adding a new job, project, or skill means **editing one data file once** —
every resume variant, in every language and format, and the website all update
on the next build.

---

## Quick start

```bash
pnpm install        # install workspace dependencies
pnpm validate       # check data/ and templates/ against the schemas
pnpm dev            # local dev server for the website
pnpm build          # generate EVERYTHING (site + md + html + docx + pdf, all locales)
```

Requirements: Node ≥ 20, pnpm ≥ 10. PDF generation uses the locally installed
Google Chrome if present, otherwise Playwright's Chromium
(`pnpm exec playwright install chromium`). Deploying the analytics Worker also
needs `wrangler` (installed in `packages/worker`).

## Repository layout

```
├── data/                  # THE single source of truth (YAML, Zod-validated)
├── templates/             # one directory per resume variant (config only)
├── locales/               # UI strings per language (en.yaml, es.yaml, …)
├── packages/
│   ├── core/              # @career/core — schemas, loaders, resolver, renderers
│   ├── analytics/         # @career/analytics — privacy-first analytics boundary
│   └── worker/            # @career/worker — analytics ingest + dashboard API (Cloudflare Worker)
├── website/               # @career/website — Astro + Tailwind (cv.orozcoh.com)
├── scripts/               # validate.ts · generate.ts · pdf.ts (run with tsx)
└── generated/             # build output — COMMITTED to git on purpose
    ├── en/  markdown/  html/  pdf/  docx/
    └── es/  markdown/  html/  pdf/  docx/
```

`generated/` is version-controlled so every resume output has reviewable
history. `website/dist/` is transient and gitignored.

## How it works

```
data/*.yaml (localized) ──► Zod validation ──► CareerData
templates/*/template.yaml ──► tag-based filter ──► ResumeData (one per template)
locales/<lang>.yaml (UI strings) ──► locale-aware renderers ──► output per language
        │
        ├──────────────┬───────────────┬──────────────────┐
        ▼              ▼               ▼                  ▼
   Markdown      HTML (Astro      DOCX (docx        PDF (headless Chromium
   renderer      website build)   renderer        prints the built pages)
```

Every renderer receives the target language and resolves localized content
from the data; UI chrome (section titles, labels, date words, enum labels)
comes from the locale file. Key property: the HTML the website serves is the
**only** HTML. PDFs are that same markup printed by Chromium, so online and
PDF versions can never diverge — and the PDF text layer is real, selectable,
machine-readable text in reading order, which is exactly what ATS parsers
extract.

## Localization

Human-readable content is stored as `LocalizedText` — a map of locale → string:

```ts
type LocalizedText = { en: string; es: string }; // Record<Locale, string>
```

Data files use the same shape in YAML:

```yaml
title:
  en: Software Engineer
  es: Ingeniero de Software
```

Adding a locale key to `LocalizedText` (via `SUPPORTED_LOCALES` in
`packages/core/src/schema/locale.ts`) is the only schema change ever needed —
all types, validation, and renderers adapt automatically. There is no
`any`; every localized field is strongly typed by Zod inference.

### Fields that ARE localized

Titles, summaries, bullet points, project taglines/descriptions/highlights,
link labels, skill category names, degree/field names, education highlights,
language names, template names/descriptions/overrides, and all UI strings
(website + renderers).

### Fields that are NEVER localized

`id`, dates (`YYYY-MM` / `YYYY`), URLs, email addresses, `company`,
`institution`, `location`, `technologies`, `skills` (item names that are
proper nouns), `tags`, template `slug`, and enum *values*
(`employment_type`, `proficiency` — their *display labels* come from the
locale files).

### Locale files

`locales/<locale>.yaml` holds UI strings: section titles, month names,
"Present", employment-type and proficiency display labels, renderer labels
(Technologies, Links, CV…), and website copy. Renderers consume these through
the typed `LocaleFile` interface — there are no hardcoded English strings in
templates or components.

### Adding a new language

1. Add the code to `SUPPORTED_LOCALES` in
   `packages/core/src/schema/locale.ts` (one line).
2. Create `locales/<code>.yaml` (copy an existing locale file and translate).
3. Add the `<code>` key to every `LocalizedText` field in `data/` and
   `templates/` (validation fails the build with precise paths if any are
   missing).

That's it — `pnpm build` then emits the new language everywhere: website
routes (`/<code>/...`), Markdown, DOCX, HTML, and PDF.

### Website routes

Locale-prefixed static routes: `/en/software-engineer`, `/es/software-engineer`,
`/en/`, `/es/`. The root `/` redirects to the default locale (`en`).
Downloads live at `/<locale>/resumes/<slug>.pdf` / `.docx`.

First-time visitors are redirected to their browser language when it's a
supported locale (stored in `localStorage`); the **EN / ES toggle** on every
page switches language explicitly and the choice sticks. Explicit deep links
(e.g. a bookmarked `/es/…` URL) always win over the stored preference.

## Data model

All content lives in `data/`. Schemas are enforced at build time
(`packages/core/src/schema/`), so a malformed file fails the build with a
precise file path and field.

### Tags — the mechanism behind resume variants

Experience, projects, and individual bullets/highlights carry `tags`.
Templates select by tag intersection, so one dataset yields targeted resumes
with zero duplication:

```yaml
# data/experience.yaml
- id: acme-senior-2023
  title:
    en: Senior Software Engineer
    es: Ingeniero de Software Senior
  company: Acme Corp
  employment_type: full-time      # full-time | part-time | contract | freelance | internship | self-employed
  location: Remote
  start: "2023-03"                # YYYY-MM
  end: null                       # null = Present
  tags: [swe, frontend]
  bullets:
    - text:
        en: Led migration of the checkout flow to React Server Components…
        es: Lideré la migración del flujo de checkout a React Server Components…
      tags: [frontend]            # shown only in templates including "frontend"
    - text:
        en: Designed an event-driven order pipeline processing 2M events/day…
        es: Diseñé un pipeline de pedidos orientado a eventos…
      tags: [swe]                 # shown only in templates including "swe"
```

Other files: `profile.yaml` (identity + contact), `projects.yaml` (same tag
rules), `skills.yaml` (categories, optional per-skill tags),
`education.yaml` (years or YYYY-MM), `languages.yaml` (proficiency levels).

## Templates

Each `templates/<name>/template.yaml` is **configuration only** — it selects
and orders content, never duplicates it:

```yaml
id: frontend
name:                               # landing card title (localized)
  en: Frontend Engineer
  es: Ingeniero Frontend
slug: frontend                   # → /en/frontend, en/frontend.pdf, en/frontend.docx
description:                        # card description (localized)
  en: UI engineering focus — React, rendering performance…
  es: Enfoque en ingeniería UI — React, rendimiento de renderizado…
title_override:                     # null → profile.title (localized)
  en: Frontend Engineer
  es: Ingeniero Frontend
summary_override: null              # null → profile.summary (localized)
include_tags: [frontend]                # ["*"] = everything (master)
exclude_tags: []
max_bullets_per_role: 4                 # null = no limit; file order = priority
project_layout: compact                 # compact | standard | complete — see below
max_education_highlights: 0             # null = all education bullets; 0 = none
sections: [summary, experience, projects, skills, education, languages]
order: 2                                # landing card order; master uses 99
skills:
  filter_tags: [frontend]               # null = all skills
```

`project_layout` controls how projects render (all output formats):

| Layout | Tagline | Description | Highlights | Technologies | Links |
| ------ | ------- | ----------- | ---------- | ------------ | ----- |
| `compact`   | ✓ | —   | ✓ | inline (`React · TypeScript · Cloudflare`) | — |
| `standard`  | ✓ | ✓   | ✓ | labeled                         | ✓ (web only, hidden in PDF) |
| `complete`  | ✓ | ✓   | ✓ | labeled                         | ✓ everywhere |

### Add a new resume variant

Create `templates/<name>/template.yaml`. That's it — the next build gives it a
landing card, an HTML page, and PDF/DOCX/Markdown outputs. No code changes.

### Add new experience

Add one entry to `data/experience.yaml` with the right tags. Every relevant
variant updates. Empty sections (e.g. no matching projects) are omitted
automatically.

## Commands

| Command            | What it does                                                        |
| ------------------ | ------------------------------------------------------------------- |
| `pnpm validate`    | Zod-validate all YAML + resolve all templates                       |
| `pnpm build`       | validate → build site → markdown/DOCX/HTML → PDF (all locales)      |
| `pnpm build:site`  | Astro build only (`website/dist`)                                   |
| `pnpm generate`    | Markdown, DOCX, HTML copy (needs `website/dist`)                    |
| `pnpm generate:pdf`| PDFs from the built site (needs `website/dist`)                     |
| `pnpm dev`         | Astro dev server                                                    |
| `pnpm test`        | Vitest suite (core + analytics + worker)                            |
| `pnpm typecheck`   | `tsc --noEmit` across packages and scripts                          |
| `pnpm clean`       | Remove `generated/` and `website/dist`                              |
| `pnpm --filter @career/worker dev`    | Run the analytics Worker locally (wrangler dev)      |
| `pnpm --filter @career/worker deploy` | Deploy the analytics Worker (wrangler deploy)        |

## ATS compatibility

Every format is built for parsers first: single-column layout, semantic
heading hierarchy (name → sections → entries), real text (no images of text),
no tables for layout, no icons, no progress bars, no decorative timelines.
PDFs are A4 with a proper text layer (verified by extraction tests); DOCX uses
native heading styles and bullet lists.

## Analytics

The site ships a real, privacy-first analytics pipeline for resume engagement,
powering the private dashboard at `/analytics`:

```
Browser                          Cloudflare Worker (cv.orozcoh.com/api/*)
┌──────────────────────┐  POST  ┌──────────────────────────────────────────┐
│ Analytics.astro      │ ─────► │ POST /api/analytics  (public)            │
│ bundled inline       │        │   enrich request.cf (country, city,      │
│ script → sendBeacon  │        │   region, continent) + Referer + UA      │
│ (page_view,          │        │   validate against strict Zod schema     │
│  resume_open,        │        │   → Analytics Engine dataset cv-analytics│
│  resume_view,        │  GET   │                                          │
│  resume_download,    │ ◄───── │ GET /api/admin/analytics/* (key-protected)│
│  outbound_click)     │        │   summary · resumes · countries · cities │
└──────────────────────┘        │   · languages · funnel · live            │
                                └──────────────────────────────────────────┘
```

The browser never talks to Analytics Engine directly — all writes and reads go
through the Worker, and the UI only ever emits anonymous `ClientSignal`s.

### Events

| Event              | Fires when                                            | Payload                    |
| ------------------ | ----------------------------------------------------- | -------------------------- |
| `page_view`        | any page loads                                        | `path`                     |
| `resume_open`      | entering a resume page (landing-card click, direct URL, or external link) | `resume` |
| `resume_view`      | any resume detail page load                           | `resume`                   |
| `resume_download`  | PDF/DOCX download link clicked                        | `resume`, `format`         |
| `outbound_click`   | external link clicked (GitHub, LinkedIn, projects…)   | `target` (coarse label), `resume` |

`resume_open` is tracked only on **entry** to a resume page — the tracking
script checks `document.referrer` and skips it when the visitor arrived from
another resume page (locale switches, back-and-forth navigation). This gives a
clean funnel: landing page → open → view → download.

### Anonymous sessions

Each browser generates a random UUID on first visit and stores it in
`localStorage` (`cv_sid`). It is attached to every event and used only to
distinguish repeat visits from unique visitors. It is never used to identify a
person, and no cookies, IP addresses, fingerprints, or authentication data are
ever collected or stored.

### Privacy contract (architectural invariants)

1. **No IP storage** — geo comes from Cloudflare edge metadata only
   (`request.cf.country/city/region/continent`), at coarse granularity.
2. **No identifying identifiers** — the only client-stored value is the
   anonymous session UUID; no cookies, no fingerprints, no email.
3. **Data minimization** — referrer is reduced to hostname, user agent to
   browser family, outbound targets to coarse labels (never raw URLs). The
   strict Zod schemas (`.strict()`) mechanically reject any payload carrying
   an extra field — `ip`, coordinates, session ids from other systems, etc. —
   and `buildEvent` re-validates before every write.
4. **Client clock is never trusted** — timestamps are stamped by the Worker.

### Adding a provider (backend-agnostic design)

The application depends only on the `@career/analytics` interfaces
(`AnalyticsProvider`, `EventSink`). Swapping Analytics Engine for another
backend (D1, a metrics SaaS…) means changing the Worker — never the website.
The provider is registered in `website/src/analytics.config.ts`, the only
file that knows which provider is active.

## Worker

`packages/worker/` is a standalone Cloudflare Worker deployed on the same
origin (`cv.orozcoh.com/api/*`) to avoid CORS and keep deployment simple.

| Config                  | Where                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| Dataset binding         | `ANALYTICS` → `cv-analytics` (Analytics Engine, `wrangler.toml`) |
| `ANALYTICS_KEY`         | secret — dashboard access key (any random string)                |
| `ANALYTICS_API_TOKEN`   | secret — Cloudflare API token, `Account / Account Analytics / Read` |
| `ACCOUNT_ID`            | env var in `wrangler.toml` `[vars]`                              |

**Public** (no auth):

- `POST /api/analytics` — browser event ingestion.

**Private** (dashboard API — requires `X-Analytics-Key` header):

| Endpoint                          | Returns                                    |
| --------------------------------- | ------------------------------------------ |
| `/api/admin/analytics/summary`    | totals / today / week per event            |
| `/api/admin/analytics/resumes`    | per-slug opens, views, downloads           |
| `/api/admin/analytics/countries`  | top 10 countries by engagement             |
| `/api/admin/analytics/cities`     | top 10 cities by engagement                |
| `/api/admin/analytics/languages`  | en/es views + downloads                    |
| `/api/admin/analytics/funnel`     | open → view → download counts              |
| `/api/admin/analytics/live`       | last 50 events (24 h window)               |
| `/api/admin/analytics/ping`       | connectivity probe                         |

Queries run against the Analytics Engine SQL API (the Worker binding has no
query method), using `SUM(_sample_interval)` so counts stay accurate under
sampling. The dataset column layout (14 positional blobs, index = session id)
is documented in `packages/worker/src/data-point.ts`.

### Deploy the Worker

```bash
cd packages/worker
# 1. Set your Cloudflare account ID in wrangler.toml ([vars] ACCOUNT_ID)
# 2. Create the secrets (never commit them):
wrangler secret put ANALYTICS_KEY          # any random string, e.g. `openssl rand -hex 24`
wrangler secret put ANALYTICS_API_TOKEN    # see below
# 3. Deploy:
wrangler deploy
# 4. In the Cloudflare dashboard (Workers & Pages → your worker → Settings →
#    Routes) or `wrangler routes`, add the route:
#      cv.orozcoh.com/api/*  →  cv-analytics
```

**Getting the credentials:**

- `ACCOUNT_ID` — Cloudflare Dashboard → Workers & Pages → Overview (right
  sidebar). A 32-character hex string, also visible in the dashboard URL:
  `dash.cloudflare.com/<account_id>`.
- `ANALYTICS_API_TOKEN` — Cloudflare Dashboard → My Profile → API Tokens →
  Create Token → **Create Custom Token**. Name it `Analytics Engine Read`,
  permission `Account` | `Account Analytics` | `Read`, then copy the token.

### Dashboard

The private dashboard lives at `cv.orozcoh.com/analytics` (also available
locally via `pnpm dev`). It is deliberately **not linked** from the public
site and carries `robots: noindex`. The visitor enters the `ANALYTICS_KEY`
once (stored in `sessionStorage`), after which the page queries
`/api/admin/analytics/*` and renders summary cards, the funnel, per-resume
tables, geography, and a live feed with a 60-second auto-refresh.

## Deployment

Two artifacts deploy to Cloudflare, both on the `cv.orozcoh.com` zone.

### 1. Website (Cloudflare Pages)

The site is fully static; `website/dist` is the deployable artifact.

- **Build command**: `pnpm build`
  (Playwright downloads its Chromium during `pnpm install` when no system
  Chrome exists; `scripts/pdf.ts` falls back to it automatically.)
- **Output directory**: `website/dist`
- PDF/DOCX downloads are staged into `dist/<locale>/resumes/` by the build,
  and `public/_headers` marks them `immutable` for caching.

### 2. Analytics Worker

See [Worker](#worker): `wrangler deploy` after setting secrets and the
`ACCOUNT_ID`, then add the route `cv.orozcoh.com/api/* → cv-analytics`.
**Deploy the Worker before the site** so tracking beacons and the dashboard
resolve immediately when the new site goes live.

### Order of operations for a fresh setup

1. **Edit** `packages/worker/wrangler.toml` — set `ACCOUNT_ID` (repo root).
2. **`cd packages/worker`**, then create the secrets (never commit them):
   ```bash
   wrangler secret put ANALYTICS_KEY          # any random string, e.g. `openssl rand -hex 24`
   wrangler secret put ANALYTICS_API_TOKEN    # see "Getting the credentials" above
   ```
3. Still **in `packages/worker`**, deploy the Worker:
   ```bash
   wrangler deploy
   ```
   Then add the Workers Route `cv.orozcoh.com/api/*` (see below).
4. **Back at the repo root**, build and deploy the site:
   ```bash
   pnpm build
   ```
   Then deploy `website/dist` to Cloudflare Pages (see "Step 4 explained" below).
5. Dashboard available at `cv.orozcoh.com/analytics`; tracking is active site-wide.

Why the two working directories: `wrangler` reads `wrangler.toml` from the
current directory, so secret/deploy commands must run inside
`packages/worker/`. `pnpm build` must run from the repo root (workspace
commands resolve from there).

**Step 3 explained.** `wrangler deploy` uploads the Worker code to
Cloudflare's edge network and gives it a `*.workers.dev` URL, but that URL
receives no traffic. The **Workers Route** is what connects the Worker to
your domain: it tells Cloudflare "when a request hits `cv.orozcoh.com/api/*`,
serve it from the `cv-analytics` Worker instead of Pages." Everything else
(`/en/…`, `/es/…`, `/analytics`, resume files) still comes from Pages.

To add the route in the dashboard: **Workers & Pages → `cv-analytics` →
Settings → Routes → Add route** with pattern `cv.orozcoh.com/api/*`, zone
`orozcoh.com`. Or from the CLI:

```bash
wrangler routes add "cv.orozcoh.com/api/*" --zone-id <zone-id>
```

The `api/*` prefix is what keeps the Worker scoped to analytics paths only —
it will never intercept the website itself.

**Step 4 explained.** `pnpm build` only produces the deployable artifact
(`website/dist`) locally; it does **not** upload anything. How you get that
folder live depends on how your Pages project is connected:

| Setup | Deploy command |
| ----- | -------------- |
| **Git-connected** (recommended — Pages runs the build on their infra) | `git push` the branch Pages watches. Pages runs `pnpm build` and deploys `website/dist` automatically. |
| **CLI upload** | `pnpm build && wrangler pages deploy website/dist --project-name=<your-project>` |
| **Dashboard upload** | `pnpm build`, then drag `website/dist` into Workers & Pages → your project → Create deployment. |

## Testing

`pnpm test` runs Vitest across three packages (74 tests):

- **core** — resolver behavior (tag filtering, bullet caps, project layouts,
  education caps, ordering, overrides), schema accept/reject fixtures
  (including localized-field completeness), Markdown rendering in English and
  Spanish with snapshots.
- **analytics** — provider contract, strict-schema privacy enforcement
  (rejects `ip`/coordinates/extra fields), `buildEvent` reducers
  (country/continent mapping, referrer/UA reduction).
- **worker** — key auth, ingest validation (client timestamp discarded,
  extra fields rejected before storage), data-point column mapping, and the
  dashboard query aggregations against a mocked SQL API.

## Roadmap

Designed for, not yet built: cover-letter generation, per-job tailored
resumes (just another template dir), JSON Resume export, public read-only
API, additional locales (adding one is a one-line schema change plus
translations — no structural work).
