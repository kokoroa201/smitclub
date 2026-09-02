import { redirect } from "next/navigation";
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
        <h1 className="text-2xl font-bold text-foreground">동아리 개설 신청</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          아래 조건을 충족하면 신청서가 관리자에게 전달됩니다.
        </p>
      </div>
      <ApplicationForm />
    </main>
  );
}
