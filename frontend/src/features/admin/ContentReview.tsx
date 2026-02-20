import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import api, { type Lesson } from "../../api/client";
import { generateQuiz } from "../../api/quizzes";
import {
  ArrowLeft, CheckCircle, XCircle, Pencil, Eye, Clock, Zap, Sparkles,
  Save, Loader2, ChevronUp, AlertCircle, ClipboardList,
} from "lucide-react";

type StatusFilter = "all" | "draft" | "review" | "published";

export default function ContentReview() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandLoading, setExpandLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [publishConfirm, setPublishConfirm] = useState<number | null>(null);
  const [quizGenerating, setQuizGenerating] = useState<number | null>(null);

  const fetchLessons = () => {
    setLoading(true);
    api.get("/lessons/").then((r) => {
      setLessons(r.data.results || r.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  const filtered = lessons.filter((l) => {
    if (filter === "all") return true;
    return l.status === filter;
  });

  const handlePublishClick = (lesson: Lesson) => {
    if (lesson.has_quiz) {
      handlePublish(lesson.id, false);
    } else {
      setPublishConfirm(lesson.id);
    }
  };

  const handlePublish = async (id: number, withQuiz: boolean) => {
    setError(null);
    setPublishConfirm(null);
    setActionLoading(id);
    try {
      await api.post(`/lessons/${id}/publish/`);
      setLessons((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: "published" } : l))
      );

      if (withQuiz) {
        setQuizGenerating(id);
        try {
          const result = await generateQuiz(id);
          setLessons((prev) =>
            prev.map((l) =>
              l.id === id
                ? { ...l, has_quiz: true, quiz_id: result.quiz_id }
                : l
            )
          );
        } catch {
          setError("Lesson published, but quiz generation failed. You can generate it later.");
        }
        setQuizGenerating(null);
      }
    } catch {
      setError("Failed to publish lesson. Please try again.");
    }
    setActionLoading(null);
  };

  const handleReject = async (id: number) => {
    setError(null);
    setActionLoading(id);
    try {
      await api.patch(`/lessons/${id}/`, { status: "draft" });
      setLessons((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: "draft" } : l))
      );
    } catch {
      setError("Failed to unpublish lesson. Please try again.");
    }
    setActionLoading(null);
  };

  const handleStartEdit = (lesson: Lesson) => {
    setEditingId(lesson.id);
    setEditTitle(lesson.title);
    setEditLoading(true);
    api.get(`/lessons/${lesson.id}/`).then((r) => {
      setEditContent(r.data.content || "");
      setEditLoading(false);
    });
  };

  const handleSaveEdit = async (id: number) => {
    setError(null);
    setActionLoading(id);
    try {
      await api.patch(`/lessons/${id}/`, {
        title: editTitle,
        content: editContent,
      });
      setLessons((prev) =>
        prev.map((l) => (l.id === id ? { ...l, title: editTitle } : l))
      );
      setEditingId(null);
    } catch {
      setError("Failed to save changes. Please try again.");
    }
    setActionLoading(null);
  };

  const handleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      // fetch full content if needed
      const lesson = lessons.find((l) => l.id === id);
      if (lesson && !lesson.content) {
        setExpandLoading(true);
        api.get(`/lessons/${id}/`).then((r) => {
          setLessons((prev) =>
            prev.map((l) =>
              l.id === id ? { ...l, content: r.data.content } : l
            )
          );
          setExpandLoading(false);
        });
      }
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-gray-100 text-gray-600",
      review: "bg-amber-50 text-amber-600",
      published: "bg-green-50 text-green-600",
    };
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${styles[status] || styles.draft}`}
      >
        {status}
      </span>
    );
  };

  const counts = {
    all: lessons.length,
    draft: lessons.filter((l) => l.status === "draft").length,
    review: lessons.filter((l) => l.status === "review").length,
    published: lessons.filter((l) => l.status === "published").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Content Review</h1>
          <p className="text-gray-500 mt-1">
            Review, edit, and publish AI-generated lessons.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "draft", "review", "published"] as StatusFilter[]).map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
                filter === f
                  ? "bg-primary-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm"
              }`}
            >
              {f} ({counts[f]})
            </button>
          )
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-3 bg-red-50 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}

      {/* Lesson list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <div className="text-5xl mb-4">
            {filter === "published" ? "🎉" : "📋"}
          </div>
          <h3 className="text-lg font-semibold text-gray-700">
            No {filter === "all" ? "" : filter} lessons found
          </h3>
          <p className="text-gray-500 mt-1">
            {filter === "draft"
              ? "Generate new lessons with the AI Lesson Generator."
              : "Try a different filter."}
          </p>
          {filter === "draft" && (
            <Link
              to="/admin/generate"
              className="mt-4 inline-flex items-center gap-2 bg-accent-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-accent-600 transition-all"
            >
              <Sparkles className="w-4 h-4" /> Generate Lesson
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lesson) => (
            <div
              key={lesson.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              {/* Lesson header row */}
              <div className="p-4 flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{
                    backgroundColor: (lesson.subject_color || "#6366f1") + "15",
                  }}
                >
                  {lesson.subject_icon || "📚"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    <span className="truncate">{lesson.title}</span>
                    {lesson.ai_generated && (
                      <Sparkles className="w-4 h-4 text-accent-400 shrink-0" />
                    )}
                    {statusBadge(lesson.status)}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-3 mt-0.5 flex-wrap">
                    <span>{lesson.topic_name}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />{" "}
                      {lesson.estimated_minutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" /> {lesson.difficulty}
                    </span>
                    <span className="text-xs">Grade {lesson.grade_level}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {lesson.status !== "published" && (
                    <>
                      <button
                        onClick={() => handlePublishClick(lesson)}
                        disabled={actionLoading === lesson.id}
                        className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-all"
                        title="Publish"
                      >
                        {actionLoading === lesson.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleStartEdit(lesson)}
                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {lesson.status === "published" && (
                    <button
                      onClick={() => handleReject(lesson.id)}
                      disabled={actionLoading === lesson.id}
                      className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all"
                      title="Unpublish (revert to draft)"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleExpand(lesson.id)}
                    className="p-2 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-all"
                    title="Preview"
                  >
                    {expandedId === lesson.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded content preview */}
              {expandedId === lesson.id && (
                <div className="px-6 pb-5 border-t border-gray-100 pt-4">
                  {expandLoading && !lesson.content ? (
                    <div className="flex items-center gap-2 text-gray-500 py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading content...</span>
                    </div>
                  ) : (
                    <div className="prose max-w-none text-sm">
                      <ReactMarkdown>
                        {lesson.content || "No content available."}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {/* Inline edit */}
              {editingId === lesson.id && (
                <div className="px-6 pb-5 border-t border-gray-100 pt-4 space-y-3">
                  {editLoading ? (
                    <div className="flex items-center gap-2 text-gray-500 py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading content for editing...</span>
                    </div>
                  ) : (
                  <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content (Markdown)
                    </label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={15}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveEdit(lesson.id)}
                      disabled={actionLoading === lesson.id}
                      className="bg-primary-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-600 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" /> Save Changes
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                  </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Publish confirmation dialog */}
      {publishConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Publish Lesson</h3>
            <p className="text-gray-600 text-sm mb-6">
              Would you like to auto-generate a quiz for this lesson? Students learn better when they can test their knowledge.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handlePublish(publishConfirm, true)}
                className="w-full bg-green-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-green-600 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Publish with Quiz
              </button>
              <button
                onClick={() => handlePublish(publishConfirm, false)}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                Publish without Quiz
              </button>
              <button
                onClick={() => setPublishConfirm(null)}
                className="w-full text-gray-500 px-4 py-2 text-sm hover:text-gray-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
