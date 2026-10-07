"use client";

import { getDictionary, type Locale } from "@/lib/i18n";

import { useActionState, useState } from "react";
import { updateMyProfile, type UpdateProfileState } from "@/lib/actions/profile";
import { DEPARTMENT_GROUPS } from "@/lib/constants/departments";

const initialState: UpdateProfileState = { error: null, success: false };


const inputClass = "rounded-md border border-border px-3 py-2 text-sm";
const labelClass = "flex flex-col gap-1 text-sm";

export function EditContactForm({
  initialContact,
  initialDepartment,
  locale,
}: {
  initialContact: string;
  initialDepartment: string;
  locale: Locale;
}) {
  const t = getDictionary(locale).account;
  const clubLabels = getDictionary(locale).clubApplication;
  const [state, formAction, pending] = useActionState(updateMyProfile, initialState);
  // 연락처·학과는 값을 상태로 직접 관리한다 — React는 form action이 끝나면
  // 성공/실패와 무관하게 제어되지 않은 입력을 처음 defaultValue로 되돌리는데,
  // 그러면 저장에 성공해도 방금 입력한 값이 아니라 이전 값으로 되돌아가 보인다.
  const [contact, setContact] = useState(initialContact);
  const [department, setDepartment] = useState(initialDepartment);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className={labelClass}>
        {t.contact}
        <input
          name="contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={t.contactPlaceholder}
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        {t.department}
        <select
          name="department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className={inputClass}
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

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-600">{t.saved}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-coral px-4 py-2 text-sm font-bold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? t.saving : t.save}
      </button>
    </form>
  );
}
