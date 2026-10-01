import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // /my/club에서 회장이 올린 동아리 대표사진(Supabase Storage 공개 버킷
    // club-covers)만 next/image 최적화를 허용한다.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/club-covers/**",
      },
    ],
  },
};

export default nextConfig;
