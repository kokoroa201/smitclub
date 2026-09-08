-- SMIT Club Portal — 회원가입에서 받은 학과·전공/연락처를 profile_private에
-- 바로 저장한다.
--
-- 0009에서 profile_private에 contact/department 컬럼을 추가했지만, 그 값을
-- 채우는 유일한 경로인 handle_new_user() 트리거(0002에서 정의)는 여전히
-- student_id/affiliation만 raw_user_meta_data에서 복사하고 있었다. 회원가입
-- 폼이 이제 "소속" 자유 입력 대신 학과·전공 선택창과 연락처 입력을 받으므로
-- (app/(auth)/signup/page.tsx, lib/actions/auth.ts), 트리거도 그 값을 함께
-- 저장하도록 갱신한다.
--
-- affiliation은 과거 가입자들의 데이터가 남아 있는 컬럼이라 계속 존재하지만,
-- 새 가입자는 더 이상 이 필드를 채우지 않는다(값이 없으면 null). MY 페이지는
-- department가 비어 있을 때만 화면 표시용으로 affiliation을 참고한다
-- (app/my/page.tsx) — DB 값 자체를 옮기거나 지우지는 않는다.
--
-- 0001-0009는 이미 적용된 것으로 보고 수정하지 않는다. 트리거는 0001에서
-- 만든 것을 CREATE OR REPLACE로 갱신하는 것이라 트리거 DDL 자체는 건드릴
-- 필요가 없다.
--
-- Apply by pasting into the Supabase Studio SQL editor, after 0001-0009.

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );

  insert into public.profile_private (id, student_id, affiliation, department, contact)
  values (
    new.id,
    new.raw_user_meta_data ->> 'student_id',
    new.raw_user_meta_data ->> 'affiliation',
    new.raw_user_meta_data ->> 'department',
    new.raw_user_meta_data ->> 'contact'
  );

  insert into public.profile_public (id) values (new.id);

  return new;
end;
$$;

commit;
