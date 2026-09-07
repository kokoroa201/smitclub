import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import {
  approveApplication,
  rejectApplication,
  requestRevision,
  requestReview,
  updateEligibilityChecklist,
  confirmAdvisor,
  recommendToSchool,
} from "@/lib/actions/admin-applications";
import { ApplicationStatusBadge } from "@/components/admin/status-badge";
import { evaluateEligibility, MANUAL_CHECKLIST_ITEMS } from "@/lib/eligibility";
import { DOCUMENT_TYPES } from "@/lib/application-documents";

type ApplicationDetail = {
  id: string;
  applicant_id: string;
  club_name: string;
  club_name_en: string | null;
  category: string;
  registration_category: string;
  purpose: string;
  activity_plan: string;
  meeting_day: string | null;
  meeting_time: string | null;
  meeting_location: string | null;
  meeting_frequency: string | null;
  status: string;
  admin_note: string | null;
  agree_rules: boolean;
  eligibility_checklist: Record<string, boolean> | null;
  review_requested_at: string | null;
  created_at: string;
  treasurer_name: string | null;
  vice_president_name: string | null;
  advisor_name: string | null;
  advisor_department: string | null;
  advisor_email: string | null;
  advisor_confirmed: boolean;
  advisor_confirmed_at: string | null;
  recommended_at: string | null;
};

type Founder = {
  id: string;
  name: string;
  student_id: string | null;
  is_current_student: boolean;
  nationality: "domestic" | "international";
  contact: string | null;
};

