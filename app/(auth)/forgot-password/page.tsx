import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";

export default async function ForgotPasswordPage(props: PageProps<"/forgot-password">) {
  const params = await props.searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const sent = params.sent === "1";

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-bold">비밀번호 재설정</h1>
        <p className="mt-1 text-sm text-neutral-500">
          가입하신 이메일 주소를 입력하시면 재설정 링크를 보내드려요.
        </p>
      </div>

      {sent ? (
        <div className="flex flex-col gap-4">
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            입력한 이메일을 확인해 주세요.
          </p>
          <Link href="/login" className="text-sm text-orange-600 underline">
            로그인으로 돌아가기
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <form action={requestPasswordReset} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              이메일
              <input
                type="email"
                name="email"
                required
                className="rounded-md border border-neutral-300 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-600"
            >
              재설정 링크 보내기
            </button>
          </form>

          <p className="text-sm text-neutral-500">
            <Link href="/login" className="text-orange-600 underline">
              로그인으로 돌아가기
            </Link>
          </p>
        </>
      )}
    </main>
  );
}
