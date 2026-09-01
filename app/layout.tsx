import type { Metadata } from "next";
import "./globals.css";
import { pretendard } from "./fonts";
import { getCurrentProfile } from "@/lib/auth";
import { SiteHeader } from "@/components/nav/site-header";
import { BottomNav } from "@/components/nav/bottom-nav";
import { SiteFooter } from "@/components/nav/site-footer";

export const metadata: Metadata = {
  title: "SMIT CLUB",
  description: "SMIT 대학원 동아리 포털",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const profile = await getCurrentProfile();

  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader profile={profile} />
        <div className="flex-1 pb-24 md:pb-0">
          {children}
          <SiteFooter />
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
