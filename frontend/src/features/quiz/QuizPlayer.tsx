import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { type Quiz, type QuizSubmitResult } from "../../api/client";
import { getQuiz, startQuiz, submitQuiz, getHint, type AnswerPayload } from "../../api/quizzes";
import { cn } from "../../utils/cn";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  HelpCircle,
  Lightbulb,
  Loader2,
  Send,
} from "lucide-react";
import QuizResult from "./QuizResult";

// Answers can be a choice ID (number) or text (string) or unanswered (null)
type AnswerValue = number | string | null;

export default function QuizPlayer() {
  const { id } = useParams();
  const location = useLocation();
  const lessonId = (location.state as { lessonId?: number })?.lessonId ?? null;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintCount, setHintCount] = useState<Record<number, number>>({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!id) return;
    getQuiz(id).then((data) => {
      setQuiz(data);
      setLoading(false);
    });
  }, [id]);

  // Timer
  useEffect(() => {
    if (!started || result) return;
    const interval = setInterval(() => setTimeElapsed((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [started, result]);

  const handleStart = async () => {
    try {
      await startQuiz(id!);
    } catch {
      // attempt might already exist, continue
    }
    setStarted(true);
  };

  const handleSelectChoice = (questionId: number, choiceId: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: choiceId }));
    setHint(null);
  };

  const handleTextAnswer = (questionId: number, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const handleGetHint = async () => {
    if (!quiz?.questions) return;
    const question = quiz.questions[currentIndex];
    const attemptNum = (hintCount[question.id] || 0) + 1;
    if (attemptNum > 3) return;

    setHintLoading(true);
    try {
      const hintText = await getHint(id!, question.id, attemptNum);
      setHint(hintText);
      setHintCount((prev) => ({ ...prev, [question.id]: attemptNum }));
    } catch {
      setHint("Hmm, I couldn't get a hint right now. Try your best!");
    }
    setHintLoading(false);
  };

  const handleSubmit = async () => {
    if (!quiz?.questions) return;
    setSubmitting(true);

    const answerPayload: AnswerPayload[] = quiz.questions.map((q) => {
      const answer = answers[q.id];
      if (q.question_type === "fill_blank" || q.question_type === "short_answer") {
        return {
          question_id: q.id,
          text_answer: typeof answer === "string" ? answer : "",
        };
      }
      return {
        question_id: q.id,
        choice_id: typeof answer === "number" ? answer : null,
      };
    });

    try {
      const data = await submitQuiz(id!, answerPayload);
      setResult(data);
    } catch {
      // handle error
    }
    setSubmitting(false);
  };

  if (loading || !quiz) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const questions = quiz.questions || [];
  const totalQuestions = questions.length;
  const answeredCount = Object.entries(answers).filter(([, v]) => {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim().length > 0;
    return true;
  }).length;

  // Show result screen
  if (result) {
    return (
      <QuizResult
        quiz={quiz}
        result={result}
        answers={answers}
        timeElapsed={timeElapsed}
        lessonId={lessonId}
      />
    );
  }

  // Pre-start screen
  if (!started) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link
          to="/quizzes"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Quizzes
        </Link>

        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-gray-500 mb-4">{quiz.description}</p>
          )}
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500 mb-6">
            <span className="flex items-center gap-1">
              <HelpCircle className="w-4 h-4" /> {totalQuestions} questions
            </span>
            {quiz.time_limit_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> {quiz.time_limit_minutes} min limit
              </span>
            )}
          </div>
          <button
            onClick={handleStart}
            className="bg-primary-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary-600 transition-all text-lg"
          >
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentHintCount = hintCount[currentQuestion.id] || 0;
  const isChoiceType = currentQuestion.question_type === "multiple_choice" || currentQuestion.question_type === "true_false";

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/quizzes"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <Clock className="w-4 h-4" /> {formatTime(timeElapsed)}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {answeredCount}/{totalQuestions} answered
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-gray-100 rounded-full h-2 mb-6">
        <div
          className="bg-primary-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question navigation dots */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {questions.map((q, i) => {
          const a = answers[q.id];
          const isAnswered = a !== null && a !== undefined && (typeof a !== "string" || a.trim().length > 0);
          return (
            <button
              key={q.id}
              onClick={() => { setCurrentIndex(i); setHint(null); }}
              className={cn(
                "w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                i === currentIndex
                  ? "bg-primary-500 text-white scale-110"
                  : isAnswered
                    ? "bg-success-500 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
            >
              {isAnswered ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                i + 1
              )}
            </button>
          );
        })}
      </div>

      {/* Question card */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <span className="text-xs font-medium text-primary-500 bg-primary-50 px-2.5 py-1 rounded-full">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span className="text-xs text-gray-400">
            {currentQuestion.points} {currentQuestion.points === 1 ? "point" : "points"}
          </span>
        </div>

        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          {currentQuestion.question_text}
        </h2>

        {/* Render based on question type */}
        {isChoiceType ? (
          <div className="space-y-3">
            {currentQuestion.choices.map((choice) => {
              const isSelected = answers[currentQuestion.id] === choice.id;
              return (
                <button
                  key={choice.id}
                  onClick={() => handleSelectChoice(currentQuestion.id, choice.id)}
                  className={cn(
                    "w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all flex items-center gap-3",
                    isSelected
                      ? "border-primary-500 bg-primary-50 text-primary-800"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                      isSelected
                        ? "border-primary-500 bg-primary-500"
                        : "border-gray-300"
                    )}
                  >
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="font-medium text-sm">{choice.choice_text}</span>
                </button>
              );
            })}
          </div>
        ) : currentQuestion.question_type === "fill_blank" ? (
          <div>
            <input
              type="text"
              value={typeof answers[currentQuestion.id] === "string" ? answers[currentQuestion.id] as string : ""}
              onChange={(e) => handleTextAnswer(currentQuestion.id, e.target.value)}
              placeholder="Type your answer here..."
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none text-gray-900 font-medium transition-all text-base"
            />
          </div>
        ) : (
          /* short_answer */
          <div>
            <textarea
              value={typeof answers[currentQuestion.id] === "string" ? answers[currentQuestion.id] as string : ""}
              onChange={(e) => handleTextAnswer(currentQuestion.id, e.target.value)}
              placeholder="Write your answer here..."
              rows={4}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none text-gray-900 font-medium transition-all text-base resize-none"
            />
          </div>
        )}
      </div>

      {/* Hint section */}
      {hint && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-amber-800 mb-1">
              Hint {currentHintCount}/3
            </div>
            <p className="text-sm text-amber-700">{hint}</p>
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-auto flex justify-center sm:justify-start items-center gap-2">
          <button
            onClick={() => { setCurrentIndex((i) => Math.max(0, i - 1)); setHint(null); }}
            disabled={currentIndex === 0}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-40 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Previous
          </button>
          <button
            onClick={handleGetHint}
            disabled={hintLoading || currentHintCount >= 3}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 transition-all disabled:opacity-40 flex items-center gap-1"
          >
            {hintLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lightbulb className="w-4 h-4" />
            )}
            {currentHintCount >= 3 ? "No hints left" : "Get Hint"}
          </button>
        </div>

        <div className="w-full sm:w-auto flex justify-center sm:justify-end items-center gap-2">
          {currentIndex < totalQuestions - 1 ? (
            <button
              onClick={() => { setCurrentIndex((i) => i + 1); setHint(null); }}
              className="bg-primary-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-600 transition-all flex items-center gap-1"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || answeredCount === 0}
              className="bg-success-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {submitting ? "Submitting..." : "Submit Quiz"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
