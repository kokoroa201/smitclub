-- SMIT Club Portal — privacy hardening.
--
-- Problem: 0001 gave every authenticated user "using (true)" SELECT access
-- to public.profiles — both the real name/role AND (originally)
-- student_id/affiliation lived on that one broadly-readable row. That
-- means any signed-in student could read any other student's identity and
-- personal details. There was also no way to grant a club president
-- operational visibility into their own club's applicants/members without
-- exposing the same data to the entire student body, and no way to cut
-- off that visibility once the relationship ends (rejected / left).
--
-- Fix — default to private, minimal disclosure:
--   * public.profiles       — real name + role. Readable only by the row
--                              owner, a super admin, or the president of a
--                              club the owner is CURRENTLY applied to /
--                              an approved member of (never past
--                              relationships, never the whole student body).
--   * public.profile_private — student_id, affiliation. Same visibility
--                              rule, kept as a separate table on purpose:
--                              if profiles' rule is ever relaxed later
--                              (e.g. to show names within a club), this
--                              table stays locked down independently.
--   * public.profile_public  — a genuinely public, opt-in display_name for
--                              contexts like club board authorship. Holds
--                              nothing else — no student_id/email/contact
--                              belongs here, ever. display_name defaults to
--                              NULL (not auto-filled from the real name) so
--                              nothing is disclosed until the user chooses
--                              to set one. Photo/bio/interests are a later,
--                              separate addition to this same table/area.
--
-- Apply against an already-migrated database with:
--   supabase db push          (if the project is CLI-linked)
--   or paste this file into the Supabase Studio SQL editor, after 0001.
-- Existing student_id/affiliation values are copied into profile_private
-- before the source columns are dropped, so no data is lost.
--
-- Wrapped in an explicit transaction so the whole file is all-or-nothing
-- regardless of which tool applies it. The LOCK TABLE right after BEGIN is
-- the important part: it blocks any concurrent signup (INSERT into
-- profiles via the auth trigger) for the — very short — duration of this
-- migration, so a signup can never land in the gap between "copy
-- student_id/affiliation into profile_private" and "drop those columns
-- from profiles" and have its data silently dropped. A blocked signup
-- simply waits a moment and then completes normally against the new
-- schema/trigger once this transaction commits.

begin;

lock table public.profiles in access exclusive mode;

-- =========================================================================
-- profile_private: 1:1 with profiles, personal fields only.
-- =========================================================================

create table public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  student_id text,
  affiliation text,
  updated_at timestamptz not null default now()
);

alter table public.profile_private enable row level security;

insert into public.profile_private (id, student_id, affiliation)
select id, student_id, affiliation from public.profiles
on conflict (id) do nothing;

alter table public.profiles drop column student_id;
alter table public.profiles drop column affiliation;

-- =========================================================================
-- profile_public: intentionally the ONE public-by-default table. Only ever
-- add fields here that a member has explicitly chosen to share (nickname,
-- avatar, bio, interests, a visibility toggle for future opt-in fields).
-- Never add student_id / email / contact to this table.
-- =========================================================================

create table public.profile_public (
  id uuid primary key references public.profiles (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profile_public enable row level security;

create policy "profile_public_select" on public.profile_public
  for select using (true);

create policy "profile_public_update_own" on public.profile_public
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Backfill: every profile that existed before this migration also needs a
-- profile_public row, otherwise those members have no row for a future
-- "set display name" update to match, and any profiles-join-profile_public
-- query silently drops them.
insert into public.profile_public (id)
select id from public.profiles
on conflict (id) do nothing;

-- =========================================================================
-- Helper: is the caller the president of a club that target_user_id is
-- CURRENTLY applied to or an approved member of? Rejected/left rows don't
-- count — a president's visibility ends when the relationship does.
-- =========================================================================

create or replace function public.is_president_of_member(target_user_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.club_memberships m
    join public.clubs c on c.id = m.club_id
    where m.user_id = target_user_id
      and c.president_id = auth.uid()
      and m.status in ('applied', 'approved')
  );
$$;

-- =========================================================================
-- profiles: replace 0001's blanket "any authenticated user" policy with
-- self / super admin / scoped-president-of-current-member only.
-- =========================================================================

drop policy "profiles_select_authenticated" on public.profiles;

create policy "profiles_select_self_or_scoped" on public.profiles
  for select using (
    id = auth.uid() or public.is_super_admin() or public.is_president_of_member(id)
  );

-- =========================================================================
-- profile_private RLS — same scoping rule as profiles above.
-- =========================================================================

create policy "profile_private_select" on public.profile_private
  for select using (
    id = auth.uid() or public.is_super_admin() or public.is_president_of_member(id)
  );

create policy "profile_private_update_own" on public.profile_private
  for update using (id = auth.uid()) with check (id = auth.uid());

create trigger profile_private_set_updated_at
before update on public.profile_private
for each row execute function public.set_updated_at();

-- =========================================================================
-- handle_new_user: now creates all three rows. profile_public.display_name
-- starts NULL on purpose — nothing is disclosed until the member sets one.
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );

  insert into public.profile_private (id, student_id, affiliation)
  values (
    new.id,
    new.raw_user_meta_data ->> 'student_id',
    new.raw_user_meta_data ->> 'affiliation'
  );

  insert into public.profile_public (id) values (new.id);

  return new;
end;
$$;

commit;
