"use client";

import { useState } from "react";
import Image from "next/image";

// public/hero-students-5.png (1600×983, 투명 배경). Hero 카드 전체가 하나의
// 장면처럼 보이도록 절대배치 배경 레이어로 깔고, 왼쪽 끝은 mask-image
// 그라데이션으로 서서히 사라지게 해 텍스트 영역과 자연스럽게 섞이도록 한다.
// object-contain은 이미지를 박스 안에 축소해 띄워 "배경"이 아니라 별도로
// 떠 있는 사진처럼 보이게 만든다(테두리 있는 박스 두 개로 분리된 것 같은
// 문제) — 반드시 object-cover로 빈틈없이 채운다. 카드 높이를 줄이면서
// 생긴 인물 머리 crop 문제는 object-right-top으로 위쪽을 기준점으로 옮겨
// 해결한다(테이블/화분 쪽 여백을 대신 잘라낸다). 로드 실패 시 이 레이어
// 자체가 사라져(return null) 카드가 밝은 배경만 남는다.
export function HeroArt({
  src = "/hero-students-5.png",
  alt = "",
  widthClassName = "w-[70%] sm:w-[64%] lg:w-[58%]",
  sizes = "(min-width: 1024px) 58vw, (min-width: 640px) 64vw, 70vw",
  // 텍스트와 겹치는 이미지 왼쪽 구간만 그라데이션으로 옅게 처리하고, 그
  // 뒤로는 100% 불투명하게 유지한다. 카메라 든 학생이 이미지 왼쪽 끝에
  // 있어 그라데이션 폭이 넓으면 그 친구까지 옅어져서 짧게 잡는다.
  fadeMask = "linear-gradient(to right, transparent 0%, black 18%)",
  opacity = 1,
  // hero-students-5.png 전용으로 고정돼 있던 크롭 기준점을 다른 이미지에도
  // 재사용할 수 있도록 분리한 값 — 기본값은 기존 동작과 동일하게 유지한다.
  objectPosition = "right top",
}: {
  src?: string;
  alt?: string;
  widthClassName?: string;
  sizes?: string;
  fadeMask?: string;
  opacity?: number;
  objectPosition?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-y-0 right-0 ${widthClassName}`}
      style={{ maskImage: fadeMask, WebkitMaskImage: fadeMask, opacity }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        preload
        sizes={sizes}
        className="object-cover"
        style={{ objectPosition }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
