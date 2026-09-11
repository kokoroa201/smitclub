import { NextResponse, type NextRequest } from "next/server";
import { runNewsSync } from "@/lib/news-sync/run-sync";

export const maxDuration = 60;

// Vercel Cron이 매일 KST 09:00(vercel.json: UTC 0시)에 호출한다. Authorization:
// Bearer ${CRON_SECRET} 헤더가 일치할 때만 실행 — 그 외에는 이 라우트를
// 직접 호출해도 아무 일도 하지 않는다.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const summary = await runNewsSync();
  return NextResponse.json(summary);
}
