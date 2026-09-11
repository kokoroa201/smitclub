"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ALL_DEPARTMENTS } from "@/lib/constants/departments";

function isValidDepartment(value: string): boolean {
  return value === "" || (ALL_DEPARTMENTS as readonly string[]).includes(value);
}

// 연락처는 "-" 등 구분자를 입력해도 저장 시 숫자만 남긴다.
function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

// 현재 요청이 도착한 호스트를 그대로 재설정 링크의 origin으로 쓴다 —
// 로컬(localhost)이든 배포 도메인이든 항상 "지금 접속한 사이트 주소"로
// 정확히 돌아오게 하기 위함(하드코딩된 사이트 URL env var를 두지 않음).
async function getOrigin() {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const studentId = String(formData.get("student_id") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const contact = digitsOnly(String(formData.get("contact") ?? "").trim());

  if (!email || !password || !name) {
    redirect(`/signup?error=${encodeURIComponent("이메일, 비밀번호, 이름은 필수입니다.")}`);
  }

  if (password.length < 6) {
    redirect(`/signup?error=${encodeURIComponent("비밀번호는 6자 이상이어야 합니다.")}`);
  }

  if (!isValidDepartment(department)) {
    redirect(`/signup?error=${encodeURIComponent("학과·전공은 제공된 목록에서 선택해주세요.")}`);
  }

  if (password !== passwordConfirm) {
    const params = new URLSearchParams({
      error: "비밀번호가 일치하지 않습니다.",
      name,
      student_id: studentId,
      department,
      contact,
      email,
    });
    redirect(`/signup?${params.toString()}`);
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        student_id: studentId || null,
        department: department || null,
        contact: contact || null,
      },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const friendlyMessage =
      error.message === "Invalid login credentials"
        ? "이메일 또는 비밀번호가 일치하지 않습니다. (Email or password is incorrect.)"
        : error.message;

    redirect(`/login?${new URLSearchParams({ error: friendlyMessage }).toString()}`);
  }

  redirect("/");
}

export async function signOut() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect(`/forgot-password?error=${encodeURIComponent("이메일을 입력해주세요. (Email is required.)")}`);
  }

  const origin = await getOrigin();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 이 프로젝트의 재설정 메일은 code 쿼리파라미터가 아니라 URL 해시
  // (#access_token=...&type=recovery)로 세션을 돌려주므로, redirectTo는
  // 해시를 직접 읽는 /reset-password 클라이언트 페이지를 가리킨다.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  // 이메일 존재 여부를 노출하지 않기 위해 성공/실패와 관계없이 항상 같은
  // 안내로 리다이렉트한다.
  redirect("/forgot-password?sent=1");
}

// MY > 계정 보안에서 쓰는 "비밀번호 변경 링크 보내기" — formData를 전혀 받지
// 않는다. 이메일을 폼 입력으로 받으면 다른 사람 주소로 보내도록 값을
// 바꿔치기할 여지가 생기므로, 항상 현재 로그인 세션의 실제 이메일(auth.
// getUser())만 사용한다. 재설정 링크 발급/속도제한은 Supabase Auth가
// resetPasswordForEmail 호출마다 이미 처리한다(이메일당 짧은 재요청 간격
// 제한) — 여기서 성공/실패를 구분해 보여주지 않는 것도 requestPasswordReset과
// 동일한 이유(계정 상태 노출 방지)다.
export async function requestOwnPasswordReset() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const origin = await getOrigin();

  await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${origin}/reset-password`,
  });

  redirect("/my?security_sent=1");
}
