import Link from "next/link";
import {
  BookOpen,
  Camera,
  Code2,
  Dumbbell,
  Gamepad2,
  Globe2,
  Lightbulb,
  Music2,
  type LucideIcon,
} from "lucide-react";
import { CLUB_CATEGORIES } from "@/lib/constants/categories";

const CATEGORY_ICON: Record<(typeof CLUB_CATEGORIES)[number], LucideIcon> = {
  운동: Dumbbell,
  밴드: Music2,
  사진: Camera,
  게임: Gamepad2,
  문화교류: Globe2,
  개발: Code2,
  스터디: BookOpen,
  창업: Lightbulb,
};

const TONE_STYLES = [
  "bg-coral-soft text-coral-dark",
  "bg-yellow-soft text-yellow-dark",
  "bg-blue-soft text-blue-dark",
  "bg-purple-soft text-purple-dark",
];

export function CategoryExplorer() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <h2 className="text-lg font-extrabold text-foreground sm:text-xl">이런 동아리 어때요?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        관심 있는 분야를 눌러보고, 없다면 직접 만들어보세요.
      </p>
      <div className="mt-4 grid grid-cols-4 gap-2.5 sm:gap-3 lg:grid-cols-8">
        {CLUB_CATEGORIES.map((category, i) => {
          const Icon = CATEGORY_ICON[category];
          return (
            <Link
              key={category}
              href={`/clubs?category=${encodeURIComponent(category)}`}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center shadow-sm transition-transform hover:scale-105"
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE_STYLES[i % TONE_STYLES.length]}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold text-foreground">{category}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
