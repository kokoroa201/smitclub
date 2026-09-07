"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Home, Newspaper, UserRound, type LucideIcon } from "lucide-react";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "홈", icon: Home },
  { href: "/clubs", label: "동아리", icon: Compass },
  { href: "/news", label: "소식", icon: Newspaper },
  { href: "/my", label: "MY", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
      aria-label="하단 내비게이션"
    >
      <div className="relative mx-auto grid h-16 max-w-md grid-cols-5 px-2">
        <BottomNavLink {...TABS[0]} active={isActive(TABS[0].href)} />
        <BottomNavLink {...TABS[1]} active={isActive(TABS[1].href)} />

        {/* 중앙 MAKE 버튼 자리 확보용 spacer */}
        <div aria-hidden />

        <BottomNavLink {...TABS[2]} active={isActive(TABS[2].href)} />
        <BottomNavLink {...TABS[3]} active={isActive(TABS[3].href)} />

        <Link
          href="/clubs/new"
          aria-label="동아리 만들기"
          className="absolute left-1/2 top-0 flex h-16 w-16 -translate-x-1/2 -translate-y-7 items-center justify-center rounded-full bg-gradient-to-br from-coral to-coral-dark text-white shadow-lg shadow-coral/40 ring-4 ring-background transition-transform hover:scale-105"
        >
          <span className="text-xs font-extrabold tracking-wide">MAKE</span>
        </Link>
      </div>
    </nav>
  );
}

function BottomNavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
        active ? "font-bold text-coral" : "font-medium text-muted-foreground"
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
      {label}
    </Link>
  );
}
