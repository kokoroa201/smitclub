import Link from "next/link";
import { Plus, Utensils, BookOpen, Clapperboard, Camera } from "lucide-react";

// 카테고리 탐색 섹션을 당분간 숨긴 대신, 어떤 분야든 동아리를 만들 수 있다는
// 힌트로 아이콘 몇 개만 옅게 보여준다. 실제 CLUB_CATEGORIES 목록과는 별개로
// 이 카드 안에서만 쓰는 무드보드용 아이콘(맛집탐방·독서·영화·사진).
const PREVIEW_ICONS = [Utensils, BookOpen, Clapperboard, Camera];

// 카드 전체가 하나의 링크(MAKE 페이지)라서, 안에 별도 "동아리 만들기" 버튼을
// 두면 같은 목적지로 가는 CTA가 중복된다. 아이콘/문구만으로 클릭 유도.
export function NextClubCard() {
  return (
    <Link
      href="/clubs/new"
      className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-white p-6 text-center transition-colors hover:border-coral/40 hover:bg-coral-soft/30 sm:p-8"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coral-soft text-coral-dark">
        <Plus className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-semibold text-coral-dark">개설 대기 중</p>
        <h3 className="mt-1 text-lg font-bold tracking-tight text-foreground sm:text-xl">
          다음 동아리의 주인공은?
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          하고 싶었던 활동을
          <br />
          직접 시작해보세요.
        </p>
      </div>
      <div className="flex items-center justify-center gap-2.5 text-muted-foreground/50">
        {PREVIEW_ICONS.map((Icon, i) => (
          <Icon key={i} className="h-4 w-4" strokeWidth={1.75} />
        ))}
      </div>
    </Link>
  );
}

// 모바일 가로 스크롤 목록에서 ClubCardMini와 같은 크기로 나란히 놓이는 축소판.
export function NextClubCardMini() {
  return (
    <Link
      href="/clubs/new"
      className="flex w-[178px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-white p-4 text-center"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-coral-soft text-coral-dark">
        <Plus className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[10px] font-semibold text-coral-dark">개설 대기 중</p>
        <h3 className="mt-0.5 text-sm font-bold text-foreground">다음 주인공은?</h3>
      </div>
      <div className="flex items-center justify-center gap-2 text-muted-foreground/50">
        {PREVIEW_ICONS.map((Icon, i) => (
          <Icon key={i} className="h-3.5 w-3.5" strokeWidth={1.75} />
        ))}
      </div>
    </Link>
  );
}
