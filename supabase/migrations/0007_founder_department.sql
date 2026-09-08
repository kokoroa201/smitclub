-- SMIT Club Portal — 추가 회원(club_application_founders)에도 학과·전공을 기록한다.
--
-- 지금까지 학과는 회장/총무/부회장(club_applications의 president_department/
-- treasurer_department/vice_president_department, 0006)에만 있었고, 서식2
-- 회원명단에 나열되는 추가 회원에는 학과 컬럼 자체가 없었다.
--
-- 신청폼의 학과 입력은 이제 자유 텍스트가 아니라 lib/constants/departments.ts의
-- 고정 목록(국문 과정/영문 과정)에서 고르는 선택창이지만, 그 목록은 앱 코드에서만
-- 관리하므로 기존 *_department 컬럼들과 마찬가지로 DB 체크 제약은 걸지 않는다.
--
-- 0006은 이미 적용된 마이그레이션이라 수정하지 않고, 새 컬럼만 이 파일에서
-- 추가한다. 기존 행에는 학과 정보가 없으므로 nullable로 두어 데이터 손실 없이
-- 그대로 보존한다(백필 불필요).
--
-- Apply by pasting into the Supabase Studio SQL editor, after 0001-0006.

begin;

alter table public.club_application_founders
  add column department text;

commit;
