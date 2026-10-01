// 앱 전역 언어 설정의 단일 소스. URL은 언어와 무관하게 그대로 두고(/en 경로
// 없음), 사용자가 고른 언어는 LOCALE_COOKIE 하나에만 저장한다 — 서버
// 컴포넌트가 cookies()로 바로 읽을 수 있어야 해서 localStorage가 아니라
// cookie다. cookie가 없으면 항상 DEFAULT_LOCALE(ko)로 시작한다.
export const LOCALES = ["ko", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ko";

export const LOCALE_COOKIE = "smitclub-locale";

// 1년 — 사용자가 다시 바꾸기 전까지 유지.
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

// Intl API(날짜·숫자 포맷)에 넘길 BCP 47 태그.
export const INTL_LOCALE: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en-US",
};
