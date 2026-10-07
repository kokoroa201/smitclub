import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { getCurrentProfile } from "@/lib/auth";
import { applyToClub } from "@/lib/actions/club-memberships";
import { MembershipStatusBadge } from "@/components/admin/status-badge";
import { clubName, fill, getDictionary } from "@/lib/i18n";

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
  const locale = await getLocale();
  const t = getDictionary(locale).clubJoin;
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs")
    .select("id, slug, name, name_en, status")
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
  const name = clubName(club.name, club.name_en, locale);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <Link href={`/clubs/${club.slug}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
        {fill(t.back, { name })}
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-foreground">{fill(t.title, { name })}</h1>
      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {success && (
        <p role="status" className="mt-4 rounded-md bg-blue-soft px-3 py-2 text-sm text-blue-dark">{t.success}</p>
      )}

      {club.status !== "recruiting" ? (
        <p className="mt-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          {t.closed}
        </p>
      ) : existingMembership || success ? (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
          <span className="text-foreground">{t.alreadyApplied}</span>
          {existingMembership && <MembershipStatusBadge status={existingMembership.status} locale={locale} />}
        </div>
      ) : (
        <>

          <div className="mt-6 flex flex-col gap-2 rounded-card border border-border bg-card p-4 text-sm">
            <p className="font-bold text-foreground">{t.applicant}</p>
            <p className="text-muted-foreground">{t.name} · {profile.name}</p>
            <p className="text-muted-foreground">{t.studentId} · {privateData?.student_id || "-"}</p>
            <p className="text-muted-foreground">{t.email} · {user?.email ?? "-"}</p>
          </div>

          <form action={applyWithClubId} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              {t.motivation}
              <textarea
                name="motivation"
                rows={4}
                placeholder={t.motivationPlaceholder}
                className="rounded-md border border-border px-3 py-2 text-sm"
              />
            </label>

            <button
              type="submit"
              className="w-fit rounded-full bg-coral px-4 py-2.5 font-bold text-white transition-opacity hover:opacity-90"
            >
              {t.submit}
            </button>
          </form>
        </>
      )}
    </main>
  );
}
