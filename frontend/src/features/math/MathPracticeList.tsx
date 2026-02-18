import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calculator, Plus, ChevronRight, Clock } from "lucide-react";
import type { MathPracticeSession } from "../../api/client";
import { getSessions } from "../../api/math";
import { cn } from "../../utils/cn";

export default function MathPracticeList() {
  const [sessions, setSessions] = useState<MathPracticeSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSessions().then((data) => {
      setSessions(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
            <Calculator className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
              Math Practice
            </h1>
            <p className="text-sm text-gray-500">Practice math problems and draw your answers</p>
          </div>
        </div>
        <Link
          to="/math-practice/new"
          className="bg-amber-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-amber-600 transition-all flex items-center gap-2 text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Practice
        </Link>
      </div>

      {/* Session List */}
      {sessions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Calculator className="w-16 h-16 mx-auto mb-4 text-gray-200" />
          <h2 className="text-lg font-bold text-gray-700 mb-2" style={{ fontFamily: "var(--font-display)" }}>
            No practice sessions yet
          </h2>
          <p className="text-gray-500 mb-6 text-sm">Start your first math practice session!</p>
          <Link
            to="/math-practice/new"
            className="inline-flex items-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-amber-600 transition-all"
          >
            <Plus className="w-5 h-5" /> Start Practicing
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const accuracy =
              session.attempt_count > 0
                ? Math.round((session.correct_count / session.attempt_count) * 100)
                : null;
            return (
              <Link
                key={session.id}
                to={`/math-practice/${session.id}`}
                className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all group"
              >
                <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                  <Calculator className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">{session.topic}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(session.updated_at).toLocaleDateString()}
                    </span>
                    <span>{session.attempt_count} problem{session.attempt_count !== 1 ? "s" : ""}</span>
                    {accuracy !== null && (
                      <span className={cn(
                        "font-semibold",
                        accuracy >= 70 ? "text-green-500" : accuracy >= 40 ? "text-amber-500" : "text-red-400"
                      )}>
                        {accuracy}% correct
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-amber-500 transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
