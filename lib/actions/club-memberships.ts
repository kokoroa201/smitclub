"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { notify } from "@/lib/notify";

// 학생 본인이 모집중인 동아리에 가입 신청한다. club_memberships_insert_own
// 정책(자기 자신만) + club_memberships_review_guard 트리거(신청 시 status는
// 'applied' 고정, 모집중 동아리만 허용)가 여기서 벗어난 값을 그대로 다시
// 막아준다.
export async function applyToClub(clubId: string, formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: club } = await supabase
    .from("clubs")
    .select("id, slug, name, status, president_id")
    .eq("id", clubId)
    .single();

  if (!club) {
    redirect("/clubs");
  }

  if (club.status !== "recruiting") {
    redirect(`/clubs/${club.slug}?error=${encodeURIComponent("현재 가입 신청을 받지 않는 동아리입니다.")}`);
  }

  const motivation = String(formData.get("motivation") ?? "").trim();

  const { error } = await supabase.from("club_memberships").insert({
    club_id: clubId,
    user_id: profile.id,
    motivation: motivation || null,
  });

  if (error) {
    const message =
      error.code === "23505" ? "이미 이 동아리에 가입 신청하셨습니다." : "가입 신청 중 오류가 발생했습니다.";
    redirect(`/clubs/${club.slug}/join?error=${encodeURIComponent(message)}`);
  }

  if (club.president_id) {
    await notify([
      {
        recipientId: club.president_id,
        type: "membership_applied",
        title: "새 가입 신청",
        body: `${club.name}에 새 가입 신청이 접수되었습니다.`,
        link: "/my/club",
      },
    ]);
  }

  redirect(`/clubs/${club.slug}/join?success=1`);
}

// 동아리 회장(또는 super_admin)이 자기 동아리로 들어온 신청을 승인/거절한다.
// club_memberships_update_review 정책(자기 동아리 회장만) + review_guard
// 트리거(applied -> approved/rejected로만, reviewed_by/reviewed_at은 본인
// 계정·현재 시각으로만)가 이중으로 막아준다.
export async function reviewMembership(membershipId: string, decision: "approved" | "rejected") {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: membership } = await supabase
    .from("club_memberships")
    .select("id, status, user_id, clubs(name)")
    .eq("id", membershipId)
    .single<{ id: string; status: string; user_id: string; clubs: { name: string } | null }>();

  if (!membership || membership.status !== "applied") {
    redirect(`/my/club?error=${encodeURIComponent("이미 처리되었거나 존재하지 않는 신청입니다.")}`);
  }

  const { error } = await supabase
    .from("club_memberships")
    .update({
      status: decision,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", membershipId);

  if (error) {
    console.error("club_memberships review failed", error);
    redirect(`/my/club?error=${encodeURIComponent("가입 신청 처리 중 오류가 발생했습니다.")}`);
  }

  const clubName = membership.clubs?.name ?? "동아리";
  await notify([
    {
      recipientId: membership.user_id,
      type: decision === "approved" ? "membership_approved" : "membership_rejected",
      title: "가입 신청 결과",
      body: `${clubName} 가입 신청이 ${decision === "approved" ? "승인" : "거절"}되었습니다.`,
      link: "/my",
    },
  ]);

  redirect("/my/club?reviewed=1");
}
