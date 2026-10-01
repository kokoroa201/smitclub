import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";

// 서버 컴포넌트/서버 액션에서 현재 요청의 언어를 읽는다. cookie가 없거나
// 지원하지 않는 값이면 항상 기본 언어(ko) — Accept-Language는 보지 않는다.
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
