import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Test actual TS modules without adding a runtime dependency or accessing a DB.
const requirePackage = createRequire(import.meta.url);
function load(relative, overrides = {}, globals = {}) {
  const filename = path.resolve(relative);
  const code = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const compiled = { exports: {} };
  runInNewContext(code, {
    module: compiled, exports: compiled.exports, URL, AbortSignal, console, Error,
    process: { env: {} }, fetch: () => { throw new Error("Unexpected live fetch"); },
    require: (name) => {
      if (name in overrides) return overrides[name];
      if (name.startsWith(".") || name.startsWith("@/")) {
        const base = name.startsWith("@/") ? path.resolve(name.slice(2)) : path.join(path.dirname(filename), name);
        const target = [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find(existsSync);
        if (!target) throw new Error(`Missing test module: ${name}`);
        return load(target, overrides, globals);
      }
      return requirePackage(name);
    }, ...globals,
  }, { filename });
  return compiled.exports;
}
const parser = load("lib/news-sync/scrape-notices.ts");
const titles = load("lib/news-sync/presentation.ts");
const row = (id, title = "학사공지", board = "notice") => `<tr><td class="tleft"><a href="./board.php?bo_table=${board}&wr_id=${id}">${title}</a></td><td class="tdata">2026-10-07</td></tr>`;

test("board parser separates sources, resolves relative links and deduplicates pinned posts", () => {
  const parsed = parser.parseNoticeList(`<table><tbody>${row(1)}${row(1)}${row(2, "Other", "news")}</tbody></table><a href="./board.php?bo_table=notice&page=2">Next</a>`, parser.NOTICE_LIST_URL);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].sourceUrl, "https://smit.ac.kr/bbs/board.php?bo_table=notice&wr_id=1");
  assert.equal(parsed.hasNext, true);
  const news = parser.parseNoticeList(`<table><tbody>${row(3, "학교소식", "news")}</tbody></table>`, parser.SCHOOL_NEWS_LIST_URL);
  assert.match(news.items[0].sourceUrl, /\/eng\/bbs\//);
});
test("changed HTML fails visibly; explicit empty archive ends safely", () => {
  assert.throws(() => parser.parseNoticeList("<title>Access denied</title>", parser.NOTICE_LIST_URL));
  const empty = parser.parseNoticeList("<table><tbody><tr><td>게시물이 없습니다</td></tr></tbody></table>", parser.NOTICE_LIST_URL, 100);
  assert.equal(empty.items.length, 0);
  assert.equal(empty.hasNext, false);
});
test("attachment badge requires a language marker, not an arbitrary English filename", () => {
  for (const name of ["[Kor Eng] 신청서.hwpx", "English timetable.pdf", "한·영 신청서.pdf", "form_ENG.pdf", "EN-KR form.pdf"]) assert.equal(parser.hasEnglishAttachment([name]), true, name);
  for (const name of ["Google Workspace.pdf", "Application for Advisor Change.pdf", "시간표.pdf", "engineering.pdf"]) assert.equal(parser.hasEnglishAttachment([name]), false, name);
  const detail = parser.parseNoticeDetail('<div class="board_view_con"><p>공지 요약</p></div><a class="view_file_download"><strong>[Kor Eng] 신청서.hwpx</strong></a>');
  assert.equal(detail.hasEnAttachment, true);
  assert.equal(detail.summary, "공지 요약");
  assert.throws(() => parser.parseNoticeDetail("<html>Denied</html>"));
});
test("English titles are reused only when they match the current Korean title", () => {
  const current = { title: "공지", title_en: "Notice", title_en_source: "공지" };
  assert.equal(titles.newsTitle(current, "en"), "Notice");
  assert.equal(titles.newsTitle(current, "ko"), "공지");
  assert.equal(titles.newsTitle({ ...current, title: "수정 공지" }, "en"), "수정 공지");
  assert.equal(titles.newsTitle({ title: "공지" }, "en"), "공지");
  assert.equal(titles.newsTitle({ title: "공지", title_en: "Notice" }, "en"), "Notice");
  for (const locale of ["ko", "en"]) assert.equal(titles.newsTitle({ ...current, source: "school_news" }, locale), "공지");
});

test("cron rejects unauthorized requests and reports independent sync failures", async () => {
  let calls = 0;
  let status = "success";
  const route = load("app/api/cron/sync-news/route.ts", {
    "next/server": { NextResponse: { json: (data, options) => ({ data, status: options?.status ?? 200 }) } },
    "@/lib/news-sync/run-sync": { runNewsSync: async () => {
      calls++;
      return { notices: { status, fetchedCount: 1 }, schoolNews: { status: "success", fetchedCount: 1 }, calendar: { status: "success", fetchedCount: 1 } };
    } },
  }, { process: { env: { CRON_SECRET: "test-secret" } } });
  const request = (auth) => ({ headers: { get: () => auth } });
  assert.equal((await route.GET(request(null))).status, 401);
  assert.equal((await route.GET(request("Bearer wrong"))).status, 401);
  assert.equal(calls, 0);
  assert.equal((await route.GET(request("Bearer test-secret"))).status, 200);
  status = "error";
  assert.equal((await route.GET(request("Bearer test-secret"))).status, 500);
  assert.equal(calls, 2);
});

