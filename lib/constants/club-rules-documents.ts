// /club-rules와 /clubs/new(신청 전 확인하세요)가 같은 문서 목록·경로를
// 참조하도록 한 곳에서 관리한다. 파일 실체는 public/documents/club-rules/에
// document/ 폴더 원문을 그대로 복사해 둔 것이다(내용 수정 없음).
export const CLUB_RULE_DOCS = [
  {
    key: "operating",
    label: "동아리 운영규정",
    description: "동아리 구분·등록요건 등 학교 차원의 공식 운영 규정입니다.",
    baseName: "서울미디어대학원대학교 동아리 운영규정",
  },
  {
    key: "charter",
    label: "표준 동아리 회칙",
    description: "개별 동아리가 회칙을 만들 때 기준이 되는 표준안입니다.",
    baseName: "서울미디어대학원대학교 표준 동아리 회칙(안)",
  },
] as const;

export type ClubRuleDocKey = (typeof CLUB_RULE_DOCS)[number]["key"];

const CLUB_RULE_DOCS_DIR = "/documents/club-rules";

export function clubRuleFileHref(baseName: string, ext: "pdf" | "hwp"): string {
  return `${CLUB_RULE_DOCS_DIR}/${encodeURIComponent(`${baseName}.${ext}`)}`;
}
