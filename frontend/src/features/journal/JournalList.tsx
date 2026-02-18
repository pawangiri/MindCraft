import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { type JournalEntry } from "../../api/client";
import { PenTool, Plus, BookOpen, ChevronRight, Sparkles } from "lucide-react";

export default function JournalList() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/journal/").then((r) => {
      setEntries(r.data.results || r.data);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Journal</h1>
          <p className="text-gray-500 mt-1">Write about what you've learned!</p>
        </div>
        <Link
          to="/journal/new"
          className="bg-primary-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-600 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> New Entry
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <div className="text-5xl mb-4">
            <PenTool className="w-12 h-12 text-gray-300 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700">No journal entries yet!</h3>
          <p className="text-gray-500 mt-1 mb-4">Start writing about what you've been learning.</p>
          <Link
            to="/journal/new"
            className="inline-flex items-center gap-2 bg-primary-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-600 transition-all"
          >
            <Plus className="w-5 h-5" /> Write Your First Entry
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => (
            <Link
              key={entry.id}
              to={`/journal/${entry.id}`}
              className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                <PenTool className="w-5 h-5 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors flex items-center gap-2">
                  <span className="truncate">{entry.title}</span>
                  {entry.ai_feedback && (
                    <Sparkles className="w-4 h-4 text-accent-400 shrink-0" />
                  )}
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-3 mt-0.5">
                  <span>
                    {new Date(entry.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {entry.lesson_title && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" /> {entry.lesson_title}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-1 truncate">
                  {entry.content.slice(0, 120)}
                  {entry.content.length > 120 ? "..." : ""}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
