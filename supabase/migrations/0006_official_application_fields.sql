-- SMIT Club Portal — align club_applications with the actual 원우회 forms.
--
-- 서울미디어대학원대학교 동아리 운영규정 제13조(등록요건) requires: 5+ members
-- including at least 1 Korean and at least 1 international student, a
-- president + treasurer, a submitted constitution, an activity plan, and a
-- faculty advisor confirmation. The previous "60% current-student ratio"
-- gate (MIN_CURRENT_STUDENT_RATIO) does not exist anywhere in the actual
-- regulation/forms and is dropped in application code — this migration only
-- adds the columns needed to capture what the real forms ask for and to
-- auto-generate 서식1/서식2/서식3/표준 회칙/서식5 from the online submission.
--
-- All new columns are applicant-supplied at submission time (like the
-- existing club_name/purpose/activity_plan columns), so no RLS policy
-- changes are needed — the existing row-level policies
-- (club_applications_insert_own / club_applications_update_applicant /
-- club_application_founders_insert) are column-agnostic. Only genuinely
-- admin-only fields need the admin-fields guard trigger, which none of
-- these are.
--
-- Revision (still pre-apply, folded into this same file rather than a new
-- migration): three workflow corrections requested before this migration
-- was ever run against the live DB —
--   1) 서식3 활동계획서 gets a real 1~12월 monthly breakdown (monthly_activities
--      jsonb), not a single free-text field.
--   2) Faculty-advisor confirmation is no longer required at initial
--      submission — advisor_* columns are applicant-optional at insert time,
--      and a separate admin-recorded advisor_confirmed flag (+ timestamp/by)
--      gates the next step. This mirrors how the real process actually
--      works: the club coordinates with a professor *after* 원우회's first
--      look at the application, not before.
--   3) 등록절차 (제14조) is now modeled as two distinct admin actions instead
--      of one: 원우회의 학교 승인 추천 (status -> 'recommended') and 학교 최종
--      승인 (status -> 'approved', which is the only step that creates the
--      club/recruiting/certificate). 'recommended' is added to the status
--      check constraint.
--
-- advisor_confirmed*/recommended_* are admin-only fields (like admin_note/
-- reviewed_by already were), so enforce_application_admin_fields_guard is
-- redefined here to cover them too — the trigger created in 0001 picks up
-- the new body automatically via CREATE OR REPLACE, no trigger DDL needed.
--
-- Apply by pasting into the Supabase Studio SQL editor, after 0001-0005.

begin;

-- =========================================================================
-- club_applications — 서식1 기본사항/임원현황, 회칙 항목, 서식5 지도교수 정보
-- =========================================================================

alter table public.club_applications
  -- 서식1 "1.동아리 기본사항" — 기존 category(사이트 탐색용 태그, CLUB_CATEGORIES)는
  -- 손대지 않고, 운영규정 제4조의 공식 분류를 별도 컬럼으로 둔다.
  add column club_name_en text,
  add column registration_category text not null default '기타'
    check (registration_category in ('학술', '문화·예술', '체육·취미', '국제교류', '기타')),
  add column language text check (language in ('ko', 'en', 'mixed')),
  add column established_at date,

  -- 서식1 "2.임원현황" — 회장은 신청자 본인(applicant_id/profiles.name)으로 고정하고
  -- 서식에만 필요한 학과/학번/연락처만 별도로 받는다. 총무는 필수, 부회장은 선택.
  add column president_department text,
  add column president_student_id text,
  add column president_contact text,
  add column treasurer_name text,
  add column treasurer_name_en text,
  add column treasurer_department text,
  add column treasurer_student_id text,
  add column treasurer_contact text,
  add column vice_president_name text,
  add column vice_president_name_en text,
  add column vice_president_department text,
  add column vice_president_student_id text,
  add column vice_president_contact text,

  -- 서식3 활동계획서 — 월별 활동 계획 12칸. {"1": "...", ..., "12": "..."}
  -- 형태의 jsonb로 저장하고, 값이 없는 달은 빈 문자열/누락으로 두면
  -- 인쇄 시 "-"로 채운다.
  add column monthly_activities jsonb not null default '{}'::jsonb,

  -- 표준 동아리 회칙(안) 자동 생성용 — 회칙의 [ ] 빈칸에 해당.
  add column membership_approval_days int,
  add column meeting_frequency text,
  add column has_membership_fee boolean not null default false,
  add column membership_fee_amount int,
  add column membership_fee_cycle text,

  -- 서식5 지도교수 확인서 — 최초 신청 제출의 필수 단계가 아니라, 원우회 1차
  -- 검토(검토 요청 발송) 이후 원우회가 지도교수와 별도로 조율해 기록하는
  -- 단계로 바뀌었다. 그래서 advisor_* 컬럼은 계속 nullable이고, 실제로
  -- "이 단계를 통과했는지"는 아래 advisor_confirmed로 판단한다 — 이 필드는
  -- admin 전용이라 enforce_application_admin_fields_guard가 함께 보호한다.
  add column advisor_name text,
  add column advisor_department text,
  add column advisor_contact text,
  add column advisor_email text,
  add column advisor_appointment_method text
    check (advisor_appointment_method in ('faculty_volunteer', 'school_recommendation')),
  add column advisor_note text,
  add column advisor_confirmed boolean not null default false,
  add column advisor_confirmed_at timestamptz,
  add column advisor_confirmed_by uuid references public.profiles (id),

  -- 등록절차(제14조) 2단계 분리: 원우회의 학교 승인 추천 → 학교 최종 승인.
  -- 최종 승인은 기존 reviewed_by/reviewed_at/status='approved'가 그대로
  -- 담당하고, 추천 단계만 별도 컬럼으로 기록한다.
  add column recommended_at timestamptz,
  add column recommended_by uuid references public.profiles (id);

