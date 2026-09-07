import Link from "next/link";
import { CalendarDays, Sparkles } from "lucide-react";
import { CATEGORY_ICON } from "@/lib/constants/category-icons";

export type ClubCardData = {
  slug: string;
  name: string;
  category: string;
  description: string | null;
  coverImageUrl: string | null;
  meetingDay: string | null;
  meetingLocation: string | null;
};

export function ClubCard({ club }: { club: ClubCardData }) {
  const meetingInfo = [club.meetingDay, club.meetingLocation].filter(Boolean).join(" · ");
  const CategoryIcon = CATEGORY_ICON[club.category as keyof typeof CATEGORY_ICON] ?? Sparkles;
  // suda.png는 원본이 어둡고 채도가 낮아 Hero의 선명한 색감과 따로 노는
  // 느낌이 들어서, 이 이미지에 한해서만 밝기/대비/채도를 살짝 보정한다.
  const coverFilter = club.slug === "suda" ? "brightness(1.1) contrast(1.05) saturate(1.2)" : undefined;
  // suda 대표 이미지는 인물/말풍선이 오른쪽으로 치우쳐 있고 왼쪽은 여백이라,
  // 카드 비율(특히 세로가 짧은 모바일)에서 bg-cover 기본 center 위치로
  // 자르면 인물이 가장자리에 걸린다. 인물·아이콘이 항상 프레임 안에
  // 들어오도록 위치를 오른쪽 위주로 고정한다.
  const coverPosition = club.slug === "suda" ? "70% 35%" : undefined;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-white">
      <div
        className="relative flex h-28 w-full shrink-0 items-center justify-center bg-muted bg-cover sm:h-52 lg:h-56"
        style={
          club.coverImageUrl
            ? {
                backgroundImage: `url(${club.coverImageUrl})`,
                backgroundPosition: coverPosition ?? "center",
                filter: coverFilter,
              }
            : undefined
        }
      >
        {!club.coverImageUrl && <CategoryIcon className="h-9 w-9 text-muted-foreground/30" strokeWidth={1.5} />}
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-foreground ring-1 ring-border sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-coral" />
          모집중
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5 sm:gap-2.5 sm:p-6">
        <span className="w-fit rounded-full bg-coral-soft px-2 py-0.5 text-[11px] font-semibold text-coral-dark sm:px-2.5 sm:py-1 sm:text-xs">
          {club.category}
        </span>
        <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-2xl">{club.name}</h3>
        {club.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground sm:line-clamp-3 sm:text-base">
            {club.description}
          </p>
        )}
        {meetingInfo && (
          <div className="hidden items-start gap-1.5 text-xs text-muted-foreground sm:flex sm:text-sm">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
            <span>주요 활동 · {meetingInfo}</span>
          </div>
        )}
        <div className="mt-auto flex flex-row gap-1.5 pt-2 sm:gap-2 sm:pt-3">
          <Link
            href={`/clubs/${club.slug}`}
            className="flex-1 rounded-full border border-border px-3 py-2 text-center text-xs font-semibold text-foreground transition-colors hover:bg-muted/50 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <span className="sm:hidden">둘러보기</span>
            <span className="hidden sm:inline">{club.name} 둘러보기</span>
          </Link>
          <Link
            href={`/clubs/${club.slug}`}
            className="flex-1 rounded-full bg-coral px-3 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-coral-dark sm:px-4 sm:py-2.5 sm:text-sm"
          >
            가입 신청
          </Link>
        </div>
      </div>
    </div>
  );
}
