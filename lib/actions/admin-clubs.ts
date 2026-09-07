"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireSuperAdmin } from "@/lib/auth";

const CLUB_STATUSES = ["preparing", "recruiting", "active", "closed"] as const;

export async function updateClubStatus(clubId: string, formData: FormData) {
  await requireSuperAdmin();

  const status = String(formData.get("status") ?? "");
  if (!CLUB_STATUSES.includes(status as (typeof CLUB_STATUSES)[number])) {
    return;
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  await supabase.from("clubs").update({ status }).eq("id", clubId);

  revalidatePath("/admin/clubs");
  revalidatePath("/admin");
}
