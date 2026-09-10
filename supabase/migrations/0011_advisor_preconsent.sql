-- SMIT Club Portal — 지도교수 사전 동의(확인) 절차 개편.
--
-- 교학처장 요구사항: 재정지원 가능 동아리로 관리하려면 동아리 개설 신청
-- 단계부터 지도교수의 사전 동의·확인이 있어야 한다. 다만 서명 서류나 파일
-- 첨부는 요구하지 않고, 원우회/교학처가 지도교수의 학교 이메일 회신으로
-- 확인한 뒤 관리자 기록을 남기는 방식으로 운영한다.
--
-- 0006에서는 advisor_name/department/email이 "원우회 1차 검토 통과 후
-- 별도 단계에서 admin이 입력"하는 admin 전용 필드였다. 이번 개편으로 이
-- 세 필드는 신청자가 신청서 제출 시 직접 입력하는 일반 필드로 바뀐다
-- (club_name/purpose 등 기존 신청자 입력 필드와 동일하게 취급) — 그래서
-- enforce_application_admin_fields_guard에서 이 세 필드를 제외한다.
--
-- advisor_contact/advisor_appointment_method(교수 개인 연락처, 선임경위)는
-- 이번 운영 방식에서 더 이상 수집하지 않으므로 값이 계속 비어있게 되지만,
-- 컬럼 자체는 서식5 인쇄 문서 호환을 위해 남겨둔다.
--
-- 신규 컬럼:
--   advisor_student_consent — 신청자가 체크하는 사전 협의 확인 체크박스
--     ("지도교수와 사전 협의하여 동아리 지도에 관한 동의를 받았습니다").
--     agree_rules와 동일하게 신청자가 직접 설정하는 일반 필드라 guard 대상이
--     아니다.
--   advisor_confirmation_method — 관리자가 지도교수 확인을 어떤 방법으로
--     했는지 기록. 현재는 "학교 이메일 회신" 한 가지만 운영하므로 값을
--     하나로 제한해둔다(추후 다른 확인 방법이 생기면 체크 제약만 넓히면 됨).
--     advisor_confirmed*와 마찬가지로 admin 전용이라 guard에 포함한다.
--
-- 승인된 동아리 상세 페이지(일반 학생 공개용)에는 지도교수 성명·소속
-- 학과/전공만 공개하므로, 학교 승인 시 club_applications에서 clubs로 이
-- 두 값만 복사한다(이메일/확인 메모/확인일시/확인자는 clubs에 두지 않음 —
-- 애초에 공개 대상이 아니므로 공개 테이블에 저장하지 않는다).

begin;

alter table public.club_applications
  add column advisor_student_consent boolean not null default false,
  add column advisor_confirmation_method text
    check (advisor_confirmation_method in ('school_email_reply'));

alter table public.clubs
  add column advisor_name text,
  add column advisor_department text;

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
      or new.advisor_confirmation_method is not null
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
    or new.advisor_confirmation_method is distinct from old.advisor_confirmation_method
    or new.advisor_contact is distinct from old.advisor_contact
    or new.advisor_appointment_method is distinct from old.advisor_appointment_method
    or new.advisor_note is distinct from old.advisor_note
    or new.recommended_at is distinct from old.recommended_at
    or new.recommended_by is distinct from old.recommended_by then
    raise exception 'insufficient privilege to modify review fields';
  end if;

  return new;
end;
$$;

commit;
