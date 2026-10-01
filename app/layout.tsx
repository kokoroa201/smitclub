import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { pretendard } from "./fonts";
import { getCurrentProfile } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/server";
import { createClient } from "@/utils/supabase/server";
import { SiteHeader } from "@/components/nav/site-header";
import { BottomNav } from "@/components/nav/bottom-nav";
import { SiteFooter } from "@/components/nav/site-footer";

export const metadata: Metadata = {
  title: "SMIT CLUB",
  description: "SMIT 대학원 동아리 포털",
};

// <meta name="color-scheme" content="only light"> — CSS의 color-scheme보다
// 먼저 읽혀 첫 페인트부터 라이트로 고정되고, 브라우저 주소창 색도 맞춘다.
export const viewport: Viewport = {
  colorScheme: "only light",
  themeColor: "#fffaf6",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [profile, locale] = await Promise.all([getCurrentProfile(), getLocale()]);

  let unreadNotifications = 0;
  if (profile) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", profile.id)
      .is("read_at", null);
    unreadNotifications = count ?? 0;
  }

  return (
    <html lang={locale} className={`${pretendard.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader profile={profile} unreadNotifications={unreadNotifications} locale={locale} />
        <div className="flex-1 pb-24 md:pb-0">
          {children}
          <SiteFooter />
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
