"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { requireSuperAdmin } from "@/lib/auth";

const CLUB_STATUSES = ["preparing", "recruiting", "active", "closed"] as const;

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
