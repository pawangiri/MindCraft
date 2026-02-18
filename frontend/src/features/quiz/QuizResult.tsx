import { Link } from "react-router-dom";
import type { Quiz, QuizSubmitResult } from "../../api/client";
import { cn } from "../../utils/cn";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Trophy,
  Clock,
  RotateCcw,
} from "lucide-react";

interface QuizResultProps {
  quiz: Quiz;
  result: QuizSubmitResult;
  answers: Record<number, number | null>;
  timeElapsed: number;
}

export default function QuizResult({ quiz, result, answers, timeElapsed }: QuizResultProps) {
  const questions = quiz.questions || [];
  const percentage = result.percentage;

  const getGrade = () => {
    if (percentage >= 90) return { label: "Amazing!", emoji: "🌟" };
    if (percentage >= 70) return { label: "Great job!", emoji: "🎉" };
    if (percentage >= 50) return { label: "Good try!", emoji: "💪" };
    return { label: "Keep practicing!", emoji: "📚" };
  };

  const grade = getGrade();

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        to="/quizzes"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Quizzes
      </Link>

      {/* Score card */}
      <div className="bg-white rounded-2xl shadow-sm p-8 mb-6 text-center">
        <div className="text-5xl mb-3">{grade.emoji}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{grade.label}</h1>
        <p className="text-gray-500 mb-6">{quiz.title}</p>

        {/* Score ring */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <svg className="w-24 sm:w-32 h-24 sm:h-32 -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="8"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke={percentage >= 70 ? "#22c55e" : percentage >= 50 ? "#3b82f6" : "#f59e0b"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(percentage / 100) * 352} 352`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">{percentage}%</span>
            <span className="text-xs text-gray-500">
              {result.score}/{result.max_score}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 text-sm text-gray-500 flex-wrap">
          <span className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500" />
            {result.score} points
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-success-500" />
            {result.results.filter((r) => r.is_correct).length} correct
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary-500" />
            {formatTime(timeElapsed)}
          </span>
        </div>
      </div>

      {/* Question review */}
      <div className="space-y-4 mb-6">
        <h2 className="text-lg font-bold text-gray-900">Review Answers</h2>
        {questions.map((question, i) => {
          const questionResult = result.results.find(
            (r) => r.question_id === question.id
          );
          const isCorrect = questionResult?.is_correct ?? false;
          const selectedId = questionResult?.selected_choice_id ?? answers[question.id];
          const correctId = questionResult?.correct_choice_id;

          return (
            <div
              key={question.id}
              className={cn(
                "bg-white rounded-2xl shadow-sm p-5 border-l-4",
                isCorrect ? "border-l-success-500" : "border-l-red-400"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  {isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-success-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-400 mb-1">
                    Question {i + 1}
                  </div>
                  <p className="font-medium text-gray-900 mb-3">
                    {question.question_text}
                  </p>

                  {/* Choices with correct/incorrect indicators */}
                  <div className="space-y-1.5">
                    {question.choices.map((choice) => {
                      const isThisCorrect = choice.id === correctId;
                      const wasThisSelected = choice.id === selectedId;

                      return (
                        <div
                          key={choice.id}
                          className={cn(
                            "text-sm px-3 py-2 rounded-lg flex items-center gap-2",
                            isThisCorrect
                              ? "bg-green-50 text-green-800 font-medium"
                              : wasThisSelected && !isThisCorrect
                                ? "bg-red-50 text-red-700"
                                : "text-gray-600"
                          )}
                        >
                          {isThisCorrect && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                          )}
                          {wasThisSelected && !isThisCorrect && (
                            <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          )}
                          {choice.choice_text}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {questionResult?.explanation && (
                    <div className="mt-3 text-sm text-gray-600 bg-blue-50 rounded-lg p-3">
                      <span className="font-medium text-blue-700">
                        Explanation:{" "}
                      </span>
                      {questionResult.explanation}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pb-8">
        <Link
          to={`/quizzes/${quiz.id}`}
          onClick={() => window.location.reload()}
          className="bg-primary-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-primary-600 transition-all flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Try Again
        </Link>
        <Link
          to="/quizzes"
          className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-all"
        >
          All Quizzes
        </Link>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
