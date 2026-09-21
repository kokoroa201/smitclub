import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { ApplicationForm } from "@/components/clubs/application-form";

export default async function NewClubPage() {
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
          홈으로
        </Link>
        <h1 className="text-2xl font-bold text-foreground">동아리 개설 신청</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          아래 조건을 충족하면 신청서가 관리자에게 전달됩니다.
        </p>
      </div>

      {/* 모바일 하단 네비게이션에는 "동아리 안내" 탭을 따로 두지 않는다
          (MAKE 버튼과 겹쳐 어색했음) — 대신 MAKE로 들어오는 이 화면
          상단에서 "신청" / "안내 보기" 두 행동을 바로 보여준다. */}
      <section className="mb-8 rounded-card border border-border bg-card p-4 sm:p-5">
        <p className="text-sm font-semibold text-foreground">동아리 개설, 이렇게 진행돼요</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <a
            href="#apply"
            className="flex-1 rounded-full bg-coral px-4 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-coral-dark"
          >
            온라인으로 동아리 개설 신청하기
          </a>
          <Link
            href="/club-rules"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-full border border-border px-4 py-2.5 text-center text-sm font-bold text-foreground hover:bg-muted"
          >
            개설 절차 · 운영규정 · 표준 회칙 보기
          </Link>
        </div>
      </section>

      <div id="apply" className="scroll-mt-28">
        <ApplicationForm profile={profile} />
      </div>
    </main>
  );
}
