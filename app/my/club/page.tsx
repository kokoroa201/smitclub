import { clubName, fill, getDictionary } from "@/lib/i18n";
import { formatDate } from "@/lib/i18n/format";

import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getLocale } from "@/lib/i18n/server";
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
  description_en: string | null;
  cover_image_url: string | null;
  activities: string | null;
  activities_en: string | null;
  meeting_day: string | null;
  meeting_day_en: string | null;
  meeting_time: string | null;
  meeting_location: string | null;
  meeting_location_en: string | null;
  sns_url: string | null;
  recruiting_post: string | null;
  recruiting_post_en: string | null;
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
  const locale = await getLocale();
  const t = getDictionary(locale).clubManage;
  const supabase = createClient(cookieStore);

  const readClub = (columns: string) => supabase.from("clubs").select(columns).eq("president_id", profile.id).maybeSingle<MyClub>();
  let clubResult = await readClub("id, slug, name, name_en, description, description_en, cover_image_url, activities, activities_en, meeting_day, meeting_day_en, meeting_time, meeting_location, meeting_location_en, sns_url, recruiting_post, recruiting_post_en");
  if (clubResult.error?.code === "42703" || clubResult.error?.code === "PGRST204") {
    clubResult = await readClub("id, slug, name, name_en, description, description_en, cover_image_url, activities, meeting_day, meeting_time, meeting_location, sns_url, recruiting_post");
  }
  const club = clubResult.data;

  if (!club) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t.noClub}
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
        {fill(t.back, { name: clubName(club.name, club.name_en, locale) })}
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-foreground">{t.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t.scope}
      </p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {success && (
        <p className="mt-4 rounded-md bg-blue-soft px-3 py-2 text-sm text-blue-dark">{t.saved}</p>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-bold text-foreground">{t.memberships}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {fill(t.reviewHint, { name: clubName(club.name, club.name_en, locale) })}
        </p>

        {pendingMemberships.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t.noPending}</p>
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
                    <p className="font-bold text-foreground">{membership.profiles?.name ?? t.unknown}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(membership.applied_at, locale)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.studentId} {applicantPrivate?.student_id || "-"} {t.department} {department}
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
                        {t.approve}
                      </button>
                    </form>
                    <form action={reject}>
                      <button
                        type="submit"
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                      >
                        {t.reject}
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
            <h3 className="text-sm font-bold text-muted-foreground">{t.reviewed}</h3>
            <div className="mt-2 flex flex-col gap-2">
              {decidedMemberships.map((membership) => (
                <div
                  key={membership.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="text-foreground">{membership.profiles?.name ?? t.unknown}</span>
                  <MembershipStatusBadge status={membership.status} locale={locale} />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-bold text-foreground">{t.edit}</h2>
      </div>

      <form action={updateMyClubWithId} className="mt-4 flex flex-col gap-5">
        <p className={hintClass}>{t.fallbackHint}</p>
        <label className={labelClass}>
          {t.description}
          <span className={hintClass}>{t.descriptionHint}</span>
          <textarea name="description" rows={4} defaultValue={club.description ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          {t.descriptionEn}
          <textarea name="description_en" rows={4} defaultValue={club.description_en ?? ""} className={inputClass} />
        </label>

        <CoverImageField currentUrl={club.cover_image_url} locale={locale} />

        <label className={labelClass}>
          {t.activities}
          <span className={hintClass}>{t.activitiesHint}</span>
          <textarea name="activities" rows={3} defaultValue={club.activities ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          {t.activitiesEn}
          <textarea name="activities_en" rows={3} defaultValue={club.activities_en ?? ""} className={inputClass} />
        </label>

        <div className={labelClass}>
          {t.meeting}
          <span className={hintClass}>{t.meetingHint}</span>
          <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className={labelClass}>
              {t.day}
              <input name="meeting_day" placeholder={t.dayPlaceholder} defaultValue={club.meeting_day ?? ""} className={inputClass} />
            </label>
            <label className={labelClass}>
              {t.time}
              <input name="meeting_time" placeholder={t.timePlaceholder} defaultValue={club.meeting_time ?? ""} className={inputClass} />
            </label>
            <label className={labelClass}>
              {t.location}
              <input name="meeting_location" placeholder={t.locationPlaceholder} defaultValue={club.meeting_location ?? ""} className={inputClass} />
            </label>
          </div>
          <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              {t.dayEn}
              <input name="meeting_day_en" defaultValue={club.meeting_day_en ?? ""} className={inputClass} />
            </label>
            <label className={labelClass}>
              {t.locationEn}
              <input name="meeting_location_en" defaultValue={club.meeting_location_en ?? ""} className={inputClass} />
            </label>
          </div>
        </div>

        <label className={labelClass}>
          {t.social}
          <span className={hintClass}>{t.socialHint}</span>
          <input type="url" name="sns_url" placeholder="https://" defaultValue={club.sns_url ?? ""} className={inputClass} />
        </label>

        <label className={labelClass}>
          {t.recruitment}
          <span className={hintClass}>{t.recruitmentHint}</span>
          <textarea name="recruiting_post" rows={4} defaultValue={club.recruiting_post ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          {t.recruitmentEn}
          <textarea name="recruiting_post_en" rows={4} defaultValue={club.recruiting_post_en ?? ""} className={inputClass} />
        </label>

        <button
          type="submit"
          className="w-fit rounded-full bg-coral px-4 py-2.5 font-bold text-white transition-opacity hover:opacity-90"
        >
          {t.save}
        </button>
      </form>
    </main>
  );
}
