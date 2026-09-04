"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Status = "checking" | "ready" | "expired";

// 이 프로젝트의 재설정 메일 링크는 서버가 아니라 브라우저로 세션을 넘긴다
// (URL 해시 #access_token=...&type=recovery). @supabase/ssr의 브라우저
// 클라이언트는 flowType이 "pkce"로 고정돼 있어 이 해시 기반(implicit) 콜백을
// 자동 감지 시 "Not a valid PKCE flow url" 오류로 거부해버린다 — 그래서
// 자동 감지에 기대지 않고 해시를 직접 파싱해 setSession으로 세션을 심는다.
// 이 처리가 브라우저에서만 가능하므로 이 페이지는 클라이언트 컴포넌트다.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function establishSession() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (hash.get("type") === "recovery" && accessToken && refreshToken) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        // 주소창/히스토리에 토큰이 남지 않도록 처리 후 해시를 지운다.
        window.history.replaceState(null, "", window.location.pathname);
        if (!setSessionError) {
          setStatus("ready");
          return;
        }
      }

      // 해시가 없거나 실패한 경우 — 이미 심어진 세션이 있는지(새로고침 등)
      // 마지막으로 확인한다.
      const { data } = await supabase.auth.getSession();
      setStatus(data.session ? "ready" : "expired");
    }

    establishSession();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError("새 비밀번호를 입력해주세요. (Password is required.)");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다. (Password must be at least 6 characters.)");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다. (Passwords do not match.)");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    // 비밀번호 변경 후에는 재설정용 세션을 끝내고 새 비밀번호로 다시
    // 로그인하도록 한다.
    await supabase.auth.signOut();
    router.push("/login?reset=1");
  }

  if (status === "checking") {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col items-center justify-center px-4 py-12">
        <p className="text-sm text-neutral-500">확인 중입니다…</p>
      </main>
    );
  }

  if (status === "expired") {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center gap-6 px-4 py-12 text-center">
        <div>
          <h1 className="text-2xl font-bold">링크가 만료되었어요</h1>
          <p className="mt-2 text-sm text-neutral-500">
            재설정 링크가 유효하지 않거나 이미 사용되었습니다. (Reset link expired or already used.)
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="rounded-md bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-600"
        >
          다시 요청하기
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-bold">새 비밀번호 설정</h1>
        <p className="mt-1 text-sm text-neutral-500">새로 사용할 비밀번호를 입력해주세요.</p>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          새 비밀번호
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
          <span className="text-xs text-neutral-500">6자 이상 입력해주세요.</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          새 비밀번호 확인
          <input
            type="password"
            required
            minLength={6}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {submitting ? "변경 중…" : "비밀번호 변경"}
        </button>
      </form>
    </main>
  );
}
