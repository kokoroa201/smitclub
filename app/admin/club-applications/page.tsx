import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

const STATUS_LABEL: Record<string, string> = {
  draft: "임시저장",
  submitted: "검토 대기",
  needs_revision: "보완 요청",
  approved: "승인",
  rejected: "반려",
};

type ApplicationListRow = {
  id: string;
  applicant_id: string;
  club_name: string;
  category: string;
  status: string;
  created_at: string;
};

export default async function AdminClubApplicationsPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") {
    redirect("/");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data } = await supabase
    .from("club_applications")
    .select("id, applicant_id, club_name, category, status, created_at")
    .order("created_at", { ascending: false });

  const applications = (data ?? []) as ApplicationListRow[];

  const applicantIds = [...new Set(applications.map((app) => app.applicant_id))];
  const { data: applicants } = applicantIds.length
    ? await supabase.from("profiles").select("id, name").in("id", applicantIds)
    : { data: [] as { id: string; name: string }[] };

  const applicantNameById = new Map((applicants ?? []).map((a) => [a.id, a.name]));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">동아리 개설 신청 관리</h1>
      <div className="mt-6 flex flex-col gap-3">
        {applications.length === 0 && (
          <p className="text-sm text-muted-foreground">신청 내역이 없습니다.</p>
        )}
        {applications.map((app) => (
          <Link
            key={app.id}
            href={`/admin/club-applications/${app.id}`}
            className="flex items-center justify-between rounded-card border border-border bg-card p-4 hover:bg-muted"
          >
            <div>
              <p className="font-bold text-foreground">{app.club_name}</p>
              <p className="text-sm text-muted-foreground">
                {app.category} · {applicantNameById.get(app.applicant_id) ?? "알 수 없음"}
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
              {STATUS_LABEL[app.status] ?? app.status}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
