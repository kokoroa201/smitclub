"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import {
  MIN_FOUNDERS,
  MIN_KOREAN_FOUNDERS,
  MIN_INTERNATIONAL_FOUNDERS,
  REGISTRATION_CATEGORIES,
  APPLICATION_MONTHS,
} from "@/lib/constants/club-application-rules";

export type SubmitClubApplicationState = {
  error: string | null;
  success: boolean;
};

type FounderInput = {
  name: string;
  studentId: string;
  isCurrentStudent: boolean;
  nationality: "domestic" | "international";
  contact: string;
};

function parseFounders(formData: FormData): FounderInput[] {
  const founders = new Map<number, Partial<FounderInput>>();
  const pattern = /^founders\[(\d+)\]\[(\w+)\]$/;

  for (const key of formData.keys()) {
    const match = key.match(pattern);
    if (!match) continue;
    const index = Number(match[1]);
    const field = match[2];
    const entry = founders.get(index) ?? {};

    if (field === "name") entry.name = String(formData.get(key) ?? "").trim();
    if (field === "student_id") entry.studentId = String(formData.get(key) ?? "").trim();
    if (field === "is_current_student") entry.isCurrentStudent = formData.get(key) === "on";
    if (field === "nationality") {
      entry.nationality = formData.get(key) === "international" ? "international" : "domestic";
    }
    if (field === "contact") entry.contact = digitsOnly(String(formData.get(key) ?? "").trim());

    founders.set(index, entry);
  }

  return Array.from(founders.entries())
    .sort(([a], [b]) => a - b)
    .map(([, f]) => ({
      name: f.name ?? "",
      studentId: f.studentId ?? "",
      isCurrentStudent: f.isCurrentStudent ?? false,
      nationality: f.nationality ?? "domestic",
      contact: f.contact ?? "",
    }))
    .filter((f) => f.name.length > 0);
}

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// 연락처는 "-" 등 구분자를 입력해도 저장 시 숫자만 남긴다.
function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export async function submitClubApplication(
  _prevState: SubmitClubApplicationState,
  formData: FormData,
): Promise<SubmitClubApplicationState> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "로그인이 필요합니다.", success: false };
  }

  const clubName = field(formData, "club_name");
  const clubNameEn = field(formData, "club_name_en");
  const category = field(formData, "category");
  const registrationCategory = field(formData, "registration_category");
  const language = field(formData, "language");
  const establishedAt = field(formData, "established_at");
  const purpose = field(formData, "purpose");
  const activityPlan = field(formData, "activity_plan");
  const meetingDay = field(formData, "meeting_day");
  const meetingTime = field(formData, "meeting_time");
  const meetingLocation = field(formData, "meeting_location");

  const presidentDepartment = field(formData, "president_department");
  const presidentStudentId = field(formData, "president_student_id");
  const presidentContact = digitsOnly(field(formData, "president_contact"));
  const presidentNationalityRaw = field(formData, "president_nationality");

  const treasurerName = field(formData, "treasurer_name");
  const treasurerNameEn = field(formData, "treasurer_name_en");
  const treasurerDepartment = field(formData, "treasurer_department");
  const treasurerStudentId = field(formData, "treasurer_student_id");
  const treasurerContact = digitsOnly(field(formData, "treasurer_contact"));
  const treasurerNationalityRaw = field(formData, "treasurer_nationality");
  const treasurerIsCurrentStudent = formData.get("treasurer_is_current_student") === "on";
  const treasurerSameAsPresident = formData.get("treasurer_same_as_president") === "on";

  const hasVicePresident = formData.get("has_vice_president") === "on";
  const vicePresidentName = field(formData, "vice_president_name");
  const vicePresidentNameEn = field(formData, "vice_president_name_en");
  const vicePresidentDepartment = field(formData, "vice_president_department");
  const vicePresidentStudentId = field(formData, "vice_president_student_id");
  const vicePresidentContact = digitsOnly(field(formData, "vice_president_contact"));

  const membershipApprovalDaysRaw = field(formData, "membership_approval_days");
  const meetingFrequency = field(formData, "meeting_frequency");

  const hasMembershipFee = formData.get("has_membership_fee") === "on";
  const membershipFeeAmountRaw = field(formData, "membership_fee_amount");
  const membershipFeeCycle = field(formData, "membership_fee_cycle");

  const monthlyActivities = Object.fromEntries(
    APPLICATION_MONTHS.map((month) => [month, field(formData, `monthly_activity[${month}]`)]).filter(
      ([, value]) => value.length > 0,
    ),
  );

  const agreeRules = formData.get("agree_rules") === "on";
  const founders = parseFounders(formData);

  if (!clubName || !category || !purpose || !activityPlan) {
    return { error: "동아리명, 카테고리, 목적, 활동계획은 필수입니다.", success: false };
  }

  if (!REGISTRATION_CATEGORIES.includes(registrationCategory as (typeof REGISTRATION_CATEGORIES)[number])) {
    return { error: "동아리 구분(운영규정 기준 분류)을 선택해주세요.", success: false };
  }

  if (language !== "ko" && language !== "en" && language !== "mixed") {
    return { error: "사용 언어를 선택해주세요.", success: false };
  }

  if (!establishedAt) {
    return { error: "설립일을 입력해주세요.", success: false };
  }

  if (!presidentContact) {
    return { error: "회장(대표자) 연락처를 입력해주세요.", success: false };
  }

  if (presidentNationalityRaw !== "domestic" && presidentNationalityRaw !== "international") {
    return { error: "회장 국적을 선택해주세요.", success: false };
  }
  const presidentNationality = presidentNationalityRaw;

  if (!treasurerName || !treasurerContact) {
    return { error: "총무 정보(성명, 연락처)를 입력해주세요.", success: false };
  }

  if (treasurerNationalityRaw !== "domestic" && treasurerNationalityRaw !== "international") {
    return { error: "총무 국적을 선택해주세요.", success: false };
  }
  const treasurerNationality = treasurerNationalityRaw;

  if (hasVicePresident && !vicePresidentName) {
    return { error: "부회장을 두는 경우 성명을 입력해주세요.", success: false };
  }

  const membershipApprovalDays = Number(membershipApprovalDaysRaw);
  if (!membershipApprovalDaysRaw || !Number.isInteger(membershipApprovalDays) || membershipApprovalDays <= 0) {
    return { error: "회원 가입 승인 처리 기한(일)을 입력해주세요.", success: false };
  }

  if (!meetingFrequency) {
    return { error: "정기 모임 빈도를 입력해주세요.", success: false };
  }

  let membershipFeeAmount: number | null = null;
  if (hasMembershipFee) {
    membershipFeeAmount = Number(membershipFeeAmountRaw);
    if (!membershipFeeAmountRaw || !Number.isInteger(membershipFeeAmount) || membershipFeeAmount <= 0 || !membershipFeeCycle) {
      return { error: "회비를 받는 경우 금액과 납부 주기를 입력해주세요.", success: false };
    }
  }

  if (!agreeRules) {
    return { error: "준수사항에 동의해야 신청할 수 있습니다.", success: false };
  }

  // 회장·총무는 회원 명단에 자동 포함된다(중복 방지를 위해 총무가 회장과
  // 동일 인물이면 한 번만 카운트). 나머지 "추가 회원" 입력분과 합쳐 실제
  // 사람 수 기준으로 등록요건(5인 이상, 한국인/외국인 각 1인 이상)을 판단한다.
  const presidentFounder: FounderInput = {
    name: profile.name,
    studentId: presidentStudentId,
    isCurrentStudent: true,
    nationality: presidentNationality,
    contact: presidentContact,
  };

  const treasurerFounder: FounderInput | null = treasurerSameAsPresident
    ? null
    : {
        name: treasurerName,
        studentId: treasurerStudentId,
        isCurrentStudent: treasurerIsCurrentStudent,
        nationality: treasurerNationality,
        contact: treasurerContact,
      };

  const allFounders = [presidentFounder, ...(treasurerFounder ? [treasurerFounder] : []), ...founders];

  if (allFounders.length < MIN_FOUNDERS) {
    return {
      error: `회원은 최소 ${MIN_FOUNDERS}명 이상이어야 합니다. (현재 ${allFounders.length}명)`,
      success: false,
    };
  }

  const koreanCount = allFounders.filter((f) => f.nationality === "domestic").length;
  const internationalCount = allFounders.filter((f) => f.nationality === "international").length;

  if (koreanCount < MIN_KOREAN_FOUNDERS) {
    return { error: "한국인 회원이 1명 이상 포함되어야 합니다.", success: false };
  }

  if (internationalCount < MIN_INTERNATIONAL_FOUNDERS) {
    return { error: "외국인 회원이 1명 이상 포함되어야 합니다.", success: false };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: application, error: insertError } = await supabase
    .from("club_applications")
    .insert({
      applicant_id: profile.id,
      club_name: clubName,
      club_name_en: clubNameEn || null,
      category,
      registration_category: registrationCategory,
      language,
      established_at: establishedAt,
      purpose,
      activity_plan: activityPlan,
      monthly_activities: monthlyActivities,
      meeting_day: meetingDay || null,
      meeting_time: meetingTime || null,
      meeting_location: meetingLocation || null,
      president_department: presidentDepartment || null,
      president_student_id: presidentStudentId || null,
      president_contact: presidentContact,
      treasurer_name: treasurerName,
      treasurer_name_en: treasurerNameEn || null,
      treasurer_department: treasurerDepartment || null,
      treasurer_student_id: treasurerStudentId || null,
      treasurer_contact: treasurerContact,
      vice_president_name: hasVicePresident ? vicePresidentName : null,
      vice_president_name_en: hasVicePresident ? vicePresidentNameEn || null : null,
      vice_president_department: hasVicePresident ? vicePresidentDepartment || null : null,
      vice_president_student_id: hasVicePresident ? vicePresidentStudentId || null : null,
      vice_president_contact: hasVicePresident ? vicePresidentContact || null : null,
      membership_approval_days: membershipApprovalDays,
      meeting_frequency: meetingFrequency,
      has_membership_fee: hasMembershipFee,
      membership_fee_amount: membershipFeeAmount,
      membership_fee_cycle: hasMembershipFee ? membershipFeeCycle : null,
      agree_rules: agreeRules,
      status: "submitted",
      validation_passed: true,
    })
    .select("id")
    .single();

  if (insertError || !application) {
    return { error: "신청서 저장 중 오류가 발생했습니다. 다시 시도해주세요.", success: false };
  }

  const { error: foundersError } = await supabase.from("club_application_founders").insert(
    allFounders.map((f) => ({
      application_id: application.id,
      name: f.name,
      student_id: f.studentId || null,
      is_current_student: f.isCurrentStudent,
      nationality: f.nationality,
      contact: f.contact || null,
    })),
  );

  if (foundersError) {
    return {
      error: "회원 명단 저장 중 오류가 발생했습니다. 다시 시도해주세요.",
      success: false,
    };
  }

  return { error: null, success: true };
}
