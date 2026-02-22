import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Markdown from "../../components/Markdown";
import api, { type Lesson } from "../../api/client";
import { cn } from "../../utils/cn";
import {
  ArrowLeft, Clock, Zap, BookCheck, MessageCircle, ClipboardList, Calculator,
} from "lucide-react";

export default function LessonViewer() {
  const { id } = useParams();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    api.get(`/lessons/${id}/`).then((r) => {
      setLesson(r.data);
      setLoading(false);
      // Mark as started
      api.post(`/lessons/${id}/start/`).catch(() => {});
    });
  }, [id]);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await api.post(`/lessons/${id}/complete/`);
      setCompleted(true);
    } catch {
      // ignore
    }
    setCompleting(false);
  };

  if (loading || !lesson) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back button */}
      <Link
        to="/lessons"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Lessons
      </Link>

      {/* Lesson header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ backgroundColor: lesson.subject_color + "15" }}
          >
            {lesson.subject_icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-500 mb-1">
              {lesson.subject_name} → {lesson.topic_name}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{lesson.title}</h1>
            {lesson.description && (
              <p className="text-gray-600 mt-2">{lesson.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> {lesson.estimated_minutes} min
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-4 h-4" /> {lesson.difficulty}
              </span>
              <span className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full text-xs font-medium">
                Grade {lesson.grade_level}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lesson content */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="prose max-w-none">
          <Markdown>{lesson.content || ""}</Markdown>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        {/* Quiz card — prominent if quiz exists */}
        {lesson.has_quiz && lesson.quiz_id && (
          <div
            className={cn(
              "rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3",
              lesson.quiz_best_score
                ? "bg-green-50 border border-green-200"
                : "bg-primary-50 border border-primary-200"
            )}
          >
            <div className="flex-1">
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                {lesson.quiz_best_score
                  ? `You scored ${lesson.quiz_best_score.percentage}%!`
                  : "Ready to test your knowledge?"}
              </div>
              <p className="text-sm text-gray-600 mt-0.5">
                {lesson.quiz_best_score
                  ? `${lesson.quiz_best_score.score}/${lesson.quiz_best_score.max_score} points — try again to improve!`
                  : "Take a quick quiz to see how well you understood this lesson."}
              </p>
            </div>
            <Link
              to={`/quizzes/${lesson.quiz_id}`}
              state={{ lessonId: lesson.id }}
              className={cn(
                "px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 shrink-0",
                lesson.quiz_best_score
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-primary-500 text-white hover:bg-primary-600"
              )}
            >
              <ClipboardList className="w-4 h-4" />
              {lesson.quiz_best_score ? "Retake Quiz" : "Take Quiz"}
            </Link>
          </div>
        )}

        {/* Other actions row */}
        <div className="flex flex-wrap items-center gap-3">
          {completed ? (
            <div className="flex items-center gap-2 text-success-500 font-semibold">
              <BookCheck className="w-5 h-5" /> Lesson Complete! 🎉
            </div>
          ) : (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="bg-success-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 transition-all flex items-center gap-2 disabled:opacity-60"
            >
              <BookCheck className="w-5 h-5" />
              {completing ? "Saving..." : "Mark as Complete"}
            </button>
          )}

          <Link
            to={`/chat?lesson=${id}`}
            className="bg-accent-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-accent-600 transition-all flex items-center gap-2"
          >
            <MessageCircle className="w-5 h-5" /> Ask AI Tutor
          </Link>

          {lesson.subject_name?.toLowerCase().includes("math") && (
            <Link
              to={`/lessons/${id}/practice`}
              className="bg-amber-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-amber-600 transition-all flex items-center gap-2"
            >
              <Calculator className="w-5 h-5" /> Practice Math
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
