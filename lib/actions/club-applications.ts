"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { MIN_FOUNDERS, MIN_CURRENT_STUDENT_RATIO } from "@/lib/constants/club-application-rules";

export type SubmitClubApplicationState = {
  error: string | null;
  success: boolean;
};

type FounderInput = {
  name: string;
  studentId: string;
  isCurrentStudent: boolean;
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
    if (field === "contact") entry.contact = String(formData.get(key) ?? "").trim();

    founders.set(index, entry);
  }

  return Array.from(founders.entries())
    .sort(([a], [b]) => a - b)
    .map(([, f]) => ({
      name: f.name ?? "",
      studentId: f.studentId ?? "",
      isCurrentStudent: f.isCurrentStudent ?? false,
      contact: f.contact ?? "",
    }))
    .filter((f) => f.name.length > 0);
}

export async function submitClubApplication(
  _prevState: SubmitClubApplicationState,
  formData: FormData,
): Promise<SubmitClubApplicationState> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "로그인이 필요합니다.", success: false };
  }

  const clubName = String(formData.get("club_name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const purpose = String(formData.get("purpose") ?? "").trim();
  const activityPlan = String(formData.get("activity_plan") ?? "").trim();
  const meetingDay = String(formData.get("meeting_day") ?? "").trim();
  const meetingTime = String(formData.get("meeting_time") ?? "").trim();
  const meetingLocation = String(formData.get("meeting_location") ?? "").trim();
  const agreeRules = formData.get("agree_rules") === "on";
  const founders = parseFounders(formData);

  if (!clubName || !category || !purpose || !activityPlan) {
    return { error: "동아리명, 카테고리, 목적, 활동계획은 필수입니다.", success: false };
  }

  if (!agreeRules) {
    return { error: "준수사항에 동의해야 신청할 수 있습니다.", success: false };
  }

  if (founders.length < MIN_FOUNDERS) {
    return {
      error: `창립회원은 최소 ${MIN_FOUNDERS}명 이상이어야 합니다. (현재 ${founders.length}명)`,
      success: false,
    };
  }

  const currentStudentCount = founders.filter((f) => f.isCurrentStudent).length;
  const ratio = currentStudentCount / founders.length;
  if (ratio < MIN_CURRENT_STUDENT_RATIO) {
    return {
      error: `재학생 비율이 ${Math.round(MIN_CURRENT_STUDENT_RATIO * 100)}% 이상이어야 합니다. (현재 ${Math.round(ratio * 100)}%)`,
      success: false,
    };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: application, error: insertError } = await supabase
    .from("club_applications")
    .insert({
      applicant_id: profile.id,
      club_name: clubName,
      category,
      purpose,
      activity_plan: activityPlan,
      meeting_day: meetingDay || null,
      meeting_time: meetingTime || null,
      meeting_location: meetingLocation || null,
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
    founders.map((f) => ({
      application_id: application.id,
      name: f.name,
      student_id: f.studentId || null,
      is_current_student: f.isCurrentStudent,
      contact: f.contact || null,
    })),
  );

  if (foundersError) {
    return {
      error: "창립회원 명단 저장 중 오류가 발생했습니다. 다시 시도해주세요.",
      success: false,
    };
  }

  return { error: null, success: true };
}
