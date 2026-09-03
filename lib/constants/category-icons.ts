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

export const CATEGORY_ICON: Record<(typeof CLUB_CATEGORIES)[number], LucideIcon> = {
  운동: Dumbbell,
  밴드: Music2,
  사진: Camera,
  게임: Gamepad2,
  문화교류: Globe2,
  개발: Code2,
  스터디: BookOpen,
  창업: Lightbulb,
};

export const CATEGORY_TONE = [
  "bg-coral-soft text-coral-dark",
  "bg-yellow-soft text-yellow-dark",
  "bg-blue-soft text-blue-dark",
  "bg-purple-soft text-purple-dark",
] as const;
