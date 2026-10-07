# SMITClub 학교 노트북 인수인계

기준: 2026-10-07 (한국 시간). 다음 Codex 대화는 이 파일과 AGENTS.md부터 읽는다.

## 현재 확정 상태

- 저장소: https://github.com/kokoroa201/smitclub / `main`.
- 운영 사이트: https://smitclub.vercel.app.
- 기능 배포 커밋: `e9fb018` (동아리 한/영 흐름 + 공식 학교소식 수집).
- 해당 커밋 push 및 Vercel Production 배포 성공을 확인했다.
- 실제 Production 브라우저에서 Clubs KO → EN, SUDA 상세 EN 유지, EN → KO, 홈의 SUDA 표시를 확인했다. 런타임 오류는 없었다.
- lint / production build 통과. 동아리·뉴스 테스트 22개 통과, 선택 외부 읽기 테스트 1개 제외. SUDA 영문 seed 추가 후 해당 migration 검사도 통과했다.
- 현재 미완료 기능 작업은 없다. 다음 작업은 사용자의 새 요청을 먼저 확인한다.

## 반드시 유지할 내용

- 확정된 디자인·색상·카드·레이아웃과 동아리 가입/개설 조건, 승인 흐름, 권한·RLS를 유지한다.
- 기존 locale cookie `smitclub-locale`와 i18n 구조를 사용한다. 언어별 페이지·DB를 만들지 않는다.
- 공개 동아리 콘텐츠만 한/영 값을 저장하며, 개인정보·학번·연락처·지도교수 정보를 새로 이중 저장하지 않는다.
- 영문 값이 없으면 기존 값으로 fallback한다. 신규 영문 컬럼이 없는 DB는 기존 컬럼으로 재조회한다.
- 개인 OpenAI 키나 외부 번역 API는 사용하지 않는다. School News는 공식 SMIT 영문 게시판의 원제목을 그대로 수집한다.
- Academic Calendar 영문 수동 입력·2026 영문 seed 요청은 취소되었다. 해당 변경과 Calendar용 0018/0019는 제거되었다. 재추가하지 않는다.

## Production DB migration

- `0017_school_news_and_english_titles.sql`: 이미 적용 완료.
- `0018_club_public_content_i18n.sql`: 사용자가 SQL Editor에서 적용 완료했고 실제 DB 값까지 확인했다.
- 두 파일을 Production에 재실행하지 않는다. 미적용 migration은 현재 없다.
- 0018의 SUDA 초기 데이터는 한국어를 바꾸지 않고 빈 `description_en`, `activities_en`만 채운다.
- SUDA 영문 소개: Practice Korean with Korean students through casual conversations, group discussions, and presentation activities.
- SUDA 영문 활동: Weekly meetings · Group discussions · Korean cultural experiences.
- Production 변경·배포·commit/push는 다음 작업에서 사용자의 지시를 확인한 뒤 수행한다.

## 새 Windows 노트북 준비

1. Git과 Node.js LTS를 설치하고, 저장소 접근 권한이 있는 GitHub 계정으로 인증한다.
2. ChatGPT 데스크톱 앱을 설치하고 현재 사용 중인 ChatGPT 계정으로 로그인한다. 앱에서 Codex를 선택한 뒤 아래 로컬 프로젝트 폴더를 연다.
   - 공식 설치/시작 안내: https://learn.chatgpt.com/docs/quickstart
3. 처음 받는 경우 PowerShell에서:

   ```powershell
   Set-Location $env:USERPROFILE
   git clone https://github.com/kokoroa201/smitclub.git
   Set-Location smitclub
   npm.cmd ci
   ```

   이미 clone한 경우 해당 폴더에서 먼저 `git status`를 확인한 뒤 `git pull --ff-only`를 실행한다. 로컬 수정이 있으면 덮어쓰거나 reset하지 않는다.

4. 현재 PC의 `.env.local`을 개인 기기 간 안전한 방법으로 새 프로젝트 폴더에 별도로 복사한다. 이 파일은 Git에 저장되지 않으므로 clone만으로 복원되지 않는다. 값이나 secret을 채팅·커밋에 넣지 않는다.
   - 기본 화면 실행에는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`가 필요하다.
   - 서버 관리자/뉴스 동기화에는 `SUPABASE_SECRET_KEY`가 필요하다. 현재 파일은 운영 DB에 연결되어 있으므로 새 노트북에서도 임의 동기화·DB 수정을 하지 않는다.
   - 그 외 변수 이름과 선택 기능은 `.env.example`을 확인한다. OpenAI 번역 키는 필요 없다.
   - Vercel CLI env pull은 이전에 인증 문제로 실패했다. 무조건 반복하지 않는다.
5. `npm.cmd run dev` 실행 후 http://localhost:3000 에 접속한다.
6. Codex에서 새 대화를 시작하고 아래 메시지를 보낸다. 이전 대화의 자동 복원 여부에 의존하지 않고 이 파일로 맥락을 전달한다.

   ```text
   AGENTS.md와 HANDOFF.md를 먼저 읽고 SMITClub 작업을 이어가자.
   현재 git 상태와 로컬 실행 환경을 확인해줘. secret은 출력하지 마.
   0017·0018은 이미 Production 적용 완료이므로 다시 실행하지 마.
   기존 디자인·신청조건·권한·RLS는 유지하고, 취소한 Academic Calendar 영문 작업은 재추가하지 마.
   새로운 작업 내용은 내가 이어서 알려줄게. 지금은 코드 수정·DB 변경·배포·commit/push하지 마.
   ```

## 검증 명령

변경 내용에 필요한 검사만 실행한다. 이미 통과한 검사를 변경 없이 반복하지 않는다.

```powershell
npm.cmd run lint
npm.cmd run build
node --test scripts/test-clubs.mjs scripts/test-news.mjs
```

관련 Next.js 코드를 수정하기 전에 AGENTS.md가 지정한 `node_modules/next/dist/docs/`의 해당 가이드를 읽는다.
