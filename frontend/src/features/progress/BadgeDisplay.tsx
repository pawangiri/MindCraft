import { Lock } from "lucide-react";
import type { Badge } from "../../api/client";

interface BadgeDisplayProps {
  badges: Badge[];
}

export default function BadgeDisplay({ badges }: BadgeDisplayProps) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Badges</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {badges.map((badge) => (
          <div key={badge.id}>
            {badge.earned ? (
              <EarnedBadge badge={badge} />
            ) : (
              <LockedBadge badge={badge} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EarnedBadge({ badge }: { badge: Badge }) {
  const earnedDate = badge.earned_at
    ? new Date(badge.earned_at).toLocaleDateString()
    : null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm text-center group cursor-default hover:scale-105 hover:-translate-y-1 transition-transform">
      <div className="text-5xl mb-2">
        {badge.icon}
      </div>
      <div className="font-bold text-sm text-gray-900">{badge.name}</div>
      <div className="text-xs text-gray-500 mt-1 line-clamp-2">{badge.description}</div>
      {earnedDate && (
        <div className="text-xs text-primary-500 mt-2 font-medium">
          Earned {earnedDate}
        </div>
      )}
    </div>
  );
}

function LockedBadge({ badge }: { badge: Badge }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4 text-center opacity-60">
      <div className="text-5xl mb-2 grayscale">
        {badge.icon}
      </div>
      <div className="flex items-center justify-center gap-1 mb-1">
        <Lock className="w-3 h-3 text-gray-400" />
        <span className="font-bold text-sm text-gray-400">{badge.name}</span>
      </div>
      <div className="text-xs text-gray-400 mt-1 line-clamp-2">{badge.description}</div>
    </div>
  );
}