-- 등록절차 2단계 분리를 위해 'recommended' 상태를 추가한다(원우회 추천 완료
-- ~ 학교 최종 승인 대기). 기존 값(draft/submitted/needs_revision/approved/
-- rejected)은 그대로 유지.
alter table public.club_applications drop constraint club_applications_status_check;
alter table public.club_applications add constraint club_applications_status_check
  check (status in ('draft', 'submitted', 'needs_revision', 'recommended', 'approved', 'rejected'));

-- enforce_application_admin_fields_guard 재정의 — 0005에서 추가된
-- eligibility_checklist/review_requested_*에 더해, 이번에 admin 전용이 된
-- advisor_confirmed*/recommended_*와 advisor_* 식별 정보까지 보호 범위에
-- 포함한다(이 트리거는 0001에서 만든 트리거가 이 함수를 참조하므로,
-- CREATE OR REPLACE만으로 트리거 DDL 변경 없이 동작이 갱신된다).
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
      or new.review_requested_by is not null
      or new.advisor_confirmed is distinct from false
      or new.advisor_confirmed_at is not null
      or new.advisor_confirmed_by is not null
      or new.recommended_at is not null
      or new.recommended_by is not null then
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
    or new.review_requested_by is distinct from old.review_requested_by
    or new.advisor_confirmed is distinct from old.advisor_confirmed
    or new.advisor_confirmed_at is distinct from old.advisor_confirmed_at
    or new.advisor_confirmed_by is distinct from old.advisor_confirmed_by
    or new.advisor_name is distinct from old.advisor_name
    or new.advisor_department is distinct from old.advisor_department
    or new.advisor_contact is distinct from old.advisor_contact
    or new.advisor_email is distinct from old.advisor_email
    or new.advisor_appointment_method is distinct from old.advisor_appointment_method
    or new.advisor_note is distinct from old.advisor_note
    or new.recommended_at is distinct from old.recommended_at
    or new.recommended_by is distinct from old.recommended_by then
    raise exception 'insufficient privilege to modify review fields';
  end if;

  return new;
end;
$$;

-- =========================================================================
-- club_application_founders — 서식2 회원명단 + 등록요건 검증용 국적/직책
-- =========================================================================

-- 회장/부회장/총무는 club_applications의 president_*/vice_president_*/
-- treasurer_* 컬럼으로 별도 관리한다(서식1 "임원현황"과 서식2 "회원명단"은
-- 원본 서식에서도 서로 독립된 표라 억지로 교차 참조시키지 않는다).
alter table public.club_application_founders
  add column nationality text not null default 'domestic'
    check (nationality in ('domestic', 'international'));

-- =========================================================================
-- 리뷰어(원우회장/부회장/교학처)용 집계 전용 함수 — 이름/학번/연락처 등 개인
-- 정보는 절대 반환하지 않고 인원수만 반환한다. club_application_founders에는
-- 여전히 SELECT 정책이 없으므로(신청자 본인/super_admin만), 이 함수가
-- security definer로 대신 집계하되, 호출자가 해당 신청서의 신청자 본인이거나
-- super_admin이거나 is_reviewer()인 경우에만 실제 값을 반환한다.
-- =========================================================================

create or replace function public.get_application_member_summary(target_application_id uuid)
returns table (total_count int, korean_count int, international_count int, current_student_count int)
language plpgsql stable security definer set search_path = public as $$
declare
  is_authorized boolean;
begin
  select exists (
    select 1 from public.club_applications a
    where a.id = target_application_id
      and (a.applicant_id = auth.uid() or public.is_super_admin() or public.is_reviewer())
  ) into is_authorized;

  if not is_authorized then
    return query select 0, 0, 0, 0;
    return;
  end if;

  return query
    select
      count(*)::int,
      count(*) filter (where f.nationality = 'domestic')::int,
      count(*) filter (where f.nationality = 'international')::int,
      count(*) filter (where f.is_current_student)::int
    from public.club_application_founders f
    where f.application_id = target_application_id;
end;
$$;

commit;
