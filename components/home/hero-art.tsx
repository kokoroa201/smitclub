"use client";

import { useState } from "react";
import Image from "next/image";

// public/hero-students-5.png (1600×983, 투명 배경). Hero 카드 전체가 하나의
// 장면처럼 보이도록 절대배치 배경 레이어로 깔고, 왼쪽 끝은 mask-image
// 그라데이션으로 서서히 사라지게 해 텍스트 영역과 자연스럽게 섞이도록 한다.
// 카드의 overflow-hidden이 오른쪽·아래를 잘라내 장면이 카드 밖으로 이어지는
// 느낌을 준다. 로드 실패 시 이 레이어 자체가 사라져(return null) 카드가
// 밝은 배경만 남는다.
export function HeroArt({
  src = "/hero-students-5.png",
  alt = "",
}: {
  src?: string;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  // 왼쪽 30%는 완전히 비우고, 62%까지 서서히 나타나 85% 지점부터 완전히
  // 불투명해진다 — 좁은 모바일 화면에서도 텍스트 영역과 겹치지 않을 만큼
  // 여유를 둔 폭.
  const fadeMask = "linear-gradient(to right, transparent 0%, transparent 30%, rgba(0,0,0,0.85) 62%, black 85%)";

  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 w-[74%] sm:w-[68%] lg:w-[62%]"
      style={{ maskImage: fadeMask, WebkitMaskImage: fadeMask }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        preload
        sizes="(min-width: 1024px) 62vw, (min-width: 640px) 68vw, 74vw"
        className="object-cover object-right-bottom"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
