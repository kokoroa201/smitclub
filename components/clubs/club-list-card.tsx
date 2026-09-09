import Link from "next/link";
import { CalendarDays, Sparkles } from "lucide-react";
import { CATEGORY_ICON, CATEGORY_TONE } from "@/lib/constants/category-icons";
import { CLUB_CATEGORIES } from "@/lib/constants/categories";
import { ClubStatusBadge } from "@/components/admin/status-badge";

export type ClubListItem = {
  slug: string;
  name: string;
  category: string;
  description: string | null;
  coverImageUrl: string | null;
  meetingDay: string | null;
  meetingLocation: string | null;
  status: string;
};

// 대표사진 대신 카테고리 색상의 원형 아이콘으로 동아리를 구분한다 — 나중에
// 회장이 소개/활동 텍스트를 직접 수정할 수 있도록 카드 구조를 텍스트 중심으로
// 유지한다(대표사진 없음). 색상은 홈 MyClubCard와 동일하게 카테고리 순서로 배정.
export function ClubListCard({ club }: { club: ClubListItem }) {
  const meetingInfo = [club.meetingDay, club.meetingLocation].filter(Boolean).join(" · ");
  const CategoryIcon = CATEGORY_ICON[club.category as keyof typeof CATEGORY_ICON] ?? Sparkles;
  const categoryIndex = CLUB_CATEGORIES.indexOf(club.category as (typeof CLUB_CATEGORIES)[number]);
  const tone = CATEGORY_TONE[(categoryIndex < 0 ? 0 : categoryIndex) % CATEGORY_TONE.length];

  return (
    <div className="flex h-full flex-col gap-2.5 rounded-lg border border-border bg-white p-3.5 sm:gap-3 sm:p-6">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11 ${tone}`}>
            <CategoryIcon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-2xl">{club.name}</h3>
            <span className="text-xs font-semibold text-muted-foreground sm:text-sm">{club.category}</span>
          </div>
        </div>
        <div className="shrink-0">
          <ClubStatusBadge status={club.status} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 sm:gap-2.5">
        {club.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground sm:line-clamp-3 sm:text-base">
            {club.description}
          </p>
        )}
        {meetingInfo && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground sm:text-sm">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
            <span>주요 활동 · {meetingInfo}</span>
          </div>
        )}
        <div className="mt-auto flex flex-row gap-1.5 pt-2 sm:gap-2 sm:pt-3">
          <Link
            href={`/clubs/${club.slug}`}
            className="flex-1 rounded-full border border-border px-3 py-2 text-center text-xs font-semibold text-foreground transition-colors hover:bg-muted/50 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            둘러보기
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
