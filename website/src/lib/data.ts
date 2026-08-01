import {
  findRepoRoot,
  loadCareerData,
  loadLocale,
  loadTemplates,
  repoPaths,
  resolveAll,
} from "@career/core";
import type { Locale, ResumeData } from "@career/core";
import type { LocaleFile } from "@career/core";

let cached: Promise<ResumeData[]> | null = null;

/**
 * Loads + resolves every resume variant once per build.
 * Consumed by pages at build time (fully static output).
 */
export function getResumes(): Promise<ResumeData[]> {
  cached ??= (async () => {
    const paths = repoPaths(findRepoRoot());
    const [data, templates] = await Promise.all([
      loadCareerData(paths.dataDir),
      loadTemplates(paths.templatesDir),
    ]);
    return resolveAll(data, templates);
  })();
  return cached;
}

/**
 * Loads a locale file for the given locale.
 */
export function getLocaleFile(locale: Locale): Promise<LocaleFile> {
  return loadLocale(locale);
}
