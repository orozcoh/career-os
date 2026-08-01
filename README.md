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
(`pnpm exec playwright install chromium`).

## Repository layout

```
├── data/                  # THE single source of truth (YAML, Zod-validated)
├── templates/             # one directory per resume variant (config only)
├── locales/               # UI strings per language (en.yaml, es.yaml, …)
├── packages/
│   ├── core/              # @career/core — schemas, loaders, resolver, renderers
│   └── analytics/         # @career/analytics — privacy-first analytics boundary
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
sections: [summary, experience, projects, skills, education, languages]
order: 2                                # landing card order; master uses 99
skills:
  filter_tags: [frontend]               # null = all skills
```

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
| `pnpm test`        | Vitest suite (core + analytics)                                     |
| `pnpm typecheck`   | `tsc --noEmit` across packages and scripts                          |
| `pnpm clean`       | Remove `generated/` and `website/dist`                              |

## ATS compatibility

Every format is built for parsers first: single-column layout, semantic
heading hierarchy (name → sections → entries), real text (no images of text),
no tables for layout, no icons, no progress bars, no decorative timelines.
PDFs are A4 with a proper text layer (verified by extraction tests); DOCX uses
native heading styles and bullet lists.

## Analytics (boundary only — nothing tracked today)

The architecture supports download/page-view analytics through a **modular
provider boundary** in `@career/analytics`. The application depends only on
interfaces; the default registration is a no-op, so the site ships zero
tracking JavaScript.

- **Client side**: `AnalyticsProvider` receives small `ClientSignal`s
  (`page_view`, `resume_view`, `resume_download`, `outbound_click`).
- **Server side**: an `EventSink` persists enriched `TrackedEvent`s built by
  the pure `buildEvent` reducer from edge request metadata.
- **Adding a provider** (Cloudflare Worker beacon, Plausible, Umami…) means
  implementing the interface and registering it in
  `website/src/analytics.config.ts` — the only file that changes.

### Privacy contract (architectural invariants)

1. **No IP storage** — geo comes from platform edge metadata only.
2. **No fingerprinting** — no client IDs, no storage APIs, no correlation
   keys; events can never be linked (aggregate counts only).
3. **No cookies** — nothing in the pipeline may set or read cookies.
4. **Data minimization** — referrer reduced to hostname, user agent reduced
   to browser family, no coordinates/postal codes/ASNs. The strict Zod event
   schema mechanically rejects any event carrying extra fields (including
   `ip`), and `buildEvent` re-validates before any sink write.

Intended future shape: a Cloudflare Pages Function enriches signals with
`request.cf.country` / `request.cf.city` (available on all plans — the IP is
never exposed to our code) and writes to Workers Analytics Engine.

## Deployment (Cloudflare Pages)

The site is fully static; `website/dist` is the deployable artifact.

- **Build command**: `pnpm build`
  (Playwright downloads its Chromium during `pnpm install` when no system
  Chrome exists; `scripts/pdf.ts` falls back to it automatically.)
- **Output directory**: `website/dist`
- PDF/DOCX downloads are staged into `dist/<locale>/resumes/` by the build,
  and `public/_headers` marks them `immutable` for caching.

## Testing

`pnpm test` runs Vitest across packages: resolver behavior (tag filtering,
bullet caps, ordering, overrides), schema accept/reject fixtures (including
localized-field completeness), Markdown rendering in English and Spanish with
snapshots, and the analytics contract (no-op conformance, strict-schema
privacy enforcement, `buildEvent` reducers). CI (`.github/workflows/ci.yml`)
runs validate + test + typecheck + a full build.

## Roadmap

Designed for, not yet built: cover-letter generation, per-job tailored
resumes (just another template dir), JSON Resume export, public read-only
API, real analytics providers, additional locales (adding one is a one-line
schema change plus translations — no structural work).
