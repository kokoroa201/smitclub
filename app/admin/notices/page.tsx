import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createNotice, updateNotice, deleteNotice } from "@/lib/actions/admin-notices";

type NoticeRow = {
  id: string;
  title: string;
  body: string | null;
  source_url: string | null;
  published_at: string;
};

type AcademicNoticeRow = {
  id: string;
  title: string;
  published_at: string;
  source_url: string | null;
};

type SyncRunRow = {
  target: string;
  status: string;
  fetched_count: number;
  error_message: string | null;
  ran_at: string;
};

const SYNC_TARGET_LABEL: Record<string, string> = {
  school_academic_notice: "학사공지",
  academic_calendar: "학사일정",
};

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

export default async function AdminNoticesPage(props: PageProps<"/admin/notices">) {
  const searchParams = await props.searchParams;
  const error = typeof searchParams.error === "string" ? searchParams.error : null;
  const success = searchParams.success === "1";
  const editId = typeof searchParams.edit === "string" ? searchParams.edit : null;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data: councilData }, { data: academicData }, { data: syncData }] = await Promise.all([
    supabase
      .from("notices")
      .select("id, title, body, source_url, published_at")
      .eq("source", "student_council")
      .order("published_at", { ascending: false })
      .returns<NoticeRow[]>(),
    supabase
      .from("notices")
      .select("id, title, published_at, source_url")
      .eq("source", "school_academic")
      .order("published_at", { ascending: false })
      .limit(5)
      .returns<AcademicNoticeRow[]>(),
    supabase
      .from("news_sync_runs")
      .select("target, status, fetched_count, error_message, ran_at")
      .order("ran_at", { ascending: false })
      .limit(20)
      .returns<SyncRunRow[]>(),
  ]);

  const councilNotices = councilData ?? [];
  const academicNotices = academicData ?? [];
  const latestSyncByTarget = new Map<string, SyncRunRow>();
  for (const run of syncData ?? []) {
    if (!latestSyncByTarget.has(run.target)) latestSyncByTarget.set(run.target, run);
  }

  const editingNotice = editId ? councilNotices.find((n) => n.id === editId) ?? null : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">공지·소식 관리</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        원우회 공지는 여기서 직접 작성·수정·삭제합니다. 학사공지·학사일정은 매일 자동으로 학교 사이트에서
        가져오며, 이 화면에서 수정·삭제할 수 없습니다.
      </p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-4 rounded-md bg-blue-soft px-3 py-2 text-sm text-blue-dark">저장되었습니다.</p>}

      <section className="mt-8">
        <h2 className="text-lg font-bold text-foreground">자동 수집 상태</h2>
        <div className="mt-3 flex flex-col gap-2">
          {["school_academic_notice", "academic_calendar"].map((target) => {
            const run = latestSyncByTarget.get(target);
            return (
              <div key={target} className="flex items-center justify-between gap-3 rounded-card border border-border bg-card p-3 text-sm">
                <div>
                  <p className="font-bold text-foreground">{SYNC_TARGET_LABEL[target]}</p>
                  {run ? (
                    <p className="text-xs text-muted-foreground">
                      {new Date(run.ran_at).toLocaleString("ko-KR")} · {run.fetched_count}건 가져옴
                      {run.error_message ? ` · ${run.error_message}` : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">아직 실행 기록이 없습니다.</p>
                  )}
                </div>
                {run && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                      run.status === "success" ? "bg-blue-soft text-blue-dark" : "bg-coral-soft text-coral-dark"
                    }`}
                  >
                    {run.status === "success" ? "정상" : "오류"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8 border-t border-border pt-8">
        <h2 className="text-lg font-bold text-foreground">{editingNotice ? "원우회 공지 수정" : "원우회 공지 작성"}</h2>
        <form
          action={editingNotice ? updateNotice.bind(null, editingNotice.id) : createNotice}
          className="mt-4 flex flex-col gap-3"
        >
          <label className="flex flex-col gap-1 text-sm">
            제목
            <input
              name="title"
              required
              defaultValue={editingNotice?.title ?? ""}
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            내용
            <textarea
              name="body"
              rows={5}
              defaultValue={editingNotice?.body ?? ""}
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              게시일
              <input
                type="date"
                name="published_at"
                required
                defaultValue={editingNotice ? toDateInputValue(editingNotice.published_at) : new Date().toISOString().slice(0, 10)}
                className="rounded-md border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              외부 링크 (선택)
              <input
                type="url"
                name="source_url"
                placeholder="https://"
                defaultValue={editingNotice?.source_url ?? ""}
                className="rounded-md border border-border px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            className="w-fit rounded-full bg-coral px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            {editingNotice ? "수정 저장" : "등록"}
          </button>
        </form>
      </section>

      <section className="mt-8 border-t border-border pt-8">
        <h2 className="text-lg font-bold text-foreground">원우회 공지 목록</h2>
        <div className="mt-3 flex flex-col gap-2">
          {councilNotices.length === 0 && <p className="text-sm text-muted-foreground">등록된 공지가 없습니다.</p>}
          {councilNotices.map((notice) => (
            <div key={notice.id} className="flex items-center justify-between gap-3 rounded-card border border-border bg-card p-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{notice.title}</p>
                <p className="text-xs text-muted-foreground">{toDateInputValue(notice.published_at)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <a
                  href={`/admin/notices?edit=${notice.id}`}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                >
                  수정
                </a>
                <form action={deleteNotice.bind(null, notice.id)}>
                  <button
                    type="submit"
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-coral-dark hover:bg-coral-soft"
                  >
                    삭제
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 border-t border-border pt-8">
        <h2 className="text-lg font-bold text-foreground">최근 학사공지 (자동 수집, 수정 불가)</h2>
        <div className="mt-3 flex flex-col gap-2">
          {academicNotices.length === 0 && (
            <p className="text-sm text-muted-foreground">아직 수집된 학사공지가 없습니다.</p>
          )}
          {academicNotices.map((notice) => (
            <div key={notice.id} className="flex items-center justify-between gap-3 rounded-card border border-border bg-card p-3">
              <p className="min-w-0 truncate text-sm text-foreground">{notice.title}</p>
              <span className="shrink-0 text-xs text-muted-foreground">{toDateInputValue(notice.published_at)}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
