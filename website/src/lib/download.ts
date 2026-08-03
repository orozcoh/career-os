import type { Locale, Template } from "@career/core";

/**
 * Brand prefix for download filenames, e.g. "santiago-orozcoh".
 * Matches the identity used across the site (email, website, GitHub).
 */
export const DOWNLOAD_PREFIX = "santiago-orozcoh";

/**
 * Recruiter-friendly download filename:
 *   santiago-orozcoh-{download_name}-{locale}.{ext}
 * The `download` attribute on the anchor tags below controls what the
 * browser saves, independent of the server path (which stays /resumes/<slug>).
 */
export function downloadFileName(
  template: Template,
  locale: Locale,
  ext: "pdf" | "docx",
): string {
  return `${DOWNLOAD_PREFIX}-${template.download_name}-${locale}.${ext}`;
}
