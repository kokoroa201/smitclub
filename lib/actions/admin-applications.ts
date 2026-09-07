"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { requireSuperAdmin, REVIEWER_ROLES } from "@/lib/auth";
import { evaluateEligibility, MANUAL_CHECKLIST_ITEMS } from "@/lib/eligibility";
import { getApprovalNumber } from "@/lib/certificate";

type ClubApplicationRow = {
  id: string;
  applicant_id: string;
  club_name: string;
  club_name_en: string | null;
  category: string;
  purpose: string;
  meeting_day: string | null;
  meeting_time: string | null;
  meeting_location: string | null;
  established_at: string | null;
  status: string;
};

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = Math.random().toString(16).slice(2, 6);
  return base ? `${base}-${suffix}` : `club-${suffix}`;
}

export async function updateEligibilityChecklist(applicationId: string, formData: FormData) {
  await requireSuperAdmin();

  const checklist = Object.fromEntries(
    MANUAL_CHECKLIST_ITEMS.map((item) => [item.key, formData.get(item.key) === "on"]),
  );

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  await supabase.from("club_applications").update({ eligibility_checklist: checklist }).eq("id", applicationId);

  redirect(`/admin/club-applications/${applicationId}`);
}

export async function requestReview(applicationId: string) {
  const admin = await requireSuperAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: application } = await supabase
    .from("club_applications")
    .select(
      "id, club_name, applicant_id, status, agree_rules, eligibility_checklist, created_at, treasurer_name",
    )
    .eq("id", applicationId)
    .single();

  if (!application || application.status !== "submitted") {
    redirect(
      `/admin/club-applications/${applicationId}?error=${encodeURIComponent("검토 요청은 검토 대기 상태에서만 가능합니다.")}`,
    );
  }

  const { data: founders } = await supabase
    .from("club_application_founders")
    .select("nationality")
    .eq("application_id", applicationId);

  const founderList = founders ?? [];
  const koreanCount = founderList.filter((f) => f.nationality === "domestic").length;
  const internationalCount = founderList.filter((f) => f.nationality === "international").length;

  const eligibility = evaluateEligibility({
    agreeRules: application.agree_rules,
    founderCount: founderList.length,
    koreanCount,
    internationalCount,
    hasTreasurer: Boolean(application.treasurer_name),
    checklist: (application.eligibility_checklist ?? {}) as Record<string, boolean>,
  });

  if (!eligibility.allPassed) {
    redirect(
      `/admin/club-applications/${applicationId}?error=${encodeURIComponent("자격요건 확인이 끝나지 않아 검토 요청을 보낼 수 없습니다.")}`,
    );
  }

  const [{ data: reviewers }, { data: applicantProfile }] = await Promise.all([
    supabase.from("profiles").select("id").in("role", REVIEWER_ROLES),
    supabase.from("profiles").select("name").eq("id", application.applicant_id).single(),
  ]);

  if (reviewers && reviewers.length > 0) {
    const createdDateLabel = new Date(application.created_at).toLocaleDateString("ko-KR");
    const { error: notifyError } = await supabase.from("notifications").insert(
      reviewers.map((reviewer) => ({
        recipient_id: reviewer.id,
        type: "application_review_requested",
        title: `[검토 요청] ${application.club_name} 동아리 개설 신청`,
        body: `신청자: ${applicantProfile?.name ?? "알 수 없음"} · 신청일: ${createdDateLabel}`,
        link: `/club-applications/${applicationId}/review`,
        related_application_id: applicationId,
      })),
    );

    if (notifyError) {
      redirect(
        `/admin/club-applications/${applicationId}?error=${encodeURIComponent("검토 요청 알림 발송 중 오류가 발생했습니다.")}`,
      );
    }
  }

  await supabase
    .from("club_applications")
    .update({ review_requested_at: new Date().toISOString(), review_requested_by: admin.id })
    .eq("id", applicationId);

  redirect(`/admin/club-applications/${applicationId}`);
}

