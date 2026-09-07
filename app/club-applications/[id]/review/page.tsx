import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile, REVIEWER_ROLES } from "@/lib/auth";
import { ApplicationStatusBadge } from "@/components/admin/status-badge";
import { evaluateEligibility } from "@/lib/eligibility";
import { LANGUAGE_LABEL } from "@/lib/application-documents";

type ApplicationDetail = {
  id: string;
  applicant_id: string;
  club_name: string;
  club_name_en: string | null;
  registration_category: string;
  language: string | null;
  purpose: string;
  activity_plan: string;
  meeting_day: string | null;
  meeting_time: string | null;
  meeting_location: string | null;
  meeting_frequency: string | null;
  status: string;
  agree_rules: boolean;
  eligibility_checklist: Record<string, boolean> | null;
  created_at: string;
  treasurer_name: string | null;
  vice_president_name: string | null;
  advisor_name: string | null;
  advisor_department: string | null;
};

type MemberSummary = {
  total_count: number;
  korean_count: number;
  international_count: number;
  current_student_count: number;
};

export default async function ClubApplicationReviewPage(
  props: PageProps<"/club-applications/[id]/review">,
) {
  const profile = await getCurrentProfile();
  const canView = profile && (profile.role === "super_admin" || REVIEWER_ROLES.includes(profile.role));
  if (!canView) {
    redirect("/");
  }

  const { id } = await props.params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: application } = await supabase
    .from("club_applications")
    .select(
      "id, applicant_id, club_name, club_name_en, registration_category, language, purpose, activity_plan, meeting_day, meeting_time, meeting_location, meeting_frequency, status, agree_rules, eligibility_checklist, created_at, treasurer_name, vice_president_name, advisor_name, advisor_department",
    )
    .eq("id", id)
    .single<ApplicationDetail>();

  if (!application) {
    notFound();
  }

  // 개인정보(이름/학번/연락처) 없이 인원수만 집계 — RLS가 아니라 이 RPC
  // 자체가 호출자 권한(본인/super_admin/is_reviewer)을 확인한다.
  const [{ data: applicant }, { data: summaryRows }] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", application.applicant_id).single(),
    supabase.rpc("get_application_member_summary", { target_application_id: id }),
  ]);

  const summary = (summaryRows as MemberSummary[] | null)?.[0] ?? {
    total_count: 0,
    korean_count: 0,
    international_count: 0,
    current_student_count: 0,
  };

  const eligibility = evaluateEligibility({
    agreeRules: application.agree_rules,
    founderCount: summary.total_count,
    koreanCount: summary.korean_count,
    internationalCount: summary.international_count,
    hasTreasurer: Boolean(application.treasurer_name),
    checklist: application.eligibility_checklist ?? {},
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <p className="mb-2 text-sm font-bold text-coral">동아리 개설 신청 검토</p>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {application.club_name}
          {application.club_name_en && (
            <span className="ml-2 text-base font-medium text-muted-foreground">
              ({application.club_name_en})
            </span>
          )}
        </h1>
        <ApplicationStatusBadge status={application.status} />
      </div>

      <section className="flex flex-col gap-4 rounded-card border border-border bg-card p-6">
        <Field label="신청자 (회장)" value={applicant?.name ?? "알 수 없음"} />
        <Field label="동아리 구분" value={application.registration_category} />
        <Field label="사용 언어" value={LANGUAGE_LABEL[application.language ?? ""] ?? "-"} />
        <Field label="신청일" value={new Date(application.created_at).toLocaleDateString("ko-KR")} />
        <Field label="목적/소개" value={application.purpose} />
        <Field label="정기 활동 계획" value={application.activity_plan} />
        <Field
          label="정기 모임"
          value={
            [application.meeting_day, application.meeting_time, application.meeting_location, application.meeting_frequency]
              .filter(Boolean)
              .join(" · ") || "미기재"
          }
        />
        <Field label="총무" value={application.treasurer_name ?? "미지정"} />
        <Field label="부회장" value={application.vice_president_name ?? "없음"} />
        <Field
          label="지도교수"
          value={application.advisor_name ? `${application.advisor_name} (${application.advisor_department ?? "-"})` : "미기재"}
        />
      </section>

      <section className="mt-6 rounded-card border border-border bg-card p-4">
        <p className="mb-2 text-xs font-bold text-muted-foreground">
          회원 현황 (개인정보는 관리자만 열람 가능 — 인원수만 표시)
        </p>
        <p className="text-sm text-foreground">
          총 {summary.total_count}명 · 한국인 {summary.korean_count}명 · 외국인 {summary.international_count}명 · 재학생{" "}
          {summary.current_student_count}명
        </p>
      </section>

      <section className="mt-6 rounded-card border border-border bg-card p-4">
        <p className="mb-2 text-xs font-bold text-muted-foreground">자격요건 확인 현황 (참고용)</p>
        <div className="flex flex-col gap-1.5 text-sm">
          {eligibility.autoChecks.map((check) => (
            <div key={check.label} className="flex items-center justify-between">
              <span className="text-foreground">{check.label}</span>
              <span className={check.passed ? "font-bold text-blue-dark" : "font-bold text-coral-dark"}>
                {check.passed ? "충족" : "미충족"}
              </span>
            </div>
          ))}
          {eligibility.manualChecks.map((check) => (
            <div key={check.key} className="flex items-center justify-between">
              <span className="text-foreground">{check.label}</span>
              <span className={check.checked ? "font-bold text-blue-dark" : "font-bold text-muted-foreground"}>
                {check.checked ? "확인됨" : "미확인"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        최종 승인/반려는 관리자(super_admin)가 처리합니다. 이 페이지는 열람 전용입니다.
      </p>
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
