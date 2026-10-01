import { INTL_LOCALE, type Locale } from "./config";

// 언어별 날짜 포맷 공통 helper. 지금 각 페이지에 흩어진
// toLocale*String("ko-KR") 호출은 이후 단계에서 이걸로 옮긴다.
export function formatDate(
  value: string | number | Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "numeric", day: "numeric" },
): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], options).format(new Date(value));
}

export function formatDateTime(value: string | number | Date, locale: Locale): string {
  return formatDate(value, locale, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
