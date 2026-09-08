-- SMIT Club Portal — 0005(reviewer_roles_and_notifications)가 실제 운영 DB에는
-- 반영되지 않은 채로 0006이 먼저(또는 단독으로) 적용된 상태를 바로잡는다.
--
-- 진단: club_applications 테이블에는 0006이 추가한 컬럼(president_*,
-- treasurer_*, advisor_*, recommended_* 등)은 전부 존재하지만, 0005가
-- 추가했어야 할 eligibility_checklist / review_requested_at /
-- review_requested_by 컬럼과 notifications 테이블 자체가 존재하지 않았다
-- (REST API로 직접 확인: 42703 undefined_column / PGRST205 table not found).
--
-- 그런데 0006이 (0005에서 그대로 이어받아) CREATE OR REPLACE 하는
-- enforce_application_admin_fields_guard() 함수 본문은 new.eligibility_checklist
-- 를 무조건 참조한다. PL/pgSQL은 트리거 함수를 만들 때 컬럼 존재 여부를
-- 검증하지 않고 실제 INSERT/UPDATE가 실행되는 시점에야 검사하기 때문에,
-- 0006 적용 자체는 에러 없이 "성공"했지만 그 이후 관리자(super_admin)가
-- 아닌 일반 신청자가 club_applications에 INSERT를 시도하는 순간
-- (is_super_admin()/service_role 얼리 리턴을 타지 않으므로) 트리거가
--   record "new" has no field "eligibility_checklist"
-- 로 매번 실패했다 — 이것이 "신청서 저장 중 오류가 발생했습니다"의 실제 원인이다.
-- (참고: 신청 폼 서버 액션이 validation_passed:true를 직접 넣던 별도 버그도
-- 함께 있었고 lib/actions/club-applications.ts에서 수정했지만, 그 수정과 무관하게
-- 이 스키마 누락이 있는 한 어차피 매번 실패했다 — 두 문제 모두 고쳐야 제출이 된다.)
--
-- 0005/0006 파일 자체는 이미 적용된 것으로 간주해 수정하지 않고, 실제로
-- 누락된 부분만 이 파일에서 다시(그리고 안전하게 재실행 가능하도록) 채워
-- 넣는다. 기존 데이터는 전혀 건드리지 않는다.
--
-- Apply by pasting into the Supabase Studio SQL editor, after 0001-0007.

begin;

-- =========================================================================
-- 1) profiles: 원우회장/부회장/교학처 리뷰어 역할 (0005의 일부, 누락 가능성 대비)
-- =========================================================================

alter table public.profiles drop constraint if exists profiles_role_check;

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

drop policy if exists "club_applications_select_reviewer" on public.club_applications;
create policy "club_applications_select_reviewer" on public.club_applications
  for select using (public.is_reviewer());

-- =========================================================================
-- 2) club_applications: 실제로 누락돼 있던 eligibility_checklist / 검토요청 컬럼
--    — enforce_application_admin_fields_guard()가 이미 이 컬럼들을 참조하고
--    있으므로, 컬럼이 없으면 일반 신청자의 모든 INSERT/UPDATE가 즉시 실패한다.
-- =========================================================================

alter table public.club_applications
  add column if not exists eligibility_checklist jsonb not null default '{}'::jsonb,
  add column if not exists review_requested_at timestamptz,
  add column if not exists review_requested_by uuid references public.profiles (id);

-- =========================================================================
-- 3) notifications — 테이블 자체가 없었다.
-- =========================================================================

create table if not exists public.notifications (
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

create index if not exists notifications_recipient_id_idx on public.notifications (recipient_id, created_at desc);

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using (recipient_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

drop policy if exists "notifications_insert_admin" on public.notifications;
create policy "notifications_insert_admin" on public.notifications
  for insert with check (public.is_super_admin());

commit;
