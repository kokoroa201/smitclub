import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
import { DEPARTMENT_GROUPS } from "@/lib/constants/departments";

export default async function SignupPage(props: PageProps<"/signup">) {
  const locale = await getLocale();
  const t = getDictionary(locale).account;
  const clubLabels = getDictionary(locale).clubApplication;
  const params = await props.searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const name = typeof params.name === "string" ? params.name : "";
  const studentId = typeof params.student_id === "string" ? params.student_id : "";
  const department = typeof params.department === "string" ? params.department : "";
  const contact = typeof params.contact === "string" ? params.contact : "";
  const email = typeof params.email === "string" ? params.email : "";

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-bold">{t.signup}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {t.signupIntro}
        </p>
      </div>

      <form action={signUp} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t.name}
          <input
            type="text"
            name="name"
            required
            defaultValue={name}
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t.studentId}
          <input
            type="text"
            name="student_id"
            defaultValue={studentId}
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t.department}
          <select
            name="department"
            defaultValue={department}
            className="rounded-md border border-neutral-300 px-3 py-2"
          >
            <option value="">{t.none}</option>
            {DEPARTMENT_GROUPS.map((group, index) => (
              <optgroup key={group.label} label={index === 0 ? clubLabels.koreanPrograms : clubLabels.englishPrograms}>
                {group.options.map((option) => (
                  <option key={option} value={option}>
                    {(clubLabels.departments as Record<string, string>)[option] ?? option}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t.contact}
          <input
            type="text"
            name="contact"
            placeholder={t.contactPlaceholder}
            defaultValue={contact}
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t.email}
          <input
            type="email"
            name="email"
            required
            defaultValue={email}
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t.password}
          <input
            type="password"
            name="password"
            required
            minLength={6}
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
          <span className="text-xs text-neutral-500">{t.passwordHint}</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t.confirmPassword}
          <input
            type="password"
            name="password_confirm"
            required
            minLength={6}
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          className="rounded-md bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-600"
        >
          {t.createAccount}
        </button>
      </form>

      <p className="text-sm text-neutral-500">
        {t.hasAccount}{" "}
        <Link href="/login" className="text-orange-600 underline">
          {t.login}
        </Link>
      </p>
    </main>
  );
}
