"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  submitClubApplication,
  type SubmitClubApplicationState,
} from "@/lib/actions/club-applications";
import { CLUB_CATEGORIES } from "@/lib/constants/categories";
import { DEPARTMENT_GROUPS } from "@/lib/constants/departments";
import {
  MIN_FOUNDERS,
  MIN_KOREAN_FOUNDERS,
  MIN_INTERNATIONAL_FOUNDERS,
  REGISTRATION_CATEGORIES,
  APPLICATION_MONTHS,
} from "@/lib/constants/club-application-rules";
import type { Profile } from "@/lib/auth";

const initialState: SubmitClubApplicationState = { error: null, success: false };

// 회장·총무는 회원 명단에 자동 포함되므로, 추가로 입력받아야 하는 "그 외"
// 회원 행은 최소 인원(MIN_FOUNDERS)에서 회장·총무 인원을 뺀 수만큼만 둔다.
const AUTO_INCLUDED_DIFFERENT = 2; // 회장 + 총무(다른 사람)
const AUTO_INCLUDED_SAME = 1; // 회장 = 총무(동일인)
const BASE_ROW_COUNT = MIN_FOUNDERS - AUTO_INCLUDED_DIFFERENT; // 기본으로 항상 보이는 추가 회원 칸(3개)

function makeInitialRowIds(count: number) {
  return Array.from({ length: count }, (_, i) => i);
}

let nextRowId = 100;

const CONTACT_PLACEHOLDER = "숫자만 입력 (예: 01012345678)";

const inputClass = "rounded-md border border-border px-3 py-2 text-sm";
const labelClass = "flex flex-col gap-1 text-sm";

// 회장·총무·부회장·추가 회원 모두 학과·전공을 자유 입력이 아니라 동일한
// 목록(lib/constants/departments.ts, 국문/영문 과정)에서 고르게 하는 공용 선택창.
function DepartmentSelect({
  name,
  value,
  onChange,
  required,
  className,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <select
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className={className}
    >
      <option value="" disabled>
        선택해주세요
      </option>
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
  );
}

