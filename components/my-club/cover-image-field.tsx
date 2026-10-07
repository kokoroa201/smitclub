"use client";

import { getDictionary, type Locale } from "@/lib/i18n";

import { useId, useRef, useState } from "react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export function CoverImageField({ currentUrl, locale }: { currentUrl: string | null; locale: Locale }) {
  const t = getDictionary(locale).clubManage;
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [clientError, setClientError] = useState<string | null>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setClientError(t.invalidCover);
      event.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      setClientError(t.largeCover);
      event.target.value = "";
      return;
    }

    setClientError(null);
    setPreview(URL.createObjectURL(file));
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <label htmlFor={inputId} className="font-medium text-foreground">
        {t.cover}
      </label>
      <p className="text-xs text-muted-foreground">{t.coverHint}</p>

      <div className="flex items-center gap-4">
        <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={t.coverPreview} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-muted-foreground">{t.noCover}</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
        >
          {t.changeCover}
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
