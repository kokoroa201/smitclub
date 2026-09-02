"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

type ClubApplicationRow = {
  id: string;
  applicant_id: string;
  club_name: string;
  category: string;
  purpose: string;
  meeting_day: string | null;
  meeting_time: string | null;
  meeting_location: string | null;
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

async function requireSuperAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") {
    redirect("/");
  }
  return profile;
}

export async function approveApplication(applicationId: string, _formData: FormData) {
  const admin = await requireSuperAdmin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error: fetchError } = await supabase
    .from("club_applications")
    .select("id, applicant_id, club_name, category, purpose, meeting_day, meeting_time, meeting_location")
    .eq("id", applicationId)
    .single();

  const application = data as ClubApplicationRow | null;

  if (fetchError || !application) {
    redirect(`/admin/club-applications/${applicationId}?error=${encodeURIComponent("신청서를 찾을 수 없습니다.")}`);
  }

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .insert({
      name: application.club_name,
      slug: slugify(application.club_name),
      category: application.category,
      status: "preparing",
      description: application.purpose,
      meeting_day: application.meeting_day,
      meeting_time: application.meeting_time,
      meeting_location: application.meeting_location,
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

  const { error: updateError } = await supabase
    .from("club_applications")
    .update({
      status: "approved",
      resulting_club_id: club.id,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (updateError) {
    redirect(`/admin/club-applications/${applicationId}?error=${encodeURIComponent("신청서 상태 업데이트 중 오류가 발생했습니다.")}`);
  }

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

  redirect("/admin/club-applications");
}
