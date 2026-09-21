import type { Role } from "@/lib/auth";

// 앱 전역에서 역할 표시 라벨을 한 곳에서만 관리한다 — /admin/members,
// /admin/clubs(회장 지정), /my에서 각자 복제해 두면 역할이 추가/변경될 때
// 갱신을 빠뜨리기 쉽다.
// Record<string, string>으로 넓혀 둔다 — 호출부(DB에서 읽은 row.role)가
// 항상 Role로 좁게 타입되어 있지는 않아서, 여기서 Role만 키로 받으면
// 정작 쓰는 곳에서 인덱싱 타입 에러가 난다. `satisfies`로 정의 시점에는
// 6개 Role을 모두 채웠는지 계속 검증한다.
export const ROLE_LABEL: Record<string, string> = {
  student: "학생",
  club_admin: "동아리장",
  super_admin: "관리자",
  council_president: "원우회장",
  council_vice_president: "원우회 부회장",
  academic_staff: "교학처 담당자",
} satisfies Record<Role, string>;
