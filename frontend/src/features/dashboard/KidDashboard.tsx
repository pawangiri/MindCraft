import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import api, { type Lesson, type ProgressOverview } from "../../api/client";
import {
  BookOpen, MessageCircle, Trophy, Flame,
  ChevronRight, Star, Clock, Zap,
} from "lucide-react";

export default function KidDashboard() {
  const user = useAuthStore((s) => s.user);
  const profile = user?.kid_profile;
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<ProgressOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/lessons/").then((r) => setLessons(r.data.results || r.data)),
      api.get("/progress/").then((r) => setProgress(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const greeting = getGreeting();

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          {greeting}, {profile?.display_name || user?.first_name}! {profile?.avatar}
        </h1>
        <p className="text-gray-500 mt-1">Ready for another day of learning?</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<BookOpen className="w-5 h-5" />}
          label="Lessons Done"
          value={progress?.lessons.completed || 0}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={<Star className="w-5 h-5" />}
          label="Quiz Avg"
          value={`${progress?.quizzes.average_score || 0}%`}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="Day Streak"
          value={progress?.streak.current_streak || 0}
          color="bg-orange-50 text-orange-600"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          label="Badges"
          value={progress?.badges_earned || 0}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/lessons"
          className="bg-gradient-to-br from-primary-500 to-primary-600 text-white p-5 rounded-2xl hover:from-primary-600 hover:to-primary-700 transition-all transform hover:scale-[1.02] shadow-lg"
        >
          <BookOpen className="w-8 h-8 mb-3" />
          <div className="font-bold text-lg">Continue Learning</div>
          <div className="text-white/70 text-sm">
            {progress?.lessons.in_progress || 0} lessons in progress
          </div>
        </Link>

        <Link
          to="/chat"
          className="bg-gradient-to-br from-accent-500 to-accent-600 text-white p-5 rounded-2xl hover:from-accent-600 hover:to-accent-700 transition-all transform hover:scale-[1.02] shadow-lg"
        >
          <MessageCircle className="w-8 h-8 mb-3" />
          <div className="font-bold text-lg">Ask AI Tutor</div>
          <div className="text-white/70 text-sm">Get help with anything</div>
        </Link>

        <Link
          to="/progress"
          className="bg-gradient-to-br from-success-500 to-emerald-600 text-white p-5 rounded-2xl hover:from-emerald-600 hover:to-emerald-700 transition-all transform hover:scale-[1.02] shadow-lg"
        >
          <Trophy className="w-8 h-8 mb-3" />
          <div className="font-bold text-lg">My Progress</div>
          <div className="text-white/70 text-sm">{progress?.badges_earned || 0} badges earned</div>
        </Link>
      </div>

      {/* Lessons List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Your Lessons</h2>
          <Link to="/lessons" className="text-primary-500 text-sm font-medium hover:text-primary-600 flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {lessons.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-gray-500">No lessons assigned yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {lessons.slice(0, 5).map((lesson) => (
              <Link
                key={lesson.id}
                to={`/lessons/${lesson.id}`}
                className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: lesson.subject_color + "15", color: lesson.subject_color }}
                >
                  {lesson.subject_icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors truncate">
                    {lesson.title}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-3 mt-0.5 flex-wrap">
                    <span>{lesson.subject_name}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {lesson.estimated_minutes} min
                    </span>
                    <span className="hidden sm:flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" /> {lesson.difficulty}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode; label: string; value: string | number; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
