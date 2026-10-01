"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Home, Newspaper, UserRound, type LucideIcon } from "lucide-react";
import { getDictionary, type Locale } from "@/lib/i18n";

// "동아리 안내"(/club-rules)는 여기 독립 탭으로 두지 않는다 — 중앙 MAKE
// 버튼과 겹쳐 어색했던 자리라, 대신 MAKE(→ /clubs/new) 진입 화면 상단에서
// "개설 절차·운영규정·표준 회칙 보기"로 안내한다. 데스크톱 헤더 메뉴에는
// 계속 유지(components/nav/site-header.tsx).
const TABS = [
  { href: "/", labelKey: "home", icon: Home },
  { href: "/clubs", labelKey: "clubs", icon: Compass },
  { href: "/news", labelKey: "news", icon: Newspaper },
  { href: "/my", labelKey: "my", icon: UserRound },
] as const;

export function BottomNav({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const t = getDictionary(locale).nav;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const renderTab = (tab: (typeof TABS)[number]) => (
    <BottomNavLink href={tab.href} icon={tab.icon} label={t[tab.labelKey]} active={isActive(tab.href)} />
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
      aria-label={t.bottomNav}
    >
      <div className="relative mx-auto grid h-16 max-w-md grid-cols-5 px-2">
        {renderTab(TABS[0])}
        {renderTab(TABS[1])}

        {/* 중앙 MAKE 버튼 자리 확보용 spacer */}
        <div aria-hidden />

        {renderTab(TABS[2])}
        {renderTab(TABS[3])}

        <Link
          href="/clubs/new"
          aria-label={t.makeClub}
          className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-[15px] items-center justify-center rounded-full bg-gradient-to-br from-coral to-coral-dark text-white shadow-md shadow-coral/40 ring-[3px] ring-background transition-transform hover:scale-105"
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
