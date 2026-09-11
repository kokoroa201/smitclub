import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

const NOTICE_SOURCE_STYLE: Record<string, { label: string; className: string }> = {
  student_council: { label: "원우회", className: "bg-purple-soft text-purple-dark" },
  school_academic: { label: "학사공지", className: "bg-blue-soft text-blue-dark" },
};

const SOURCE_FILTERS = [
  { key: "all", label: "전체" },
  { key: "council", label: "원우회" },
  { key: "academic", label: "학사공지" },
] as const;

type SourceFilter = (typeof SOURCE_FILTERS)[number]["key"];

type NoticeRow = {
  id: string;
  source: "student_council" | "school_academic";
  title: string;
  summary: string | null;
  source_url: string | null;
  published_at: string;
};

type CalendarEventRow = {
  id: string;
  title: string;
  starts_on: string;
  ends_on: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function formatEventRange(startsOn: string, endsOn: string | null): string {
  const start = new Date(`${startsOn}T00:00:00`);
  const startLabel = `${start.getMonth() + 1}.${start.getDate()}`;
  if (!endsOn || endsOn === startsOn) return startLabel;
  const end = new Date(`${endsOn}T00:00:00`);
  const endLabel = `${end.getMonth() + 1}.${end.getDate()}`;
  return `${startLabel} ~ ${endLabel}`;
}

function parseMonthParam(value: string | undefined): { year: number; month: number } {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  const now = new Date();
  if (!match) return { year: now.getFullYear(), month: now.getMonth() + 1 };
  return { year: Number(match[1]), month: Number(match[2]) };
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

export default async function NewsPage(props: PageProps<"/news">) {
  const searchParams = await props.searchParams;
  const tab = searchParams.tab === "calendar" ? "calendar" : "notice";
  const sourceParam = typeof searchParams.source === "string" ? searchParams.source : "all";
  const sourceFilter: SourceFilter = SOURCE_FILTERS.some((f) => f.key === sourceParam)
    ? (sourceParam as SourceFilter)
    : "all";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let notices: NoticeRow[] = [];
  let events: CalendarEventRow[] = [];
  let year = 0;
  let month = 0;

  if (tab === "notice") {
    let query = supabase
      .from("notices")
      .select("id, source, title, summary, source_url, published_at")
      .order("published_at", { ascending: false })
      .limit(50);

    if (sourceFilter === "council") query = query.eq("source", "student_council");
    if (sourceFilter === "academic") query = query.eq("source", "school_academic");

    const { data } = await query;
    notices = data ?? [];
  } else {
    ({ year, month } = parseMonthParam(typeof searchParams.month === "string" ? searchParams.month : undefined));
    const monthStart = `${monthKey(year, month)}-01`;
    const { year: nextYear, month: nextMonth } = shiftMonth(year, month, 1);
    const monthEnd = `${monthKey(nextYear, nextMonth)}-01`;

    const { data } = await supabase
      .from("academic_calendar_events")
      .select("id, title, starts_on, ends_on")
      .lt("starts_on", monthEnd)
      .or(`ends_on.gte.${monthStart},and(ends_on.is.null,starts_on.gte.${monthStart})`)
      .order("starts_on", { ascending: true });

    events = data ?? [];
  }

  const prev = shiftMonth(year || new Date().getFullYear(), month || new Date().getMonth() + 1, -1);
  const next = shiftMonth(year || new Date().getFullYear(), month || new Date().getMonth() + 1, 1);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      <section className="relative h-[130px] overflow-hidden rounded-lg sm:h-[220px]">
        <Image src="/img/news_hero.png" alt="" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-y-0 left-0 w-[70%] bg-gradient-to-r from-white/95 via-white/60 to-transparent sm:w-[55%] sm:from-white/90 sm:via-white/40" />
        <div className="absolute inset-0 z-10 flex max-w-[62%] flex-col justify-center px-4 py-8 sm:max-w-[46%] sm:px-8 sm:py-14">
          <h1 className="text-lg font-extrabold leading-snug text-[#16234a] sm:text-2xl lg:text-3xl">소식</h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[#2f3b5c] sm:mt-2 sm:text-base">
            학교 학사공지와 원우회 소식을 한곳에서 확인하세요.
          </p>
        </div>
      </section>

      <div className="mt-5 flex gap-2 sm:mt-6">
        <Link
          href="/news?tab=notice"
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
            tab === "notice" ? "bg-coral text-white" : "border border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          공지
        </Link>
        <Link
          href="/news?tab=calendar"
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
            tab === "calendar" ? "bg-coral text-white" : "border border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          학사일정
        </Link>
      </div>

      {tab === "notice" ? (
        <>
          <div className="mt-4 flex gap-2">
            {SOURCE_FILTERS.map((f) => (
              <Link
                key={f.key}
                href={`/news?tab=notice&source=${f.key}`}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                  sourceFilter === f.key ? "bg-navy text-white" : "border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {notices.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">등록된 공지가 없습니다.</p>
            )}
            {notices.map((notice) => {
              const style = NOTICE_SOURCE_STYLE[notice.source];
              const isAcademic = notice.source === "school_academic";
              return (
                <div key={notice.id} className="rounded-xl border border-border bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${style.className}`}>
                      {style.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(notice.published_at)}</span>
                  </div>
                  <p className="mt-2 font-bold text-foreground">{notice.title}</p>
                  {notice.summary && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{notice.summary}</p>
                  )}
                  <div className="mt-2">
                    {isAcademic ? (
                      notice.source_url && (
                        <a
                          href={notice.source_url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-sm font-semibold text-coral-dark hover:underline"
                        >
                          원문 보기 →
                        </a>
                      )
                    ) : (
                      <Link href={`/news/${notice.id}`} className="text-sm font-semibold text-coral-dark hover:underline">
                        자세히 보기 →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between">
            <Link
              href={`/news?tab=calendar&month=${monthKey(prev.year, prev.month)}`}
              className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
            >
              ← 이전 달
            </Link>
            <p className="font-bold text-foreground">
              {year || new Date().getFullYear()}년 {month || new Date().getMonth() + 1}월
            </p>
            <Link
              href={`/news?tab=calendar&month=${monthKey(next.year, next.month)}`}
              className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
            >
              다음 달 →
            </Link>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {events.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">등록된 학사일정이 없습니다.</p>
            )}
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3 rounded-xl border border-border bg-white p-4">
                <span className="shrink-0 rounded-full bg-blue-soft px-2.5 py-1 text-xs font-bold text-blue-dark">
                  {formatEventRange(event.starts_on, event.ends_on)}
                </span>
                <p className="text-sm text-foreground">{event.title}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
