import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { ArrowRight, Rocket, Search, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { ClubCard, type ClubCardData } from "@/components/clubs/club-card";
import { CategoryExplorer } from "@/components/home/category-explorer";
import { SchoolNews } from "@/components/home/school-news";
import { HeroArt } from "@/components/home/hero-art";

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
      {/* Hero */}
      <section className="px-4 pt-4 sm:pt-5">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-card bg-gradient-to-br from-coral-soft via-yellow-soft to-blue-soft">
          <div className="flex items-center gap-3 px-5 py-4 sm:gap-6 sm:px-8 sm:py-6 lg:gap-10 lg:px-12 lg:py-9">
            <div className="flex-1">
              <h1 className="text-[19px] font-extrabold leading-tight text-foreground sm:text-[26px] lg:text-4xl">
                학교생활, 같이하면 더 재밌어요 <span className="inline-block">👋</span>
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground sm:text-sm lg:text-base">
                새로운 동아리를 만들거나 나에게 맞는 동아리를 찾아보세요.
              </p>
            </div>
            <HeroArt />
          </div>
        </div>
      </section>

      {/* 만들기 / 찾아보기 */}
      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-3 px-4 pt-5 sm:grid-cols-2 sm:gap-4 lg:pt-6">
        <Link
          href="/clubs/new"
          className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-card bg-gradient-to-br from-coral to-coral-dark px-5 py-4 text-white shadow-md shadow-coral/25 transition-transform hover:scale-[1.01] sm:px-6 sm:py-5"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Rocket className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold sm:text-lg">동아리 만들기</h3>
              <p className="text-xs text-white/85 sm:text-sm">5명만 모이면 시작할 수 있어요</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0" />
        </Link>

        <Link
          href="/clubs"
          className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-card bg-gradient-to-br from-blue to-purple px-5 py-4 text-white shadow-md shadow-blue/25 transition-transform hover:scale-[1.01] sm:px-6 sm:py-5"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Search className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold sm:text-lg">동아리 찾아보기</h3>
              <p className="text-xs text-white/85 sm:text-sm">모집 중인 동아리를 만나보세요</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0" />
        </Link>
      </section>

      {/* 모집 중 동아리 — HOME의 핵심 콘텐츠 */}
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">지금 모집 중인 동아리</h2>
          <Link href="/clubs" className="text-xs font-bold text-muted-foreground hover:text-foreground sm:text-sm">
            전체보기
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <ClubCard key={club.slug} club={club} />
          ))}

          <Link
            href="/clubs/new"
            className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-card shadow-sm transition-transform hover:scale-[1.01] sm:flex-row"
          >
            <div className="flex flex-1 flex-col justify-center gap-3 p-6 sm:p-7 lg:p-8">
              <span className="w-fit rounded-full bg-purple-soft px-2.5 py-1 text-xs font-bold text-purple-dark">
                개설 대기 중
              </span>
              <h3 className="text-xl font-extrabold text-foreground sm:text-2xl">다음 동아리의 주인공은?</h3>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                하고 싶었던 활동을 직접 시작해보세요.
              </p>
              <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-coral/30 transition-transform group-hover:scale-105">
                동아리 만들기 <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <div className="relative h-40 w-full shrink-0 sm:h-auto sm:w-2/5 lg:w-1/2">
              <Image src="/next-club.png" alt="" fill className="object-cover" />
            </div>
          </Link>
        </div>
      </section>

      <CategoryExplorer />
      <SchoolNews />

      {/* 통계 */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-10">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
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
