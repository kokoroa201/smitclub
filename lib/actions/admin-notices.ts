"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { requireSuperAdmin } from "@/lib/auth";
import { runNewsSync } from "@/lib/news-sync/run-sync";

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// 원우회 공지만 이 화면에서 다룬다 — source를 항상 'student_council'로
// 고정해서 보내므로, 폼 값을 조작해도 학사공지(source='school_academic')
// 행은 만들 수 없다. notices_insert_council RLS 정책이 DB에서도 동일하게
// 다시 막아준다.
export async function createNotice(formData: FormData) {
  const admin = await requireSuperAdmin();

  const title = field(formData, "title");
  const body = field(formData, "body");
  const publishedDate = field(formData, "published_at");
  const sourceUrl = field(formData, "source_url");

  if (!title) {
    redirect(`/admin/notices?error=${encodeURIComponent("제목을 입력해주세요.")}`);
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.from("notices").insert({
    source: "student_council",
    title,
    body: body || null,
    published_at: publishedDate ? `${publishedDate}T00:00:00+09:00` : new Date().toISOString(),
    source_url: sourceUrl || null,
    created_by: admin.id,
  });

  if (error) {
    console.error("notice insert failed", error);
    redirect(`/admin/notices?error=${encodeURIComponent("공지 등록 중 오류가 발생했습니다.")}`);
  }

  redirect("/admin/notices?success=1");
}

export async function updateNotice(noticeId: string, formData: FormData) {
  await requireSuperAdmin();

  const title = field(formData, "title");
  const body = field(formData, "body");
  const publishedDate = field(formData, "published_at");
  const sourceUrl = field(formData, "source_url");

  if (!title) {
    redirect(`/admin/notices?edit=${noticeId}&error=${encodeURIComponent("제목을 입력해주세요.")}`);
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: existing } = await supabase.from("notices").select("id, source").eq("id", noticeId).single();

  if (!existing || existing.source !== "student_council") {
    redirect(`/admin/notices?error=${encodeURIComponent("학사공지는 수정할 수 없습니다.")}`);
  }

  const { error } = await supabase
    .from("notices")
    .update({
      title,
      body: body || null,
      published_at: publishedDate ? `${publishedDate}T00:00:00+09:00` : undefined,
      source_url: sourceUrl || null,
    })
    .eq("id", noticeId);

  if (error) {
    console.error("notice update failed", error);
    redirect(`/admin/notices?edit=${noticeId}&error=${encodeURIComponent("공지 수정 중 오류가 발생했습니다.")}`);
  }

  redirect("/admin/notices?success=1");
}

export async function deleteNotice(noticeId: string) {
  await requireSuperAdmin();

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: existing } = await supabase.from("notices").select("id, source").eq("id", noticeId).single();

  if (!existing || existing.source !== "student_council") {
    redirect(`/admin/notices?error=${encodeURIComponent("학사공지는 삭제할 수 없습니다.")}`);
  }

  const { error } = await supabase.from("notices").delete().eq("id", noticeId);

  if (error) {
    console.error("notice delete failed", error);
    redirect(`/admin/notices?error=${encodeURIComponent("공지 삭제 중 오류가 발생했습니다.")}`);
  }

  redirect("/admin/notices?success=1");
}

// 관리자 화면의 "지금 동기화" 버튼용 — Vercel Cron과 동일한 runNewsSync를
// 그 자리에서 바로 호출해, 환경변수(CRON_SECRET 등) 설정 후 다음날 자동
// 실행을 기다리지 않고 즉시 반영 여부를 확인할 수 있게 한다.
export async function syncNewsNow() {
  await requireSuperAdmin();

  try {
    const summary = await runNewsSync();
    const parts = [
      `학사공지 ${summary.notices.status === "success" ? `${summary.notices.fetchedCount}건` : `오류(${summary.notices.error})`}`,
      `학사일정 ${summary.calendar.status === "success" ? `${summary.calendar.fetchedCount}건` : `오류(${summary.calendar.error})`}`,
    ];
    redirect(`/admin/notices?synced=${encodeURIComponent(parts.join(" · "))}`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err; // redirect() 자체가 던지는 신호는 그대로 통과
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    redirect(`/admin/notices?error=${encodeURIComponent(`동기화 실행 실패: ${message}`)}`);
  }
}
