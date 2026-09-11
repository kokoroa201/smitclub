"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth";
import { notify, resolveAllPresidentIds, resolveAllStudentIds } from "@/lib/notify";

const TARGET_SCOPES = ["all_students", "all_presidents", "club_president", "single_student"] as const;
type TargetScope = (typeof TARGET_SCOPES)[number];

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// super_admin이 대상을 지정해 알림을 보낸다. 이메일 주소를 직접 입력받지
// 않고 항상 화면에서 고른 실제 계정(club_id/user_id)만 대상으로 삼는다 —
// 서버에서도 그 값이 실제 존재하는 계정인지 다시 확인한다.
export async function sendBroadcastNotification(formData: FormData) {
  const admin = await requireSuperAdmin();

  const targetScope = field(formData, "target_scope") as TargetScope;
  const title = field(formData, "title");
  const body = field(formData, "body");
  const link = field(formData, "link");
  const targetClubId = field(formData, "target_club_id");
  const targetUserId = field(formData, "target_user_id");

  if (!TARGET_SCOPES.includes(targetScope)) {
    redirect(`/admin/notify?error=${encodeURIComponent("발송 대상을 선택해주세요.")}`);
  }
  if (!title) {
    redirect(`/admin/notify?error=${encodeURIComponent("제목을 입력해주세요.")}`);
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const adminDb = createAdminClient();

  if (!adminDb) {
    redirect(`/admin/notify?error=${encodeURIComponent("서버에 SUPABASE_SECRET_KEY가 설정되어 있지 않습니다.")}`);
  }

  let recipientIds: string[] = [];
  let resolvedTargetClubId: string | null = null;
  let resolvedTargetUserId: string | null = null;

  if (targetScope === "all_students") {
    recipientIds = await resolveAllStudentIds();
  } else if (targetScope === "all_presidents") {
    recipientIds = await resolveAllPresidentIds();
  } else if (targetScope === "club_president") {
    if (!targetClubId) {
      redirect(`/admin/notify?error=${encodeURIComponent("동아리를 선택해주세요.")}`);
    }
    const { data: club } = await supabase.from("clubs").select("id, president_id").eq("id", targetClubId).single();
    if (!club) {
      redirect(`/admin/notify?error=${encodeURIComponent("존재하지 않는 동아리입니다.")}`);
    }
    if (!club.president_id) {
      redirect(`/admin/notify?error=${encodeURIComponent("이 동아리는 현재 회장이 지정되어 있지 않습니다.")}`);
    }
    recipientIds = [club.president_id];
    resolvedTargetClubId = club.id;
  } else if (targetScope === "single_student") {
    if (!targetUserId) {
      redirect(`/admin/notify?error=${encodeURIComponent("학생을 선택해주세요.")}`);
    }
    const { data: student } = await adminDb
      .from("profiles")
      .select("id, role")
      .eq("id", targetUserId)
      .eq("role", "student")
      .maybeSingle();
    if (!student) {
      redirect(`/admin/notify?error=${encodeURIComponent("존재하지 않는 학생 계정입니다.")}`);
    }
    recipientIds = [student.id];
    resolvedTargetUserId = student.id;
  }

  if (recipientIds.length === 0) {
    redirect(`/admin/notify?error=${encodeURIComponent("알림을 받을 대상이 없습니다.")}`);
  }

  const { error: logError } = await supabase.from("notification_broadcasts").insert({
    sender_id: admin.id,
    title,
    body: body || null,
    link: link || null,
    target_scope: targetScope,
    target_club_id: resolvedTargetClubId,
    target_user_id: resolvedTargetUserId,
    recipient_count: recipientIds.length,
  });

  if (logError) {
    console.error("notification_broadcasts insert failed", logError);
    redirect(`/admin/notify?error=${encodeURIComponent("발송 기록 저장 중 오류가 발생했습니다.")}`);
  }

  await notify(
    recipientIds.map((recipientId) => ({
      recipientId,
      type: "admin_broadcast",
      title,
      body: body || null,
      link: link || null,
    })),
  );

  redirect("/admin/notify?success=1");
}
