import * as cheerio from "cheerio";
export const NOTICE_LIST_URL = "https://smit.ac.kr/bbs/board.php?bo_table=notice";
export const SCHOOL_NEWS_LIST_URL = "https://smit.ac.kr/eng/bbs/board.php?bo_table=news";
export type ScrapedNoticeListItem = { externalId: string; title: string; publishedAt: string; sourceUrl: string };

export async function fetchSchoolHtml(url: string): Promise<string> {
  if (new URL(url).origin !== "https://smit.ac.kr") throw new Error("학교 외부 URL은 수집할 수 없습니다.");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SmitClubBot/1.0)" },
    cache: "no-store", signal: AbortSignal.timeout(12_000), redirect: "error",
  });
  if (!res.ok) throw new Error(`학교 요청 실패 (HTTP ${res.status})`);
  return res.text();
}

export function parseNoticeList(html: string, listUrl: string, page = 1) {
  const $ = cheerio.load(html);
  const board = new URL(listUrl).searchParams.get("bo_table");
  const items = new Map<string, ScrapedNoticeListItem>();
  $("table tbody tr").each((_, row) => {
    const link = $(row).find("td.tleft a[href*='wr_id=']").first();
    if (!link.length) return;
    const url = new URL(link.attr("href") ?? "", listUrl);
    const id = url.searchParams.get("wr_id");
    if (url.origin !== "https://smit.ac.kr" || url.searchParams.get("bo_table") !== board || !id?.match(/^\d+$/)) return;
    const title = link.text().replace(/\s+/g, " ").trim();
    const date = $(row).find("td.tdata").first().text().trim();
    if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return;
    items.set(id, { externalId: id, title, publishedAt: `${date}T00:00:00+09:00`, sourceUrl: url.href });
  });
  if (!items.size && (page === 1 || !$("table tbody td").text().match(/게시물이 없습니다|No (?:posts|articles|data)/i))) {
    throw new Error(`게시판 목록 구조를 확인할 수 없음: ${$("title").text().trim()}`);
  }
  const hasNext = $("a[href]").toArray().some((el) => {
    const url = new URL($(el).attr("href")!, listUrl);
    return url.origin === "https://smit.ac.kr" && url.searchParams.get("bo_table") === board && Number(url.searchParams.get("page")) > page;
  });
  return { items: [...items.values()], hasNext };
}

export async function scrapeNoticePage(listUrl: string, page = 1) {
  const url = new URL(listUrl);
  url.searchParams.set("page", String(page));
  return parseNoticeList(await fetchSchoolHtml(url.href), listUrl, page);
}

export function hasEnglishAttachment(names: string[]): boolean {
  // An arbitrary English word alone does not prove English contents.
  return names.some((name) => /\b(?:english|eng)\b|\bkor[\s_\-/]*en\b|\ben[\s_\-/]*kr\b|한\s*[·/\-]?\s*영|영문/i.test(name.replace(/_/g, " ")));
}

export function parseNoticeDetail(html: string) {
  const $ = cheerio.load(html);
  if (!$(".board_view_con").length) throw new Error("게시글 상세 구조를 확인할 수 없습니다.");
  const first = $(".board_view_con p").map((_, el) => $(el).text().replace(/\s+/g, " ").trim()).get().find(Boolean);
  const attachmentNames = $("a.view_file_download strong").map((_, el) => $(el).text().replace(/\s+/g, " ").trim()).get().filter(Boolean);
  return { summary: first ? (first.length > 220 ? `${first.slice(0, 220)}…` : first) : null, attachmentNames, hasEnAttachment: hasEnglishAttachment(attachmentNames) };
}

export async function scrapeNoticeDetail(sourceUrl: string) {
  return parseNoticeDetail(await fetchSchoolHtml(sourceUrl));
}
