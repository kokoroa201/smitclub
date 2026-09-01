"use client";

import { useState } from "react";
import Image from "next/image";

// public/hero-students.png (2172×724, 투명 배경) — 인물이 이미지 우측에
// 몰려 있고 좌측은 빈 여백이라 object-cover + object-right-bottom으로
// 우측 인물 클러스터만 크롭해서 보여준다. 로드 실패 시 이 슬롯 자체가
// 레이아웃에서 사라져(display:none) 텍스트가 전체 폭을 차지한다.
export function HeroArt({
  // 파일명에 버전을 둔다: Next 이미지 옵티마이저가 동일 경로의 이전 파일을
  // 캐시해서, 같은 파일명으로 덮어써도 예전 캐시본을 계속 내려주는 문제가
  // 있었다(로컬 이미지는 쿼리스트링 캐시버스터도 지원하지 않음/400 에러).
  // 이미지를 교체할 때는 파일명 자체를 바꿔서 넣어야 한다.
  src = "/hero-students-2.png",
  alt = "함께 활동하는 학생들 일러스트",
}: {
  src?: string;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={
        failed
          ? "hidden"
          : "relative h-28 w-32 shrink-0 sm:h-40 sm:w-48 lg:h-60 lg:w-72"
      }
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority
        sizes="(min-width: 1024px) 32vw, 40vw"
        className="object-cover object-right-bottom"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
