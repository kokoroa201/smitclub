import Link from "next/link";
import { CLUB_CATEGORIES } from "@/lib/constants/categories";
import { CATEGORY_ICON, CATEGORY_TONE } from "@/lib/constants/category-icons";

export function CategoryExplorer() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:py-10">
      <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-2xl">이런 동아리 어때요?</h2>
      <p className="mt-1 text-xs text-muted-foreground sm:mt-1.5 sm:text-sm">
        관심 있는 분야를 눌러보고, 없다면 직접 만들어보세요.
      </p>
      <div className="mt-3 grid grid-cols-4 gap-2 sm:mt-5 sm:gap-3 lg:grid-cols-8">
        {CLUB_CATEGORIES.map((category, i) => {
          const Icon = CATEGORY_ICON[category];
          return (
            <Link
              key={category}
              href={`/clubs?category=${encodeURIComponent(category)}`}
              className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-white p-2 text-center transition-colors hover:border-foreground/15 hover:bg-muted/50 sm:gap-1.5 sm:p-3"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${CATEGORY_TONE[i % CATEGORY_TONE.length]}`}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <span className="text-[11px] font-semibold text-foreground sm:text-xs">{category}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