test("News server rendering keeps School News separate and English Academic shows title/link/badge only", async () => {
  const store = mockDb();
  for (const source of ["student_council", "school_academic", "school_news"]) {
    store.rows.set(source, { id: source, source, title: `${source} 원제목`, title_en: `${source} English title`, title_en_source: `${source} 원제목`, summary: `${source} Korean summary`, has_en_attachment: source === "school_academic", published_at: "2026-10-07", source_url: source === "school_academic" ? "https://smit.ac.kr/bbs/board.php?bo_table=notice&wr_id=1541" : "https://smit.ac.kr/eng/bbs/board.php?bo_table=news&wr_id=620" });
  }
  async function render(params, locale) {
    const page = load("app/news/page.tsx", {
      "next/link": (props) => React.createElement("a", props, props.children),
      "next/image": ({ src, alt }) => React.createElement("img", { src, alt }),
      "next/headers": { cookies: async () => ({ getAll: () => [] }) },
      "@/utils/supabase/server": { createClient: () => store.db },
      "@/lib/i18n/server": { getLocale: async () => locale },
    });
    return renderToStaticMarkup(await page.default({ searchParams: Promise.resolve(params) }));
  }
  const academic = await render({ source: "academic" }, "en");
  assert.match(academic, /school_academic English title/);
  assert.match(academic, /EN\/KR attachment/);
  assert.match(academic, /View Original/);
  assert.match(academic, /https:\/\/smit.ac.kr\/bbs\/board.php\?bo_table=notice&amp;wr_id=1541/);
  assert.doesNotMatch(academic, /Korean summary|school_news English title|student_council English title/);
  for (const label of ["Notices", "School News", "Academic Calendar", "All", "Council", "Academic"]) assert.ok(academic.includes(`>${label}<`), label);
  const all = await render({}, "en");
  assert.match(all, /student_council Korean summary/);
  assert.doesNotMatch(all, /school_news English title/);
  const school = await render({ tab: "school", source: "academic" }, "en");
  assert.match(school, /school_news 원제목/);
  assert.doesNotMatch(school, /school_news English title/);
  assert.doesNotMatch(school, /school_academic English title|source=all|Korean summary/);
  const ko = await render({ source: "academic" }, "ko");
  assert.match(ko, /school_academic 원제목/);
  assert.match(ko, /한·영 자료/);
  for (const label of ["공지사항", "학교소식", "학사일정", "전체", "원우회", "학사"]) assert.ok(ko.includes(`>${label}<`), label);
  assert.match(ko, /school_academic Korean summary/);
  store.rows.get("school_academic").title_en = null;
  const fallback = await render({ source: "academic" }, "en");
  assert.match(fallback, /school_academic 원제목/);
  assert.doesNotMatch(fallback, /No notices yet/);
  store.errors.set("notices", { message: "Database unavailable" });
  const failed = await render({}, "en");
  assert.match(failed, /Unable to load notices/);
  assert.doesNotMatch(failed, /No notices yet/);
  store.errors.clear();
  const calendar = await render({ tab: "calendar", month: "2026-10" }, "en");
  assert.match(calendar, /month=2026-09/);
  assert.match(calendar, /month=2026-11/);
});

