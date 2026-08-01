# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project uses
[Semantic Versioning](https://semver.org/). The version in the root
`package.json` is the resume release version stamped into the website
(and, when analytics ships, into every tracked event).

## [0.2.0] - 2026-07-31

### Added

- Internationalization (i18n) as a foundational architectural refactor.
- `LocalizedText` type (`{ en, es }`) for every human-readable field, strongly
  typed via `SUPPORTED_LOCALES` + Zod inference; no `any`.
- `locales/en.yaml` and `locales/es.yaml` hold all UI strings (section
  titles, month names, "Present", employment/proficiency display labels,
  renderer labels, website copy), consumed through the typed `LocaleFile`.
- Renderers (`renderMarkdown`, `renderDocx`, `Resume.astro`) accept a locale
  and resolve all content + chrome through it; no hardcoded English remains.
- Locale-prefixed website routes (`/en/…`, `/es/…`) with a root redirect to
  the default locale (`en`).
- Language toggle (EN / ES) on every page; first visits default to the
  browser locale, with the explicit choice persisted in `localStorage`
  (`LOCALE_STORAGE_KEY`). PDF generation seeds the preference per locale so
  headless Chromium never redirects to the wrong language.
- Locale-first generated output: `generated/{locale}/{markdown,html,pdf,docx}`.
- All YAML data and templates migrated to `LocalizedText` (English + Spanish).

### Changed

- `formatDateRange`/`formatYearRange` are locale-aware (month names, "Present").
- `ResumeData.title`/`summary` are now `LocalizedText`; `sectionHasContent`
  detects localized content.
- Website download URLs are locale-prefixed (`/<locale>/resumes/<slug>.pdf`).

## [0.1.0] - 2026-07-31

### Added

- Initial architecture: pnpm workspace with `@career/core`, `@career/analytics`,
  and the Astro website (`@career/website`).
- Structured YAML data model (`data/`): profile, experience, projects,
  education, skills, languages — all validated with Zod.
- Tag-based template system (`templates/`): master, software-engineer,
  frontend, creative-tech. Templates select content; data is never duplicated.
- Renderers: Markdown and DOCX (pure TypeScript), HTML via the Astro site,
  PDF via headless Chromium printing the built pages (A4, machine-readable,
  ATS-friendly).
- Resume website: landing page with one card per template (`View online` /
  `Download PDF`), semantic single-column resume pages, print stylesheet.
- Analytics boundary (`@career/analytics`): interfaces, Zod event schemas,
  pure `buildEvent` reducer, no-op provider/sink defaults. No tracking shipped.
- Build pipeline: `pnpm build` = validate → site → markdown/DOCX/HTML → PDF.
- Vitest suite (46 tests) and GitHub Actions CI.