// 지도교수 확인 — 최초 신청 제출의 필수 단계가 아니라, 원우회가 검토 요청을
// 보낸 뒤(review_requested_at 존재) 지도교수와 별도로 조율해 기록하는 단계.
// 이 단계를 통과(advisor_confirmed=true)해야 학교 승인 추천으로 넘어갈 수 있다.
export async function confirmAdvisor(applicationId: string, formData: FormData) {
  const admin = await requireSuperAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: application } = await supabase
    .from("club_applications")
    .select("id, status, review_requested_at")
    .eq("id", applicationId)
    .single();

  if (!application || application.status !== "submitted" || !application.review_requested_at) {
    redirect(
      `/admin/club-applications/${applicationId}?error=${encodeURIComponent("원우회 검토 요청을 먼저 보낸 뒤 지도교수 확인을 진행할 수 있습니다.")}`,
    );
  }

  const advisorName = String(formData.get("advisor_name") ?? "").trim();
  const advisorDepartment = String(formData.get("advisor_department") ?? "").trim();
  const advisorContact = String(formData.get("advisor_contact") ?? "").trim();
  const advisorEmail = String(formData.get("advisor_email") ?? "").trim();
  const advisorAppointmentMethod = String(formData.get("advisor_appointment_method") ?? "").trim();
  const advisorNote = String(formData.get("advisor_note") ?? "").trim();

  if (!advisorName || !advisorDepartment || !advisorContact || !advisorEmail || !advisorAppointmentMethod) {
    redirect(
      `/admin/club-applications/${applicationId}?error=${encodeURIComponent("지도교수 정보(성명, 소속학과, 연락처, 이메일, 선임경위)를 모두 입력해주세요.")}`,
    );
  }

  await supabase
    .from("club_applications")
    .update({
      advisor_name: advisorName,
      advisor_department: advisorDepartment,
      advisor_contact: advisorContact,
      advisor_email: advisorEmail,
      advisor_appointment_method: advisorAppointmentMethod,
      advisor_note: advisorNote || null,
      advisor_confirmed: true,
      advisor_confirmed_at: new Date().toISOString(),
      advisor_confirmed_by: admin.id,
    })
    .eq("id", applicationId);

  redirect(`/admin/club-applications/${applicationId}`);
}

// 원우회의 학교 승인 추천 (제14조 4호) — 지도교수 확인이 끝난 뒤에만 가능하며,
// 이 단계만으로는 아직 동아리가 만들어지거나 recruiting으로 전환되지 않는다.
// 실제 등록(승인)은 approveApplication(학교 최종 승인)에서만 이루어진다.
export async function recommendToSchool(applicationId: string) {
  const admin = await requireSuperAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: application } = await supabase
    .from("club_applications")
    .select("id, status, advisor_confirmed")
    .eq("id", applicationId)
    .single();

  if (!application || application.status !== "submitted" || !application.advisor_confirmed) {
    redirect(
      `/admin/club-applications/${applicationId}?error=${encodeURIComponent("지도교수 확인이 완료되어야 학교 승인 추천을 진행할 수 있습니다.")}`,
    );
  }

  await supabase
    .from("club_applications")
    .update({ status: "recommended", recommended_at: new Date().toISOString(), recommended_by: admin.id })
    .eq("id", applicationId);

  redirect(`/admin/club-applications/${applicationId}`);
}

