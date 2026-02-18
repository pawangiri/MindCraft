import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import api, { type JournalEntry, type Lesson } from "../../api/client";
import {
  ArrowLeft, Save, Sparkles, Loader2, BookOpen, Trash2, AlertCircle,
} from "lucide-react";

export default function JournalEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [lessonId, setLessonId] = useState<number | null>(null);
  const [lessonTitle, setLessonTitle] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [deleting, setDeleting] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load lessons for the dropdown
  useEffect(() => {
    api.get("/lessons/").then((r) => {
      setLessons(r.data.results || r.data);
    });
  }, []);

  // Load existing entry or set lesson from query params
  useEffect(() => {
    if (!isNew && id) {
      api.get(`/journal/${id}/`).then((r) => {
        const entry: JournalEntry = r.data;
        setTitle(entry.title);
        setContent(entry.content);
        setLessonId(entry.lesson);
        setLessonTitle(entry.lesson_title);
        setAiFeedback(entry.ai_feedback);
        setSavedId(entry.id);
        setLoading(false);
      });
    } else {
      const lessonParam = searchParams.get("lesson");
      if (lessonParam) {
        const lid = parseInt(lessonParam, 10);
        setLessonId(lid);
        // Fetch lesson title
        api.get(`/lessons/${lid}/`).then((r) => {
          setLessonTitle(r.data.title);
          if (!title) setTitle(`Reflections on: ${r.data.title}`);
        }).catch(() => {});
      }
    }
  }, [id, isNew, searchParams]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { title, content };
      if (lessonId) payload.lesson = lessonId;

      if (savedId) {
        await api.put(`/journal/${savedId}/`, payload);
      } else {
        const { data } = await api.post("/journal/", payload);
        setSavedId(data.id);
      }
      navigate("/journal");
    } catch {
      setError("Failed to save entry. Please try again.");
    }
    setSaving(false);
  };

  const handleGetFeedback = async () => {
    setError(null);
    const entryId = savedId;
    if (!entryId) {
      // Save first, then get feedback
      if (!title.trim() || !content.trim()) return;
      setSaving(true);
      try {
        const payload: Record<string, unknown> = { title, content };
        if (lessonId) payload.lesson = lessonId;
        const { data } = await api.post("/journal/", payload);
        setSavedId(data.id);
        setSaving(false);
        // Now get feedback
        setLoadingFeedback(true);
        const fbRes = await api.post(`/journal/${data.id}/feedback/`);
        setAiFeedback(fbRes.data.feedback);
      } catch {
        setError("Failed to get AI feedback. Please try again.");
      }
      setSaving(false);
      setLoadingFeedback(false);
      return;
    }

    setLoadingFeedback(true);
    try {
      // Save latest content first
      const payload: Record<string, unknown> = { title, content };
      if (lessonId) payload.lesson = lessonId;
      await api.put(`/journal/${entryId}/`, payload);

      const { data } = await api.post(`/journal/${entryId}/feedback/`);
      setAiFeedback(data.feedback);
    } catch {
      setError("Failed to get AI feedback. Please try again.");
    }
    setLoadingFeedback(false);
  };

  const handleDelete = async () => {
    if (!savedId) return;
    setDeleting(true);
    try {
      await api.delete(`/journal/${savedId}/`);
      navigate("/journal");
    } catch {
      setDeleting(false);
    }
  };

  if (loading) {
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
        to="/journal"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Journal
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {isNew ? "New Journal Entry" : "Edit Journal Entry"}
        </h1>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your entry a title..."
          className="w-full text-lg font-semibold px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent mb-4"
        />

        {/* Lesson link */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-600 mb-1.5 block">
            <BookOpen className="w-4 h-4 inline mr-1" />
            Related Lesson (optional)
          </label>
          <select
            value={lessonId || ""}
            onChange={(e) => {
              const val = e.target.value;
              setLessonId(val ? parseInt(val, 10) : null);
              const selected = lessons.find((l) => l.id === parseInt(val, 10));
              setLessonTitle(selected?.title || null);
            }}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent text-sm"
          >
            <option value="">No lesson selected</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.subject_icon} {lesson.title}
              </option>
            ))}
          </select>
        </div>

        {/* Content area with write/preview toggle */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setShowPreview(false)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                !showPreview
                  ? "bg-primary-100 text-primary-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Write
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                showPreview
                  ? "bg-primary-100 text-primary-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Preview
            </button>
            <span className="text-xs text-gray-400 ml-auto">
              Supports Markdown formatting
            </span>
          </div>

          {showPreview ? (
            <div className="min-h-[300px] p-4 border border-gray-200 rounded-xl bg-gray-50">
              <div className="prose max-w-none">
                <ReactMarkdown>{content || "*Nothing to preview yet...*"}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write about what you learned today... You can use Markdown for formatting!"
              rows={8}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-y font-mono text-sm leading-relaxed"
            />
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !content.trim()}
            className="bg-success-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 transition-all flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saving ? "Saving..." : "Save Entry"}
          </button>

          <button
            onClick={handleGetFeedback}
            disabled={loadingFeedback || !content.trim()}
            className="bg-accent-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-accent-600 transition-all flex items-center gap-2 disabled:opacity-60"
          >
            {loadingFeedback ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            {loadingFeedback ? "Getting Feedback..." : "Get AI Feedback"}
          </button>

          {savedId && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="ml-auto text-red-500 hover:text-red-700 px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      </div>

      {/* AI Feedback section */}
      {(aiFeedback || loadingFeedback) && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border-l-4 border-accent-500">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-accent-500" />
            <h2 className="text-lg font-bold text-gray-900">AI Feedback</h2>
          </div>
          {loadingFeedback ? (
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Reading your entry and thinking...</span>
            </div>
          ) : (
            <div className="prose max-w-none">
              <ReactMarkdown>{aiFeedback}</ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {/* Linked lesson info */}
      {lessonTitle && (
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-primary-500" />
          <div>
            <div className="text-xs text-gray-500">Related Lesson</div>
            <div className="text-sm font-medium text-gray-800">{lessonTitle}</div>
          </div>
          {lessonId && (
            <Link
              to={`/lessons/${lessonId}`}
              className="ml-auto text-sm text-primary-500 hover:text-primary-700 font-medium"
            >
              View Lesson
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
