import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, Sparkles, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { fill, getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { ClubCard, type ClubCardData } from "@/components/clubs/club-card";
import { ClubCardMini } from "@/components/clubs/club-card-mini";
import { NextClubCard, NextClubCardMini } from "@/components/home/next-club-card";
import { NewsPreview } from "@/components/home/news-preview";
import { HomeFreshness } from "@/components/home/home-freshness";

// SUDA는 모집 상태와 무관하게 홈에 카드 1개가 항상 보여야 하는 대표
// 동아리라서, status 필터와 별개로 항상 목록에 포함시킨다(이미 recruiting
// 상태로 조회됐다면 중복 추가하지 않는다).
const PINNED_CLUB_SLUG = "suda";

function toClubCardData(club: {
  slug: string;
  name: string;
  name_en: string | null;
  category: string;
  description: string | null;
  cover_image_url: string | null;
  meeting_day: string | null;
  meeting_location: string | null;
}): ClubCardData {
  return {
    slug: club.slug,
    name: club.name,
    nameEn: club.name_en,
    category: club.category,
    description: club.description,
    coverImageUrl: club.cover_image_url,
    meetingDay: club.meeting_day,
    meetingLocation: club.meeting_location,
  };
}

async function getRecruitingClubs(): Promise<ClubCardData[]> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const [{ data }, { data: pinned }] = await Promise.all([
      supabase
        .from("clubs")
        .select("slug, name, name_en, category, description, cover_image_url, meeting_day, meeting_location")
        .eq("status", "recruiting")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("clubs")
        .select("slug, name, name_en, category, description, cover_image_url, meeting_day, meeting_location")
        .eq("slug", PINNED_CLUB_SLUG)
        .maybeSingle(),
    ]);

    const clubs = (data ?? []).map(toClubCardData);

    if (pinned && !clubs.some((club) => club.slug === PINNED_CLUB_SLUG)) {
      clubs.push(toClubCardData(pinned));
    }

    return clubs;
  } catch {
    return [];
  }
}

export default async function Home() {
  const [clubs, locale] = await Promise.all([getRecruitingClubs(), getLocale()]);
  const t = getDictionary(locale);

  return (
    <div className="flex flex-col">
      <HomeFreshness />

      {/* 모바일 Hero — 일러스트 제거, 텍스트만 세로 중앙 배치한 짧은 배너.
          min-h만 두고 max-h/overflow 고정은 두지 않아, 큰 글씨 모드에서
          텍스트가 늘어나면 배너 높이도 함께 늘어나 잘리지 않는다. */}
      <div className="sm:hidden">
        <section className="px-4 pt-3">
          <div className="flex min-h-[140px] flex-col items-center justify-center gap-1.5 rounded-lg border border-border/50 bg-gradient-to-r from-coral-soft/50 to-white px-4 py-4 text-center">
            <span className="inline-flex w-fit items-center rounded-full bg-coral-soft px-2.5 py-0.5 text-[11px] font-semibold text-coral-dark">
              {t.home.season}
            </span>
            {/* 모바일 Hero는 언어와 무관하게 2줄로 고정 —
                둘째 줄은 nowrap이라 좁은 화면·큰 글씨 모드에서도 "즐거워/요"처럼
                다시 갈라지지 않는다. */}
            <h1 className="text-xl leading-snug tracking-tight">
              <span className="block font-semibold text-slate-800">{t.home.heroStart}</span>
              <span className="block whitespace-nowrap">
                <span className="font-bold text-coral-dark">{t.home.heroHighlight}</span>{" "}
                <span className="font-semibold text-slate-800">{t.home.heroEnd}</span>
              </span>
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t.home.intro}
            </p>
          </div>
        </section>
      </div>

      {/* 태블릿/데스크톱 Hero — 마찬가지로 일러스트 없이 텍스트만 세로 중앙
          배치한 짧은 배너. */}
      <div className="hidden sm:block">
        <section className="px-4 pt-4 sm:pt-6">
          <div className="mx-auto flex min-h-[150px] max-w-6xl flex-col items-center justify-center gap-1.5 rounded-lg border border-border/50 bg-gradient-to-r from-coral-soft/50 to-white px-7 py-5 text-center lg:px-10">
            <span className="inline-flex w-fit items-center rounded-full bg-coral-soft px-3 py-1 text-xs font-semibold text-coral-dark">
              {t.home.season}
            </span>
            <h1 className="text-2xl leading-tight tracking-tight sm:whitespace-nowrap sm:text-3xl lg:text-4xl">
              <span className="font-semibold text-slate-800">{t.home.heroStart}</span>{" "}
              <span className="font-bold text-coral-dark">{t.home.heroHighlight}</span>{" "}
              <span className="font-semibold text-slate-800">{t.home.heroEnd}</span>
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t.home.intro}
            </p>
          </div>
        </section>
      </div>

      {/* 모집 중 동아리 — Hero 바로 아래, HOME의 핵심 콘텐츠 */}
      <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:pb-10 sm:pt-7 lg:pb-12 lg:pt-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl lg:text-2xl">
              {t.home.recruiting}
            </h2>
            {clubs.length > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                {fill(clubs.length === 1 ? t.home.countOne : t.home.countMany, { count: String(clubs.length) })}
              </p>
            )}
          </div>
          <Link href="/clubs" className="text-xs font-semibold text-muted-foreground hover:text-foreground sm:text-sm">
            {t.newsPreview.viewAll}
          </Link>
        </div>

        {clubs.length === 0 ? (
          <div className="mt-3 flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-white px-6 py-10 text-center sm:mt-5 sm:py-16">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-coral-soft text-coral-dark">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-foreground">{t.home.emptyTitle}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {t.home.emptyBody}
              </p>
            </div>
            <Link
              href="/clubs/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-coral/25 transition-colors hover:bg-coral-dark"
            >
              {t.nav.makeClub} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* 모바일 — 가로 스와이프형 카드. 섹션의 px-4를 그대로 물려받고
                음수 마진으로 상쇄하지 않는다 — 첫 카드 left edge가 Hero/제목과
                정확히 같은 세로선에 있어야 하므로 full-bleed로 빼지 않음. */}
            <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:hidden">
              {clubs.map((club) => (
                <ClubCardMini key={club.slug} club={club} locale={locale} />
              ))}
              <NextClubCardMini locale={locale} />
            </div>

            {/* 태블릿/데스크톱 — 기존 그리드 */}
            <div className="hidden sm:mt-5 sm:grid sm:grid-cols-2 sm:items-stretch sm:gap-5 lg:grid-cols-3">
              {clubs.map((club) => (
                <ClubCard key={club.slug} club={club} locale={locale} />
              ))}
              <NextClubCard locale={locale} />
            </div>
          </>
        )}
      </section>

      {/* 소식(공지·학사일정) 미리보기 — 모집 중 동아리 바로 아래 */}
      <NewsPreview locale={locale} />

      {/* 이런 동아리 어때요? (카테고리 탐색)는 동아리 수가 늘어나 분류가
          필요해지면 다시 노출한다. 컴포넌트는 components/home/category-explorer.tsx
          에 그대로 남아있음 — 재활성화 시 이 자리에 <CategoryExplorer />만
          추가하면 됨. */}

      {/* 통계 */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-6 sm:pb-10">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-soft text-coral-dark">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">{t.home.community}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t.home.stats}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
