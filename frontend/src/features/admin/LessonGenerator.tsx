import { useEffect, useState } from "react";
import Markdown from "../../components/Markdown";
import api, { type Subject, type Topic } from "../../api/client";
import {
  Sparkles, Eye, Pencil, Save, Send, ArrowLeft, Loader2,
} from "lucide-react";
import SubjectPicker from "../../components/SubjectPicker";
import TopicPicker from "../../components/TopicPicker";
import { Link, useNavigate } from "react-router-dom";

interface GeneratedLesson {
  lesson_id?: number;
  title: string;
  description: string;
  content: string;
  estimated_minutes: number;
}

export default function LessonGenerator() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [topicName, setTopicName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("5");
  const [difficulty, setDifficulty] = useState("medium");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState<GeneratedLesson | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editContent, setEditContent] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/subjects/").then((r) => setSubjects(r.data.results ?? r.data));
  }, []);

  useEffect(() => {
    if (subjectId) {
      api.get(`/topics/?subject=${subjectId}`).then((r) => {
        setTopics(r.data.results ?? r.data);
        setTopicId("");
        setTopicName("");
      });
    } else {
      setTopics([]);
      setTopicId("");
      setTopicName("");
    }
  }, [subjectId]);

  const handleTopicChange = (id: string) => {
    setTopicId(id);
    const t = topics.find((t) => t.id === Number(id));
    setTopicName(t?.name || "");
  };

  const handleGenerate = async () => {
    if (!topicId || !topicName) {
      setError("Please select a subject and topic.");
      return;
    }
    setError("");
    setGenerating(true);
    setGenerated(null);
    try {
      const { data } = await api.post("/admin/lessons/generate/", {
        topic: topicName,
        topic_id: Number(topicId),
        grade_level: Number(gradeLevel),
        difficulty,
      });
      setGenerated(data);
      setEditTitle(data.title);
      setEditDescription(data.description);
      setEditContent(data.content);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(message || "Failed to generate lesson. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (publish: boolean) => {
    if (!generated?.lesson_id) return;
    setSaving(true);
    setError("");
    try {
      await api.patch(`/lessons/${generated.lesson_id}/`, {
        title: editTitle,
        description: editDescription,
        content: editContent,
        status: publish ? "published" : "draft",
      });
      if (publish) {
        await api.post(`/lessons/${generated.lesson_id}/publish/`);
      }
      navigate("/admin/review");
    } catch {
      setError("Failed to save lesson.");
    } finally {
      setSaving(false);
    }
  };

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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">AI Lesson Generator</h1>
          <p className="text-gray-500 mt-1">
            Generate educational lessons powered by AI.
          </p>
        </div>
      </div>

      {/* Configuration form */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">Lesson Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <SubjectPicker
              subjects={subjects}
              value={subjectId}
              onChange={setSubjectId}
              onSubjectsChange={() => api.get("/subjects/").then((r) => setSubjects(r.data.results ?? r.data))}
              onTopicsChange={() => { if (subjectId) api.get(`/topics/?subject=${subjectId}`).then((r) => setTopics(r.data.results ?? r.data)); }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic
            </label>
            <TopicPicker
              topics={topics}
              value={topicId}
              onChange={handleTopicChange}
              onTopicsChange={() => { if (subjectId) api.get(`/topics/?subject=${subjectId}`).then((r) => setTopics(r.data.results ?? r.data)); }}
              subjectId={subjectId}
              disabled={!subjectId}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grade Level
            </label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating || !topicId}
          className="mt-6 bg-accent-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-accent-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" /> Generate with AI
            </>
          )}
        </button>
      </div>

      {/* Generated preview */}
      {generated && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Generated Lesson</h2>
            <button
              onClick={() => setEditMode(!editMode)}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1.5 transition-colors"
            >
              {editMode ? (
                <>
                  <Eye className="w-4 h-4" /> Preview
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4" /> Edit
                </>
              )}
            </button>
          </div>

          {editMode ? (
            <div className="space-y-4">
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
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content (Markdown)
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={20}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                />
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {editTitle}
              </h3>
              <p className="text-gray-500 text-sm mb-4">{editDescription}</p>
              <div className="prose max-w-none">
                <Markdown>{editContent}</Markdown>
              </div>
            </div>
          )}

          {/* Save actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save as Draft"}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="bg-success-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {saving ? "Publishing..." : "Publish Now"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
