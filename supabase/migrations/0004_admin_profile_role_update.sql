-- Allow a super_admin to update another user's profiles row (needed to
-- promote a club-creation applicant to club_admin on approval). The existing
-- `profiles_update_own` policy only lets a row's owner update it, so an
-- admin's UPDATE never reaches `enforce_profile_role_guard` — that trigger
-- already anticipates an admin-driven role change, but had no RLS path to
-- fire on. Postgres RLS policies for the same command are OR'd together, so
-- this coexists with `profiles_update_own` without changing its behavior;
-- the trigger remains the actual gate on which fields may change and by whom.

create policy "profiles_update_admin" on public.profiles
  for update using (public.is_super_admin()) with check (public.is_super_admin());