function mockDb() {
  const rows = new Map();
  const state = new Map();
  const logs = [];
  const writes = [];
  const errors = new Map();
  const db = { from(table) {
    const filters = [];
    let action = "select", payload;
    const query = {
      select() { return query; }, eq(key, value) { filters.push((r) => r[key] === value); return query; },
      in(key, values) { filters.push((r) => values.includes(r[key])); return query; },
      is(key, value) { filters.push((r) => (r[key] ?? null) === value); return query; },
      lt() { return query; }, or() { return query; },
      order() { return query; }, limit() { return query; }, maybeSingle() { return query; },
      upsert(value) { action = "upsert"; payload = value; return query; },
      update(value) { action = "update"; payload = value; return query; },
      insert(value) { action = "insert"; payload = value; return query; },
      then(resolve) {
        if (action !== "select") writes.push({ table, action, payload });
        let data = [];
        if (table === "news_sync_state") {
          if (action === "upsert") state.set(payload.target, payload);
          data = [...state.values()].filter((r) => filters.every((f) => f(r)))[0] ?? null;
        } else if (table === "notices") {
          if (action === "upsert") {
            const key = `${payload.source}:${payload.external_id}`;
            rows.set(key, { id: key, ...rows.get(key), ...payload });
          }
          data = [...rows.values()].filter((r) => filters.every((f) => f(r)));
          if (action === "update") for (const r of data) Object.assign(r, payload);
        } else if (table === "news_sync_runs" && action === "insert") logs.push(payload);
        const error = errors.get(table) ?? null;
        return Promise.resolve({ data: error ? null : data, error }).then(resolve);
      },
    };
    return query;
  } };
  return { db, rows, state, logs, writes, errors };
}
function syncModule(store, { failAcademic = false, failDetail = false, title = "공지" } = {}) {
  return load("lib/news-sync/run-sync.ts", {
    "@/utils/supabase/admin": { createAdminClient: () => store.db },
    "./scrape-notices": {
      NOTICE_LIST_URL: "academic",
      scrapeNoticePage: async (url, page = 1) => {
        if (url === "academic" && failAcademic) throw new Error("academic offline");
        return { items: [{ externalId: String(page), title: url === "news" ? `Official English News ${page}` : `${title} ${page}`, publishedAt: "2026-10-07", sourceUrl: url }], hasNext: page < 5 };
      },
      scrapeNoticeDetail: async () => {
        if (failDetail) throw new Error("detail offline");
        return { summary: "summary", attachmentNames: ["[Kor Eng] form.pdf"], hasEnAttachment: true };
      },
    },
    "./scrape-school-news": { SCHOOL_NEWS_LIST_URL: "news" },
    "./scrape-calendar": { scrapeAcademicCalendar: async () => ({ events: [{ title: "Calendar", externalId: "1", startsOn: "2026-10-07", endsOn: null, sourceUrl: "calendar" }], skipped: 0 }) },
  });
}
test("sync without API keys preserves Council, saved titles and attachments, and uses original school news titles", async () => {
  const store = mockDb();
  store.rows.set("council", { id: "council", source: "student_council", title: "Council" });
  const sync = syncModule(store);
  await sync.runNewsSync();
  assert.equal(store.rows.size, 7);
  assert.equal(store.state.get("school_news").next_page, 4);
  await sync.runNewsSync();
  assert.equal(store.rows.size, 11);
  assert.equal(store.state.get("school_news").next_page, 2);
  await sync.runNewsSync();
  assert.equal(store.rows.size, 11);
  Object.assign(store.rows.get("school_academic:1"), { title_en: "Saved Notice", title_en_source: "공지 1" });
  await syncModule(store, { failDetail: true }).runNewsSync();
  assert.equal(store.rows.get("school_academic:1").title_en, "Saved Notice");
  assert.equal(store.rows.get("school_academic:1").has_en_attachment, true);
  assert.equal(store.state.get("school_news").next_page, 4);
  await syncModule(store, { title: "수정공지" }).runNewsSync();
  assert.equal(store.rows.get("school_academic:1").title_en, null);
  assert.equal(store.rows.get("school_academic:1").title, "수정공지 1");
  assert.equal(store.rows.get("school_news:1").title, "Official English News 1");
  for (const locale of ["ko", "en"]) assert.equal(titles.newsTitle(store.rows.get("school_news:1"), locale), "Official English News 1");
  assert.equal(store.writes.some((w) => w.action === "update"), false);
  assert.equal(store.rows.get("council").title, "Council");
  assert.equal(store.writes.some((w) => w.payload?.source === "student_council"), false);
});
test("a failed source leaves independent syncs and old data available without translation keys", async () => {
  const store = mockDb();
  await syncModule(store).runNewsSync();
  const size = store.rows.size;
  const result = await syncModule(store, { failAcademic: true }).runNewsSync();
  assert.equal(result.notices.status, "error");
  assert.equal(result.schoolNews.status, "success");
  assert.equal(result.schoolNews.warning, undefined);
  assert.equal(result.calendar.status, "success");
  assert.ok(store.rows.size >= size);
  assert.equal(store.logs.length, 6);
});

test("official sources can be read and actual bilingual attachment names recognized", { skip: !process.argv.includes("--live") }, async () => {
  const live = load("lib/news-sync/scrape-notices.ts", {}, { fetch });
  for (const url of [live.NOTICE_LIST_URL, live.SCHOOL_NEWS_LIST_URL]) {
    const first = await live.scrapeNoticePage(url);
    assert.ok(first.items.length > 0);
    if (first.hasNext) assert.ok((await live.scrapeNoticePage(url, 2)).items.length > 0);
    const detail = await live.scrapeNoticeDetail(first.items[0].sourceUrl);
    console.log(`Official board: ${url}, ${first.items.length} posts, ${detail.attachmentNames.length} attachment names`);
  }
  const bilingual = await live.scrapeNoticeDetail("https://smit.ac.kr/bbs/board.php?bo_table=notice&wr_id=1541");
  assert.equal(bilingual.hasEnAttachment, true);
  const calendar = load("lib/news-sync/scrape-calendar.ts", {}, { fetch });
  assert.ok((await calendar.scrapeAcademicCalendar()).events.length > 0);
});
