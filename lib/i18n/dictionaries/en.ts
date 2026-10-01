import type { Dictionary } from "./ko";

// Dictionary(ko 기준) 타입을 명시해서 키가 빠지거나 남으면 tsc가 잡는다.
export const en: Dictionary = {
  accessibility: {
    korean: "한국어",
    english: "EN",
    largeText: "Large text",
    baseText: "Default text",
  },
};
