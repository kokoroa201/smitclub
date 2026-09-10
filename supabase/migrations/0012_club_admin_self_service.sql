-- SMIT Club Portal — 권한 구조 점검 후속 조치: 동아리 회장(club_admin)의
-- 자기 동아리 자기관리 범위를 DB 레벨에서 명확히 제한한다.
--
-- 점검 결과:
--   1) super_admin은 이미 여러 계정에 부여 가능하다(is_super_admin()이 단일
--      계정을 가정하지 않고 role='super_admin'인 모든 행을 허용하며, 하드코딩된
--      이메일/UUID도 없다) — 이 마이그레이션에서 손댈 부분이 없다.
--   2) /admin/* 전 구간이 requireSuperAdmin()으로 막혀 있어 club_admin은
--      회원·공지·전체 승인 등 관리자 기능에 원천적으로 접근할 수 없다(앱
--      라우팅 레벨, DB 변경 불필요).
--   3) 다만 clubs 테이블의 clubs_update_admin_or_president RLS 정책(0001)은
--      "president_id = auth.uid()면 UPDATE 허용"까지만 행 단위로 제한하고
--      컬럼은 전혀 제한하지 않았다 — 즉 회장이 Supabase 클라이언트를 직접
--      호출하면 자기 동아리의 status/category/slug/advisor_name/president_id
--      까지 바꿀 수 있는 구조였다. 이 마이그레이션은 enforce_application_admin_
--      fields_guard/enforce_profile_role_guard와 동일한 패턴으로 컬럼 단위
--      가드 트리거를 추가해, 회장 본인이 바꿀 수 있는 항목을 소개·대표사진·
--      활동(요일/시간/장소)·SNS·모집글로만 한정한다. super_admin/service_role은
--      계속 모든 컬럼을 수정할 수 있다(기존 /admin/clubs 상태 변경 흐름 유지).
--   4) SNS 링크·모집글 컬럼이 아예 없어 "자기 동아리만 수정"의 대상 자체가
--      없었으므로 sns_url/recruiting_post를 추가한다.
--   5) club_applications에는 "이 동아리의 회장이 누구 계정인지"를 나타내는
--      컬럼이 없었다 — 지금까지는 신청서 제출자(applicant_id)가 곧 회장이라고
--      그냥 가정하고 최종 승인 시 applicant_id를 club_admin으로 승격시켰다.
--      신청자와 회장이 다를 수 있으므로 president_profile_id를 별도로 둬서,
--      승인 처리 로직이 이 컬럼을 기준으로 club_admin을 부여하게 한다(lib/
--      actions/admin-applications.ts approveApplication 참고). 현재 신청폼은
--      여전히 "회장 = 신청자 본인"만 지원하므로 제출 시 applicant_id로 채워
--      두고(lib/actions/club-applications.ts), 이미 제출된 기존 행도 동일하게
--      백필한다 — 데이터 의미상 지금까지의 모든 신청은 실제로 신청자=회장이었기
--      때문에 이 백필은 사실과 다른 값을 만들어내지 않는다.

begin;

alter table public.club_applications
  add column president_profile_id uuid references public.profiles (id);

update public.club_applications
  set president_profile_id = applicant_id
  where president_profile_id is null;

alter table public.clubs
  add column sns_url text,
  add column recruiting_post text;

-- 회장이 직접 고칠 수 있는 항목: description/description_en(소개),
-- cover_image_url(대표사진), meeting_day/meeting_time/meeting_location(활동),
-- sns_url(SNS), recruiting_post(모집글). 나머지 컬럼(name/slug/category/status/
-- founded_year/president_id/advisor_name/advisor_department/logo_url 등)은
-- super_admin/service_role만 바꿀 수 있다.
create or replace function public.enforce_club_admin_fields_guard()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or public.is_super_admin() then
    return new;
  end if;

  if new.name is distinct from old.name
    or new.name_en is distinct from old.name_en
    or new.slug is distinct from old.slug
    or new.category is distinct from old.category
    or new.status is distinct from old.status
    or new.logo_url is distinct from old.logo_url
    or new.founded_year is distinct from old.founded_year
    or new.president_id is distinct from old.president_id
    or new.advisor_name is distinct from old.advisor_name
    or new.advisor_department is distinct from old.advisor_department
    or new.created_at is distinct from old.created_at then
    raise exception 'insufficient privilege to modify admin-only club fields';
  end if;

  return new;
end;
$$;

create trigger clubs_admin_fields_guard
before update on public.clubs
for each row execute function public.enforce_club_admin_fields_guard();

commit;
