import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import Link from "next/link";
import { signIn } from "@/lib/actions/auth";

export default async function LoginPage(props: PageProps<"/login">) {
  const locale = await getLocale();
  const t = getDictionary(locale).account;
  const params = await props.searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const errorDetail = typeof params.detail === "string" ? params.detail : null;
  const justReset = params.reset === "1";

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-bold">{t.login}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t.welcome}</p>
      </div>

      {params.signup === "1" && !error && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{t.signupSuccess}</p>
      )}
      {justReset && !error && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {t.passwordReset}
        </p>
      )}

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          <p>{error}</p>
          {errorDetail && (
            <p className="mt-0.5 text-xs text-red-400">({errorDetail})</p>
          )}
        </div>
      )}

      <form action={signIn} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t.email}
          <input
            type="email"
            name="email"
            required
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t.password}
          <input
            type="password"
            name="password"
            required
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <Link href="/forgot-password" className="-mt-2 self-end text-xs text-neutral-500 underline hover:text-neutral-700">
          {t.forgotPassword}
        </Link>
        <button
          type="submit"
          className="rounded-md bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-600"
        >
          {t.login}
        </button>
      </form>

      <p className="text-sm text-neutral-500">
        {t.noAccount}{" "}
        <Link href="/signup" className="text-orange-600 underline">
          {t.signup}
        </Link>
      </p>
    </main>
  );
}
