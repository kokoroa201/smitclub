"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { requireSuperAdmin } from "@/lib/auth";

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
