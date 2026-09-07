import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { ApplicationStatusBadge } from "@/components/admin/status-badge";

type RecentApplication = {
  id: string;
  club_name: string;
  applicant_id: string;
  status: string;
  created_at: string;
};

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [pendingCount, recruitingCount, memberCount, recentResult] = await Promise.all([
    supabase.from("club_applications").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    supabase.from("clubs").select("id", { count: "exact", head: true }).eq("status", "recruiting"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("club_applications")
      .select("id, club_name, applicant_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const recentApplications = (recentResult.data ?? []) as RecentApplication[];
  const applicantIds = [...new Set(recentApplications.map((app) => app.applicant_id))];
  const { data: applicants } = applicantIds.length
    ? await supabase.from("profiles").select("id, name").in("id", applicantIds)
    : { data: [] as { id: string; name: string }[] };
  const applicantNameById = new Map((applicants ?? []).map((a) => [a.id, a.name]));

  const stats = [
    { label: "개설 신청 대기", value: pendingCount.count ?? 0, href: "/admin/club-applications?status=submitted" },
    { label: "모집 중 동아리", value: recruitingCount.count ?? 0, href: "/admin/clubs" },
    { label: "전체 회원", value: memberCount.count ?? 0, href: "/admin/members" },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">관리자 대시보드</h1>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-card border border-border bg-card p-5 transition-colors hover:bg-muted"
          >
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-3xl font-extrabold text-foreground">{stat.value}</p>
          </Link>
        ))}
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">최근 신청</h2>
          <Link href="/admin/club-applications" className="text-sm font-medium text-coral hover:underline">
            전체 보기
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {recentApplications.length === 0 && (
            <p className="text-sm text-muted-foreground">신청 내역이 없습니다.</p>
          )}
          {recentApplications.map((app) => (
            <Link
              key={app.id}
              href={`/admin/club-applications/${app.id}`}
              className="flex items-center justify-between rounded-card border border-border bg-card p-4 hover:bg-muted"
            >
              <div>
                <p className="font-bold text-foreground">{app.club_name}</p>
                <p className="text-sm text-muted-foreground">
                  {applicantNameById.get(app.applicant_id) ?? "알 수 없음"}
                </p>
              </div>
              <ApplicationStatusBadge status={app.status} />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
