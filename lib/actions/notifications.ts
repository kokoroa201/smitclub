"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export type { NotificationType } from "@/lib/notify";

export async function markNotificationRead(notificationId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", profile.id);

  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", profile.id)
    .is("read_at", null);

  revalidatePath("/notifications");
}
