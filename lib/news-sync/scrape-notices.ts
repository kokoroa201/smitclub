import * as cheerio from "cheerio";

const NOTICE_LIST_URL = "https://smit.ac.kr/bbs/board.php?bo_table=notice";
const MAX_SUMMARY_LENGTH = 220;

export type ScrapedNoticeListItem = {
  externalId: string;
  title: string;
  publishedAt: string;
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

// 목록 첫 페이지만 가져온다 — 매일 도는 배치라 새 글은 항상 1페이지 안에
// 들어오고, external_id(wr_id) 기준 upsert라 매번 다시 가져와도 안전하다.
// 학교 사이트에 불필요한 페이지네이션 요청을 반복하지 않기 위함이기도 하다.
export async function scrapeNoticeList(): Promise<ScrapedNoticeListItem[]> {
  const html = await fetchHtml(NOTICE_LIST_URL);
  const $ = cheerio.load(html);

  const items: ScrapedNoticeListItem[] = [];

  $("table tbody tr").each((_, row) => {
    const link = $(row).find("td.tleft a[href*='wr_id=']").first();
    if (link.length === 0) return;

    const href = link.attr("href") ?? "";
    const wrIdMatch = href.match(/wr_id=(\d+)/);
    if (!wrIdMatch) return;

    const title = link.text().replace(/\s+/g, " ").trim();
    const dateText = $(row).find("td.tdata").first().text().trim();
    if (!title || !dateText) return;

    items.push({
      externalId: wrIdMatch[1],
      title,
      publishedAt: `${dateText}T00:00:00+09:00`,
      sourceUrl: href.startsWith("http") ? href : `https://smit.ac.kr${href}`,
    });
  });

  return items;
}

// 상세 페이지 본문(.board_view_con, 메뉴·푸터·연락처는 이 컨테이너 밖에 있어
// 애초에 포함되지 않는다)의 첫 non-empty <p> 텍스트만 최대 220자로 잘라
// 요약으로 쓴다. 실패하면 null — 호출부가 "요약 없이 제목·날짜·원문 링크만"
// 표시하도록 둔다. 전문·첨부파일은 절대 저장하지 않는다.
export async function scrapeNoticeSummary(sourceUrl: string): Promise<string | null> {
  try {
    const html = await fetchHtml(sourceUrl);
    const $ = cheerio.load(html);

    const paragraphs = $(".board_view_con p")
      .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
      .get()
      .filter((text) => text.length > 0);

    if (paragraphs.length === 0) return null;

    const first = paragraphs[0];
    return first.length > MAX_SUMMARY_LENGTH ? `${first.slice(0, MAX_SUMMARY_LENGTH)}…` : first;
  } catch {
    return null;
  }
}
