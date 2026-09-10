import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { CalendarDays, MapPin, Sparkles } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { CATEGORY_ICON } from "@/lib/constants/category-icons";
import { ClubStatusBadge } from "@/components/admin/status-badge";

type ClubDetail = {
  slug: string;
  name: string;
  name_en: string | null;
  category: string;
  status: string;
  description: string | null;
  cover_image_url: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  meeting_location: string | null;
  founded_year: number | null;
  advisor_name: string | null;
  advisor_department: string | null;
  sns_url: string | null;
  recruiting_post: string | null;
};

export default async function ClubDetailPage(props: PageProps<"/clubs/[slug]">) {
  const { slug } = await props.params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: club } = await supabase
    .from("clubs")
    .select(
      "slug, name, name_en, category, status, description, cover_image_url, meeting_day, meeting_time, meeting_location, founded_year, advisor_name, advisor_department, sns_url, recruiting_post",
    )
    .eq("slug", slug)
    .single<ClubDetail>();

  if (!club) {
    notFound();
  }

  const CategoryIcon = CATEGORY_ICON[club.category as keyof typeof CATEGORY_ICON] ?? Sparkles;
  const meetingInfo = [club.meeting_day, club.meeting_time].filter(Boolean).join(" · ");

  // 지도교수 정보는 학생에게 성명·소속 학과/전공만 공개한다. 학교
  // 이메일·확인 메모·확인일시·확인자는 관리자 전용 정보라 이 페이지에서는
  // 애초에 조회하지 않는다(위 select 목록 참고). 기존 동아리에 지도교수
  // 정보가 없을 수 있으므로(개편 이전 승인 건) 값이 없으면 항목 자체를 숨긴다.
  const advisorLabel = club.advisor_name
    ? `${club.advisor_name} 교수${club.advisor_department ? ` · ${club.advisor_department}` : ""}`
    : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <Link href="/clubs" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
        ← 동아리 목록으로
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
                {club.category}
              </span>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {club.name}
                {club.name_en && (
                  <span className="ml-2 text-base font-medium text-muted-foreground">({club.name_en})</span>
                )}
              </h1>
            </div>
            <ClubStatusBadge status={club.status} />
          </div>

          {club.description && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground sm:text-base">
              {club.description}
            </p>
          )}

          <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
            {meetingInfo && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>정기 모임 · {meetingInfo}</span>
              </div>
            )}
            {club.meeting_location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{club.meeting_location}</span>
              </div>
            )}
            {club.founded_year && <div>설립 연도 · {club.founded_year}</div>}
            {advisorLabel && <div>지도교수 &nbsp; {advisorLabel}</div>}
            {club.sns_url && (
              <div>
                SNS ·{" "}
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

          {club.recruiting_post && (
            <div className="border-t border-border pt-4">
              <h2 className="text-sm font-bold text-foreground">모집 안내</h2>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {club.recruiting_post}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
