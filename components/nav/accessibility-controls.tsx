"use client";

import { useEffect, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages, Type } from "lucide-react";
import { getDictionary, isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from "@/lib/i18n";

// 언어 선택이 cookie로 옮겨가기 전 localStorage에 저장하던 키 — 최초 1회
// cookie로 이관한 뒤 지운다.
const LEGACY_LOCALE_KEY = "smitclub:locale";
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

function readFontSize(): "base" | "large" {
  return localStorage.getItem(FONT_SIZE_KEY) === "large" ? "large" : "base";
}

function writeFontSize(value: "base" | "large") {
  localStorage.setItem(FONT_SIZE_KEY, value);
  notify();
}

const getServerFontSize = () => "base" as const;

function writeLocaleCookie(value: Locale) {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${value}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax${secure}`;
}

function hasLocaleCookie(): boolean {
  return document.cookie.split("; ").some((entry) => entry.startsWith(`${LOCALE_COOKIE}=`));
}

// locale은 서버가 cookie에서 읽은 값을 그대로 받는다 — 버튼을 누르면
// cookie만 바꾸고 router.refresh()로 서버 컴포넌트(이 컴포넌트의 props
// 포함)를 새 언어로 다시 렌더링한다.
export function AccessibilityControls({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const t = getDictionary(locale).accessibility;
  // localStorage 기반 외부 저장소 구독 — SSR에서는 항상 기본값(getServerSnapshot)을
  // 반환해 하이드레이션 불일치 없이, 마운트 후 실제 저장된 값으로 자동 갱신된다.
  const fontSize = useSyncExternalStore(subscribe, readFontSize, getServerFontSize);

  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize;
  }, [fontSize]);

  // 예전 localStorage 언어 값 이관: cookie가 아직 없을 때만 한 번 옮기고
  // 키를 지운다. 서버가 렌더링한 언어와 다르면 새로고침해서 반영한다.
  useEffect(() => {
    try {
      const legacy = localStorage.getItem(LEGACY_LOCALE_KEY);
      if (legacy === null) return;
      localStorage.removeItem(LEGACY_LOCALE_KEY);
      if (hasLocaleCookie() || !isLocale(legacy)) return;
      writeLocaleCookie(legacy);
      if (legacy !== locale) startTransition(() => router.refresh());
    } catch {
      // 저장소 접근이 막힌 환경 — 이관 없이 기본 언어로 둔다.
    }
  }, [locale, router]);

  function selectLocale(value: Locale) {
    if (value === locale) return;
    writeLocaleCookie(value);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5 rounded-full bg-card p-1 text-xs font-bold shadow-sm ring-1 ring-border">
        <Languages className="ml-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <button
          type="button"
          onClick={() => selectLocale("ko")}
          aria-pressed={locale === "ko"}
          className={`rounded-full px-2.5 py-1 transition-colors ${
            locale === "ko" ? "bg-coral text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.korean}
        </button>
        <button
          type="button"
          onClick={() => selectLocale("en")}
          aria-pressed={locale === "en"}
          className={`rounded-full px-2.5 py-1 transition-colors ${
            locale === "en" ? "bg-coral text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.english}
        </button>
      </div>
      <button
        type="button"
        onClick={() => writeFontSize(fontSize === "base" ? "large" : "base")}
        aria-pressed={fontSize === "large"}
        className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground shadow-sm ring-1 ring-border transition-colors hover:text-foreground"
      >
        <Type className="h-3.5 w-3.5" />
        {fontSize === "base" ? t.largeText : t.baseText}
      </button>
    </div>
  );
}
