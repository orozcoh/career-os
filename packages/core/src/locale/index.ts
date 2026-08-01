import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { findRepoRoot, repoPaths } from "../paths";
import type { Locale } from "../schema/locale";
import type { LocaleFile } from "./types";

const localeCache = new Map<Locale, LocaleFile>();

/**
 * Load and parse a locale file from locales/{locale}.yaml
 * Results are cached after first load.
 */
export async function loadLocale(locale: Locale): Promise<LocaleFile> {
  const cached = localeCache.get(locale);
  if (cached) return cached;

  const root = findRepoRoot();
  const localePath = join(root, "locales", `${locale}.yaml`);

  const raw = await readFile(localePath, "utf8");
  const parsed = parseYaml(raw) as LocaleFile;

  localeCache.set(locale, parsed);
  return parsed;
}

/**
 * Load all supported locales.
 */
export async function loadAllLocales(locales: readonly Locale[]): Promise<Record<Locale, LocaleFile>> {
  const results = await Promise.all(
    locales.map(async (locale) => ({
      locale,
      file: await loadLocale(locale),
    }))
  );

  return Object.fromEntries(results.map(({ locale, file }) => [locale, file])) as Record<Locale, LocaleFile>;
}

/**
 * Clear the locale cache (useful for testing).
 */
export function clearLocaleCache(): void {
  localeCache.clear();
}
