import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AlertTriangle, BadgeCheck, Clock, FileEdit as FileEditIcon, Sparkles, ThumbsUp, XCircle, type LucideIcon } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { categoryLabel, clubName, fill, getDictionary, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { getCurrentProfile } from "@/lib/auth";
import { requestOwnPasswordReset } from "@/lib/actions/auth";
import { EditContactForm } from "@/components/profile/edit-contact-form";
import { ClubStatusBadge, MembershipStatusBadge } from "@/components/admin/status-badge";
import { CATEGORY_ICON, CATEGORY_TONE } from "@/lib/constants/category-icons";
import { CLUB_CATEGORIES } from "@/lib/constants/categories";
import { ALL_DEPARTMENTS } from "@/lib/constants/departments";
import { formatDate } from "@/lib/i18n/format";

// 0009 이전 가입자는 학과·전공을 고정 목록 대신 자유 입력(profile_private.
// affiliation, 예: "미디어비즈니스학과")으로 받았다. department가 아직
// 비어있다면 그 값을 목록의 표기("미디어비즈니스전공")에 맞춰 최대한
// 매칭해 초기값으로 보여준다 — DB 값을 옮기거나 지우지는 않고 화면
// 표시에만 쓰며, 매칭되는 항목이 없으면 빈 선택으로 둔다.
// 재설정 발송 안내에 이메일을 그대로 노출하지 않기 위한 마스킹. 별표
// 개수를 고정해 실제 아이디 길이도 함께 드러나지 않게 한다.
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

function normalizeLegacyDepartment(affiliation: string | null | undefined): string {
  if (!affiliation) return "";
  const trimmed = affiliation.trim();
  if ((ALL_DEPARTMENTS as readonly string[]).includes(trimmed)) return trimmed;
  const bare = trimmed.replace(/(학과|전공)$/, "");
  return ALL_DEPARTMENTS.find((dept) => dept.replace(/(학과|전공)$/, "") === bare) ?? "";
}

// 신청 상태별 카드 톤·아바타 색·아이콘 — 흰 카드만 나열하지 않고 상태를
// 한눈에 구분할 수 있도록 아주 옅은 배경(wash)과 진한 아바타/칩 색을 짝지운다.
const STATUS_STYLE: Record<string, { wash: string; solid: string; icon: LucideIcon }> = {
  draft: { wash: "bg-muted/70", solid: "bg-muted-foreground/70", icon: FileEditIcon },
  submitted: { wash: "bg-yellow-soft/60", solid: "bg-yellow-dark", icon: Clock },
  needs_revision: { wash: "bg-purple-soft/60", solid: "bg-purple-dark", icon: AlertTriangle },
  recommended: { wash: "bg-blue-soft/60", solid: "bg-blue-dark", icon: ThumbsUp },
  approved: { wash: "bg-mint-soft/70", solid: "bg-mint-dark", icon: BadgeCheck },
  rejected: { wash: "bg-coral-soft/60", solid: "bg-coral-dark", icon: XCircle },
};

type PrivateProfileRow = {
  student_id: string | null;
  contact: string | null;
  department: string | null;
  affiliation: string | null;
};

type ApplicationRow = {
  id: string;
  club_name: string;
  club_name_en: string | null;
  status: string;
  created_at: string;
};

type MembershipRow = {
  id: string;
  status: string;
  applied_at: string;
  clubs: {
    id: string;
    name: string;
    name_en: string | null;
    slug: string;
    category: string;
    cover_image_url: string | null;
    status: string;
  } | null;
};

export default async function MyPage(props: PageProps<"/my">) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const searchParams = await props.searchParams;
  const securitySent = searchParams.security_sent === "1";

  const cookieStore = await cookies();
  const locale = await getLocale();
  const t = getDictionary(locale).account;
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? "-";

  const { data: privateData, error: privateError } = await supabase
    .from("profile_private")
    .select("student_id, contact, department, affiliation")
    .eq("id", profile.id)
    .single<PrivateProfileRow>();

  if (privateError) {
    console.error("profile_private fetch failed", privateError);
  }

  const { data: applicationsData } = await supabase
    .from("club_applications")
    .select("id, club_name, club_name_en, status, created_at")
    .eq("applicant_id", profile.id)
    .order("created_at", { ascending: false })
    .returns<ApplicationRow[]>();
  const applications = applicationsData ?? [];

  const { data: membershipsData } = await supabase
    .from("club_memberships")
    .select("id, status, applied_at, clubs(id, name, name_en, slug, category, cover_image_url, status)")
    .eq("user_id", profile.id)
    .order("applied_at", { ascending: false })
    .returns<MembershipRow[]>();
  const memberships = membershipsData ?? [];
  const joinedClubs = memberships
    .filter((m) => m.status === "approved")
    .map((m) => m.clubs)
    .filter((club): club is NonNullable<MembershipRow["clubs"]> => club !== null);

  // role === 'club_admin' 여부가 아니라 실제 clubs.president_id 연결을
  // 기준으로 노출한다 — super_admin이 회장으로 지정된 경우에도(role은
  // club_admin으로 낮추지 않으므로) 이 진입점이 보여야 한다.
  const { data: myClub } = await supabase.from("clubs").select("id").eq("president_id", profile.id).maybeSingle();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">MY</h1>

      <section className="mt-6 flex flex-col gap-4 rounded-card border border-border bg-card p-6">
        <h2 className="text-lg font-bold text-foreground">{t.profile}</h2>

        <div className="flex flex-col gap-2">
          <InfoRow label={t.name} value={profile.name} />
          <InfoRow label={t.email} value={email} />
          <InfoRow label={t.studentId} value={privateData?.student_id || "-"} />
          <InfoRow label={t.role} value={(t.roles as Record<string, string>)[profile.role] ?? profile.role} />
        </div>

        <div className="border-t border-border pt-4">
          <EditContactForm
            locale={locale}
            initialContact={privateData?.contact ?? ""}
            initialDepartment={privateData?.department || normalizeLegacyDepartment(privateData?.affiliation)}
          />
        </div>
      </section>

      <section className="mt-8 flex flex-col gap-3 rounded-card border border-border bg-card p-6">
        <h2 className="text-lg font-bold text-foreground">{t.security}</h2>
        <p className="text-sm text-muted-foreground">
          {t.securityHint}
        </p>

        {securitySent && (
          <p className="rounded-md bg-blue-soft px-3 py-2 text-sm text-blue-dark">
            {fill(t.securitySent, { email: maskEmail(email) })}
          </p>
        )}

        <form action={requestOwnPasswordReset}>
          <button
            type="submit"
            className="w-fit rounded-full bg-coral px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
          >
            {t.sendReset}
          </button>
        </form>
      </section>

      {myClub && (
        <section className="mt-8 flex items-center justify-between gap-3 rounded-card border border-border bg-card p-4">
          <p className="text-sm text-foreground">{t.manageHint}</p>
          <Link
            href="/my/club"
            className="shrink-0 rounded-full bg-coral px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
          >
            {t.manageClub}
          </Link>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-bold text-foreground">{t.applications}</h2>
        {applications.length === 0 ? (
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t.noApplications}</p>
            <Link
              href="/clubs/new"
              className="shrink-0 rounded-full bg-coral px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
            >
              {t.startClub}
            </Link>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {applications.map((application) => (
              <ApplicationCard key={application.id} application={application} locale={locale} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-foreground">{t.memberships}</h2>
        {memberships.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t.noMemberships}</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {memberships.map((membership) =>
              membership.clubs ? (
                <div
                  key={membership.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3"
                >
                  <Link href={`/clubs/${membership.clubs.slug}`} className="min-w-0 flex-1 truncate text-sm font-bold text-foreground hover:underline">
                    {membership.clubs.name}
                  </Link>
                  <MembershipStatusBadge status={membership.status} locale={locale} />
                </div>
              ) : null,
            )}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-foreground">{t.joined}</h2>
        {joinedClubs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t.noJoined}</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {joinedClubs.map((club) => (
              <MyClubCard key={club.id} club={club} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-4 text-sm">
      <span className="w-16 shrink-0 font-bold text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function ApplicationCard({
  application,
  locale,
}: {
  application: { id: string; club_name: string; club_name_en: string | null; status: string; created_at: string };
  locale: Locale;
}) {
  const t = getDictionary(locale).account;
  const style = STATUS_STYLE[application.status] ?? STATUS_STYLE.draft;
  const StatusIcon = style.icon;
  const initial = application.club_name.trim().charAt(0) || "?";

  return (
    <div className={`rounded-xl border border-border p-3 ${style.wash}`}>
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${style.solid}`}
        >
          <StatusIcon className="h-3 w-3" />
          {(getDictionary(locale).status.application as Record<string, string>)[application.status] ?? application.status}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {formatDate(application.created_at, locale)}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${style.solid}`}
        >
          {initial}
        </div>
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{clubName(application.club_name, application.club_name_en, locale)}</p>
        <Link
          href={`/club-applications/${application.id}/documents/registration`}
          className="shrink-0 text-[11px] font-bold text-coral hover:underline"
        >
          {t.viewApplication}
        </Link>
      </div>
    </div>
  );
}

function MyClubCard({
  club,
  locale,
}: {
  club: { id: string; name: string; name_en: string | null; slug: string; category: string; cover_image_url: string | null; status: string };
  locale: Locale;
}) {
  const categoryIndex = CLUB_CATEGORIES.indexOf(club.category as (typeof CLUB_CATEGORIES)[number]);
  const tone = CATEGORY_TONE[(categoryIndex < 0 ? 0 : categoryIndex) % CATEGORY_TONE.length];
  const wash = `${tone.split(" ")[0]}/30`;
  const CategoryIcon = CATEGORY_ICON[club.category as keyof typeof CATEGORY_ICON] ?? Sparkles;

  return (
    <Link
      href={`/clubs/${club.slug}`}
      className={`flex items-center gap-2.5 rounded-xl border border-border p-3 hover:opacity-90 ${wash}`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}>
        <CategoryIcon className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">{clubName(club.name, club.name_en, locale)}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{categoryLabel(club.category, locale)}</p>
      </div>
      <ClubStatusBadge status={club.status} locale={locale} />
    </Link>
  );
}
