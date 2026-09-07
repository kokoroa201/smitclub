"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { requireSuperAdmin, type Role } from "@/lib/auth";

const ASSIGNABLE_ROLES: Role[] = [
  "student",
  "club_admin",
  "super_admin",
  "council_president",
  "council_vice_president",
  "academic_staff",
];

export async function updateMemberRole(memberId: string, formData: FormData) {
  const admin = await requireSuperAdmin();
  if (memberId === admin.id) return;

  const role = String(formData.get("role") ?? "");
  if (!ASSIGNABLE_ROLES.includes(role as Role)) return;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  await supabase.from("profiles").update({ role }).eq("id", memberId);

  revalidatePath("/admin/members");
}
