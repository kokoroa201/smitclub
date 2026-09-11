import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { sendBroadcastNotification } from "@/lib/actions/admin-notify";

const TARGET_SCOPE_LABEL: Record<string, string> = {
  all_students: "전체 학생",
  all_presidents: "현재 동아리 회장 전체",
  club_president: "특정 동아리의 현재 회장",
  single_student: "특정 학생 1명",
};

type ClubOption = { id: string; name: string; slug: string };
type StudentOption = { id: string; name: string };

type BroadcastRow = {
  id: string;
  title: string;
  target_scope: string;
  recipient_count: number;
  created_at: string;
  sender: { name: string } | null;
  target_club: { name: string } | null;
  target_user: { name: string } | null;
};

export default async function AdminNotifyPage(props: PageProps<"/admin/notify">) {
  const searchParams = await props.searchParams;
  const error = typeof searchParams.error === "string" ? searchParams.error : null;
  const success = searchParams.success === "1";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data: clubsData }, { data: studentsData }, { data: broadcastsData }] = await Promise.all([
    supabase.from("clubs").select("id, name, slug").order("name"),
    supabase.from("profiles").select("id, name").eq("role", "student").order("name"),
    supabase
      .from("notification_broadcasts")
      .select(
        "id, title, target_scope, recipient_count, created_at, sender:profiles!notification_broadcasts_sender_id_fkey(name), target_club:clubs(name), target_user:profiles!notification_broadcasts_target_user_id_fkey(name)",
      )
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<BroadcastRow[]>(),
  ]);

  const clubs = (clubsData ?? []) as ClubOption[];
  const students = (studentsData ?? []) as StudentOption[];
  const broadcasts = broadcastsData ?? [];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">알림 보내기</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        선택한 대상에게 사이트 알림(종 아이콘)을 보냅니다. 이메일 설정이 완료된 경우 같은 내용의 이메일도 함께
        발송됩니다.
      </p>
      <p className="mt-1 rounded-md bg-yellow-soft px-3 py-2 text-xs text-yellow-dark">
        개인정보·비밀번호·민감한 신청 내용은 알림 본문에 포함하지 마세요.
      </p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {success && (
        <p className="mt-4 rounded-md bg-blue-soft px-3 py-2 text-sm text-blue-dark">알림을 발송했습니다.</p>
      )}

      <form action={sendBroadcastNotification} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          발송 대상
          <select
            name="target_scope"
            defaultValue="all_students"
            className="rounded-md border border-border px-3 py-2 text-sm"
          >
            {Object.entries(TARGET_SCOPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          동아리 선택 <span className="text-xs text-muted-foreground">(&ldquo;특정 동아리의 현재 회장&rdquo;을 선택했을 때만 사용됩니다)</span>
          <select name="target_club_id" defaultValue="" className="rounded-md border border-border px-3 py-2 text-sm">
            <option value="">동아리 선택 안 함</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name} ({club.slug})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          학생 선택 <span className="text-xs text-muted-foreground">(&ldquo;특정 학생 1명&rdquo;을 선택했을 때만 사용됩니다)</span>
          <select name="target_user_id" defaultValue="" className="rounded-md border border-border px-3 py-2 text-sm">
            <option value="">학생 선택 안 함</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          제목
          <input name="title" required className="rounded-md border border-border px-3 py-2 text-sm" />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          내용 (선택)
          <textarea name="body" rows={4} className="rounded-md border border-border px-3 py-2 text-sm" />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          관련 페이지 링크 (선택)
          <input name="link" placeholder="/clubs/suda" className="rounded-md border border-border px-3 py-2 text-sm" />
        </label>

        <button
          type="submit"
          className="w-fit rounded-full bg-coral px-4 py-2.5 font-bold text-white transition-opacity hover:opacity-90"
        >
          알림 보내기
        </button>
      </form>

      <section className="mt-10 border-t border-border pt-6">
        <h2 className="text-lg font-bold text-foreground">최근 발송 내역</h2>
        {broadcasts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">발송한 알림이 없습니다.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {broadcasts.map((b) => (
              <div key={b.id} className="rounded-card border border-border bg-card p-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold text-foreground">{b.title}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(b.created_at).toLocaleString("ko-KR")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {b.sender?.name ?? "알 수 없음"} 발송 · {TARGET_SCOPE_LABEL[b.target_scope] ?? b.target_scope}
                  {b.target_club?.name ? ` (${b.target_club.name})` : ""}
                  {b.target_user?.name ? ` (${b.target_user.name})` : ""} · 수신 {b.recipient_count}명
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
