"use client";

import { useActionState, useState } from "react";
import {
  submitClubApplication,
  type SubmitClubApplicationState,
} from "@/lib/actions/club-applications";
import { CLUB_CATEGORIES } from "@/lib/constants/categories";
import { MIN_FOUNDERS, MIN_CURRENT_STUDENT_RATIO } from "@/lib/constants/club-application-rules";

const initialState: SubmitClubApplicationState = { error: null, success: false };

function makeInitialRowIds() {
  return Array.from({ length: MIN_FOUNDERS }, (_, i) => i);
}

let nextRowId = MIN_FOUNDERS;

export function ApplicationForm() {
  const [state, formAction, pending] = useActionState(submitClubApplication, initialState);
  const [rowIds, setRowIds] = useState<number[]>(makeInitialRowIds);
  const [currentStudentFlags, setCurrentStudentFlags] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(makeInitialRowIds().map((id) => [id, true])),
  );

  const addRow = () => {
    const id = nextRowId++;
    setRowIds((rows) => [...rows, id]);
    setCurrentStudentFlags((flags) => ({ ...flags, [id]: true }));
  };

  const removeRow = (id: number) => {
    setRowIds((rows) => rows.filter((rowId) => rowId !== id));
    setCurrentStudentFlags((flags) => {
      const next = { ...flags };
      delete next[id];
      return next;
    });
  };

  const totalCount = rowIds.length;
  const currentStudentCount = rowIds.filter((id) => currentStudentFlags[id]).length;
  const ratio = totalCount > 0 ? currentStudentCount / totalCount : 0;

  if (state.success) {
    return (
      <div className="rounded-card border border-border bg-card p-8 text-center">
        <h2 className="text-xl font-extrabold text-foreground">신청이 접수됐습니다</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          관리자 검토 후 결과를 안내드릴게요. 검토에는 며칠 정도 소요될 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-foreground">기본 정보</h2>
        <label className="flex flex-col gap-1 text-sm">
          동아리명
          <input name="club_name" required className="rounded-md border border-border px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          카테고리
          <select
            name="category"
            required
            defaultValue=""
            className="rounded-md border border-border px-3 py-2"
          >
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
        <label className="flex flex-col gap-1 text-sm">
          목적/소개
          <textarea
            name="purpose"
            required
            rows={3}
            className="rounded-md border border-border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          정기 활동 계획
          <textarea
            name="activity_plan"
            required
            rows={3}
            className="rounded-md border border-border px-3 py-2"
          />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            요일
            <input name="meeting_day" className="rounded-md border border-border px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            시간
            <input name="meeting_time" className="rounded-md border border-border px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            장소
            <input name="meeting_location" className="rounded-md border border-border px-3 py-2" />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">창립회원 명단</h2>
          <button
            type="button"
            onClick={addRow}
            className="rounded-full border border-border px-3 py-1 text-sm font-medium hover:bg-muted"
          >
            + 회원 추가
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          최소 {MIN_FOUNDERS}명, 재학생 비율 {Math.round(MIN_CURRENT_STUDENT_RATIO * 100)}% 이상
          필요 — 현재 {totalCount}명, 재학생 {Math.round(ratio * 100)}%
        </p>

        {rowIds.map((id, index) => (
          <div
            key={id}
            className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-[2fr_1.5fr_1fr_1.5fr_auto] sm:items-center"
          >
            <input
              name={`founders[${id}][name]`}
              placeholder="이름"
              required
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
            <input
              name={`founders[${id}][student_id]`}
              placeholder="학번"
              className="rounded-md border border-border px-3 py-2 text-sm"
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
            <input
              name={`founders[${id}][contact]`}
              placeholder="연락처"
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
            {index >= MIN_FOUNDERS && (
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

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="agree_rules" required className="mt-1" />
        학교 및 관련 법규를 준수하며, 정치/종교/상업적 목적으로 활동하지 않을 것에 동의합니다.
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
