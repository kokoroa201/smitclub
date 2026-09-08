// SMIT 공식 학과·전공 목록. 동아리 개설 신청서(서식1 임원현황/서식2 회원명단)의
// 학과 선택칸에서 공통으로 쓰는 단일 소스 — 여기 값만 바꾸면 신청폼·인쇄
// 서식·서버 검증에 모두 반영된다. 해외 협력대학명은 포함하지 않는다.

export const DEPARTMENTS_KO = [
  "미디어비즈니스전공",
  "미디어한국어교육전공",
  "AI UX RdD전공",
  "AI스타트업전공",
  "융합예술디자인전공",
  "AI소프트웨어전공",
  "AI기술경영전공",
] as const;

export const DEPARTMENTS_EN = [
  "e-Business",
  "AI Business",
  "AI Startup",
  "K-Culture Leadership",
  "Digital Art & Design",
  "Cybersecurity",
  "Program Development",
] as const;

export const DEPARTMENT_GROUPS = [
  { label: "국문 과정 (Korean-Taught Programs)", options: DEPARTMENTS_KO },
  { label: "영문 과정 (English-Taught Programs)", options: DEPARTMENTS_EN },
] as const;

export const ALL_DEPARTMENTS: readonly string[] = [...DEPARTMENTS_KO, ...DEPARTMENTS_EN];
