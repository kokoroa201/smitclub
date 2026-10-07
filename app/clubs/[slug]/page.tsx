import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { CalendarDays, MapPin, Sparkles } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { categoryLabel, clubText, clubName, fill, getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { CATEGORY_ICON } from "@/lib/constants/category-icons";
import { ClubStatusBadge } from "@/components/admin/status-badge";

type ClubDetail = {
  slug: string;
  name: string;
  name_en: string | null;
  category: string;
  status: string;
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
  founded_year: number | null;
  advisor_name: string | null;
  advisor_department: string | null;
  sns_url: string | null;
  recruiting_post: string | null;
  recruiting_post_en: string | null;
};

export default async function ClubDetailPage(props: PageProps<"/clubs/[slug]">) {
  const { slug } = await props.params;
  const cookieStore = await cookies();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const supabase = createClient(cookieStore);

  const readClub = (columns: string) => supabase.from("clubs").select(columns).eq("slug", slug).single<ClubDetail>();
  let clubResult = await readClub("slug, name, name_en, category, status, description, description_en, cover_image_url, activities, activities_en, meeting_day, meeting_day_en, meeting_time, meeting_location, meeting_location_en, founded_year, advisor_name, advisor_department, sns_url, recruiting_post, recruiting_post_en");
  if (clubResult.error?.code === "42703" || clubResult.error?.code === "PGRST204") {
    clubResult = await readClub("slug, name, name_en, category, status, description, description_en, cover_image_url, activities, meeting_day, meeting_time, meeting_location, founded_year, advisor_name, advisor_department, sns_url, recruiting_post");
  }
  const club = clubResult.data;

  if (!club) {
    notFound();
  }

  const description = clubText(club.description, club.description_en, locale);
  const activities = clubText(club.activities, club.activities_en, locale);
  const recruitingPost = clubText(club.recruiting_post, club.recruiting_post_en, locale);
  const meetingLocation = clubText(club.meeting_location, club.meeting_location_en, locale);
  const CategoryIcon = CATEGORY_ICON[club.category as keyof typeof CATEGORY_ICON] ?? Sparkles;
  const meetingInfo = [clubText(club.meeting_day, club.meeting_day_en, locale), club.meeting_time].filter(Boolean).join(" · ");

  // 지도교수 정보는 학생에게 성명·소속 학과/전공만 공개한다. 학교
  // 이메일·확인 메모·확인일시·확인자는 관리자 전용 정보라 이 페이지에서는
  // 애초에 조회하지 않는다(위 select 목록 참고). 기존 동아리에 지도교수
  // 정보가 없을 수 있으므로(개편 이전 승인 건) 값이 없으면 항목 자체를 숨긴다.
  const advisorLabel = club.advisor_name
    ? `${fill(t.clubDetail.professor, { name: club.advisor_name })}${club.advisor_department ? ` · ${club.advisor_department}` : ""}`
    : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <Link href="/clubs" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
        {t.clubDetail.back}
      </Link>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
        <div
          className="relative flex h-40 w-full items-center justify-center bg-muted bg-cover sm:h-64"
          style={club.cover_image_url ? { backgroundImage: `url(${club.cover_image_url})` } : undefined}
        >
          {!club.cover_image_url && <CategoryIcon className="h-12 w-12 text-muted-foreground/30" strokeWidth={1.5} />}
        </div>

        <div className="flex flex-col gap-4 p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="w-fit rounded-full bg-coral-soft px-2.5 py-1 text-xs font-semibold text-coral-dark">
                {categoryLabel(club.category, locale)}
              </span>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {clubName(club.name, club.name_en, locale)}
              </h1>
            </div>
            <ClubStatusBadge status={club.status} locale={locale} />
          </div>

          {club.status === "recruiting" && (
            <Link
              href={`/clubs/${club.slug}/join`}
              className="w-fit rounded-full bg-coral px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              {t.clubCard.join}
            </Link>
          )}

          {description && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground sm:text-base">
              {description}
            </p>
          )}

          <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
            {activities && (
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 shrink-0 translate-y-0.5" />
                <span className="whitespace-pre-wrap">{activities}</span>
              </div>
            )}
            {meetingInfo && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>{t.clubDetail.meeting} · {meetingInfo}</span>
              </div>
            )}
            {meetingLocation && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{meetingLocation}</span>
              </div>
            )}
            {club.founded_year && <div>{t.clubDetail.founded} · {club.founded_year}</div>}
            {advisorLabel && <div>{t.clubDetail.advisor} &nbsp; {advisorLabel}</div>}
            {club.sns_url && (
              <div>
                {t.clubDetail.social} ·{" "}
                <a
                  href={club.sns_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-semibold text-coral-dark hover:underline"
                >
                  {club.sns_url}
                </a>
              </div>
            )}
          </div>

          {recruitingPost && (
            <div className="border-t border-border pt-4">
              <h2 className="text-sm font-bold text-foreground">{t.clubDetail.recruitment}</h2>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {recruitingPost}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
