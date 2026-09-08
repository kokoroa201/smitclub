"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { ALL_DEPARTMENTS } from "@/lib/constants/departments";

export type UpdateProfileState = {
  error: string | null;
  success: boolean;
};

// 학과·전공은 자유 입력이 아니라 고정 목록에서 고르므로, 값이 있다면 목록에
// 있는 값이어야 한다(비어있는 건 선택 안 함으로 허용).
function isValidDepartment(value: string): boolean {
  return value === "" || (ALL_DEPARTMENTS as readonly string[]).includes(value);
}

// 연락처는 "-" 등 구분자를 입력해도 저장 시 숫자만 남긴다.
function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export async function updateMyProfile(
  _prevState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "로그인이 필요합니다.", success: false };
  }

  const contact = digitsOnly(String(formData.get("contact") ?? "").trim());
  const department = String(formData.get("department") ?? "").trim();

  if (!isValidDepartment(department)) {
    return { error: "학과·전공은 제공된 목록에서 선택해주세요.", success: false };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // profile_private_update_own RLS(id = auth.uid())가 이미 본인 행만 수정
  // 가능하도록 막고 있지만, id는 세션에서 얻은 profile.id로만 지정해 다른
  // 사용자의 행을 대상으로 삼을 여지 자체를 없앤다.
  const { error } = await supabase
    .from("profile_private")
    .update({
      contact: contact || null,
      department: department || null,
    })
    .eq("id", profile.id);

  if (error) {
    console.error("profile_private update failed", error);
    return { error: "저장 중 오류가 발생했습니다. 다시 시도해주세요.", success: false };
  }

  return { error: null, success: true };
}
