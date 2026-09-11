// Resend 기반 이메일 발송. 학교 도메인 인증·API 키 설정 전에는 아무것도
// 보내지 않고 조용히 건너뛴다 — 세 환경변수가 모두 있어야만 실제 발송한다.
// 이 파일의 함수는 절대 예외를 던지지 않는다: 이메일 발송 실패가 신청·승인
// 같은 실제 처리를 실패시키면 안 되기 때문이다.

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!apiKey || !from || !appUrl) return null;
  return { apiKey, from, appUrl };
}

export function isEmailConfigured(): boolean {
  return getEmailConfig() !== null;
}

export async function sendNotificationEmail(params: {
  to: string;
  subject: string;
  text: string;
  link?: string | null;
}): Promise<void> {
  const config = getEmailConfig();
  if (!config) return;

  const url = params.link ? new URL(params.link, config.appUrl).toString() : config.appUrl;
  const text = `${params.text}\n\n${url}`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: params.to,
        subject: params.subject,
        text,
      }),
    });

    if (!res.ok) {
      console.error("resend email send failed", res.status, await res.text());
    }
  } catch (err) {
    console.error("resend email request threw", err);
  }
}
