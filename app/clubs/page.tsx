import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { Sparkles } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { ClubListCard, type ClubListItem } from "@/components/clubs/club-list-card";

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
  category: string;
  description: string | null;
  cover_image_url: string | null;
  meeting_day: string | null;
  meeting_location: string | null;
  status: string;
}): ClubListItem {
  return {
    slug: club.slug,
    name: club.name,
    category: club.category,
    description: club.description,
    coverImageUrl: club.cover_image_url,
    meetingDay: club.meeting_day,
    meetingLocation: club.meeting_location,
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
    .select("slug, name, category, description, cover_image_url, meeting_day, meeting_location, status")
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data } = await query;
  const clubs = (data ?? []).map(toClubListItem);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      {/* 비주얼 배너 — 잘리지 않게 object-contain으로 일러스트 전체를 보여주고,
          flex로 텍스트 칸과 분리해 어떤 화면 너비에서도 겹치지 않게 한다. */}
      <section className="flex items-center gap-3 overflow-hidden rounded-lg bg-gradient-to-br from-coral-soft via-coral-soft/80 to-purple-soft px-4 py-5 sm:gap-6 sm:px-8 sm:py-7">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold leading-snug text-[#16234a] sm:text-2xl lg:text-3xl">
            나와 맞는 동아리를 찾아보세요
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[#2f3b5c] sm:mt-2 sm:text-base">
            관심사와 활동 목표에 맞는 동아리를 둘러보고, 마음에 드는 곳에 바로 가입 신청해보세요.
          </p>
        </div>
        <div className="relative aspect-[4/3] h-20 shrink-0 sm:h-32 lg:h-36">
          <Image
            src="/next-club.png"
            alt="동아리 개설 일러스트"
            fill
            sizes="(min-width: 1024px) 192px, (min-width: 640px) 170px, 106px"
            className="object-contain"
          />
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
        <div className="mt-5 grid grid-cols-1 gap-4 sm:mt-6 sm:grid-cols-2">
          {clubs.map((club) => (
            <ClubListCard key={club.slug} club={club} />
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-4 py-3 sm:mt-8">
        <p className="text-sm text-muted-foreground">원하는 동아리가 없나요?</p>
        <Link
          href="/clubs/new"
          className="shrink-0 rounded-full bg-coral px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-coral-dark sm:text-sm"
        >
          동아리 개설 신청
        </Link>
      </div>
    </main>
  );
}
