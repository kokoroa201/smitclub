import Link from "next/link";
import { Sparkles } from "lucide-react";
import { CATEGORY_ICON } from "@/lib/constants/category-icons";
import type { ClubCardData } from "@/components/clubs/club-card";

// 모바일 "지금 모집 중인 동아리" 가로 스크롤 목록 전용 카드. ClubCard(데스크톱
// 그리드용)와 별개로, 175~185px 고정폭 + snap-scroll에 맞춘 축소 레이아웃.
export function ClubCardMini({ club }: { club: ClubCardData }) {
  const CategoryIcon = CATEGORY_ICON[club.category as keyof typeof CATEGORY_ICON] ?? Sparkles;
  // ClubCard와 동일한 이유로 suda.png에만 밝기/대비/채도 보정을 적용한다.
  const coverFilter = club.slug === "suda" ? "brightness(1.1) contrast(1.05) saturate(1.2)" : undefined;
  // ClubCard와 동일한 이유로 인물/말풍선이 잘리지 않게 위치를 오른쪽 위주로
  // 고정한다. 이 카드는 높이가 84px로 더 짧아 기본 center면 더 많이 잘린다.
  const coverPosition = club.slug === "suda" ? "70% 35%" : undefined;

  return (
    <Link
      href={`/clubs/${club.slug}`}
      className="flex w-[178px] shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-border bg-white"
    >
      <div
        className="relative flex h-[84px] w-full shrink-0 items-center justify-center bg-muted bg-cover"
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
        {!club.coverImageUrl && <CategoryIcon className="h-7 w-7 text-muted-foreground/30" strokeWidth={1.5} />}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-foreground ring-1 ring-border">
          <span className="h-1 w-1 rounded-full bg-coral" />
          모집중
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <span className="w-fit rounded-full bg-coral-soft px-1.5 py-0.5 text-[10px] font-semibold text-coral-dark">
          {club.category}
        </span>
        <h3 className="text-base font-bold tracking-tight text-foreground">{club.name}</h3>
        {club.description && (
          <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">{club.description}</p>
        )}
        <span className="mt-auto inline-flex w-full items-center justify-center rounded-full bg-coral py-1.5 text-[11px] font-semibold text-white">
          가입 신청
        </span>
      </div>
    </Link>
  );
}
