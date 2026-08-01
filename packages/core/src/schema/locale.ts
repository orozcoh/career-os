import { z } from "zod";

/**
 * Supported locales for the Career OS system.
 * Adding a new language requires:
 * 1. Adding the locale code here
 * 2. Creating a corresponding locale file (e.g., locales/fr.yaml)
 * 3. Adding translations to all LocalizedText fields in YAML data
 */
export const SUPPORTED_LOCALES = ["en", "es"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/**
 * localStorage key persisting the visitor's explicit language choice.
 * Shared by the website toggle and the PDF build pipeline.
 */
export const LOCALE_STORAGE_KEY = "career-locale";

/**
 * LocalizedText represents a string with translations for each supported locale.
 * This is the foundational type for all human-readable content in the system.
 *
 * Example:
 *   title:
 *     en: "Software Engineer"
 *     es: "Ingeniero de Software"
 */
export const localizedTextSchema = z.object({
  en: z.string(),
  es: z.string(),
});

export type LocalizedText = z.infer<typeof localizedTextSchema>;

/**
 * Resolve a LocalizedText to a string for the given locale.
 * This is the primary API for accessing localized content.
 */
export function t(text: LocalizedText, locale: Locale): string {
  return text[locale];
}

/**
 * Check if a value is a valid Locale.
 */
export function isValidLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}
