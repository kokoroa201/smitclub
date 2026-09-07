"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-coral px-6 py-2.5 font-bold text-white shadow-sm shadow-coral/30"
    >
      인쇄 / PDF로 저장
    </button>
  );
}
