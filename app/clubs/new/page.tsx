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
      <ApplicationForm />
    </main>
  );
}
