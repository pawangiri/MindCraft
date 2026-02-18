import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { type Quiz } from "../../api/client";
import { getQuizzes } from "../../api/quizzes";
import { ClipboardList, ChevronRight, HelpCircle, Clock } from "lucide-react";

export default function QuizList() {
  const [searchParams] = useSearchParams();
  const lessonFilter = searchParams.get("lesson");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getQuizzes().then((data) => {
      if (lessonFilter) {
        const lid = parseInt(lessonFilter, 10);
        data = data.filter((q) => q.lesson_id === lid);
      }
      setQuizzes(data);
      setLoading(false);
    });
  }, [lessonFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quizzes</h1>
        <p className="text-gray-500 mt-1">Test your knowledge and earn points!</p>
      </div>

      {quizzes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-lg font-semibold text-gray-700">No quizzes yet!</h3>
          <p className="text-gray-500 mt-1">
            Complete some lessons first — quizzes will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {quizzes.map((quiz) => (
            <Link
              key={quiz.id}
              to={`/quizzes/${quiz.id}`}
              state={{ lessonId: quiz.lesson_id }}
              className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                <ClipboardList className="w-6 h-6 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors truncate">
                  {quiz.title}
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-3 mt-0.5">
                  {quiz.lesson_title && (
                    <span className="truncate">{quiz.lesson_title}</span>
                  )}
                  <span className="flex items-center gap-1 shrink-0">
                    <HelpCircle className="w-3.5 h-3.5" /> {quiz.question_count} questions
                  </span>
                  {quiz.time_limit_minutes && (
                    <span className="flex items-center gap-1 shrink-0">
                      <Clock className="w-3.5 h-3.5" /> {quiz.time_limit_minutes} min
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
