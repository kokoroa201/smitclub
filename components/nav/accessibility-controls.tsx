"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Languages, Type } from "lucide-react";

const LOCALE_KEY = "smitclub:locale";
const FONT_SIZE_KEY = "smitclub:font-size";

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readLocale(): "ko" | "en" {
  return localStorage.getItem(LOCALE_KEY) === "en" ? "en" : "ko";
}

function readFontSize(): "base" | "large" {
  return localStorage.getItem(FONT_SIZE_KEY) === "large" ? "large" : "base";
}

function writeLocale(value: "ko" | "en") {
  localStorage.setItem(LOCALE_KEY, value);
  notify();
}

function writeFontSize(value: "base" | "large") {
  localStorage.setItem(FONT_SIZE_KEY, value);
  notify();
}

const getServerLocale = () => "ko" as const;
const getServerFontSize = () => "base" as const;

export function AccessibilityControls() {
  // localStorage 기반 외부 저장소 구독 — SSR에서는 항상 기본값(getServerSnapshot)을
  // 반환해 하이드레이션 불일치 없이, 마운트 후 실제 저장된 값으로 자동 갱신된다.
  const locale = useSyncExternalStore(subscribe, readLocale, getServerLocale);
  const fontSize = useSyncExternalStore(subscribe, readFontSize, getServerFontSize);

  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize;
  }, [fontSize]);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5 rounded-full bg-card p-1 text-xs font-bold shadow-sm ring-1 ring-border">
        <Languages className="ml-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <button
          type="button"
          onClick={() => writeLocale("ko")}
          aria-pressed={locale === "ko"}
          className={`rounded-full px-2.5 py-1 transition-colors ${
            locale === "ko" ? "bg-coral text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          한국어
        </button>
        <button
          type="button"
          onClick={() => writeLocale("en")}
          aria-pressed={locale === "en"}
          className={`rounded-full px-2.5 py-1 transition-colors ${
            locale === "en" ? "bg-coral text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          EN
        </button>
      </div>
      <button
        type="button"
        onClick={() => writeFontSize(fontSize === "base" ? "large" : "base")}
        aria-pressed={fontSize === "large"}
        className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground shadow-sm ring-1 ring-border transition-colors hover:text-foreground"
      >
        <Type className="h-3.5 w-3.5" />
        {fontSize === "base" ? "큰 글씨" : "기본 글씨"}
      </button>
    </div>
  );
}
