import type { Locale, Template } from "@career/core";

/**
 * Brand prefix for download filenames, e.g. "santiago-orozcoh".
 * Matches the identity used across the site (email, website, GitHub).
 */
export const DOWNLOAD_PREFIX = "santiago-orozcoh";

/**
 * Recruiter-friendly download filename:
 *   1-column: santiago-orozcoh-{download_name}-{locale}.{ext}
 *   2-column: santiago-orozcoh-{download_name}-2col-{locale}.pdf
 * The `download` attribute on the anchor tags controls what the
 * browser saves, independent of the server path (which stays /resumes/<slug>).
 */
export function downloadFileName(
  template: Template,
  locale: Locale,
  ext: "pdf" | "docx",
  columns: 1 | 2 = 1,
): string {
  const layoutSuffix = ext === "pdf" && columns === 2 ? "-2col" : "";
  return `${DOWNLOAD_PREFIX}-${template.download_name}${layoutSuffix}-${locale}.${ext}`;
}
