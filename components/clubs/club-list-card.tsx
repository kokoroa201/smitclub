import Link from "next/link";
import { Clapperboard, Coffee, Dumbbell, MessageCircle, Plus, Salad, Sparkles, UserPlus } from "lucide-react";
import { CATEGORY_ICON, CATEGORY_ACCENT, DEFAULT_CATEGORY_ACCENT } from "@/lib/constants/category-icons";
import { ClubStatusBadge } from "@/components/admin/status-badge";

export type ClubListItem = {
  slug: string;
  name: string;
  nameEn: string | null;
  category: string;
  description: string | null;
  activities: string | null;
  status: string;
};

// 대표사진 없이 카테고리 색 띠(카드 맨 위, 고정 10~12px) + 원형 분류
// 아이콘으로만 구분한다. 카드에는 실제 DB 값(소개/주요 활동)만 표시하고,
// 회원 수·국적 비율 같은 지어낸 정보는 절대 넣지 않는다. 코랄은 카드
// 안에서 "문화교류" 분류일 때만 등장하도록 하고(색 띠·아이콘 배지),
// CTA는 코랄을 쓰지 않는다 — 강조점이 여러 군데로 흩어지지 않게.
export function ClubListCard({ club }: { club: ClubListItem }) {
  const CategoryIcon = CATEGORY_ICON[club.category as keyof typeof CATEGORY_ICON] ?? Sparkles;
  const accent = CATEGORY_ACCENT[club.category] ?? DEFAULT_CATEGORY_ACCENT;
  const isRecruiting = club.status === "recruiting";

  // "주 1회 정기 모임 · 주제 토론 · ..." 형식일 때 맨 앞의 핵심 정기 모임
  // 정보만 분류색으로 강조하고, 나머지는 차분한 회색으로 둔다.
  const [keyActivity, ...restActivityParts] = (club.activities ?? "").split(" · ");
  const restActivity = restActivityParts.length > 0 ? ` · ${restActivityParts.join(" · ")}` : "";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm shadow-black/5">
      <div className={`h-[5px] sm:h-1.5 ${accent.strip}`} />

      <div className="flex flex-1 flex-col gap-3 px-5 pb-4 pt-5 sm:gap-4 sm:px-6 sm:pb-5 sm:pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${accent.icon}`}>
              <CategoryIcon className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
                {club.name}
                {club.nameEn && <span className="ml-1.5 font-medium text-muted-foreground">({club.nameEn})</span>}
              </h3>
              <span className={`text-xs font-semibold sm:text-sm ${accent.text}`}>{club.category}</span>
            </div>
          </div>
          <div className="shrink-0">
            <ClubStatusBadge status={club.status} />
          </div>
        </div>

        {club.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {club.description}
          </p>
        )}

        {club.activities && (
          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-muted-foreground">
              <span className={`font-semibold ${accent.text}`}>{keyActivity}</span>
              {restActivity}
            </span>
          </div>
        )}

        <div className="mt-auto flex flex-row gap-2 pt-1.5">
          <Link
            href={`/clubs/${club.slug}`}
            className="flex h-11 flex-1 items-center justify-center rounded-full border border-purple/40 bg-white px-4 text-sm font-semibold text-foreground transition-colors hover:bg-purple-soft/40 sm:h-10"
          >
            둘러보기
          </Link>
          {isRecruiting ? (
            <Link
              href={`/clubs/${club.slug}/join`}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-navy px-4 text-sm font-semibold text-white transition-opacity hover:opacity-85 sm:h-10"
            >
              <UserPlus className="h-4 w-4" />
              가입 신청
            </Link>
          ) : (
            <span className="flex h-11 flex-1 cursor-not-allowed items-center justify-center rounded-full bg-muted px-4 text-sm font-semibold text-muted-foreground sm:h-10">
              모집 준비 중
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// 앞으로 어떤 관심사의 동아리든 올 수 있다는 걸 보여주기 위한 예시
// 아이콘 모음(찻잔·음식·영화·수다·운동) — 실제 CLUB_CATEGORIES와 1:1로
// 맞출 필요 없는 순수 장식용이라 이 카드 전용으로만 둔다.
const PLACEHOLDER_ICONS: { Icon: typeof Sparkles; tone: string }[] = [
  { Icon: Coffee, tone: "bg-blue-soft text-blue-dark" },
  { Icon: Salad, tone: "bg-mint-soft text-mint-dark" },
  { Icon: Clapperboard, tone: "bg-purple-soft text-purple-dark" },
  { Icon: MessageCircle, tone: "bg-yellow-soft text-yellow-dark" },
  { Icon: Dumbbell, tone: "bg-coral-soft text-coral-dark" },
];

// 실제 동아리가 1개뿐일 때 2열 그리드의 남는 칸을 채우는 안내 카드. 회원
// 수·국적 등 지어낸 통계는 없고, 다음 동아리를 기다린다는 안내와 개설
// 신청 CTA만 담는다.
export function ClubListPlaceholderCard() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-purple/30 bg-purple-soft/20 p-8 text-center sm:gap-4 sm:p-10">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {PLACEHOLDER_ICONS.map(({ Icon, tone }, i) => (
          <span
            key={i}
            className={`flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10 ${tone}`}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
        ))}
      </div>
      <p className="text-sm font-bold text-foreground sm:text-base">다음 동아리를 기다리고 있어요</p>
      <Link
        href="/clubs/new"
        className="flex h-11 items-center gap-1.5 rounded-full bg-coral px-5 text-sm font-semibold text-white transition-colors hover:bg-coral-dark sm:h-10"
      >
        <Plus className="h-4 w-4" />
        동아리 개설 신청
      </Link>
    </div>
  );
}
