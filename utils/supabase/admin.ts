import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// 서비스 롤 키를 쓰는 서버 전용 클라이언트 — RLS를 전부 우회한다. 절대
// 클라이언트 컴포넌트나 사용자 입력을 그대로 반영하는 코드에서 쓰지 않는다.
// 알림 발송처럼 "다른 사용자의 이메일 조회" 또는 "역할 전체 조회"가
// 필요한, 이미 앱 레벨에서 권한 확인(super_admin 등)이 끝난 서버 전용
// 코드에서만 사용한다. 환경변수가 없으면 null을 반환하므로 호출부가 항상
// 널 체크 후 조용히 건너뛰어야 한다 — 서비스 키 부재가 다른 기능을 깨서는
// 안 된다.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
