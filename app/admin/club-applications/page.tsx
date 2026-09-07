import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { ApplicationStatusBadge, APPLICATION_STATUS_LABEL } from "@/components/admin/status-badge";

const STATUS_FILTERS = ["all", "submitted", "needs_revision", "recommended", "approved", "rejected", "draft"] as const;

type ApplicationListRow = {
  id: string;
  applicant_id: string;
  club_name: string;
  category: string;
  status: string;
  created_at: string;
};

export default async function AdminClubApplicationsPage(
  props: PageProps<"/admin/club-applications">,
) {
  const searchParams = await props.searchParams;
  const statusFilter =
    typeof searchParams.status === "string" && STATUS_FILTERS.includes(searchParams.status as (typeof STATUS_FILTERS)[number])
      ? searchParams.status
      : "all";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let query = supabase
    .from("club_applications")
    .select("id, applicant_id, club_name, category, status, created_at")
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data } = await query;
  const applications = (data ?? []) as ApplicationListRow[];

  const applicantIds = [...new Set(applications.map((app) => app.applicant_id))];
  const { data: applicants } = applicantIds.length
    ? await supabase.from("profiles").select("id, name").in("id", applicantIds)
    : { data: [] as { id: string; name: string }[] };

  const applicantNameById = new Map((applicants ?? []).map((a) => [a.id, a.name]));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">동아리 개설 신청 관리</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => (
          <Link
            key={status}
            href={status === "all" ? "/admin/club-applications" : `/admin/club-applications?status=${status}`}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === status
                ? "border-coral bg-coral text-white"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {status === "all" ? "전체" : APPLICATION_STATUS_LABEL[status]}
          </Link>
        ))}
      </div>

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
            <ApplicationStatusBadge status={app.status} />
          </Link>
        ))}
      </div>
    </main>
  );
}
