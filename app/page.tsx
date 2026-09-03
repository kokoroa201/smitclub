import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { ArrowRight, Sparkles, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { ClubCard, type ClubCardData } from "@/components/clubs/club-card";
import { ClubCardMini } from "@/components/clubs/club-card-mini";
import { NextClubCard, NextClubCardMini } from "@/components/home/next-club-card";
import { SchoolNews } from "@/components/home/school-news";
import { HeroArt } from "@/components/home/hero-art";
import { HomeFreshness } from "@/components/home/home-freshness";

async function getRecruitingClubs(): Promise<ClubCardData[]> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data } = await supabase
      .from("clubs")
      .select("slug, name, category, description, cover_image_url, meeting_day, meeting_location")
      .eq("status", "recruiting")
      .order("created_at", { ascending: false })
      .limit(5);

    return (data ?? []).map((club) => ({
      slug: club.slug,
      name: club.name,
      category: club.category,
      description: club.description,
      coverImageUrl: club.cover_image_url,
      meetingDay: club.meeting_day,
      meetingLocation: club.meeting_location,
    }));
  } catch {
    return [];
  }
}

export default async function Home() {
  const clubs = await getRecruitingClubs();

  return (
    <div className="flex flex-col">
      <HomeFreshness />

      {/* 모바일 전용 Hero — 배지+제목+설명만, 120~145px 높이. CTA는 하단
          MAKE 버튼/동아리 탭과 중복되므로 Hero 안에 두지 않는다.
          640px(sm) 이상에서는 아래의 데스크톱 Hero로 대체된다. */}
      <div className="sm:hidden">
        <section className="px-4 pt-3">
          <div className="relative min-h-[120px] max-h-[145px] overflow-hidden rounded-lg border border-border bg-white px-4 py-4">
            <div
              className="pointer-events-none absolute bottom-0 right-0 h-[184px] w-[300px] opacity-70"
              style={{
                maskImage: "radial-gradient(140% 140% at 100% 100%, black 55%, transparent 92%)",
                WebkitMaskImage: "radial-gradient(140% 140% at 100% 100%, black 55%, transparent 92%)",
              }}
            >
              <Image
                src="/hero-students-5.png"
                alt=""
                fill
                sizes="300px"
                className="object-contain object-right-bottom"
              />
            </div>
            <div className="relative z-10">
              <span className="inline-flex items-center rounded-full bg-coral-soft px-2.5 py-0.5 text-[11px] font-semibold text-coral-dark">
                2026 동아리 시즌
              </span>
              <h1 className="mt-2 text-xl font-bold leading-snug tracking-tight text-foreground">
                학교생활, <span className="text-coral">함께할 때</span> 더 즐거워요
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                관심사가 맞는 동아리를 찾거나, 새로운 동아리를 직접 시작해보세요.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* 태블릿/데스크톱 Hero — 하나의 장면처럼 보이는 배경 이미지. CTA 카드는
          제거(하단/상단 내비의 MAKE·동아리 진입점과 중복되어 있었음). */}
      <div className="hidden sm:block">
        <section className="px-4 pt-4 sm:pt-6">
          <div className="relative mx-auto min-h-[380px] max-w-6xl overflow-hidden rounded-lg border border-border bg-white sm:min-h-[420px] lg:min-h-[480px]">
            <HeroArt />
            <div className="relative z-10 w-[58%] px-5 py-10 sm:w-[52%] sm:px-8 sm:py-12 lg:w-[46%] lg:px-12 lg:py-16">
              <span className="inline-flex items-center rounded-full bg-coral-soft px-3 py-1 text-xs font-semibold text-coral-dark">
                2026 동아리 시즌
              </span>
              <h1 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                학교생활, <span className="text-coral">함께할 때</span> 더 즐거워요
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                관심사가 맞는 동아리를 찾거나, 새로운 동아리를 직접 시작해보세요.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* 모집 중 동아리 — Hero 바로 아래, HOME의 핵심 콘텐츠 */}
      <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:py-10 lg:py-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl lg:text-2xl">
              지금 모집 중인 동아리
            </h2>
            {clubs.length > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                {clubs.length}개 동아리가 함께할 원우를 찾고 있어요.
              </p>
            )}
          </div>
          <Link href="/clubs" className="text-xs font-semibold text-muted-foreground hover:text-foreground sm:text-sm">
            전체보기
          </Link>
        </div>

        {clubs.length === 0 ? (
          <div className="mt-3 flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-white px-6 py-10 text-center sm:mt-5 sm:py-16">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-coral-soft text-coral-dark">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-foreground">아직 모집 중인 동아리가 없어요</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                SMIT CLUB은 이제 막 시작했어요. 첫 동아리의 주인공이 되어보세요.
              </p>
            </div>
            <Link
              href="/clubs/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-coral/25 transition-colors hover:bg-coral-dark"
            >
              동아리 만들기 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* 모바일 — 가로 스와이프형 카드. 섹션의 px-4를 그대로 물려받고
                음수 마진으로 상쇄하지 않는다 — 첫 카드 left edge가 Hero/제목과
                정확히 같은 세로선에 있어야 하므로 full-bleed로 빼지 않음. */}
            <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:hidden">
              {clubs.map((club) => (
                <ClubCardMini key={club.slug} club={club} />
              ))}
              <NextClubCardMini />
            </div>

            {/* 태블릿/데스크톱 — 기존 그리드 */}
            <div className="hidden sm:mt-5 sm:grid sm:grid-cols-2 sm:items-stretch sm:gap-5 lg:grid-cols-3">
              {clubs.map((club) => (
                <ClubCard key={club.slug} club={club} />
              ))}
              <NextClubCard />
            </div>
          </>
        )}
      </section>

      {/* 학교 & 원우회 소식 — 모집 중 동아리 바로 아래 */}
      <SchoolNews />

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
            <p className="text-sm font-bold text-foreground">360명의 원우와 함께 시작하는 SMIT CLUB</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              내국인 101 · 외국인 259 · 2026 동아리 제도 시작
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
