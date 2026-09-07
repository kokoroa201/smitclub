export const DOCUMENT_TYPES = [
  { type: "registration", label: "서식1 · 동아리 등록 신청서" },
  { type: "members", label: "서식2 · 동아리 회원 명단" },
  { type: "activity-plan", label: "서식3 · 활동 계획서" },
  { type: "constitution", label: "표준 동아리 회칙" },
  { type: "advisor", label: "서식5 · 지도교수 확인서" },
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number]["type"];

export function formatKDate(value: string | null): string {
  if (!value) return "미기재";
  return new Date(value).toLocaleDateString("ko-KR");
}

export const APPOINTMENT_METHOD_LABEL: Record<string, string> = {
  faculty_volunteer: "교수 자원 (Faculty Volunteer)",
  school_recommendation: "학교 추천 (School Recommendation)",
};

export const LANGUAGE_LABEL: Record<string, string> = {
  ko: "한국어 Korean",
  en: "영어 English",
  mixed: "혼합 Mixed",
};
