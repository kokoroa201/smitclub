"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// 회장이 직접 고칠 수 있는 항목만 받는다(소개·대표사진·활동·SNS·모집글).
// 이 클라이언트는 로그인 세션 기준 RLS를 그대로 따르므로, clubs_update_admin_
// or_president 정책(자기 동아리만) + clubs_admin_fields_guard 트리거(이
// 컬럼들 외에는 변경 불가)가 이중으로 막아준다 — 여기서 clubId를 다른
// 동아리로 바꿔 호출해도 DB가 거부한다.
export async function updateMyClub(clubId: string, formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: club } = await supabase.from("clubs").select("id, president_id").eq("id", clubId).single();

  if (!club || club.president_id !== profile.id) {
    redirect(`/my/club?error=${encodeURIComponent("본인이 회장으로 등록된 동아리만 수정할 수 있습니다.")}`);
  }

  const description = field(formData, "description");
  const coverImageUrl = field(formData, "cover_image_url");
  const meetingDay = field(formData, "meeting_day");
  const meetingTime = field(formData, "meeting_time");
  const meetingLocation = field(formData, "meeting_location");
  const snsUrl = field(formData, "sns_url");
  const recruitingPost = field(formData, "recruiting_post");

  const { error } = await supabase
    .from("clubs")
    .update({
      description: description || null,
      cover_image_url: coverImageUrl || null,
      meeting_day: meetingDay || null,
      meeting_time: meetingTime || null,
      meeting_location: meetingLocation || null,
      sns_url: snsUrl || null,
      recruiting_post: recruitingPost || null,
    })
    .eq("id", clubId);

  if (error) {
    console.error("clubs update failed", error);
    redirect(`/my/club?error=${encodeURIComponent("동아리 정보 저장 중 오류가 발생했습니다.")}`);
  }

  redirect("/my/club?success=1");
}
