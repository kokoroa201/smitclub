import Link from "next/link";
import { Bell, Compass, Home, Newspaper, UserRound } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import type { Profile } from "@/lib/auth";
import { AccessibilityControls } from "@/components/nav/accessibility-controls";

const NAV_LINKS = [
  { href: "/", label: "홈", icon: Home },
  { href: "/clubs", label: "동아리", icon: Compass },
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
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-foreground">
            SMIT <span className="text-coral">CLUB</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="주요 메뉴">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
            <Link
              href="/clubs/new"
              className="ml-2 rounded-full bg-coral px-5 py-2 text-sm font-bold text-white shadow-sm shadow-coral/30 transition-transform hover:scale-105"
            >
              MAKE
            </Link>
          </nav>

          <div className="flex items-center gap-3 text-sm">
            {profile ? (
              <>
                <Link href="/notifications" aria-label="알림" className="relative rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </Link>
                {profile.role === "super_admin" && (
                  <Link
                    href="/admin"
                    className="rounded-full border border-coral px-4 py-1.5 font-bold text-coral transition-colors hover:bg-coral-soft"
                  >
                    관리자
                  </Link>
                )}
                <div className="hidden items-center gap-2 sm:flex">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-coral text-xs font-extrabold text-white">
                    {profile.name.slice(0, 1)}
                  </span>
                  <span className="text-muted-foreground">{profile.name}님</span>
                </div>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="rounded-full border border-border px-4 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-muted"
                  >
                    로그아웃
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="text-muted-foreground hover:text-foreground">
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-coral px-4 py-1.5 font-bold text-white shadow-sm shadow-coral/30"
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