export async function approveApplication(applicationId: string, formData: FormData) {
  const admin = await requireSuperAdmin();
  const adminNote = String(formData.get("admin_note") ?? "").trim();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error: fetchError } = await supabase
    .from("club_applications")
    .select(
      "id, applicant_id, club_name, club_name_en, category, purpose, meeting_day, meeting_time, meeting_location, established_at, status",
    )
    .eq("id", applicationId)
    .single();

  const application = data as ClubApplicationRow | null;

  if (fetchError || !application) {
    redirect(`/admin/club-applications/${applicationId}?error=${encodeURIComponent("신청서를 찾을 수 없습니다.")}`);
  }

  if (application.status !== "recommended") {
    redirect(
      `/admin/club-applications/${applicationId}?error=${encodeURIComponent("원우회의 학교 승인 추천이 완료된 신청만 최종 승인할 수 있습니다.")}`,
    );
  }

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .insert({
      name: application.club_name,
      name_en: application.club_name_en,
      slug: slugify(application.club_name),
      category: application.category,
      status: "recruiting",
      description: application.purpose,
      meeting_day: application.meeting_day,
      meeting_time: application.meeting_time,
      meeting_location: application.meeting_location,
      founded_year: application.established_at ? new Date(application.established_at).getFullYear() : null,
      president_id: application.applicant_id,
    })
    .select("id")
    .single();

  if (clubError || !club) {
    redirect(`/admin/club-applications/${applicationId}?error=${encodeURIComponent("동아리 생성 중 오류가 발생했습니다.")}`);
  }

  const { error: roleError } = await supabase
    .from("profiles")
    .update({ role: "club_admin" })
    .eq("id", application.applicant_id);

  if (roleError) {
    redirect(
      `/admin/club-applications/${applicationId}?error=${encodeURIComponent("신청자 권한 승격 중 오류가 발생했습니다. 0004 마이그레이션이 적용됐는지 확인해주세요.")}`,
    );
  }

  const reviewedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("club_applications")
    .update({
      status: "approved",
      resulting_club_id: club.id,
      reviewed_by: admin.id,
      reviewed_at: reviewedAt,
      admin_note: adminNote || null,
    })
    .eq("id", applicationId);

  if (updateError) {
    redirect(`/admin/club-applications/${applicationId}?error=${encodeURIComponent("신청서 상태 업데이트 중 오류가 발생했습니다.")}`);
  }

  const approvalNumber = getApprovalNumber(applicationId, reviewedAt);
  const approvedDateLabel = new Date(reviewedAt).toLocaleDateString("ko-KR");

  await supabase.from("notifications").insert({
    recipient_id: application.applicant_id,
    type: "application_approved",
    title: `[승인 완료] ${application.club_name} 동아리 개설이 승인되었습니다.`,
    body: `승인일: ${approvedDateLabel} · 승인번호: ${approvalNumber}${adminNote ? `\n${adminNote}` : ""}`,
    link: `/club-applications/${applicationId}/certificate`,
    related_application_id: applicationId,
  });

  redirect("/admin/club-applications");
}

export async function rejectApplication(applicationId: string, formData: FormData) {
  const admin = await requireSuperAdmin();
  const adminNote = String(formData.get("admin_note") ?? "").trim();

  if (!adminNote) {
    redirect(`/admin/club-applications/${applicationId}?error=${encodeURIComponent("반려 사유를 입력해주세요.")}`);
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: application } = await supabase
    .from("club_applications")
    .select("applicant_id, club_name")
    .eq("id", applicationId)
    .single();

  const { error } = await supabase
    .from("club_applications")
    .update({
      status: "rejected",
      admin_note: adminNote,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) {
    redirect(`/admin/club-applications/${applicationId}?error=${encodeURIComponent("신청서 상태 업데이트 중 오류가 발생했습니다.")}`);
  }

  if (application) {
    await supabase.from("notifications").insert({
      recipient_id: application.applicant_id,
      type: "application_rejected",
      title: `[반려] ${application.club_name} 동아리 개설 신청이 반려되었습니다.`,
      body: adminNote,
      related_application_id: applicationId,
    });
  }

  redirect("/admin/club-applications");
}

export async function requestRevision(applicationId: string, formData: FormData) {
  const admin = await requireSuperAdmin();
  const adminNote = String(formData.get("admin_note") ?? "").trim();

  if (!adminNote) {
    redirect(`/admin/club-applications/${applicationId}?error=${encodeURIComponent("보완 요청 사유를 입력해주세요.")}`);
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: application } = await supabase
    .from("club_applications")
    .select("applicant_id, club_name")
    .eq("id", applicationId)
    .single();

  const { error } = await supabase
    .from("club_applications")
    .update({
      status: "needs_revision",
      admin_note: adminNote,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) {
    redirect(`/admin/club-applications/${applicationId}?error=${encodeURIComponent("신청서 상태 업데이트 중 오류가 발생했습니다.")}`);
  }

  if (application) {
    await supabase.from("notifications").insert({
      recipient_id: application.applicant_id,
      type: "application_needs_revision",
      title: `[보완 요청] ${application.club_name} 동아리 개설 신청`,
      body: adminNote,
      related_application_id: applicationId,
    });
  }

  redirect("/admin/club-applications");
}
