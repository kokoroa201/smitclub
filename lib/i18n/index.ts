import type { Locale } from "./config";
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
