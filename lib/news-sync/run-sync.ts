import { createAdminClient } from "@/utils/supabase/admin";
import { scrapeNoticeList, scrapeNoticeSummary } from "./scrape-notices";
import { scrapeAcademicCalendar } from "./scrape-calendar";

export type SyncTargetResult = { status: "success" | "error"; fetchedCount: number; error?: string };
export type SyncSummary = { notices: SyncTargetResult; calendar: SyncTargetResult };

// 학교 학사공지/학사일정을 하루 1회 가져와 upsert한다(app/api/cron/sync-news
// 에서만 호출). 실패해도 기존 데이터는 절대 지우지 않는다 — insert/upsert만
// 하고 delete는 어디에도 없다. 각 대상(공지/일정)은 서로 독립적으로 성공·
// 실패하며, 결과는 news_sync_runs에 기록해 관리자 화면에서 확인할 수 있게
// 한다. 재시도는 하지 않는다(다음 날 배치가 다시 시도).
export async function runNewsSync(): Promise<SyncSummary> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("SUPABASE_SECRET_KEY가 설정되어 있지 않습니다.");
  }

  const summary: SyncSummary = {
    notices: { status: "error", fetchedCount: 0 },
    calendar: { status: "error", fetchedCount: 0 },
  };

  try {
    const list = await scrapeNoticeList();
    let upserted = 0;

    for (const item of list) {
      const summaryText = await scrapeNoticeSummary(item.sourceUrl);
      const { error } = await admin.from("notices").upsert(
        {
          source: "school_academic",
          title: item.title,
          summary: summaryText,
          source_url: item.sourceUrl,
          published_at: item.publishedAt,
          external_id: item.externalId,
        },
        { onConflict: "source,external_id" },
      );
      if (!error) upserted += 1;
    }

    summary.notices = { status: "success", fetchedCount: upserted };
    await admin.from("news_sync_runs").insert({
      target: "school_academic_notice",
      status: "success",
      fetched_count: upserted,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    summary.notices = { status: "error", fetchedCount: 0, error: message };
    await admin.from("news_sync_runs").insert({
      target: "school_academic_notice",
      status: "error",
      fetched_count: 0,
      error_message: message,
    });
  }

  try {
    const { events, skipped } = await scrapeAcademicCalendar();
    let upserted = 0;

    for (const event of events) {
      const { error } = await admin.from("academic_calendar_events").upsert(
        {
          title: event.title,
          starts_on: event.startsOn,
          ends_on: event.endsOn,
          source_url: event.sourceUrl,
          external_id: event.externalId,
        },
        { onConflict: "external_id" },
      );
      if (!error) upserted += 1;
    }

    summary.calendar = { status: "success", fetchedCount: upserted };
    await admin.from("news_sync_runs").insert({
      target: "academic_calendar",
      status: "success",
      fetched_count: upserted,
      error_message: skipped > 0 ? `${skipped}건 형식을 인식하지 못해 건너뜀` : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    summary.calendar = { status: "error", fetchedCount: 0, error: message };
    await admin.from("news_sync_runs").insert({
      target: "academic_calendar",
      status: "error",
      fetched_count: 0,
      error_message: message,
    });
  }

  return summary;
}
