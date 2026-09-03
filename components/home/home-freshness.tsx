"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 브라우저 뒤로/앞으로가기(popstate)는 staleTimes 설정과 무관하게 항상
// Next.js 클라이언트 캐시(RSC payload)를 재사용한다 — 스크롤 위치 보존을 위한
// 의도된 동작이라 config로는 끌 수 없다(참고: staleTimes 문서 "This doesn't
// change back/forward caching behavior"). 홈은 어떤 경로로 들어와도 항상
// 최신 레이아웃을 보여줘야 하므로, 마운트될 때마다 router.refresh()로 캐시를
// 무시하고 서버에서 다시 렌더링해 이전 DOM이 복원되는 것을 막는다.
export function HomeFreshness() {
  const router = useRouter();

  useEffect(() => {
    router.refresh();
  }, [router]);

  return null;
}
