import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { updateMyClub } from "@/lib/actions/club-admin";

type MyClub = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  meeting_location: string | null;
  sns_url: string | null;
  recruiting_post: string | null;
};

const inputClass = "rounded-md border border-border px-3 py-2 text-sm";
const labelClass = "flex flex-col gap-1 text-sm";

export default async function MyClubManagePage(props: PageProps<"/my/club">) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const searchParams = await props.searchParams;
  const error = typeof searchParams.error === "string" ? searchParams.error : null;
  const success = searchParams.success === "1";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: club } = await supabase
    .from("clubs")
    .select(
      "id, slug, name, description, cover_image_url, meeting_day, meeting_time, meeting_location, sns_url, recruiting_post",
    )
    .eq("president_id", profile.id)
    .maybeSingle<MyClub>();

  if (!club) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-foreground">내 동아리 관리</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          현재 회장으로 등록된 동아리가 없습니다. 동아리 개설 신청이 승인되면 이 페이지에서 소개·대표
          사진·활동·SNS·모집글을 직접 관리할 수 있습니다.
        </p>
      </main>
    );
  }

  const updateMyClubWithId = updateMyClub.bind(null, club.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href={`/clubs/${club.slug}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
        ← {club.name} 상세 보기
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-foreground">내 동아리 관리</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        회장으로 등록된 동아리의 소개·대표사진·활동·SNS·모집글만 직접 수정할 수 있습니다. 동아리명·
        카테고리·운영 상태·지도교수 정보 등은 학교(관리자) 승인이 필요한 항목이라 여기서 바꿀 수
        없습니다.
      </p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {success && (
        <p className="mt-4 rounded-md bg-blue-soft px-3 py-2 text-sm text-blue-dark">저장되었습니다.</p>
      )}

      <form action={updateMyClubWithId} className="mt-6 flex flex-col gap-4">
        <label className={labelClass}>
          소개
          <textarea name="description" rows={4} defaultValue={club.description ?? ""} className={inputClass} />
        </label>

        <label className={labelClass}>
          대표사진 URL
          <input name="cover_image_url" defaultValue={club.cover_image_url ?? ""} className={inputClass} />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className={labelClass}>
            요일
            <input name="meeting_day" defaultValue={club.meeting_day ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            시간
            <input name="meeting_time" defaultValue={club.meeting_time ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            장소
            <input name="meeting_location" defaultValue={club.meeting_location ?? ""} className={inputClass} />
          </label>
        </div>

        <label className={labelClass}>
          SNS 링크
          <input type="url" name="sns_url" defaultValue={club.sns_url ?? ""} className={inputClass} />
        </label>

        <label className={labelClass}>
          모집글
          <textarea name="recruiting_post" rows={4} defaultValue={club.recruiting_post ?? ""} className={inputClass} />
        </label>

        <button
          type="submit"
          className="w-fit rounded-full bg-coral px-4 py-2.5 font-bold text-white transition-opacity hover:opacity-90"
        >
          저장
        </button>
      </form>
    </main>
  );
}
