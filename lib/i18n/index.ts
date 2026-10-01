import { DEFAULT_LOCALE, type Locale } from "./config";
import { ko, type Dictionary } from "./dictionaries/ko";
import { en } from "./dictionaries/en";

export {
  DEFAULT_LOCALE,
  INTL_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  isLocale,
  type Locale,
} from "./config";
export type { Dictionary } from "./dictionaries/ko";

const DICTIONARIES: Record<Locale, Dictionary> = { ko, en };

// 서버·클라이언트 어디서나 쓸 수 있는 동기 조회. 사전이 작아 지연 로딩하지 않는다.
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

// "{name} 둘러보기" 같은 사전 문구의 자리표시자를 채운다.
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

// clubs.category(한국어 DB 값)의 표시 라벨. 사전에 없는 값은 원문 그대로.
export function categoryLabel(category: string, locale: Locale = DEFAULT_LOCALE): string {
  const labels: Record<string, string> = getDictionary(locale).category;
  return labels[category] ?? category;
}
