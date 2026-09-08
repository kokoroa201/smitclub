-- SMIT Club Portal — MY 페이지에서 본인이 직접 수정하는 연락처/학과·전공을
-- profile_private에 추가한다.
--
-- 0002_privacy_profile_split.sql의 원칙을 그대로 따른다: 연락처는 개인정보이므로
-- profiles(이름/역할, 조회 범위가 넓음)나 profile_public(opt-in 공개용)이 아니라
-- profile_private에 둔다. profile_private는 이미 본인만 수정 가능한 RLS
-- (profile_private_update_own: using/with check id = auth.uid())를 갖고 있으므로
-- 별도 정책 변경 없이 컬럼만 추가하면 된다 — 컬럼 단위 가드가 없는 테이블이라
-- 새 컬럼도 자동으로 "본인만 수정 가능" 범위에 들어간다.
--
-- 학과·전공은 club_applications/club_application_founders와 동일하게
-- lib/constants/departments.ts 고정 목록에서만 고르므로, 그 두 테이블과
-- 마찬가지로 DB 체크 제약은 걸지 않고 앱 레이어(isValidDepartment)에서 검증한다.
-- 주전공 하나만 선택·저장하므로 단일 text 컬럼으로 충분하다.
--
-- 0001-0008은 이미 적용된 것으로 보고 수정하지 않고, 신규 컬럼만 이 파일에서
-- 추가한다. 기존 행에는 값이 없으므로 nullable로 두어 기존 데이터를 그대로
-- 보존한다(백필 불필요).
--
-- Apply by pasting into the Supabase Studio SQL editor, after 0001-0008.

begin;

alter table public.profile_private
  add column if not exists contact text,
  add column if not exists department text;

commit;
