import Link from "next/link";
import { CalendarDays } from "lucide-react";

export type ClubCardData = {
  slug: string;
  name: string;
  category: string;
  description: string | null;
  coverImageUrl: string | null;
  meetingDay: string | null;
  meetingLocation: string | null;
};

export function ClubCard({ club }: { club: ClubCardData }) {
  const meetingInfo = [club.meetingDay, club.meetingLocation].filter(Boolean).join(" · ");

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-card shadow-sm">
      <div
        className="relative h-44 w-full shrink-0 bg-gradient-to-br from-coral via-purple to-blue bg-cover bg-center sm:h-52 lg:h-60"
        style={club.coverImageUrl ? { backgroundImage: `url(${club.coverImageUrl})` } : undefined}
      >
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-coral-dark shadow-sm">
          모집중
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5 sm:p-6">
        <span className="w-fit rounded-full bg-coral-soft px-2.5 py-1 text-xs font-bold text-coral-dark">
          {club.category}
        </span>
        <h3 className="text-xl font-extrabold text-foreground sm:text-2xl">{club.name}</h3>
        {club.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {club.description}
          </p>
        )}
        {meetingInfo && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground sm:text-sm">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
            <span>주요 활동 · {meetingInfo}</span>
          </div>
        )}
        <div className="mt-auto flex flex-col gap-2 pt-3 sm:flex-row">
          <Link
            href={`/clubs/${club.slug}`}
            className="flex-1 rounded-full border border-border px-4 py-2.5 text-center text-sm font-bold text-foreground transition-colors hover:bg-muted sm:text-base"
          >
            {club.name} 둘러보기
          </Link>
          <Link
            href={`/clubs/${club.slug}`}
            className="flex-1 rounded-full bg-coral px-4 py-2.5 text-center text-sm font-bold text-white transition-transform hover:scale-105 sm:text-base"
          >
            가입 신청
          </Link>
        </div>
      </div>
    </div>
  );
}
