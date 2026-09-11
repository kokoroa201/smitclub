import { createAdminClient } from "@/utils/supabase/admin";
import { isEmailConfigured, sendNotificationEmail } from "@/lib/email";

export type NotificationType =
  | "application_review_requested"
  | "application_approved"
  | "application_rejected"
  | "application_needs_revision"
  | "application_submitted"
  | "membership_applied"
  | "membership_approved"
  | "membership_rejected"
  | "admin_broadcast";

type NotifyInput = {
  recipientId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  relatedApplicationId?: string | null;
};

// 알림 행 생성 + (설정된 경우) 이메일 발송. 절대 예외를 던지지 않는다 —
// 신청/승인 같은 실제 처리는 알림 발송 성공 여부와 무관하게 항상 끝까지
// 진행되어야 한다. 다른 사용자의 이메일 주소를 조회하려면(로그인한 사람의
// RLS로는 자기 자신 것만 볼 수 있다) 서비스 롤 키가 필요해 이 파일만
// 예외적으로 관리자 클라이언트를 쓴다.
export async function notify(inputs: NotifyInput[]): Promise<void> {
  if (inputs.length === 0) return;

  const admin = createAdminClient();
  if (!admin) {
    console.error("notify: SUPABASE_SECRET_KEY가 없어 알림을 생성할 수 없습니다.");
    return;
  }

  try {
    const { error } = await admin.from("notifications").insert(
      inputs.map((n) => ({
        recipient_id: n.recipientId,
        type: n.type,
        title: n.title,
        body: n.body ?? null,
        link: n.link ?? null,
        related_application_id: n.relatedApplicationId ?? null,
      })),
    );
    if (error) {
      console.error("notify: notifications insert failed", error);
      return;
    }
  } catch (err) {
    console.error("notify: notifications insert threw", err);
    return;
  }

  if (!isEmailConfigured()) return;

  await Promise.all(
    inputs.map(async (n) => {
      try {
        const { data, error } = await admin.auth.admin.getUserById(n.recipientId);
        if (error || !data.user?.email) return;
        await sendNotificationEmail({
          to: data.user.email,
          subject: n.title,
          text: n.body ?? n.title,
          link: n.link,
        });
      } catch (err) {
        console.error("notify: email dispatch failed", err);
      }
    }),
  );
}

// 아래 조회 헬퍼들은 "역할 전체"/"모든 회장" 같은 범위를 다뤄야 해서
// 일반 로그인 클라이언트의 RLS(자기 자신만 조회 가능)로는 수행할 수 없다 —
// 관리자 알림 보내기(super_admin 전용, 앱 레벨에서 이미 권한 확인됨)에서만
// 사용한다.

export async function resolveSuperAdminIds(): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("profiles").select("id").eq("role", "super_admin");
  return (data ?? []).map((row) => row.id);
}

export async function resolveAllStudentIds(): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("profiles").select("id").eq("role", "student");
  return (data ?? []).map((row) => row.id);
}

export async function resolveAllPresidentIds(): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("clubs").select("president_id").not("president_id", "is", null);
  return [...new Set((data ?? []).map((row) => row.president_id as string))];
}
