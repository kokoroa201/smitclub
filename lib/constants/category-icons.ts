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

// /clubs 카드 전용 — 카테고리마다 "항상 같은" 색을 쓴다(카드 목록 안에서
// 순서가 바뀌어도 같은 분류는 항상 같은 색). 문화교류=코랄, 학술 계열
// (스터디/개발)=블루, 취미·여가 계열(사진/밴드/게임)=그린, 운동=옐로우.
// 아직 명시적으로 배정하지 않은 분류(창업 포함, 추후 추가되는 분류도)는
// DEFAULT_CATEGORY_ACCENT(퍼플)로 안전하게 떨어진다.
// text는 카드 안에서 분류명·핵심 정보를 강조할 때 쓰는 "분류색 하나"다
// (icon과 같은 -dark 톤을 재사용 — 카드 하나에 여러 색이 섞이지 않도록).
export const CATEGORY_ACCENT: Record<string, { strip: string; icon: string; text: string }> = {
  문화교류: { strip: "bg-coral", icon: "bg-coral-soft text-coral-dark", text: "text-coral-dark" },
  스터디: { strip: "bg-blue", icon: "bg-blue-soft text-blue-dark", text: "text-blue-dark" },
  개발: { strip: "bg-blue", icon: "bg-blue-soft text-blue-dark", text: "text-blue-dark" },
  사진: { strip: "bg-mint", icon: "bg-mint-soft text-mint-dark", text: "text-mint-dark" },
  밴드: { strip: "bg-mint", icon: "bg-mint-soft text-mint-dark", text: "text-mint-dark" },
  게임: { strip: "bg-mint", icon: "bg-mint-soft text-mint-dark", text: "text-mint-dark" },
  운동: { strip: "bg-yellow", icon: "bg-yellow-soft text-yellow-dark", text: "text-yellow-dark" },
};

export const DEFAULT_CATEGORY_ACCENT = {
  strip: "bg-purple",
  icon: "bg-purple-soft text-purple-dark",
  text: "text-purple-dark",
};
