import {
  MIN_FOUNDERS,
  MIN_KOREAN_FOUNDERS,
  MIN_INTERNATIONAL_FOUNDERS,
} from "@/lib/constants/club-application-rules";

// 지도교수 확인(advisor_confirmed)은 이 1차 검토 게이트에 포함되지 않는다 —
// 신청 제출 시 지도교수 정보를 함께 받고, 원우회·교학처가 학교 이메일 회신으로
// 별도 확인한다. 다만 확인이 끝나야 원우회의 학교 승인 추천으로 넘어갈 수
// 있다(app/admin/club-applications/[id]/page.tsx 참고).
export const MANUAL_CHECKLIST_ITEMS = [
  { key: "rules_doc_confirmed", label: "동아리 운영규정·표준 회칙 부합 확인" },
] as const;

export type ManualChecklistKey = (typeof MANUAL_CHECKLIST_ITEMS)[number]["key"];

export type EligibilityInput = {
  agreeRules: boolean;
  founderCount: number;
  koreanCount: number;
  internationalCount: number;
  hasTreasurer: boolean;
  checklist: Record<string, boolean>;
};

export type EligibilityResult = {
  autoChecks: { label: string; passed: boolean; detail: string }[];
  manualChecks: { key: ManualChecklistKey; label: string; checked: boolean }[];
  allPassed: boolean;
};

// 서울미디어대학원대학교 동아리 운영규정 제13조(등록요건) 기준 자동 확인.
// (지도교수 확인은 별도 단계로 분리되어 여기서는 다루지 않는다 —
// app/admin/club-applications/[id]/page.tsx의 "지도교수 확인"/"학교 승인
// 추천" 섹션 참고.)
export function evaluateEligibility(input: EligibilityInput): EligibilityResult {
  const autoChecks = [
    {
      label: "회칙 동의",
      passed: input.agreeRules,
      detail: input.agreeRules ? "동의함" : "미동의",
    },
    {
      label: `회원 수 (최소 ${MIN_FOUNDERS}명)`,
      passed: input.founderCount >= MIN_FOUNDERS,
      detail: `${input.founderCount}명`,
    },
    {
      label: `한국인 회원 (최소 ${MIN_KOREAN_FOUNDERS}명)`,
      passed: input.koreanCount >= MIN_KOREAN_FOUNDERS,
      detail: `${input.koreanCount}명`,
    },
    {
      label: `외국인 회원 (최소 ${MIN_INTERNATIONAL_FOUNDERS}명)`,
      passed: input.internationalCount >= MIN_INTERNATIONAL_FOUNDERS,
      detail: `${input.internationalCount}명`,
    },
    {
      label: "총무 선임",
      passed: input.hasTreasurer,
      detail: input.hasTreasurer ? "선임됨" : "미선임",
    },
  ];

  const manualChecks = MANUAL_CHECKLIST_ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    checked: Boolean(input.checklist[item.key]),
  }));

  const allPassed = autoChecks.every((c) => c.passed) && manualChecks.every((c) => c.checked);

  return { autoChecks, manualChecks, allPassed };
}
