import type { LocaleFile } from "../locale/types";

/** "2023-03" → "Mar 2023" (uses locale-specific month names) */
export function formatMonth(yearMonth: string, locale: LocaleFile): string {
  const [year, month] = yearMonth.split("-");
  const monthIndex = Number(month) - 1;
  const label = locale.dates.months[monthIndex];
  return label === undefined || year === undefined ? yearMonth : `${label} ${year}`;
}

/** ("2023-03", null) → "Mar 2023 – Present" */
export function formatDateRange(start: string, end: string | null, locale: LocaleFile): string {
  return `${formatMonth(start, locale)} – ${end === null ? locale.dates.present : formatMonth(end, locale)}`;
}

/** ("2015", "2020") → "2015 – 2020"; ("2015", null) → "2015 – Present" */
/** Also accepts YYYY-MM: ("2014-08", "2023-06") → "Aug 2014 – Jun 2023" */
export function formatYearRange(start: string, end: string | null, locale: LocaleFile): string {
  const formatStart = start.includes("-") ? formatMonth(start, locale) : start;
  const formatEnd = end === null ? locale.dates.present : (end.includes("-") ? formatMonth(end, locale) : end);
  return `${formatStart} – ${formatEnd}`;
}
