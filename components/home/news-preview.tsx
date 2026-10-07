import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getDictionary, type Locale } from "@/lib/i18n";
import { newsTitle } from "@/lib/news-sync/presentation";

const SOURCE_CLASS: Record<string, string> = {
  student_council: "bg-purple-soft text-purple-dark",
  school_academic: "bg-blue-soft text-blue-dark",
};

type NoticePreview = { id: string; source: string; title: string; title_en: string | null; title_en_source: string | null; published_at: string };
type EventPreview = { id: string; title: string; starts_on: string; ends_on: string | null };

function formatEventRange(startsOn: string, endsOn: string | null): string {
  const start = new Date(`${startsOn}T00:00:00`);
  const startLabel = `${start.getMonth() + 1}.${start.getDate()}`;
  if (!endsOn || endsOn === startsOn) return startLabel;
  const end = new Date(`${endsOn}T00:00:00`);
  return `${startLabel} ~ ${end.getMonth() + 1}.${end.getDate()}`;
}

// 홈의 "소식" 미리보기 — 최근 공지 3개 + 이번 달 가까운 학사일정 3개.
// 실제 notices/academic_calendar_events 테이블을 직접 조회한다(과거
// SchoolNews의 mock 데이터를 대체).
export async function NewsPreview({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).newsPreview;
  const sourceLabels: Record<string, string> = t.source;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const todayStr = now.toISOString().slice(0, 10);

  const [{ data: noticesData, error: noticesError }, { data: eventsData }] = await Promise.all([
    supabase
      .from("notices")
      .select("id, source, title, title_en, title_en_source, published_at")
      .in("source", ["student_council", "school_academic"])
      .order("published_at", { ascending: false })
      .limit(3)
      .returns<NoticePreview[]>(),
    supabase
      .from("academic_calendar_events")
      .select("id, title, starts_on, ends_on")
      .gte("starts_on", monthStart <= todayStr ? todayStr : monthStart)
      .order("starts_on", { ascending: true })
      .limit(3)
      .returns<EventPreview[]>(),
  ]);

  const notices = noticesData ?? [];
  const events = eventsData ?? [];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:py-8">
      <div className="flex items-end justify-between">
        <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl lg:text-2xl">{t.title}</h2>
        <Link href="/news" className="text-xs font-semibold text-muted-foreground hover:text-foreground sm:text-sm">
          {t.viewAll}
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-5 sm:mt-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-muted-foreground">{t.recentNotices}</h3>
          {notices.length === 0 ? (
            <p className="rounded-xl border border-border bg-white p-4 text-sm text-muted-foreground">
              {noticesError ? getDictionary(locale).newsPage.loadError : t.noNotices}
            </p>
          ) : (
            notices.map((notice) => {
              const style = {
                label: sourceLabels[notice.source] ?? notice.source,
                className: SOURCE_CLASS[notice.source] ?? "bg-muted text-muted-foreground",
              };
              return (
                <Link
                  key={notice.id}
                  href={notice.source === "student_council" ? `/news/${notice.id}` : "/news"}
                  className="flex items-center gap-2 rounded-xl border border-border bg-white p-3 hover:bg-muted/40"
                >
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${style.className}`}>
                    {style.label}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{newsTitle(notice, locale)}</span>
                </Link>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-muted-foreground">{t.thisMonthCalendar}</h3>
          {events.length === 0 ? (
            <p className="rounded-xl border border-border bg-white p-4 text-sm text-muted-foreground">
              {t.noCalendar}
            </p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="flex items-center gap-2 rounded-xl border border-border bg-white p-3">
                <span className="shrink-0 rounded-full bg-blue-soft px-2 py-0.5 text-[10px] font-bold text-blue-dark">
                  {formatEventRange(event.starts_on, event.ends_on)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{event.title}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
