import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { approveApplication, rejectApplication, requestRevision } from "@/lib/actions/admin-applications";

const STATUS_LABEL: Record<string, string> = {
  draft: "임시저장",
  submitted: "검토 대기",
  needs_revision: "보완 요청",
  approved: "승인",
  rejected: "반려",
};

type ApplicationDetail = {
  id: string;
  applicant_id: string;
  club_name: string;
  category: string;
  purpose: string;
  activity_plan: string;
  meeting_day: string | null;
  meeting_time: string | null;
  meeting_location: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

type Founder = {
  id: string;
  name: string;
  student_id: string | null;
  is_current_student: boolean;
  contact: string | null;
};

export default async function AdminClubApplicationDetailPage(
  props: PageProps<"/admin/club-applications/[id]">,
) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") {
    redirect("/");
  }

  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const error = typeof searchParams.error === "string" ? searchParams.error : null;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: application } = await supabase
    .from("club_applications")
    .select(
      "id, applicant_id, club_name, category, purpose, activity_plan, meeting_day, meeting_time, meeting_location, status, admin_note, created_at",
    )
    .eq("id", id)
    .single<ApplicationDetail>();

  if (!application) {
    notFound();
  }

  const [{ data: applicant }, { data: founders }] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", application.applicant_id).single(),
    supabase
      .from("club_application_founders")
      .select("id, name, student_id, is_current_student, contact")
      .eq("application_id", id)
      .returns<Founder[]>(),
  ]);

  const approveWithId = approveApplication.bind(null, id);
  const rejectWithId = rejectApplication.bind(null, id);
  const requestRevisionWithId = requestRevision.bind(null, id);

  const canReview = application.status === "submitted" || application.status === "needs_revision";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{application.club_name}</h1>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
          {STATUS_LABEL[application.status] ?? application.status}
        </span>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <section className="flex flex-col gap-4 rounded-card border border-border bg-card p-6">
        <Field label="신청자" value={applicant?.name ?? "알 수 없음"} />
        <Field label="카테고리" value={application.category} />
        <Field label="목적/소개" value={application.purpose} />
        <Field label="정기 활동 계획" value={application.activity_plan} />
        <Field
          label="정기 모임"
          value={
            [application.meeting_day, application.meeting_time, application.meeting_location]
              .filter(Boolean)
              .join(" · ") || "미기재"
          }
        />
        {application.admin_note && <Field label="관리자 메모" value={application.admin_note} />}
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-bold text-foreground">
          창립회원 명단 ({founders?.length ?? 0}명)
        </h2>
        <div className="flex flex-col gap-2">
          {(founders ?? []).map((founder) => (
            <div
              key={founder.id}
              className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
            >
              <span className="font-medium text-foreground">{founder.name}</span>
              <span className="text-muted-foreground">
                {founder.student_id ?? "학번 미기재"} ·{" "}
                {founder.is_current_student ? "재학생" : "비재학생"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {canReview && (
        <section className="mt-8 flex flex-col gap-4">
          <form action={approveWithId}>
            <button
              type="submit"
              className="w-full rounded-full bg-coral px-4 py-3 font-bold text-white"
            >
              승인
            </button>
          </form>

          <form action={rejectWithId} className="flex flex-col gap-2">
            <textarea
              name="admin_note"
              placeholder="반려 사유"
              rows={2}
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-full border border-border px-4 py-2.5 font-bold text-foreground hover:bg-muted"
            >
              반려
            </button>
          </form>

          <form action={requestRevisionWithId} className="flex flex-col gap-2">
            <textarea
              name="admin_note"
              placeholder="보완 요청 사유"
              rows={2}
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-full border border-border px-4 py-2.5 font-bold text-foreground hover:bg-muted"
            >
              보완 요청
            </button>
          </form>
        </section>
      )}
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{value}</p>
    </div>
  );
}
