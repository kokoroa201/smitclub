import type { Locale } from "@/lib/i18n";
export type NewsSource = "student_council" | "school_academic" | "school_news";
export type LocalizedTitle = { source?: NewsSource | string; title: string; title_en?: string | null; title_en_source?: string | null };
export function newsTitle(row: LocalizedTitle, locale: Locale): string {
  if (row.source === "school_news") return row.title;
  return locale === "en" && row.title_en && (!row.title_en_source || row.title_en_source === row.title) ? row.title_en : row.title;
}
