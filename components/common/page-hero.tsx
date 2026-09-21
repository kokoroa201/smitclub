import Image from "next/image";
import type { CSSProperties } from "react";

// /news, /clubs가 각자 인라인으로 들고 있던 hero 마크업(높이·라운드·좌우
// 그라데이션·텍스트 오버레이 규칙)을 그대로 옮겨온 공통 컴포넌트다. 지금은
// /club-rules에서만 쓰고 있고 /news·/clubs는 아직 이 컴포넌트로 옮기지
// 않았다(이번 작업 범위가 "다른 페이지는 건드리지 않기"라서) — 다만 두
// 페이지의 마크업과 클래스가 여기와 1:1로 같으므로, 나중에 옮겨도 화면이
// 달라지지 않는다. 새 hero를 추가할 때도 이 컴포넌트를 재사용하면 세
// 페이지의 크기가 다시 벌어지지 않는다.
export function PageHero({
  src,
  title,
  description,
  objectPosition,
  imageStyle,
}: {
  src: string;
  title: string;
  description: string;
  objectPosition?: string;
  imageStyle?: CSSProperties;
}) {
  return (
    <section className="relative h-[130px] overflow-hidden rounded-lg sm:h-[220px]">
      <Image
        src={src}
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
        style={{ objectPosition, ...imageStyle }}
        priority
      />
      <div className="absolute inset-y-0 left-0 w-[70%] bg-gradient-to-r from-white/95 via-white/60 to-transparent sm:w-[55%] sm:from-white/90 sm:via-white/40" />
      <div className="absolute inset-0 z-10 flex max-w-[62%] flex-col justify-center px-4 py-8 sm:max-w-[46%] sm:px-8 sm:py-14">
        <h1 className="text-lg font-extrabold leading-snug text-[#16234a] sm:text-2xl lg:text-3xl">{title}</h1>
        <p className="mt-1.5 text-xs leading-relaxed text-[#2f3b5c] sm:mt-2 sm:text-base">{description}</p>
      </div>
    </section>
  );
}
