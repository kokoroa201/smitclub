"use client";

import { useId, useRef, useState } from "react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export function CoverImageField({ currentUrl }: { currentUrl: string | null }) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [clientError, setClientError] = useState<string | null>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setClientError("JPG, PNG, WebP 파일만 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      setClientError("파일 크기는 5MB 이하여야 합니다.");
      event.target.value = "";
      return;
    }

    setClientError(null);
    setPreview(URL.createObjectURL(file));
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <label htmlFor={inputId} className="font-medium text-foreground">
        대표사진
      </label>
      <p className="text-xs text-muted-foreground">JPG, PNG, WebP · 최대 5MB</p>

      <div className="flex items-center gap-4">
        <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="대표사진 미리보기" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-muted-foreground">사진 없음</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
        >
          대표사진 변경
        </button>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          name="cover_image_file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {clientError && <p className="text-xs text-red-600">{clientError}</p>}
    </div>
  );
}
