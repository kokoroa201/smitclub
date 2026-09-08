"use client";

import { useActionState, useState } from "react";
import { updateMyProfile, type UpdateProfileState } from "@/lib/actions/profile";
import { DEPARTMENT_GROUPS } from "@/lib/constants/departments";

const initialState: UpdateProfileState = { error: null, success: false };

const CONTACT_PLACEHOLDER = "숫자만 입력 (예: 01012345678)";
const inputClass = "rounded-md border border-border px-3 py-2 text-sm";
const labelClass = "flex flex-col gap-1 text-sm";

export function EditContactForm({
  initialContact,
  initialDepartment,
}: {
  initialContact: string;
  initialDepartment: string;
}) {
  const [state, formAction, pending] = useActionState(updateMyProfile, initialState);
  // 연락처·학과는 값을 상태로 직접 관리한다 — React는 form action이 끝나면
  // 성공/실패와 무관하게 제어되지 않은 입력을 처음 defaultValue로 되돌리는데,
  // 그러면 저장에 성공해도 방금 입력한 값이 아니라 이전 값으로 되돌아가 보인다.
  const [contact, setContact] = useState(initialContact);
  const [department, setDepartment] = useState(initialDepartment);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className={labelClass}>
        연락처 Contact
        <input
          name="contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={CONTACT_PLACEHOLDER}
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        학과·전공 Department / Program
        <select
          name="department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className={inputClass}
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

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-600">저장되었습니다.</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-coral px-4 py-2 text-sm font-bold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
