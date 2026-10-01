import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/format";

const NOTICE_SOURCE_STYLE = {
  student_council: "bg-purple-soft text-purple-dark",
  school_academic: "bg-blue-soft text-blue-dark",
};

const SOURCE_FILTERS = ["all", "council", "academic"] as const;

type SourceFilter = (typeof SOURCE_FILTERS)[number];

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

function formatEventRange(startsOn: string, endsOn: string | null, locale: Locale): string {
  const start = new Date(`${startsOn}T00:00:00`);
  const startLabel = locale === "en"
    ? formatDate(start, locale, { month: "short", day: "numeric" })
    : `${start.getMonth() + 1}.${start.getDate()}`;
  if (!endsOn || endsOn === startsOn) return startLabel;
  const end = new Date(`${endsOn}T00:00:00`);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const endLabel = locale === "en"
    ? formatDate(end, locale, { month: sameMonth ? undefined : "short", day: "numeric" })
    : `${end.getMonth() + 1}.${end.getDate()}`;
  return locale === "en" ? `${startLabel}–${endLabel}` : `${startLabel} ~ ${endLabel}`;
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
  const locale = await getLocale();
  const t = getDictionary(locale);
  const sourceLabels = { all: t.clubsPage.tabs.all, council: t.newsPreview.source.student_council, academic: t.newsPreview.source.school_academic };
  const tab = searchParams.tab === "calendar" ? "calendar" : "notice";
  const sourceParam = typeof searchParams.source === "string" ? searchParams.source : "all";
  const sourceFilter: SourceFilter = SOURCE_FILTERS.some((f) => f === sourceParam)
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
          <h1 className="text-lg font-extrabold leading-snug text-[#16234a] sm:text-2xl lg:text-3xl">{t.nav.news}</h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[#2f3b5c] sm:mt-2 sm:text-base">
            {t.newsPage.intro}
          </p>
        </div>
      </section>

      <div className="mt-4 flex gap-2 sm:mt-6">
        <Link
          href="/news?tab=notice"
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
            tab === "notice" ? "bg-coral text-white" : "border border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          {t.newsPage.notices}
        </Link>
        <Link
          href="/news?tab=calendar"
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
            tab === "calendar" ? "bg-coral text-white" : "border border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          {t.newsPage.calendar}
        </Link>
      </div>

      {tab === "notice" ? (
        <>
          <div className="mt-3 flex gap-2 sm:mt-4">
            {SOURCE_FILTERS.map((f) => (
              <Link
                key={f}
                href={`/news?tab=notice&source=${f}`}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                  sourceFilter === f ? "bg-navy text-white" : "border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {sourceLabels[f]}
              </Link>
            ))}
          </div>

          {/* 모바일은 한 화면에 더 많이 훑어볼 수 있는 compact list — 제목은
              크기 대신 굵기로 위계를 주고 2줄까지만, 요약은 1줄. sm: 이상과
              큰 글씨 모드(in-data-[font-size=large])는 기존 카드 크기 그대로. */}
          <div className="mt-3 flex flex-col gap-1.5 sm:mt-4 sm:gap-2 in-data-[font-size=large]:gap-2">
            {notices.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">{t.newsPreview.noNotices}</p>
            )}
            {notices.map((notice) => {
              const style = NOTICE_SOURCE_STYLE[notice.source];
              const isAcademic = notice.source === "school_academic";
              // 같은 링크를 모바일(날짜 줄 오른쪽)과 sm:/큰 글씨 모드(아래 별도
              // 행) 두 곳에 그린다 — 목적지·동작이 어긋나지 않도록 한 곳에서 만든다.
              const renderLink = (className: string) =>
                isAcademic ? (
                  notice.source_url && (
                    <a href={notice.source_url} target="_blank" rel="noopener noreferrer nofollow" className={className}>
                      {t.newsPage.viewOriginal}
                    </a>
                  )
                ) : (
                  <Link href={`/news/${notice.id}`} className={className}>
                    {t.newsPage.viewDetails}
                  </Link>
                );
              return (
                <div
                  key={notice.id}
                  className="rounded-xl border border-border bg-white px-4 py-2.5 sm:p-4 in-data-[font-size=large]:p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${style}`}>
                      {t.newsPreview.source[notice.source]}
                    </span>
                    <span className="text-[0.6875rem] text-muted-foreground sm:text-xs in-data-[font-size=large]:ml-auto in-data-[font-size=large]:text-xs">
                      {formatDate(notice.published_at, locale, { year: "numeric", month: locale === "en" ? "short" : "long", day: "numeric" })}
                    </span>
                    {/* 모바일·데스크톱 공통(큰 글씨 모드 제외) — 날짜 줄 오른쪽 끝.
                        음수 마진+패딩으로 터치 영역을 36px 높이로 넓히되 날짜 줄
                        높이는 늘리지 않는다. */}
                    {renderLink(
                      "-my-2 -mr-2 ml-auto inline-flex min-h-9 shrink-0 items-center px-2 text-xs font-semibold text-coral-dark hover:underline sm:text-sm in-data-[font-size=large]:hidden",
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[0.8125rem] font-semibold leading-snug text-foreground sm:mt-2 sm:line-clamp-none sm:text-base sm:font-bold sm:leading-normal in-data-[font-size=large]:mt-2 in-data-[font-size=large]:text-base in-data-[font-size=large]:font-bold in-data-[font-size=large]:leading-normal">
                    {notice.title}
                  </p>
                  {notice.summary && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground sm:mt-1 sm:line-clamp-2 sm:text-sm in-data-[font-size=large]:mt-1 in-data-[font-size=large]:line-clamp-2 in-data-[font-size=large]:text-sm">
                      {notice.summary}
                    </p>
                  )}
                  <div className="mt-2 hidden in-data-[font-size=large]:block">
                    {renderLink("text-sm font-semibold text-coral-dark hover:underline")}
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
              {t.newsPage.previousMonth}
            </Link>
            <p className="font-bold text-foreground">
              {formatDate(new Date(year, month - 1, 1), locale, { year: "numeric", month: "long" })}
            </p>
            <Link
              href={`/news?tab=calendar&month=${monthKey(next.year, next.month)}`}
              className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
            >
              {t.newsPage.nextMonth}
            </Link>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {events.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">{t.newsPreview.noCalendar}</p>
            )}
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3 rounded-xl border border-border bg-white p-4">
                <span className="shrink-0 rounded-full bg-blue-soft px-2.5 py-1 text-xs font-bold text-blue-dark">
                  {formatEventRange(event.starts_on, event.ends_on, locale)}
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
