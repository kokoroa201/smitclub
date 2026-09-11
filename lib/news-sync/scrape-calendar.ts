import * as cheerio from "cheerio";
import { createHash } from "node:crypto";

const CALENDAR_URL = "https://smit.ac.kr/bachelor/academic-calendar2.php";

export type ScrapedCalendarEvent = {
  externalId: string;
  title: string;
  startsOn: string;
  endsOn: string | null;
  sourceUrl: string;
};

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SmitClubBot/1.0)" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`요청 실패: ${url} (HTTP ${res.status})`);
  }
  return res.text();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// 학교 학사일정 페이지는 표가 아니라 자유서식 텍스트로 날짜를 적어둔다:
// "8.31(월)", "8.31(월)~9.5(토)", "11(금)"(월 섹션 헤더에서 월을 물려받음),
// "19(토), 21(월)"(쉼표 나열 — 이 경우 첫 날짜만 취급), "9.28(월)~10.31(토)"
// (양쪽 다 월이 명시된 범위). 완벽한 파서는 불가능한 원문이라, 못 알아본
// 형식은 null을 반환해 그 항목만 건너뛴다(전체 동기화를 막지 않는다).
function parseDateRange(
  raw: string,
  sectionMonth: number,
  sectionYear: number,
): { startsOn: string; endsOn: string | null } | null {
  const cleaned = raw.replace(/\([가-힣]+\)/g, "").trim();
  if (!cleaned) return null;

  const rangeParts = cleaned.split("~").map((s) => s.trim());
  const startToken = rangeParts[0]?.split(",")[0]?.trim();
  const endToken = rangeParts[1]?.split(",")[0]?.trim();
  if (!startToken) return null;

  function resolveToken(token: string, fallbackMonth: number): { month: number; day: number } | null {
    const dotted = token.match(/^(\d{1,2})\.(\d{1,2})$/);
    if (dotted) return { month: Number(dotted[1]), day: Number(dotted[2]) };
    const bare = token.match(/^(\d{1,2})$/);
    if (bare) return { month: fallbackMonth, day: Number(bare[1]) };
    return null;
  }

  const start = resolveToken(startToken, sectionMonth);
  if (!start) return null;

  // 섹션 월보다 한참 작은 명시적 월(예: 12월 섹션에 "1.5")은 해를 넘긴
  // 것으로 본다 — 자유서식 페이지에서 연도가 안 적힌 경우의 유일한 신호.
  const startYear = start.month < sectionMonth - 6 ? sectionYear + 1 : sectionYear;
  const startsOn = `${startYear}-${pad2(start.month)}-${pad2(start.day)}`;

  let endsOn: string | null = null;
  if (endToken) {
    const end = resolveToken(endToken, start.month);
    if (end) {
      const endYear = end.month < start.month ? startYear + 1 : startYear;
      endsOn = `${endYear}-${pad2(end.month)}-${pad2(end.day)}`;
    }
  }

  return { startsOn, endsOn };
}

export async function scrapeAcademicCalendar(): Promise<{ events: ScrapedCalendarEvent[]; skipped: number }> {
  const html = await fetchHtml(CALENDAR_URL);
  const $ = cheerio.load(html);

  const pageText = $.root().text();
  const baseYearMatch = pageText.match(/(\d{4})-\d학기/);
  const baseYear = baseYearMatch ? Number(baseYearMatch[1]) : new Date().getFullYear();

  const events: ScrapedCalendarEvent[] = [];
  let skipped = 0;
  let currentYear = baseYear;
  let previousMonth = 0;

  $(".calendar_cont").each((_, section) => {
    const headerText = $(section).find(".calendar_layl h3").text().replace(/\s+/g, "");
    const explicitYearMatch = headerText.match(/(\d{4})년/);
    const monthMatch = headerText.match(/(\d{1,2})월/);
    if (!monthMatch) return;

    const month = Number(monthMatch[1]);
    if (explicitYearMatch) {
      currentYear = Number(explicitYearMatch[1]);
    } else if (previousMonth && month < previousMonth) {
      // "OOOO년" 표기 없이 12월 -> 1월로 넘어간 경우의 방어적 처리.
      currentYear += 1;
    }
    previousMonth = month;

    $(section)
      .find("ul.calendar_lists")
      .children("li")
      .each((_, li) => {
        const dateText = $(li).children("strong").first().text().trim();
        const range = parseDateRange(dateText, month, currentYear);

        $(li)
          .find("ul.calendar_dep_lists")
          .children("li")
          .each((_, eventLi) => {
            const title = $(eventLi).text().replace(/\s+/g, " ").trim();
            if (!title || !range) {
              skipped += 1;
              return;
            }

            const externalId = createHash("sha1")
              .update(`${range.startsOn}|${range.endsOn ?? ""}|${title}`)
              .digest("hex")
              .slice(0, 32);

            events.push({
              externalId,
              title,
              startsOn: range.startsOn,
              endsOn: range.endsOn,
              sourceUrl: CALENDAR_URL,
            });
          });
      });
  });

  return { events, skipped };
}
