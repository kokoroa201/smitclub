import { createAdminClient } from "@/utils/supabase/admin";
import { NOTICE_LIST_URL, scrapeNoticePage, scrapeNoticeDetail, type ScrapedNoticeListItem } from "./scrape-notices";
import { SCHOOL_NEWS_LIST_URL } from "./scrape-school-news";
import { scrapeAcademicCalendar } from "./scrape-calendar";

export type SyncTargetResult = { status: "success" | "error"; fetchedCount: number; error?: string; warning?: string };
export type SyncSummary = { notices: SyncTargetResult; schoolNews: SyncTargetResult; calendar: SyncTargetResult };
type Admin = NonNullable<ReturnType<typeof createAdminClient>>;
const message = (err: unknown) => err instanceof Error ? err.message : "알 수 없는 오류";

async function syncBoard(admin: Admin, source: "school_academic" | "school_news", target: string, url: string): Promise<SyncTargetResult> {
  let count = 0;
  try {
    const { data: state, error: stateError } = await admin.from("news_sync_state").select("next_page").eq("target", target).maybeSingle();
    if (stateError) throw new Error(`수집 상태 조회 실패: ${stateError.message}`);
    const first = await scrapeNoticePage(url);
    const items = new Map<string, ScrapedNoticeListItem>(first.items.map((item) => [item.externalId, item]));
    let nextPage = state?.next_page ?? 2;
    if (first.hasNext) {
      // Always refresh recent posts; sweep two archive pages per run, then wrap.
      for (let i = 0; i < 2; i++) {
        const page = await scrapeNoticePage(url, nextPage);
        for (const item of page.items) items.set(item.externalId, item);
        if (!page.hasNext) { nextPage = 2; break; }
        nextPage++;
      }
    } else nextPage = 2;
    const { data: existing, error: lookupError } = await admin.from("notices").select("external_id,title").eq("source", source).in("external_id", [...items.keys()]);
    if (lookupError) throw new Error(`기존 공지 조회 실패: ${lookupError.message}`);
    const titles = new Map((existing ?? []).map((row) => [row.external_id, row.title]));
    const warnings = new Set<string>();
    const failures: string[] = [];
    const queue = [...items.values()];
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (queue.length) {
        const item = queue.shift()!;
        let detail: Awaited<ReturnType<typeof scrapeNoticeDetail>> | undefined;
        try { detail = await scrapeNoticeDetail(item.sourceUrl); }
        catch (err) { warnings.add(`상세 수집 실패: ${message(err)}`); }
        const changed = titles.get(item.externalId) !== item.title;
        const { error } = await admin.from("notices").upsert({
          source, title: item.title, source_url: item.sourceUrl, published_at: item.publishedAt, external_id: item.externalId,
          ...(changed ? { title_en: null, title_en_source: null } : {}),
          // Preserve previously collected metadata if a detail request fails.
          ...(detail ? { summary: detail.summary, attachment_names: detail.attachmentNames, has_en_attachment: detail.hasEnAttachment } : {}),
        }, { onConflict: "source,external_id" });
        if (error) failures.push(error.message);
        else count++;
      }
    }));
    // Do not move the archive cursor past failed saves/details.
    if (!failures.length && !warnings.size) {
      const { error } = await admin.from("news_sync_state").upsert({ target, next_page: nextPage });
      if (error) failures.push(error.message);
    }
    if (failures.length) throw new Error(`${failures.length}건 저장 실패: ${failures[0]}`);
    return { status: "success", fetchedCount: count, ...(warnings.size ? { warning: [...warnings].join(" · ") } : {}) };
  } catch (err) { return { status: "error", fetchedCount: count, error: message(err) }; }
}

async function syncCalendar(admin: Admin): Promise<SyncTargetResult> {
  let count = 0;
  try {
    const { events, skipped } = await scrapeAcademicCalendar();
    for (const event of events) {
      const { error } = await admin.from("academic_calendar_events").upsert({ title: event.title, starts_on: event.startsOn, ends_on: event.endsOn, source_url: event.sourceUrl, external_id: event.externalId }, { onConflict: "external_id" });
      if (error) throw new Error(`학사일정 저장 실패: ${error.message}`);
      count++;
    }
    return { status: "success", fetchedCount: count, ...(skipped ? { warning: `${skipped}건 형식을 인식하지 못해 건너뜀` } : {}) };
  } catch (err) { return { status: "error", fetchedCount: count, error: message(err) }; }
}

export async function runNewsSync(): Promise<SyncSummary> {
  const admin = createAdminClient();
  if (!admin) throw new Error("SUPABASE_SECRET_KEY가 설정되어 있지 않습니다.");
  // Independent sources; failures never delete stored posts or affect Council.
  const targets = ["school_academic_notice", "school_news", "academic_calendar"];
  const results = await Promise.all([
    syncBoard(admin, "school_academic", targets[0], NOTICE_LIST_URL),
    syncBoard(admin, "school_news", targets[1], SCHOOL_NEWS_LIST_URL),
    syncCalendar(admin),
  ]);
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const { error } = await admin.from("news_sync_runs").insert({ target: targets[i], status: result.status, fetched_count: result.fetchedCount, error_message: result.error ?? result.warning ?? null });
    if (error) {
      result.status = "error";
      result.error = `${result.error ? `${result.error} · ` : ""}동기화 로그 저장 실패: ${error.message}`;
    }
  }
  return { notices: results[0], schoolNews: results[1], calendar: results[2] };
}
