import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";

const TYPE_LABEL: Record<string, string> = {
  application_review_requested: "검토 요청",
  application_approved: "승인 완료",
  application_rejected: "반려",
  application_needs_revision: "보완 요청",
  application_submitted: "개설 신청 접수",
  membership_applied: "가입 신청",
  membership_approved: "가입 승인",
  membership_rejected: "가입 거절",
  admin_broadcast: "공지",
};

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export default async function NotificationsPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("recipient_id", profile.id)
    .order("created_at", { ascending: false });

  const notifications = (data ?? []) as NotificationRow[];
  const hasUnread = notifications.some((n) => !n.read_at);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">알림</h1>
        {hasUnread && (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="text-sm font-medium text-coral hover:underline">
              모두 읽음 처리
            </button>
          </form>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {notifications.length === 0 && (
          <p className="text-sm text-muted-foreground">받은 알림이 없습니다.</p>
        )}
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`rounded-card border p-4 ${
              notification.read_at ? "border-border bg-card" : "border-coral/40 bg-coral-soft/40"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                {TYPE_LABEL[notification.type] ?? notification.type}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(notification.created_at).toLocaleString("ko-KR")}
              </span>
            </div>
            <p className="mt-2 font-bold text-foreground">{notification.title}</p>
            {notification.body && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{notification.body}</p>
            )}
            <div className="mt-3 flex items-center gap-3">
              {notification.link && (
                <Link href={notification.link} className="text-sm font-bold text-coral hover:underline">
                  바로 가기
                </Link>
              )}
              {!notification.read_at && (
                <form action={markNotificationRead.bind(null, notification.id)}>
                  <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
                    읽음 처리
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
