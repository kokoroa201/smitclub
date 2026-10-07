"use server";

import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

const COVER_BUCKET = "club-covers";
const MAX_COVER_BYTES = 5 * 1024 * 1024;
const COVER_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// 이 버킷의 공개 URL에서 object 경로만 뽑아낸다. 예전 시드 데이터처럼
// /clubs/suda.png 같은 정적 자산 경로이거나 외부 URL이면 null을 반환해서
// 건드리지 않는다 — 이 함수가 우리 버킷 소유라고 확인한 파일만 나중에
// 정리(delete) 대상이 된다.
function coverStoragePath(url: string | null): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${COVER_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
}

// 회장이 직접 고칠 수 있는 항목만 받는다(소개·대표사진·주요 활동·정기 모임·
// SNS·모집글). 이 클라이언트는 로그인 세션 기준 RLS를 그대로 따르므로,
// clubs_update_admin_or_president 정책(자기 동아리만) + clubs_admin_fields_
// guard 트리거(이 컬럼들 외에는 변경 불가) + club-covers Storage RLS(자기
// 동아리 폴더만)가 이중 삼중으로 막아준다 — 여기서 clubId를 다른 동아리로
// 바꿔 호출해도 DB가 거부한다.
export async function updateMyClub(clubId: string, formData: FormData) {
  const t = getDictionary(await getLocale()).clubManage;
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: club } = await supabase
    .from("clubs")
    .select("id, president_id, cover_image_url")
    .eq("id", clubId)
    .single();

  if (!club || club.president_id !== profile.id) {
    redirect(`/my/club?error=${encodeURIComponent(t.errors.notPresident)}`);
  }

  const description = field(formData, "description");
  const activities = field(formData, "activities");
  const meetingDay = field(formData, "meeting_day");
  const meetingTime = field(formData, "meeting_time");
  const meetingLocation = field(formData, "meeting_location");
  const snsUrl = field(formData, "sns_url");
  const recruitingPost = field(formData, "recruiting_post");

  const coverFile = formData.get("cover_image_file");
  const hasNewCover = coverFile instanceof File && coverFile.size > 0;

  let newCoverUrl: string | null = null;

  if (hasNewCover) {
    const file = coverFile as File;
    const ext = COVER_MIME_EXT[file.type];

    if (!ext) {
      redirect(`/my/club?error=${encodeURIComponent(t.errors.invalidCover)}`);
    }
    if (file.size > MAX_COVER_BYTES) {
      redirect(`/my/club?error=${encodeURIComponent(t.errors.largeCover)}`);
    }

    const path = `${clubId}/${randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(COVER_BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      console.error("cover image upload failed", uploadError);
      redirect(`/my/club?error=${encodeURIComponent(t.errors.uploadFailed)}`);
    }

    newCoverUrl = supabase.storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase
    .from("clubs")
    .update({
      description: formData.has("description") ? description || null : undefined,
      description_en: formData.has("description_en") ? field(formData, "description_en") || null : undefined,
      activities: formData.has("activities") ? activities || null : undefined,
      activities_en: formData.has("activities_en") ? field(formData, "activities_en") || null : undefined,
      meeting_day: formData.has("meeting_day") ? meetingDay || null : undefined,
      meeting_day_en: formData.has("meeting_day_en") ? field(formData, "meeting_day_en") || null : undefined,
      meeting_time: formData.has("meeting_time") ? meetingTime || null : undefined,
      meeting_location: formData.has("meeting_location") ? meetingLocation || null : undefined,
      meeting_location_en: formData.has("meeting_location_en") ? field(formData, "meeting_location_en") || null : undefined,
      sns_url: formData.has("sns_url") ? snsUrl || null : undefined,
      recruiting_post: formData.has("recruiting_post") ? recruitingPost || null : undefined,
      recruiting_post_en: formData.has("recruiting_post_en") ? field(formData, "recruiting_post_en") || null : undefined,
      ...(newCoverUrl ? { cover_image_url: newCoverUrl } : {}),
    })
    .eq("id", clubId);

  if (error) {
    console.error("clubs update failed", error);
    redirect(`/my/club?error=${encodeURIComponent(t.errors.saveFailed)}`);
  }

  if (newCoverUrl) {
    const oldPath = coverStoragePath(club.cover_image_url);
    if (oldPath) {
      await supabase.storage.from(COVER_BUCKET).remove([oldPath]);
    }
  }

  redirect("/my/club?success=1");
}
