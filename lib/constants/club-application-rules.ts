// 서울미디어대학원대학교 동아리 운영규정 제13조(등록요건) 기준.
// 예전에 있던 "재학생 비율 60% 이상" 게이트는 실제 규정 어디에도 없는
// 임의 조건이라 제거했다 — 규정은 국적 구성만 요구한다.
export const MIN_FOUNDERS = 5;
export const MIN_KOREAN_FOUNDERS = 1;
export const MIN_INTERNATIONAL_FOUNDERS = 1;

export const REGISTRATION_CATEGORIES = ["학술", "문화·예술", "체육·취미", "국제교류", "기타"] as const;

// 서식3 활동계획서 "월별 활동 계획" 12칸.
export const APPLICATION_MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1));

// 동아리 개설 절차 안내(5단계) — 온라인 신청으로 전환하면서 별도 "서식 작성"
// 단계 없이 온라인 신청서 제출로 서식 내용을 대체한다. 공개 안내 페이지인
// /club-rules 맨 위에서 펼쳐진 상태로 보여준다.
export const APPLICATION_STEPS = [
  {
    title: "아이디어 구체화",
    description: "동아리의 목적·활동 분야·구성원 계획을 세웁니다.",
  },
  {
    title: "온라인 신청",
    description: "신청 폼을 작성해 제출합니다. 최소 5인 이상, 한국인·외국인 각 1인 이상이 필요합니다.",
  },
  {
    title: "원우회 검토",
    description: "원우회가 신청서를 검토하고 지도교수 확인을 진행합니다.",
  },
  {
    title: "교학팀 협의",
    description: "원우회와 교학팀이 최종 협의하여 동아리 등록을 확정합니다.",
  },
  {
    title: "최종 승인 및 활동 시작",
    description: "승인 후 동아리 등록을 마치고 공식 활동을 시작합니다.",
  },
] as const;

// 신청 자격 — MIN_FOUNDERS 등 위 상수와 어긋나지 않도록 문구에 실제 숫자를
// 그대로 반영한다("한국 포함 3개국 이상" 같은 예전 포털 문구는 실제 등록요건
// 어디에도 없어 재사용하지 않는다).
export const ELIGIBILITY_ITEMS = [
  `재학 중인 원우 ${MIN_FOUNDERS}인 이상 (한국인 ${MIN_KOREAN_FOUNDERS}인 이상·외국인 ${MIN_INTERNATIONAL_FOUNDERS}인 이상 포함)`,
  "동아리 목적과 활동 계획 수립",
  "지도교수 사전 동의",
] as const;

// 처리 일정 — 원우회 검토·교학팀 협의 소요 기간은 참고용 예상치다.
export const PROCESSING_TIMELINE = [
  { label: "원우회 검토", value: "약 3~5일" },
  { label: "교학팀 협의", value: "약 5~7일" },
  { label: "최종 승인 통보", value: "안내 알림·이메일" },
] as const;