export function ApplicationForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(submitClubApplication, initialState);

  // React는 form action이 끝나면 성공/실패와 무관하게 제어되지 않은(uncontrolled)
  // 입력칸을 전부 비운다. 저장 실패 시에도 작성 내용을 유지하기 위해, 제출
  // 직전 폼 값을 스냅샷으로 저장해뒀다가 실패 응답을 받으면 DOM에 그대로
  // 복원한다(상태로 관리되는 필드는 애초에 영향받지 않으므로 함께 복원해도 무해하다).
  const formRef = useRef<HTMLFormElement>(null);
  const lastSubmissionRef = useRef<FormData | null>(null);

  useEffect(() => {
    if (!state.error) return;
    const snapshot = lastSubmissionRef.current;
    const form = formRef.current;
    if (!snapshot || !form) return;

    for (const element of Array.from(form.elements)) {
      if (
        !(element instanceof HTMLInputElement) &&
        !(element instanceof HTMLTextAreaElement) &&
        !(element instanceof HTMLSelectElement)
      ) {
        continue;
      }
      const name = element.name;
      if (!name) continue;

      if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
        const values = snapshot.getAll(name).map(String);
        element.checked = values.includes(element.value);
      } else {
        const value = snapshot.get(name);
        if (value != null) element.value = String(value);
      }
    }
  }, [state]);

  const [presidentDepartment, setPresidentDepartment] = useState("");
  const [presidentStudentId, setPresidentStudentId] = useState("");
  const [presidentContact, setPresidentContact] = useState("");
  const [presidentNationality, setPresidentNationality] = useState<"domestic" | "international">("domestic");

  const [treasurerSameAsPresident, setTreasurerSameAsPresident] = useState(false);
  const [treasurerDepartment, setTreasurerDepartment] = useState("");
  const [treasurerNationality, setTreasurerNationality] = useState<"domestic" | "international">("domestic");
  const [treasurerIsCurrentStudent, setTreasurerIsCurrentStudent] = useState(true);

  const [vicePresidentDepartment, setVicePresidentDepartment] = useState("");

  const [rowIds, setRowIds] = useState<number[]>(() => makeInitialRowIds(BASE_ROW_COUNT));
  const [currentStudentFlags, setCurrentStudentFlags] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(makeInitialRowIds(BASE_ROW_COUNT).map((id) => [id, true])),
  );
  const [nationalityFlags, setNationalityFlags] = useState<Record<number, "domestic" | "international">>(() =>
    Object.fromEntries(makeInitialRowIds(BASE_ROW_COUNT).map((id) => [id, "domestic"])),
  );
  const [departmentFlags, setDepartmentFlags] = useState<Record<number, string>>(() =>
    Object.fromEntries(makeInitialRowIds(BASE_ROW_COUNT).map((id) => [id, ""])),
  );
  // 각 추가 회원 칸에 이름이 실제로 입력됐는지 — 진행 상태 표시와, 총무=회장
  // 토글을 되돌릴 때 "이미 입력한 칸은 지우지 않는다" 판단에 함께 쓴다.
  const [nameFilledFlags, setNameFilledFlags] = useState<Record<number, boolean>>({});
  // 총무=회장 토글로 자동으로 늘어난 칸의 id만 별도로 기억해뒀다가, 토글을
  // 되돌릴 때 그 중 비어있는 칸만 되돌린다("+ 회원 추가"로 늘린 칸은 그대로 둔다).
  const [autoAddedIds, setAutoAddedIds] = useState<number[]>([]);
  const [hasVicePresident, setHasVicePresident] = useState(false);
  const [hasMembershipFee, setHasMembershipFee] = useState(false);

  const addRow = () => {
    const id = nextRowId++;
    setRowIds((rows) => [...rows, id]);
    setCurrentStudentFlags((flags) => ({ ...flags, [id]: true }));
    setNationalityFlags((flags) => ({ ...flags, [id]: "domestic" }));
    setDepartmentFlags((flags) => ({ ...flags, [id]: "" }));
    setNameFilledFlags((flags) => ({ ...flags, [id]: false }));
  };

  const removeRow = (id: number) => {
    setRowIds((rows) => rows.filter((rowId) => rowId !== id));
    setCurrentStudentFlags((flags) => {
      const next = { ...flags };
      delete next[id];
      return next;
    });
    setNationalityFlags((flags) => {
      const next = { ...flags };
      delete next[id];
      return next;
    });
    setDepartmentFlags((flags) => {
      const next = { ...flags };
      delete next[id];
      return next;
    });
    setNameFilledFlags((flags) => {
      const next = { ...flags };
      delete next[id];
      return next;
    });
    setAutoAddedIds((ids) => ids.filter((rowId) => rowId !== id));
  };

  // 총무를 회장과 동일로 전환하면 필요 인원이 1명 줄어드는 대신, 추가 회원
  // 행이 최소 4개는 있어야 하므로 부족한 만큼만 자동으로 늘려준다. 다시
  // 해제하면 그 중 아직 이름을 입력하지 않은 칸만 3칸으로 되돌리고, 이미
  // 입력한 칸은 그대로 유지한다.
  const handleTreasurerSameToggle = (checked: boolean) => {
    setTreasurerSameAsPresident(checked);
    if (checked) {
      const needed = MIN_FOUNDERS - AUTO_INCLUDED_SAME;
      if (rowIds.length >= needed) return;
      const extraIds = Array.from({ length: needed - rowIds.length }, () => nextRowId++);
      setRowIds((rows) => [...rows, ...extraIds]);
      setCurrentStudentFlags((flags) => ({ ...flags, ...Object.fromEntries(extraIds.map((id) => [id, true])) }));
      setNationalityFlags((flags) => ({
        ...flags,
        ...Object.fromEntries(extraIds.map((id) => [id, "domestic"])),
      }));
      setDepartmentFlags((flags) => ({ ...flags, ...Object.fromEntries(extraIds.map((id) => [id, ""])) }));
      setNameFilledFlags((flags) => ({ ...flags, ...Object.fromEntries(extraIds.map((id) => [id, false])) }));
      setAutoAddedIds((ids) => [...ids, ...extraIds]);
      return;
    }

    if (autoAddedIds.length === 0) return;
    const idsToRemove = autoAddedIds.filter((id) => !nameFilledFlags[id]);
    if (idsToRemove.length > 0) {
      setRowIds((rows) => rows.filter((id) => !idsToRemove.includes(id)));
      setCurrentStudentFlags((flags) => {
        const next = { ...flags };
        idsToRemove.forEach((id) => delete next[id]);
        return next;
      });
      setNationalityFlags((flags) => {
        const next = { ...flags };
        idsToRemove.forEach((id) => delete next[id]);
        return next;
      });
      setDepartmentFlags((flags) => {
        const next = { ...flags };
        idsToRemove.forEach((id) => delete next[id]);
        return next;
      });
      setNameFilledFlags((flags) => {
        const next = { ...flags };
        idsToRemove.forEach((id) => delete next[id]);
        return next;
      });
    }
    setAutoAddedIds((ids) => ids.filter((id) => !idsToRemove.includes(id)));
  };

  const autoIncluded = treasurerSameAsPresident ? AUTO_INCLUDED_SAME : AUTO_INCLUDED_DIFFERENT;
  const filledExtraCount = rowIds.filter((id) => nameFilledFlags[id]).length;
  const totalFilledMembers = autoIncluded + filledExtraCount;
  const extraStillNeeded = Math.max(0, MIN_FOUNDERS - totalFilledMembers);

  const extraKoreanCount = rowIds.filter((id) => nameFilledFlags[id] && nationalityFlags[id] !== "international").length;
  const extraInternationalCount = rowIds.filter((id) => nameFilledFlags[id] && nationalityFlags[id] === "international").length;
  const presidentKorean = presidentNationality === "domestic" ? 1 : 0;
  const presidentInternational = presidentNationality === "international" ? 1 : 0;
  const treasurerKorean = !treasurerSameAsPresident && treasurerNationality === "domestic" ? 1 : 0;
  const treasurerInternational = !treasurerSameAsPresident && treasurerNationality === "international" ? 1 : 0;
  const koreanCount = presidentKorean + treasurerKorean + extraKoreanCount;
  const internationalCount = presidentInternational + treasurerInternational + extraInternationalCount;

  const meetsMemberRequirement =
    totalFilledMembers >= MIN_FOUNDERS &&
    koreanCount >= MIN_KOREAN_FOUNDERS &&
    internationalCount >= MIN_INTERNATIONAL_FOUNDERS;

  if (state.success) {
    return (
      <div className="rounded-card border border-border bg-card p-8 text-center">
        <h2 className="text-xl font-extrabold text-foreground">신청이 접수됐습니다</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          원우회 검토 → 원우회의 학교 승인 추천 → 학교 최종 승인 순으로 처리되며, 처리 현황과
          결과는 알림으로 안내드립니다.
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(e) => {
        lastSubmissionRef.current = new FormData(e.currentTarget);
      }}
      className="flex flex-col gap-8"
    >
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-foreground">1. 동아리 기본사항 (Club Information)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            동아리명 국문 (Club Name, Korean)
            <input name="club_name" required className={inputClass} />
          </label>
          <label className={labelClass}>
            동아리명 영문 (Club Name, English)
            <input name="club_name_en" required className={inputClass} />
          </label>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm">동아리 구분 (Category, 운영규정 제4조)</legend>
          <div className="flex flex-wrap gap-3 text-sm">
            {REGISTRATION_CATEGORIES.map((cat) => (
              <label key={cat} className="flex items-center gap-1.5">
                <input type="radio" name="registration_category" value={cat} required />
                {cat}
              </label>
            ))}
          </div>
        </fieldset>

        <label className={labelClass}>
          사이트 표시 카테고리 (동아리 목록/검색용)
          <select name="category" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              선택해주세요
            </option>
            {CLUB_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm">사용 언어 (Language)</legend>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="language" value="ko" required />
              한국어 Korean
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="language" value="en" />
              영어 English
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="language" value="mixed" />
              혼합 Mixed
            </label>
          </div>
        </fieldset>

        <label className={labelClass}>
          설립일 (Date of Establishment)
          <input type="date" name="established_at" required className={`${inputClass} w-full`} />
        </label>

        <label className={labelClass}>
          설립 목적 (Purpose of Club)
          <textarea name="purpose" required rows={3} className={inputClass} />
        </label>

        <div className="rounded-md border border-border p-3">
          <h3 className="text-sm font-bold text-blue-dark">
            지도교수 사전 동의(확인) Faculty Advisor Pre-Consent
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            재정지원이 가능한 동아리로 관리되려면 지도교수의 사전 동의가 필요합니다. 아래 정보를
            입력해주세요. 지도교수 확인은 이후 원우회·교학처가 학교 이메일 회신으로 별도 처리합니다.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              지도교수 성명 Advisor Name
              <input name="advisor_name" required className={inputClass} />
            </label>
            <label className={labelClass}>
              소속 학과/전공 Advisor Department
              <input name="advisor_department" required className={inputClass} />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              학교 이메일 Advisor School E-Mail
              <input type="email" name="advisor_email" required className={inputClass} />
            </label>
          </div>
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input type="checkbox" name="advisor_student_consent" required className="mt-1" />
            지도교수와 사전 협의하여 동아리 지도에 관한 동의를 받았습니다.
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-foreground">2. 임원현황 (Executive Members)</h2>

        <div className="rounded-md border border-border p-3">
          <p className="text-sm font-semibold text-foreground">회장 President — {profile.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            회장은 신청자 본인으로 자동 등록되며, 회원 명단에도 자동으로 포함됩니다.
          </p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className={labelClass}>
              학과·전공 Department / Program
              <DepartmentSelect
                name="president_department"
                value={presidentDepartment}
                onChange={setPresidentDepartment}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              학번 Student ID
              <input
                name="president_student_id"
                value={presidentStudentId}
                onChange={(e) => setPresidentStudentId(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              연락처 Contact
              <input
                name="president_contact"
                required
                placeholder={CONTACT_PLACEHOLDER}
                value={presidentContact}
                onChange={(e) => setPresidentContact(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <fieldset className="mt-3 flex items-center gap-4 text-sm">
            <legend className="sr-only">회장 국적</legend>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="president_nationality"
                value="domestic"
                checked={presidentNationality === "domestic"}
                onChange={() => setPresidentNationality("domestic")}
              />
              한국인
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="president_nationality"
                value="international"
                checked={presidentNationality === "international"}
                onChange={() => setPresidentNationality("international")}
              />
              외국인
            </label>
          </fieldset>
        </div>

        <div className="rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">총무 Treasurer (필수)</p>
          </div>
          <label className="mt-1 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={treasurerSameAsPresident}
              onChange={(e) => handleTreasurerSameToggle(e.target.checked)}
            />
            총무는 회장과 동일
          </label>

          {treasurerSameAsPresident ? (
            <>
              <p className="mt-2 text-xs text-muted-foreground">
                회장({profile.name}) 정보가 총무 정보로 자동 반영됩니다. 회원 명단에는 한 명으로만
                집계됩니다.
              </p>
              <input type="hidden" name="treasurer_name" value={profile.name} />
              <input type="hidden" name="treasurer_department" value={presidentDepartment} />
              <input type="hidden" name="treasurer_student_id" value={presidentStudentId} />
              <input type="hidden" name="treasurer_contact" value={presidentContact} />
              <input type="hidden" name="treasurer_nationality" value={presidentNationality} />
              <input type="hidden" name="treasurer_is_current_student" value="on" />
              <input type="hidden" name="treasurer_same_as_president" value="on" />
            </>
          ) : (
            <>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  성명 국문 Name (Korean)
                  <input name="treasurer_name" required className={inputClass} />
                </label>
                <label className={labelClass}>
                  성명 영문 Name (English) — 선택
                  <input name="treasurer_name_en" className={inputClass} />
                </label>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className={labelClass}>
                  학과·전공 Department / Program
                  <DepartmentSelect
                    name="treasurer_department"
                    value={treasurerDepartment}
                    onChange={setTreasurerDepartment}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  학번 Student ID
                  <input name="treasurer_student_id" className={inputClass} />
                </label>
                <label className={labelClass}>
                  연락처 Contact
                  <input name="treasurer_contact" required placeholder={CONTACT_PLACEHOLDER} className={inputClass} />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    name="treasurer_is_current_student"
                    checked={treasurerIsCurrentStudent}
                    onChange={(e) => setTreasurerIsCurrentStudent(e.target.checked)}
                  />
                  재학생
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="treasurer_nationality"
                    value="domestic"
                    checked={treasurerNationality === "domestic"}
                    onChange={() => setTreasurerNationality("domestic")}
                  />
                  한국인
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="treasurer_nationality"
                    value="international"
                    checked={treasurerNationality === "international"}
                    onChange={() => setTreasurerNationality("international")}
                  />
                  외국인
                </label>
              </div>
            </>
          )}
        </div>

        <div className="rounded-md border border-border p-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <input
              type="checkbox"
              name="has_vice_president"
              checked={hasVicePresident}
              onChange={(e) => setHasVicePresident(e.target.checked)}
            />
            부회장 Vice President (선택)
          </label>
          {hasVicePresident && (
            <>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  성명 국문 Name (Korean)
                  <input name="vice_president_name" required={hasVicePresident} className={inputClass} />
                </label>
                <label className={labelClass}>
                  성명 영문 Name (English) — 선택
                  <input name="vice_president_name_en" className={inputClass} />
                </label>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className={labelClass}>
                  학과·전공 Department / Program
                  <DepartmentSelect
                    name="vice_president_department"
                    value={vicePresidentDepartment}
                    onChange={setVicePresidentDepartment}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  학번 Student ID
                  <input name="vice_president_student_id" className={inputClass} />
                </label>
                <label className={labelClass}>
                  연락처 Contact
                  <input name="vice_president_contact" placeholder={CONTACT_PLACEHOLDER} className={inputClass} />
                </label>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">3. 추가 회원 명단 (Additional Members)</h2>
          <button
            type="button"
            onClick={addRow}
            className="rounded-full border border-border px-3 py-1 text-sm font-medium hover:bg-muted"
          >
            + 회원 추가
          </button>
        </div>
        <p className={`text-xs ${extraStillNeeded === 0 ? "text-muted-foreground" : "font-semibold text-coral-dark"}`}>
          {extraStillNeeded > 0
            ? `회장·총무 ${autoIncluded}명 + 추가 회원 ${extraStillNeeded}명 입력 필요`
            : `회장·총무 포함 총 ${totalFilledMembers}명 입력 완료`}
        </p>
        <p className={`text-xs ${meetsMemberRequirement ? "text-muted-foreground" : "font-semibold text-coral-dark"}`}>
          한국인 {MIN_KOREAN_FOUNDERS}명 이상·외국인 {MIN_INTERNATIONAL_FOUNDERS}명 이상 포함 필요 (운영규정 제13조) —
          현재 한국인 {koreanCount}명 · 외국인 {internationalCount}명
        </p>

        {rowIds.map((id) => (
          <div key={id} className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:flex-wrap sm:items-center">
            <input
              name={`founders[${id}][name]`}
              placeholder="이름 Name"
              required
              onChange={(e) =>
                setNameFilledFlags((flags) => ({ ...flags, [id]: e.target.value.trim().length > 0 }))
              }
              className={`${inputClass} sm:flex-1 sm:min-w-[120px]`}
            />
            <input
              name={`founders[${id}][student_id]`}
              placeholder="학번 Student ID"
              className={`${inputClass} sm:flex-1 sm:min-w-[110px]`}
            />
            <input
              name={`founders[${id}][contact]`}
              placeholder={CONTACT_PLACEHOLDER}
              className={`${inputClass} sm:flex-1 sm:min-w-[120px]`}
            />
            <DepartmentSelect
              name={`founders[${id}][department]`}
              value={departmentFlags[id] ?? ""}
              onChange={(value) => setDepartmentFlags((flags) => ({ ...flags, [id]: value }))}
              className={`${inputClass} sm:flex-1 sm:min-w-[160px]`}
            />
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name={`founders[${id}][is_current_student]`}
                checked={currentStudentFlags[id] ?? true}
                onChange={(e) =>
                  setCurrentStudentFlags((flags) => ({ ...flags, [id]: e.target.checked }))
                }
              />
              재학생
            </label>
            <div className="flex items-center gap-2 text-sm">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name={`founders[${id}][nationality]`}
                  value="domestic"
                  checked={(nationalityFlags[id] ?? "domestic") === "domestic"}
                  onChange={() => setNationalityFlags((flags) => ({ ...flags, [id]: "domestic" }))}
                />
                한국인
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name={`founders[${id}][nationality]`}
                  value="international"
                  checked={nationalityFlags[id] === "international"}
                  onChange={() => setNationalityFlags((flags) => ({ ...flags, [id]: "international" }))}
                />
                외국인
              </label>
            </div>
            {id >= BASE_ROW_COUNT && (
              <button
                type="button"
                onClick={() => removeRow(id)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                삭제
              </button>
            )}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-foreground">4. 활동 계획 (Activity Plan)</h2>
        <label className={labelClass}>
          주요 활동 목표 (Main Goals)
          <textarea name="activity_plan" required rows={3} className={inputClass} />
        </label>

        <div>
          <p className="mb-2 text-sm">월별 활동 계획 (Monthly Activity Schedule) — 활동이 없는 달은 비워두세요</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {APPLICATION_MONTHS.map((month) => (
              <label key={month} className="flex items-center gap-2 text-sm">
                <span className="w-10 shrink-0 text-muted-foreground">{month}월</span>
                <input name={`monthly_activity[${month}]`} className={`${inputClass} flex-1`} />
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className={labelClass}>
            요일
            <input name="meeting_day" className={inputClass} />
          </label>
          <label className={labelClass}>
            시간
            <input name="meeting_time" className={inputClass} />
          </label>
          <label className={labelClass}>
            장소
            <input name="meeting_location" className={inputClass} />
          </label>
        </div>
        <label className={labelClass}>
          정기 모임 빈도 (회칙 제15조 — 예: 월 2회)
          <input name="meeting_frequency" required className={inputClass} />
        </label>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-foreground">5. 회칙 관련 사항 (Constitution)</h2>
        <label className={labelClass}>
          회원 가입 승인 처리 기한 (회칙 제5조, 일 단위)
          <select name="membership_approval_days" defaultValue={3} required className={inputClass}>
            {[1, 2, 3, 4, 5, 6, 7].map((days) => (
              <option key={days} value={days}>
                {days}일
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-md border border-border p-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <input
              type="checkbox"
              name="has_membership_fee"
              checked={hasMembershipFee}
              onChange={(e) => setHasMembershipFee(e.target.checked)}
            />
            회비 있음 (회칙 제17조)
          </label>
          {hasMembershipFee && (
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                금액 (원)
                <input type="number" name="membership_fee_amount" min={1} required={hasMembershipFee} className={inputClass} />
              </label>
              <label className={labelClass}>
                납부 주기
                <input name="membership_fee_cycle" placeholder="예: 학기별" required={hasMembershipFee} className={inputClass} />
              </label>
            </div>
          )}
        </div>
      </section>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="agree_rules" required className="mt-1" />
        본인은 서울미디어대학원대학교 동아리 등록 절차 진행 및 운영 관리를 위하여 위 내용을
        사실에 따라 작성하였으며, 관련 규정을 준수할 것을 확인합니다.
      </label>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-coral px-4 py-3 font-bold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? "제출 중..." : "신청서 제출"}
      </button>
    </form>
  );
}