export default async function AdminClubApplicationDetailPage(
  props: PageProps<"/admin/club-applications/[id]">,
) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const error = typeof searchParams.error === "string" ? searchParams.error : null;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: application } = await supabase
    .from("club_applications")
    .select(
      "id, applicant_id, club_name, club_name_en, category, registration_category, purpose, activity_plan, meeting_day, meeting_time, meeting_location, meeting_frequency, status, admin_note, agree_rules, eligibility_checklist, review_requested_at, created_at, treasurer_name, vice_president_name, advisor_name, advisor_department, advisor_email, advisor_confirmed, advisor_confirmed_at, recommended_at",
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
      .select("id, name, student_id, is_current_student, nationality, contact")
      .eq("application_id", id)
      .returns<Founder[]>(),
  ]);

  const founderList = founders ?? [];
  const koreanCount = founderList.filter((f) => f.nationality === "domestic").length;
  const internationalCount = founderList.filter((f) => f.nationality === "international").length;

  const eligibility = evaluateEligibility({
    agreeRules: application.agree_rules,
    founderCount: founderList.length,
    koreanCount,
    internationalCount,
    hasTreasurer: Boolean(application.treasurer_name),
    checklist: application.eligibility_checklist ?? {},
  });

  const approveWithId = approveApplication.bind(null, id);
  const rejectWithId = rejectApplication.bind(null, id);
  const requestRevisionWithId = requestRevision.bind(null, id);
  const requestReviewWithId = requestReview.bind(null, id);
  const updateChecklistWithId = updateEligibilityChecklist.bind(null, id);
  const confirmAdvisorWithId = confirmAdvisor.bind(null, id);
  const recommendToSchoolWithId = recommendToSchool.bind(null, id);

  const canReject = ["submitted", "needs_revision", "recommended"].includes(application.status);
  const canApprove = application.status === "recommended";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
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

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <section className="flex flex-col gap-4 rounded-card border border-border bg-card p-6">
        <Field label="신청자 (회장)" value={applicant?.name ?? "알 수 없음"} />
        <Field label="동아리 구분 (운영규정 제4조)" value={application.registration_category} />
        <Field label="사이트 표시 카테고리" value={application.category} />
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
          value={
            application.advisor_name
              ? `${application.advisor_name} (${application.advisor_department ?? "-"}) · ${application.advisor_email ?? "-"}${
                  application.advisor_confirmed ? " · 확인 완료" : " · 확인 대기"
                }`
              : "1차 검토 이후 확인 예정"
          }
        />
        {application.admin_note && <Field label="관리자 메모" value={application.admin_note} />}
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-bold text-foreground">
          회원 명단 ({founderList.length}명 · 한국인 {koreanCount} · 외국인 {internationalCount})
        </h2>
        <div className="flex flex-col gap-2">
          {founderList.map((founder) => (
            <div
              key={founder.id}
              className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
            >
              <span className="font-medium text-foreground">{founder.name}</span>
              <span className="text-muted-foreground">
                {founder.student_id ?? "학번 미기재"} ·{" "}
                {founder.is_current_student ? "재학생" : "휴학/졸업"} ·{" "}
                {founder.nationality === "international" ? "외국인" : "한국인"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-bold text-foreground">서식 인쇄</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DOCUMENT_TYPES.map((doc) => (
            <Link
              key={doc.type}
              href={`/club-applications/${id}/documents/${doc.type}`}
              className="rounded-md border border-border px-3 py-2 text-center text-sm font-semibold text-foreground hover:bg-muted"
            >
              {doc.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">자격요건 확인</h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              eligibility.allPassed ? "bg-blue-soft text-blue-dark" : "bg-yellow-soft text-yellow-dark"
            }`}
          >
            {eligibility.allPassed ? "검토 가능" : "보완 필요"}
          </span>
        </div>

        <div className="flex flex-col gap-2 rounded-card border border-border bg-card p-4">
          <p className="text-xs font-bold text-muted-foreground">자동 확인 (DB 기준)</p>
          {eligibility.autoChecks.map((check) => (
            <div key={check.label} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{check.label}</span>
              <span className={check.passed ? "font-bold text-blue-dark" : "font-bold text-coral-dark"}>
                {check.passed ? "충족" : "미충족"} · {check.detail}
              </span>
            </div>
          ))}

          <div className="my-2 border-t border-border" />

          <p className="text-xs font-bold text-muted-foreground">관리자 확인 필요</p>
          <form action={updateChecklistWithId} className="flex flex-col gap-2">
            {MANUAL_CHECKLIST_ITEMS.map((item) => {
              const checked = eligibility.manualChecks.find((c) => c.key === item.key)?.checked ?? false;
              return (
                <label key={item.key} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" name={item.key} defaultChecked={checked} className="h-4 w-4" />
                  {item.label}
                </label>
              );
            })}
            <button
              type="submit"
              className="mt-1 w-fit rounded-full border border-border px-3 py-1.5 text-sm font-bold text-foreground hover:bg-muted"
            >
              확인 항목 저장
            </button>
          </form>
        </div>
      </section>

      {application.status === "submitted" && (
        <section className="mt-6 rounded-card border border-border bg-card p-4">
          <h2 className="mb-2 text-lg font-bold text-foreground">원우회·교학처 검토 요청</h2>
          {application.review_requested_at ? (
            <p className="text-sm text-muted-foreground">
              {new Date(application.review_requested_at).toLocaleString("ko-KR")}에 요청을 보냈습니다.
            </p>
          ) : eligibility.allPassed ? (
            <form action={requestReviewWithId}>
              <button
                type="submit"
                className="w-full rounded-full border border-coral px-4 py-2.5 font-bold text-coral hover:bg-coral-soft"
              >
                원우회장·부회장·교학처 담당자에게 검토 요청 보내기
              </button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              자격요건 확인(자동 확인 + 관리자 확인 항목)을 모두 충족해야 검토 요청을 보낼 수 있습니다.
            </p>
          )}
        </section>
      )}

      {application.status === "submitted" && application.review_requested_at && (
        <section className="mt-6 rounded-card border border-border bg-card p-4">
          <h2 className="mb-2 text-lg font-bold text-foreground">지도교수 확인</h2>
          {application.advisor_confirmed ? (
            <p className="text-sm text-muted-foreground">
              {application.advisor_confirmed_at && new Date(application.advisor_confirmed_at).toLocaleString("ko-KR")}에
              확인 완료 — {application.advisor_name} ({application.advisor_department})
            </p>
          ) : (
            <form action={confirmAdvisorWithId} className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                원우회가 지도교수와 별도로 조율한 정보를 입력하고 확인 완료 처리합니다.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input name="advisor_name" placeholder="성명 Name" required className="rounded-md border border-border px-3 py-2 text-sm" />
                <input
                  name="advisor_department"
                  placeholder="소속학과/전공 Department"
                  required
                  className="rounded-md border border-border px-3 py-2 text-sm"
                />
                <input name="advisor_contact" placeholder="연락처 Contact" required className="rounded-md border border-border px-3 py-2 text-sm" />
                <input
                  type="email"
                  name="advisor_email"
                  placeholder="이메일 E-Mail"
                  required
                  className="rounded-md border border-border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="advisor_appointment_method" value="faculty_volunteer" required />
                  교수 자원
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="advisor_appointment_method" value="school_recommendation" />
                  학교 추천
                </label>
              </div>
              <textarea
                name="advisor_note"
                placeholder="특기사항 (선택)"
                rows={2}
                className="rounded-md border border-border px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="w-fit rounded-full border border-border px-3 py-1.5 text-sm font-bold text-foreground hover:bg-muted"
              >
                지도교수 확인 완료 처리
              </button>
            </form>
          )}
        </section>
      )}

      {application.status === "submitted" && application.advisor_confirmed && (
        <section className="mt-6 rounded-card border border-border bg-card p-4">
          <h2 className="mb-2 text-lg font-bold text-foreground">원우회의 학교 승인 추천</h2>
          <form action={recommendToSchoolWithId}>
            <button
              type="submit"
              className="w-full rounded-full border border-coral px-4 py-2.5 font-bold text-coral hover:bg-coral-soft"
            >
              학교에 승인 추천하기
            </button>
          </form>
        </section>
      )}

      {application.status === "recommended" && (
        <section className="mt-6 rounded-card border border-border bg-card p-4">
          <h2 className="mb-2 text-lg font-bold text-foreground">학교 최종 승인 대기</h2>
          <p className="text-sm text-muted-foreground">
            {application.recommended_at && new Date(application.recommended_at).toLocaleString("ko-KR")}에 원우회가 학교에
            승인을 추천했습니다. 아래에서 학교 최종 승인을 처리할 수 있습니다.
          </p>
        </section>
      )}

      {application.status === "approved" && (
        <section className="mt-6">
          <Link
            href={`/club-applications/${id}/certificate`}
            className="block w-full rounded-full bg-coral px-4 py-3 text-center font-bold text-white"
          >
            승인서 보기 / 인쇄
          </Link>
        </section>
      )}

      {(canApprove || canReject) && (
        <section className="mt-8 flex flex-col gap-4">
          {canApprove && (
            <form action={approveWithId} className="flex flex-col gap-2">
              <textarea
                name="admin_note"
                placeholder="승인 메모 (선택)"
                rows={2}
                className="rounded-md border border-border px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="w-full rounded-full bg-coral px-4 py-3 font-bold text-white"
              >
                학교 최종 승인
              </button>
            </form>
          )}

          {canReject && (
            <>
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
            </>
          )}
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
