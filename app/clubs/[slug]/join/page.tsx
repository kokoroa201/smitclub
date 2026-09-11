import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { applyToClub } from "@/lib/actions/club-memberships";
import { MembershipStatusBadge } from "@/components/admin/status-badge";

export default async function JoinClubPage(props: PageProps<"/clubs/[slug]/join">) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  const error = typeof searchParams.error === "string" ? searchParams.error : null;
  const success = searchParams.success === "1";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs")
    .select("id, slug, name, status")
    .eq("slug", slug)
    .single();

  if (!club) {
    notFound();
  }

  const { data: privateData } = await supabase
    .from("profile_private")
    .select("student_id")
    .eq("id", profile.id)
    .single();

  const { data: existingMembership } = await supabase
    .from("club_memberships")
    .select("status, applied_at")
    .eq("club_id", club.id)
    .eq("user_id", profile.id)
    .maybeSingle();

  const applyWithClubId = applyToClub.bind(null, club.id);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <Link href={`/clubs/${club.slug}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
        ← {club.name} 상세 보기
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-foreground">{club.name} 가입 신청</h1>

      {club.status !== "recruiting" ? (
        <p className="mt-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          현재 이 동아리는 가입 신청을 받지 않습니다.
        </p>
      ) : existingMembership ? (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
          <span className="text-foreground">이미 가입 신청하셨습니다.</span>
          <MembershipStatusBadge status={existingMembership.status} />
        </div>
      ) : (
        <>
          {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {success && (
            <p className="mt-4 rounded-md bg-blue-soft px-3 py-2 text-sm text-blue-dark">
              가입 신청이 접수되었습니다. 회장의 승인을 기다려주세요.
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2 rounded-card border border-border bg-card p-4 text-sm">
            <p className="font-bold text-foreground">신청자 정보</p>
            <p className="text-muted-foreground">이름 · {profile.name}</p>
            <p className="text-muted-foreground">학번 · {privateData?.student_id || "-"}</p>
            <p className="text-muted-foreground">이메일 · {user?.email ?? "-"}</p>
          </div>

          <form action={applyWithClubId} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              신청 사유 (선택)
              <textarea
                name="motivation"
                rows={4}
                placeholder="지원 동기를 간단히 적어주세요."
                className="rounded-md border border-border px-3 py-2 text-sm"
              />
            </label>

            <button
              type="submit"
              className="w-fit rounded-full bg-coral px-4 py-2.5 font-bold text-white transition-opacity hover:opacity-90"
            >
              가입 신청
            </button>
          </form>
        </>
      )}
    </main>
  );
}
