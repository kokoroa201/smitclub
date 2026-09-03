"use client";

import { useState } from "react";
import Image from "next/image";

// public/hero-students-5.png (1600×983, 투명 배경). Hero 카드 전체가 하나의
// 장면처럼 보이도록 절대배치 배경 레이어로 깔고, 왼쪽 끝은 mask-image
// 그라데이션으로 서서히 사라지게 해 텍스트 영역과 자연스럽게 섞이도록 한다.
// object-contain을 써서 박스보다 이미지 비율이 클 때도 위/아래가 잘리지
// 않고 항상 전체가 보이게 한다(카드 높이를 줄였을 때 인물 머리가 위에서
// crop되던 문제). 로드 실패 시 이 레이어 자체가 사라져(return null) 카드가
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

  // 텍스트와 겹치는 이미지 왼쪽 구간만 그라데이션으로 옅게 처리하고, 그
  // 뒤로는 100% 불투명하게 유지한다. 카메라 든 학생이 이미지 왼쪽 끝에
  // 있어 그라데이션 폭이 넓으면 그 친구까지 옅어져서 짧게 잡는다.
  const fadeMask = "linear-gradient(to right, transparent 0%, black 18%)";

  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 w-[70%] sm:w-[64%] lg:w-[58%]"
      style={{ maskImage: fadeMask, WebkitMaskImage: fadeMask }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        preload
        sizes="(min-width: 1024px) 58vw, (min-width: 640px) 64vw, 70vw"
        className="object-contain object-right-bottom"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
