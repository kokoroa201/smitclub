import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type Role =
  | "student"
  | "club_admin"
  | "super_admin"
  | "council_president"
  | "council_vice_president"
  | "academic_staff";

export const REVIEWER_ROLES: Role[] = ["council_president", "council_vice_president", "academic_staff"];

export type Profile = {
  id: string;
  name: string;
  role: Role;
  locale_pref: "ko" | "en";
  created_at: string;
};

export async function getCurrentProfile(): Promise<Profile | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (profile as Profile | null) ?? null;
}

export async function requireSuperAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") {
    redirect("/");
  }
  return profile;
}
