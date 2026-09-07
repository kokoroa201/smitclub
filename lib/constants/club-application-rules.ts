// 서울미디어대학원대학교 동아리 운영규정 제13조(등록요건) 기준.
// 예전에 있던 "재학생 비율 60% 이상" 게이트는 실제 규정 어디에도 없는
// 임의 조건이라 제거했다 — 규정은 국적 구성만 요구한다.
export const MIN_FOUNDERS = 5;
export const MIN_KOREAN_FOUNDERS = 1;
export const MIN_INTERNATIONAL_FOUNDERS = 1;

export const REGISTRATION_CATEGORIES = ["학술", "문화·예술", "체육·취미", "국제교류", "기타"] as const;

// 서식3 활동계획서 "월별 활동 계획" 12칸.
export const APPLICATION_MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1));
