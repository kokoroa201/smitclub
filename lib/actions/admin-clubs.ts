"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireSuperAdmin, REVIEWER_ROLES, type Role } from "@/lib/auth";

const CLUB_STATUSES = ["preparing", "recruiting", "active", "closed"] as const;

// 이 역할들은 회장으로 지정되어도 club_admin으로 덮어쓰지 않는다 — 원우회장 등이
// 본인 동아리 회장을 겸하는 경우를 보호한다(0012 마이그레이션과 동일한 원칙).
const ROLE_PROTECTED_FROM_CLUB_ADMIN_OVERRIDE: Role[] = ["super_admin", ...REVIEWER_ROLES];

export async function updateClubStatus(clubId: string, formData: FormData) {
  await requireSuperAdmin();

  const status = String(formData.get("status") ?? "");
  if (!CLUB_STATUSES.includes(status as (typeof CLUB_STATUSES)[number])) {
    redirect(`/admin/clubs?error=${encodeURIComponent("올바르지 않은 상태 값입니다.")}`);
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.from("clubs").update({ status }).eq("id", clubId);

  if (error) {
    console.error("clubs status update failed", error);
    redirect(`/admin/clubs?error=${encodeURIComponent(`상태 변경 중 오류가 발생했습니다: ${error.message}`)}`);
  }

  redirect("/admin/clubs");
}

// 동아리 회장(= 페이지 관리 권한) 지정. clubs.president_id가 실제 권한의
// 근거이므로(clubs_update_admin_or_president RLS, is_club_president() 함수),
// 이 액션은 그 컬럼만 변경하고 role은 필요한 경우에만 부수적으로 맞춰준다.
// president_id 자체는 clubs_admin_fields_guard 트리거로 super_admin/
// service_role만 바꿀 수 있게 이미 막혀 있으므로, requireSuperAdmin()이
// 이 액션의 유일한 진입 조건이 되어도 RLS와 어긋나지 않는다.
export async function updateClubPresident(clubId: string, formData: FormData) {
  const admin = await requireSuperAdmin();

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const rawPresidentId = String(formData.get("president_id") ?? "").trim();
  const newPresidentId = rawPresidentId || null;

  const { data: club, error: clubFetchError } = await supabase
    .from("clubs")
    .select("id, name, president_id")
    .eq("id", clubId)
    .single();

  if (clubFetchError || !club) {
    redirect(`/admin/clubs?error=${encodeURIComponent("동아리를 찾을 수 없습니다.")}`);
  }

  const oldPresidentId: string | null = club.president_id;

  let newPresidentProfile: { id: string; role: Role } | null = null;

  if (newPresidentId) {
    // 1) 선택한 회원이 실제로 존재하는지 검증
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", newPresidentId)
      .single();

    if (profileError || !profile) {
      redirect(`/admin/clubs?error=${encodeURIComponent("선택한 회원을 찾을 수 없습니다.")}`);
    }

    newPresidentProfile = profile as { id: string; role: Role };

    // 2) 한 계정이 두 개 이상의 동아리 회장이 되지 않도록 검증
    const { data: otherClubs } = await supabase
      .from("clubs")
      .select("id, name")
      .eq("president_id", newPresidentId)
      .neq("id", clubId);

    if (otherClubs && otherClubs.length > 0) {
      redirect(
        `/admin/clubs?error=${encodeURIComponent(
          `이미 '${otherClubs[0].name}' 동아리의 회장으로 지정되어 있습니다. 한 계정은 한 동아리의 회장만 맡을 수 있습니다.`,
        )}`,
      );
    }
  }

  if (oldPresidentId === newPresidentId) {
    // 변경 사항이 없으면 그대로 종료 (이미 동일 인물이거나 둘 다 미지정)
    redirect("/admin/clubs");
  }

  const { error: updateError } = await supabase
    .from("clubs")
    .update({ president_id: newPresidentId })
    .eq("id", clubId);

  if (updateError) {
    console.error("club president update failed", updateError);
    redirect(`/admin/clubs?error=${encodeURIComponent(`회장 지정 중 오류가 발생했습니다: ${updateError.message}`)}`);
  }

  // 3) 새 회장 승격: student(또는 그 외 미보호 역할)만 club_admin으로 바꾼다.
  if (
    newPresidentProfile &&
    newPresidentProfile.role !== "club_admin" &&
    !ROLE_PROTECTED_FROM_CLUB_ADMIN_OVERRIDE.includes(newPresidentProfile.role)
  ) {
    const { error: promoteError } = await supabase
      .from("profiles")
      .update({ role: "club_admin" })
      .eq("id", newPresidentProfile.id);

    if (promoteError) {
      console.error("club president promote failed", promoteError);
    }
  }

  // 4) 이전 회장 강등: role이 club_admin이고, 더 이상 어느 동아리의 회장도
  //    아니게 됐다면 student로 되돌린다. (본인 계정은 건드리지 않음 —
  //    enforce_profile_role_guard 트리거가 super_admin 본인의 role 변경은
  //    막아 둔 것과 동일한 이유.)
  if (oldPresidentId && oldPresidentId !== newPresidentId && oldPresidentId !== admin.id) {
    const { data: oldProfile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", oldPresidentId)
      .single();

    if (oldProfile && oldProfile.role === "club_admin") {
      const { data: stillPresidentOf } = await supabase
        .from("clubs")
        .select("id")
        .eq("president_id", oldPresidentId);

      if (!stillPresidentOf || stillPresidentOf.length === 0) {
        const { error: demoteError } = await supabase
          .from("profiles")
          .update({ role: "student" })
          .eq("id", oldPresidentId);

        if (demoteError) {
          console.error("club president demote failed", demoteError);
        }
      }
    }
  }

  revalidatePath("/admin/clubs");
  revalidatePath("/admin/members");
  revalidatePath("/my");
  revalidatePath("/my/club");

  redirect("/admin/clubs?success=president");
}
