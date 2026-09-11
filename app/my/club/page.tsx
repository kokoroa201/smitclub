import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { updateMyClub } from "@/lib/actions/club-admin";
import { reviewMembership } from "@/lib/actions/club-memberships";
import { CoverImageField } from "@/components/my-club/cover-image-field";
import { MembershipStatusBadge } from "@/components/admin/status-badge";

type MyClub = {
  id: string;
  slug: string;
  name: string;
  name_en: string | null;
  description: string | null;
  cover_image_url: string | null;
  activities: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  meeting_location: string | null;
  sns_url: string | null;
  recruiting_post: string | null;
};

type MembershipRow = {
  id: string;
  user_id: string;
  status: string;
  motivation: string | null;
  applied_at: string;
  profiles: { name: string } | null;
};

type PrivateRow = {
  id: string;
  student_id: string | null;
  department: string | null;
  affiliation: string | null;
};

const inputClass = "rounded-md border border-border px-3 py-2 text-sm";
const labelClass = "flex flex-col gap-1 text-sm";
const hintClass = "text-xs text-muted-foreground";

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
      "id, slug, name, name_en, description, cover_image_url, activities, meeting_day, meeting_time, meeting_location, sns_url, recruiting_post",
    )
    .eq("president_id", profile.id)
    .maybeSingle<MyClub>();

  if (!club) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-foreground">내 동아리 관리</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          현재 회장으로 등록된 동아리가 없습니다. 동아리 개설 신청이 승인되면 이 페이지에서 소개·대표
          사진·주요 활동·정기 모임·SNS·모집글을 직접 관리할 수 있습니다.
        </p>
      </main>
    );
  }

  const updateMyClubWithId = updateMyClub.bind(null, club.id);

  // club_memberships has two FKs into profiles (user_id, reviewed_by), so the
  // bare "profiles(name)" embed is ambiguous to PostgREST (PGRST201) and
  // silently comes back as an error with data: null — the exact reason the
  // pending list was rendering empty despite the row existing. Naming the FK
  // constraint picks the applicant relationship, not the reviewer one.
  const { data: membershipData } = await supabase
    .from("club_memberships")
    .select("id, user_id, status, motivation, applied_at, profiles!club_memberships_user_id_fkey(name)")
    .eq("club_id", club.id)
    .order("applied_at", { ascending: false })
    .returns<MembershipRow[]>();
  const memberships = membershipData ?? [];

  const applicantIds = memberships.map((m) => m.user_id);
  const { data: privateData } = applicantIds.length
    ? await supabase.from("profile_private").select("id, student_id, department, affiliation").in("id", applicantIds).returns<PrivateRow[]>()
    : { data: [] as PrivateRow[] };
  const privateById = new Map((privateData ?? []).map((p) => [p.id, p]));

  const pendingMemberships = memberships.filter((m) => m.status === "applied");
  const decidedMemberships = memberships.filter((m) => m.status !== "applied");

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href={`/clubs/${club.slug}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
        ← {club.name}
        {club.name_en && ` (${club.name_en})`} 상세 보기
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-foreground">내 동아리 관리</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        회장으로 등록된 동아리의 소개·대표사진·주요 활동·정기 모임·SNS·모집글만 직접 수정할 수 있습니다.
        동아리명·카테고리·운영 상태·지도교수 정보 등은 학교(관리자) 승인이 필요한 항목이라 여기서 바꿀
        수 없습니다.
      </p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {success && (
        <p className="mt-4 rounded-md bg-blue-soft px-3 py-2 text-sm text-blue-dark">저장되었습니다.</p>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-bold text-foreground">가입 신청 관리</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {club.name}에 가입 신청한 학생을 확인하고 승인·거절할 수 있습니다.
        </p>

        {pendingMemberships.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">대기 중인 신청이 없습니다.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {pendingMemberships.map((membership) => {
              const applicantPrivate = privateById.get(membership.user_id);
              const department = applicantPrivate?.department || applicantPrivate?.affiliation || "-";
              const approve = reviewMembership.bind(null, membership.id, "approved");
              const reject = reviewMembership.bind(null, membership.id, "rejected");

              return (
                <div key={membership.id} className="rounded-card border border-border bg-card p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-bold text-foreground">{membership.profiles?.name ?? "알 수 없음"}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(membership.applied_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    학번 {applicantPrivate?.student_id || "-"} · 학과 {department}
                  </p>
                  {membership.motivation && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{membership.motivation}</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <form action={approve}>
                      <button
                        type="submit"
                        className="rounded-full bg-coral px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                      >
                        승인
                      </button>
                    </form>
                    <form action={reject}>
                      <button
                        type="submit"
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                      >
                        거절
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {decidedMemberships.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-muted-foreground">처리 완료</h3>
            <div className="mt-2 flex flex-col gap-2">
              {decidedMemberships.map((membership) => (
                <div
                  key={membership.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="text-foreground">{membership.profiles?.name ?? "알 수 없음"}</span>
                  <MembershipStatusBadge status={membership.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-bold text-foreground">동아리 정보 수정</h2>
      </div>

      <form action={updateMyClubWithId} className="mt-4 flex flex-col gap-5">
        <label className={labelClass}>
          소개
          <span className={hintClass}>동아리를 처음 보는 학생에게 보여줄 한두 문단 설명입니다.</span>
          <textarea name="description" rows={4} defaultValue={club.description ?? ""} className={inputClass} />
        </label>

        <CoverImageField currentUrl={club.cover_image_url} />

        <label className={labelClass}>
          주요 활동
          <span className={hintClass}>정기 모임 외에 어떤 활동을 하는 동아리인지 자유롭게 적어주세요. (예: 주 1회 정기 모임 · 주제 토론 · 한국 문화 체험)</span>
          <textarea name="activities" rows={3} defaultValue={club.activities ?? ""} className={inputClass} />
        </label>

        <div className={labelClass}>
          정기 모임 (선택)
          <span className={hintClass}>실제로 정해진 요일·시간·장소가 있을 때만 입력하세요. 없으면 비워두면 됩니다.</span>
          <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className={labelClass}>
              요일
              <input name="meeting_day" placeholder="예: 매주 화요일" defaultValue={club.meeting_day ?? ""} className={inputClass} />
            </label>
            <label className={labelClass}>
              시간
              <input name="meeting_time" placeholder="예: 18:00" defaultValue={club.meeting_time ?? ""} className={inputClass} />
            </label>
            <label className={labelClass}>
              장소
              <input name="meeting_location" placeholder="예: 학생휴게실" defaultValue={club.meeting_location ?? ""} className={inputClass} />
            </label>
          </div>
        </div>

        <label className={labelClass}>
          SNS 링크
          <span className={hintClass}>인스타그램, 오픈채팅 등 학생들이 찾아볼 수 있는 링크입니다.</span>
          <input type="url" name="sns_url" placeholder="https://" defaultValue={club.sns_url ?? ""} className={inputClass} />
        </label>

        <label className={labelClass}>
          모집글
          <span className={hintClass}>신입 부원 모집 중이라면 안내 문구를 적어주세요. 비워두면 공개 페이지에 표시되지 않습니다.</span>
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
