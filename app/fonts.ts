import localFont from "next/font/local";

// Pretendard — 한글/영문 모두 가독성이 좋은 현대적 UI 서체.
// 헤딩(700~800)과 본문(400~500) hierarchy에 맞춰 필요한 굵기만 로드.
export const pretendard = localFont({
  src: [
    {
      path: "../node_modules/pretendard/dist/web/static/woff2/Pretendard-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/pretendard/dist/web/static/woff2/Pretendard-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/pretendard/dist/web/static/woff2/Pretendard-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../node_modules/pretendard/dist/web/static/woff2/Pretendard-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../node_modules/pretendard/dist/web/static/woff2/Pretendard-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-pretendard",
  display: "swap",
});
