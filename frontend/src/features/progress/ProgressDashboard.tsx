import { useEffect, useState } from "react";
import {
  BookOpen, Star, Flame, Trophy, TrendingUp, Target,
} from "lucide-react";
import api, { type ProgressOverview, type Badge } from "../../api/client";
import BadgeDisplay from "./BadgeDisplay";

export default function ProgressDashboard() {
  const [progress, setProgress] = useState<ProgressOverview | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/progress/").then((r) => setProgress(r.data)),
      api.get("/progress/badges/").then((r) => setBadges(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="text-center py-12 text-gray-500">
        Unable to load progress data.
      </div>
    );
  }

  const streakDays = progress.streak.current_streak;
  const longestStreak = progress.streak.longest_streak;
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Progress</h1>
        <p className="text-gray-500 mt-1">Track your learning journey</p>
      </div>

      {/* Streak Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white shadow-lg animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="text-5xl">
            <Flame className="w-10 h-10 sm:w-14 sm:h-14" />
          </div>
          <div>
            <div className="text-4xl font-bold">
              {streakDays} Day{streakDays !== 1 ? "s" : ""}
            </div>
            <div className="text-white/80 text-sm">
              {streakDays > 0
                ? "Keep it going! Learn something today."
                : "Start a streak by completing a lesson, quiz, or journal entry!"}
            </div>
            {longestStreak > 0 && (
              <div className="text-white/70 text-xs mt-1">
                Longest streak: {longestStreak} day{longestStreak !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
        {/* Streak dots (last 7 days) */}
        <div className="flex gap-2 mt-4">
          {Array.from({ length: 7 }).map((_, i) => {
            const active = i < streakDays;
            return (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-transform ${
                  active
                    ? "bg-white text-orange-500"
                    : "bg-white/20 text-white/50"
                }`}
              >
                {active ? <Flame className="w-4 h-4" /> : i + 1}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<BookOpen className="w-5 h-5" />}
          label="Lessons Completed"
          value={progress.lessons.completed}
          subtext={`${progress.lessons.in_progress} in progress`}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Quizzes Taken"
          value={progress.quizzes.total_attempts}
          subtext={`${progress.quizzes.average_score}% avg score`}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Current Streak"
          value={`${streakDays} day${streakDays !== 1 ? "s" : ""}`}
          subtext={`Best: ${longestStreak} day${longestStreak !== 1 ? "s" : ""}`}
          color="bg-orange-50 text-orange-600"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          label="Badges Earned"
          value={`${earnedCount}/${badges.length}`}
          subtext={earnedCount === badges.length ? "All collected!" : `${badges.length - earnedCount} to go`}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Lesson Progress Bar */}
      {progress.lessons.total > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-gray-900">Lesson Progress</h3>
            </div>
            <span className="text-sm text-gray-500">
              {progress.lessons.completed} of {progress.lessons.total} completed
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${(progress.lessons.completed / progress.lessons.total) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>0%</span>
            <span>{Math.round((progress.lessons.completed / progress.lessons.total) * 100)}%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Quiz Average Score */}
      {progress.quizzes.total_attempts > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-gray-900">Quiz Performance</h3>
            </div>
            <span className="text-sm text-gray-500">
              {progress.quizzes.total_attempts} quiz{progress.quizzes.total_attempts !== 1 ? "zes" : ""} taken
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${progress.quizzes.average_score}%`,
                background: progress.quizzes.average_score >= 80
                  ? "linear-gradient(to right, #22c55e, #16a34a)"
                  : progress.quizzes.average_score >= 50
                    ? "linear-gradient(to right, #eab308, #f59e0b)"
                    : "linear-gradient(to right, #ef4444, #f87171)",
              }}
            />
          </div>
          <div className="text-center mt-2 text-sm font-bold text-gray-700">
            {progress.quizzes.average_score}% Average Score
          </div>
        </div>
      )}

      {/* Badges Section */}
      <div>
        <BadgeDisplay badges={badges} />
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, subtext, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-xs text-gray-400 mt-1">{subtext}</div>
    </div>
  );
}
