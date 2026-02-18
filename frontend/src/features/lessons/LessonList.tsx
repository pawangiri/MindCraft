import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { type Lesson } from "../../api/client";
import { Clock, Zap, ChevronRight, Sparkles } from "lucide-react";

export default function LessonList() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/lessons/").then((r) => {
      setLessons(r.data.results || r.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Group by subject
  const grouped = lessons.reduce<Record<string, Lesson[]>>((acc, lesson) => {
    const key = lesson.subject_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(lesson);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Lessons</h1>
        <p className="text-gray-500 mt-1">Pick a lesson and start learning!</p>
      </div>

      {lessons.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <div className="text-5xl mb-4">📚</div>
          <h3 className="text-lg font-semibold text-gray-700">No lessons yet!</h3>
          <p className="text-gray-500 mt-1">Your parent will assign lessons for you soon.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([subject, subjectLessons]) => (
          <div key={subject}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{subjectLessons[0].subject_icon}</span>
              <h2 className="text-lg font-bold text-gray-900">{subject}</h2>
              <span className="text-sm text-gray-400">{subjectLessons.length} lessons</span>
            </div>
            <div className="grid gap-3">
              {subjectLessons.map((lesson) => (
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
                    <div className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors flex items-center gap-2">
                      <span className="truncate">{lesson.title}</span>
                      {lesson.ai_generated && (
                        <Sparkles className="w-4 h-4 text-accent-400 shrink-0" />
                      )}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-3 mt-0.5">
                      <span>{lesson.topic_name}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {lesson.estimated_minutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" /> {lesson.difficulty}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
