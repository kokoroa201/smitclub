import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
import { DEPARTMENT_GROUPS } from "@/lib/constants/departments";

export default async function SignupPage(props: PageProps<"/signup">) {
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
        <h1 className="text-2xl font-bold">회원가입</h1>
        <p className="mt-1 text-sm text-neutral-500">
          이름, 학번, 학과, 연락처만 알려주시면 바로 시작할 수 있어요.
        </p>
      </div>

      <form action={signUp} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          이름
          <input
            type="text"
            name="name"
            required
            defaultValue={name}
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          학번
          <input
            type="text"
            name="student_id"
            defaultValue={studentId}
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          학과·전공 Department / Program
          <select
            name="department"
            defaultValue={department}
            className="rounded-md border border-neutral-300 px-3 py-2"
          >
            <option value="">선택 안 함</option>
            {DEPARTMENT_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          연락처 Contact
          <input
            type="text"
            name="contact"
            placeholder="숫자만 입력 (예: 01012345678)"
            defaultValue={contact}
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          이메일
          <input
            type="email"
            name="email"
            required
            defaultValue={email}
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          비밀번호
          <input
            type="password"
            name="password"
            required
            minLength={6}
            className="rounded-md border border-neutral-300 px-3 py-2"
          />
          <span className="text-xs text-neutral-500">6자 이상 입력해주세요.</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          비밀번호 확인
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
          가입하기
        </button>
      </form>

      <p className="text-sm text-neutral-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-orange-600 underline">
          로그인
        </Link>
      </p>
    </main>
  );
}
