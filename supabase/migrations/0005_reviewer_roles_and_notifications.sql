-- SMIT Club Portal — application review workflow support.
--
-- Adds the pieces needed to run "신청 -> 자격요건 확인 -> 원우회/교학처 검토
-- 요청 -> 최종 승인 -> 승인서 발급" end to end without redesigning the
-- existing auth/role/RLS model:
--
--   1) Three new profiles.role values so the 원우회장/부회장/교학처 담당자
--      can be represented as real accounts. They are NOT admins — they get
--      no new write privileges anywhere, only read access to
--      club_applications (via is_reviewer()) so a notification's "신청 상세
--      보기" link actually resolves for them. Approve/reject/status changes
--      remain super_admin-only, unchanged.
--   2) club_applications gains two review-workflow columns (eligibility
--      checklist state, review-request bookkeeping). Both are admin-only
--      fields, so the existing enforce_application_admin_fields_guard
--      trigger is extended to cover them the same way it already covers
--      admin_note/validation_passed/etc.
--   3) A generic notifications table for in-app alerts (no email service is
--      connected yet). A recipient can only ever read/update their own
--      rows; only a super_admin can create one (every code path that
--      inserts a notification is already super_admin-gated).
--
-- Apply by pasting into the Supabase Studio SQL editor (this project has no
-- CLI-linked `supabase/config.toml`), after 0001-0004.

begin;

-- =========================================================================
-- 1) New reviewer roles on profiles
-- =========================================================================

alter table public.profiles drop constraint profiles_role_check;

alter table public.profiles add constraint profiles_role_check check (
  role in (
    'student',
    'club_admin',
    'super_admin',
    'council_president',
    'council_vice_president',
    'academic_staff'
  )
);

create or replace function public.is_reviewer()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('council_president', 'council_vice_president', 'academic_staff')
  );
$$;

-- Additive only — the existing club_applications_select_own_or_admin policy
-- is untouched; Postgres OR's every SELECT policy on the table together.
create policy "club_applications_select_reviewer" on public.club_applications
  for select using (public.is_reviewer());

-- =========================================================================
-- 2) club_applications: eligibility checklist + review-request bookkeeping
-- =========================================================================

alter table public.club_applications
  add column eligibility_checklist jsonb not null default '{}'::jsonb,
  add column review_requested_at timestamptz,
  add column review_requested_by uuid references public.profiles (id);

-- Extend the existing admin-fields guard (same function, same trigger — no
-- need to touch the trigger definition) to also lock down the two new
-- columns down to admin/service_role only, exactly like admin_note today.
create or replace function public.enforce_application_admin_fields_guard()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or public.is_super_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'submitted')
      or new.validation_passed is distinct from false
      or new.admin_note is not null
      or new.reviewed_by is not null
      or new.reviewed_at is not null
      or new.resulting_club_id is not null
      or new.eligibility_checklist is distinct from '{}'::jsonb
      or new.review_requested_at is not null
      or new.review_requested_by is not null then
      raise exception 'insufficient privilege to set review fields on insert';
    end if;
    return new;
  end if;

  if new.validation_passed is distinct from old.validation_passed
    or new.admin_note is distinct from old.admin_note
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.resulting_club_id is distinct from old.resulting_club_id
    or new.eligibility_checklist is distinct from old.eligibility_checklist
    or new.review_requested_at is distinct from old.review_requested_at
    or new.review_requested_by is distinct from old.review_requested_by then
    raise exception 'insufficient privilege to modify review fields';
  end if;

  return new;
end;
$$;

-- =========================================================================
-- 3) notifications — generic in-app notification (no email provider wired
--    up yet; this is the fallback the task calls for).
-- =========================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (
    type in (
      'application_review_requested',
      'application_approved',
      'application_rejected',
      'application_needs_revision'
    )
  ),
  title text not null,
  body text,
  link text,
  related_application_id uuid references public.club_applications (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create index notifications_recipient_id_idx on public.notifications (recipient_id, created_at desc);

create policy "notifications_select_own" on public.notifications
  for select using (recipient_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- Every current insert path (review-request / approve / reject / revision)
-- is already super_admin-gated in app code; RLS mirrors that at the DB
-- layer so a notification can never be forged as coming from someone else.
create policy "notifications_insert_admin" on public.notifications
  for insert with check (public.is_super_admin());

commit;
