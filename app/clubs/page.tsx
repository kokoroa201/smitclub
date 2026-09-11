import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { Sparkles } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { ClubListCard, ClubListPlaceholderCard, type ClubListItem } from "@/components/clubs/club-list-card";

const STATUS_TABS = [
  { key: "all", label: "전체" },
  { key: "recruiting", label: "모집 중" },
  { key: "active", label: "운영 중" },
] as const;

type StatusFilter = (typeof STATUS_TABS)[number]["key"];

const EMPTY_MESSAGE: Record<StatusFilter, string> = {
  all: "등록된 동아리가 없습니다.",
  recruiting: "지금 모집 중인 동아리가 없습니다.",
  active: "지금 운영 중인 동아리가 없습니다.",
};

function toClubListItem(club: {
  slug: string;
  name: string;
  name_en: string | null;
  category: string;
  description: string | null;
  activities: string | null;
  status: string;
}): ClubListItem {
  return {
    slug: club.slug,
    name: club.name,
    nameEn: club.name_en,
    category: club.category,
    description: club.description,
    activities: club.activities,
    status: club.status,
  };
}

export default async function ClubsPage(props: PageProps<"/clubs">) {
  const searchParams = await props.searchParams;
  const statusParam = typeof searchParams.status === "string" ? searchParams.status : "all";
  const statusFilter: StatusFilter = STATUS_TABS.some((tab) => tab.key === statusParam)
    ? (statusParam as StatusFilter)
    : "all";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let query = supabase
    .from("clubs")
    .select("slug, name, name_en, category, description, activities, status")
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data } = await query;
  const clubs = (data ?? []).map(toClubListItem);

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
            나와 맞는 동아리를 찾아보세요
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[#2f3b5c] sm:mt-2 sm:text-base">
            관심사와 활동 목표에 맞는 동아리를 둘러보고, 마음에 드는 곳에 바로 가입 신청해보세요.
          </p>
        </div>
      </section>

      {/* 상태 탭 */}
      <div className="mt-5 flex gap-2 sm:mt-6">
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.key;
          const href = tab.key === "all" ? "/clubs" : `/clubs?status=${tab.key}`;
          return (
            <Link
              key={tab.key}
              href={href}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                active ? "bg-coral text-white" : "border border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {clubs.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 py-10 text-center sm:mt-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral-soft text-coral-dark">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="text-sm text-muted-foreground">{EMPTY_MESSAGE[statusFilter]}</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:mt-8 sm:grid-cols-2 sm:gap-6">
          {clubs.map((club) => (
            <ClubListCard key={club.slug} club={club} />
          ))}
          {clubs.length === 1 && <ClubListPlaceholderCard />}
        </div>
      )}

      {clubs.length !== 1 && (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-6 text-center sm:mt-10 sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm font-medium text-muted-foreground sm:text-base">원하는 동아리가 없나요?</p>
          <Link
            href="/clubs/new"
            className="shrink-0 rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-coral-dark"
          >
            동아리 개설 신청
          </Link>
        </div>
      )}
    </main>
  );
}
