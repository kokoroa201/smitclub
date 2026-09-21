import Link from "next/link";
import { Bell, Compass, FileText, Home, Newspaper, UserRound } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import type { Profile } from "@/lib/auth";
import { AccessibilityControls } from "@/components/nav/accessibility-controls";

const NAV_LINKS = [
  { href: "/", label: "홈", icon: Home },
  { href: "/clubs", label: "동아리", icon: Compass },
  { href: "/club-rules", label: "동아리 안내", icon: FileText },
  { href: "/news", label: "소식", icon: Newspaper },
  { href: "/my", label: "MY", icon: UserRound },
];

export function SiteHeader({
  profile,
  unreadNotifications = 0,
}: {
  profile: Profile | null;
  unreadNotifications?: number;
}) {
  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur print:hidden">
      <div className="border-b border-border/70 bg-muted/60">
        <div className="mx-auto flex h-11 max-w-6xl items-center justify-end px-4">
          <AccessibilityControls />
        </div>
      </div>

      <div className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 lg:gap-4">
          <Link
            href="/"
            className="shrink-0 whitespace-nowrap text-base font-extrabold tracking-tight text-foreground lg:text-lg"
          >
            SMIT <span className="text-coral">CLUB</span>
          </Link>

          <nav className="hidden items-center gap-0.5 whitespace-nowrap md:flex lg:gap-1" aria-label="주요 메뉴">
            {/* 항목이 5개(+MAKE)로 늘어난 뒤에도 768px(md)에서 한 줄을
                유지하도록, md 구간에서는 아이콘을 숨기고 텍스트만 좁은
                패딩으로 보여준다 — 여유 있는 lg(1024px+)부터 아이콘을 되살린다. */}
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:gap-1.5 lg:px-4 lg:py-2 lg:text-sm"
              >
                <link.icon className="hidden h-4 w-4 shrink-0 lg:block" />
                {link.label}
              </Link>
            ))}
            <Link
              href="/clubs/new"
              className="ml-1 shrink-0 whitespace-nowrap rounded-full bg-coral px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-coral/30 transition-transform hover:scale-105 lg:ml-2 lg:px-5 lg:py-2 lg:text-sm"
            >
              MAKE
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs lg:gap-3 lg:text-sm">
            {profile ? (
              <>
                <Link href="/notifications" aria-label="알림" className="relative shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:p-2">
                  <Bell className="h-4 w-4 lg:h-5 lg:w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </Link>
                {profile.role === "super_admin" && (
                  <Link
                    href="/admin"
                    className="shrink-0 whitespace-nowrap rounded-full border border-coral px-2.5 py-1 font-bold text-coral transition-colors hover:bg-coral-soft lg:px-4 lg:py-1.5"
                  >
                    관리자
                  </Link>
                )}
                <div className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap sm:flex">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral text-[10px] font-extrabold text-white lg:h-8 lg:w-8 lg:text-xs">
                    {profile.name.slice(0, 1)}
                  </span>
                  <span className="whitespace-nowrap text-muted-foreground">{profile.name}님</span>
                </div>
                <form action={signOut} className="shrink-0">
                  <button
                    type="submit"
                    className="shrink-0 whitespace-nowrap rounded-full border border-border px-2.5 py-1 font-medium text-muted-foreground transition-colors hover:bg-muted lg:px-4 lg:py-1.5"
                  >
                    로그아웃
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="shrink-0 whitespace-nowrap text-muted-foreground hover:text-foreground">
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="shrink-0 whitespace-nowrap rounded-full bg-coral px-2.5 py-1 font-bold text-white shadow-sm shadow-coral/30 lg:px-4 lg:py-1.5"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
