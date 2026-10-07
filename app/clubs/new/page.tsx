import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { ApplicationForm } from "@/components/clubs/application-form";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export default async function NewClubPage() {
  const locale = await getLocale();
  const t = getDictionary(locale).clubApplication;
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-8">
        {/* 브라우저/OS 뒤로가기 제스처는 Next.js 클라이언트 캐시상 이전 홈
            렌더링을 복원할 수 있으므로, 홈으로 돌아가는 명시적 경로를
            제공한다. replace라 히스토리에 이 신청서 화면이 남지 않는다. */}
        <Link
          href="/"
          replace
          className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.backHome}
        </Link>
        <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.intro}
        </p>
      </div>

      {/* 모바일 하단 네비게이션에는 "동아리 안내" 탭을 따로 두지 않는다
          (MAKE 버튼과 겹쳐 어색했음) — 대신 MAKE로 들어오는 이 화면
          상단에서 "신청" / "안내 보기" 두 행동을 바로 보여준다. */}
      <section className="mb-8 rounded-card border border-border bg-card p-4 sm:p-5">
        <p className="text-sm font-semibold text-foreground">{t.processTitle}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <a
            href="#apply"
            className="flex flex-1 items-center justify-center rounded-full bg-coral px-4 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-coral-dark"
          >
            {t.applyOnline}
          </a>
          <Link
            href="/club-rules"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-full border border-border px-4 py-2.5 text-center text-sm font-bold text-foreground hover:bg-muted"
          >
            {t.viewGuide}
          </Link>
        </div>
      </section>

      <div id="apply" className="scroll-mt-28">
        <ApplicationForm profile={profile} locale={locale} />
      </div>
    </main>
  );
}
