import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { ArrowRight, Sparkles } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { ClubListCard, ClubListPlaceholderCard, type ClubListItem } from "@/components/clubs/club-list-card";

const STATUS_TABS = ["all", "recruiting", "active"] as const;

type StatusFilter = (typeof STATUS_TABS)[number];

function toClubListItem(club: {
  slug: string;
  name: string;
  name_en: string | null;
  category: string;
  description: string | null;
  description_en: string | null;
  activities: string | null;
  activities_en: string | null;
  status: string;
  cover_image_url: string | null;
}): ClubListItem {
  return {
    slug: club.slug,
    name: club.name,
    nameEn: club.name_en,
    category: club.category,
    description: club.description,
    descriptionEn: club.description_en,
    activities: club.activities,
    activitiesEn: club.activities_en,
    status: club.status,
    coverImageUrl: club.cover_image_url,
  };
}

export default async function ClubsPage(props: PageProps<"/clubs">) {
  const searchParams = await props.searchParams;
  const statusParam = typeof searchParams.status === "string" ? searchParams.status : "all";
  const statusFilter: StatusFilter = STATUS_TABS.some((tab) => tab === statusParam)
    ? (statusParam as StatusFilter)
    : "all";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const readClubs = (columns: string) => {
    let query = supabase
      .from("clubs")
      .select(columns)
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    return query.returns<Parameters<typeof toClubListItem>[0][]>();
  };
  let result = await readClubs("slug, name, name_en, category, description, description_en, activities, activities_en, status, cover_image_url");
  if (result.error?.code === "42703" || result.error?.code === "PGRST204") {
    result = await readClubs("slug, name, name_en, category, description, description_en, activities, status, cover_image_url");
  }
  const { data } = result;
  const clubs = (data ?? []).map(toClubListItem);
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      {/* 비주얼 배너 — 하나의 긴 통합 배너 박스(모바일 150px / 데스크톱
          270px 고정)를 object-cover로 꽉 채운다. objectPosition
          "right 15%"로 기본 크롭을 잡은 뒤, 얼굴이 더 또렷하게 보이도록
          scale(1.35)로 추가 확대한다. transformOrigin을 얼굴이 몰린
          지점(78% 40%, 박스 기준)에 고정해 확대해도 네 명의 머리·얼굴·
          카메라·기타가 프레임 안에 남고, 대신 하체·계단·신발 쪽이 더
          잘리는 방향으로 크롭되게 한다. 텍스트 가독성용 크림색
          그라데이션은 문구가 있는 왼쪽 영역에만 좁게 둔다. */}
      <section className="relative h-[150px] overflow-hidden rounded-lg sm:h-[270px]">
        <Image
          src="/clubs-banner.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "right 15%", transform: "scale(1.35)", transformOrigin: "78% 40%" }}
          priority
        />
        <div className="absolute inset-y-0 left-0 w-[70%] bg-gradient-to-r from-white/95 via-white/60 to-transparent sm:w-[55%] sm:from-white/90 sm:via-white/40" />
        <div className="absolute inset-0 z-10 flex max-w-[62%] flex-col justify-center px-4 py-8 sm:max-w-[46%] sm:px-8 sm:py-14">
          <h1 className="text-lg font-extrabold leading-snug text-[#16234a] sm:text-2xl lg:text-3xl">
            {t.clubsPage.title}
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[#2f3b5c] sm:mt-2 sm:text-base">
            {t.clubsPage.intro}
          </p>
        </div>
      </section>

      {/* 동아리 안내(개설 절차·운영규정·표준 회칙) 진입 카드 — 로그인 여부와
          무관하게 누구나 볼 수 있는 /club-rules로 바로 연결한다. 목록을
          방해하지 않도록 가로 한 줄짜리 카드 하나로 좁게 둔다. */}
      <Link
        href="/club-rules"
        className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-white px-4 py-2.5 transition-colors hover:bg-muted/50 sm:mt-5 sm:py-3 in-data-[font-size=large]:py-3"
      >
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{t.clubsPage.guideTitle}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
            {t.clubsPage.guideBody}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-coral-soft px-2.5 py-1 text-xs font-bold text-coral-dark sm:px-3 sm:py-1.5 sm:text-sm in-data-[font-size=large]:px-3 in-data-[font-size=large]:py-1.5">
          {t.clubsPage.guideCta}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>

      {/* 상태 탭 */}
      <div className="mt-4 flex gap-2 sm:mt-6">
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab;
          const href = tab === "all" ? "/clubs" : `/clubs?status=${tab}`;
          return (
            <Link
              key={tab}
              href={href}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                active ? "bg-coral text-white" : "border border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {t.clubsPage.tabs[tab]}
            </Link>
          );
        })}
      </div>

      {clubs.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 py-10 text-center sm:mt-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral-soft text-coral-dark">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="text-sm text-muted-foreground">{t.clubsPage.empty[statusFilter]}</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-6">
          {clubs.map((club) => (
            <ClubListCard key={club.slug} club={club} locale={locale} />
          ))}
          {clubs.length === 1 && <ClubListPlaceholderCard locale={locale} />}
        </div>
      )}

      {clubs.length !== 1 && (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-6 text-center sm:mt-10 sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm font-medium text-muted-foreground sm:text-base">{t.clubsPage.missing}</p>
          <Link
            href="/clubs/new"
            className="shrink-0 rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-coral-dark"
          >
            {t.clubCard.createClub}
          </Link>
        </div>
      )}
    </main>
  );
}
