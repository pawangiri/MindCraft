import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Markdown from "../../components/Markdown";
import api, {
  type Subject,
  type Topic,
  type ResearchSession,
  type KidProfile,
  type PipelineStatus,
} from "../../api/client";
import {
  Search,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  Trash2,
  Eye,
  Pencil,
  Save,
  Send,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Globe,
  Video,
  BookOpen,
} from "lucide-react";
import SubjectPicker from "../../components/SubjectPicker";
import TopicPicker from "../../components/TopicPicker";

const STEPS = [
  "Topic Input",
  "Research Review",
  "Generate Lesson",
  "Multimedia",
  "Review & Publish",
];

const STATUS_STEP_MAP: Record<PipelineStatus, number> = {
  topic_input: 0,
  researching: 0,
  research_complete: 1,
  generating: 2,
  generated: 2,
  enriching: 3,
  ready: 4,
  published: 4,
};

const STATUS_COLORS: Record<PipelineStatus, string> = {
  topic_input: "bg-gray-100 text-gray-600",
  researching: "bg-yellow-100 text-yellow-700",
  research_complete: "bg-blue-100 text-blue-700",
  generating: "bg-yellow-100 text-yellow-700",
  generated: "bg-purple-100 text-purple-700",
  enriching: "bg-yellow-100 text-yellow-700",
  ready: "bg-green-100 text-green-700",
  published: "bg-emerald-100 text-emerald-700",
};

function StepperBar({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex items-center justify-between w-full">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <button
            onClick={() => onStepClick(i)}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                i < currentStep
                  ? "bg-green-500 text-white"
                  : i === currentStep
                    ? "bg-primary-500 text-white ring-4 ring-primary-100"
                    : "bg-gray-200 text-gray-500"
              }`}
            >
              {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`text-xs font-medium hidden md:block ${
                i === currentStep
                  ? "text-primary-600"
                  : i < currentStep
                    ? "text-green-600"
                    : "text-gray-400"
              }`}
            >
              {label}
            </span>
          </button>
          {i < STEPS.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 ${
                i < currentStep ? "bg-green-400" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function MediaTypeBadge({
  type,
}: {
  type: string;
}) {
  const colors: Record<string, string> = {
    youtube: "bg-red-100 text-red-700",
    khan_academy: "bg-green-100 text-green-700",
    interactive: "bg-blue-100 text-blue-700",
    article: "bg-amber-100 text-amber-700",
    other: "bg-gray-100 text-gray-600",
  };
  const labels: Record<string, string> = {
    youtube: "YouTube",
    khan_academy: "Khan Academy",
    interactive: "Interactive",
    article: "Article",
    other: "Other",
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[type] || colors.other}`}
    >
      {labels[type] || type}
    </span>
  );
}

function MediaIcon({ type }: { type: string }) {
  if (type === "youtube") return <Video className="w-4 h-4" />;
  if (type === "khan_academy") return <BookOpen className="w-4 h-4" />;
  return <Globe className="w-4 h-4" />;
}

export default function ResearchPipeline() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionIdParam = searchParams.get("session");

  // Form state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [topicQuery, setTopicQuery] = useState("");
  const [gradeLevel, setGradeLevel] = useState("5");
  const [difficulty, setDifficulty] = useState("medium");

  // Session state
  const [session, setSession] = useState<ResearchSession | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");

  // Loading states
  const [loadingSession, setLoadingSession] = useState(false);
  const [researching, setResearching] = useState(false);
  const [savingFinding, setSavingFinding] = useState(false);
  const [generatingLesson, setGeneratingLesson] = useState(false);
  const [discoveringMedia, setDiscoveringMedia] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Edit states for research review
  const [editSummary, setEditSummary] = useState("");
  const [editFacts, setEditFacts] = useState<string[]>([]);
  const [editParentNotes, setEditParentNotes] = useState("");
  const [summaryEditMode, setSummaryEditMode] = useState(false);

  // Lesson edit states
  const [lessonContent, setLessonContent] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonEditMode, setLessonEditMode] = useState(false);

  // Multimedia
  const [addMediaUrl, setAddMediaUrl] = useState("");
  const [addMediaTitle, setAddMediaTitle] = useState("");
  const [addMediaType, setAddMediaType] = useState("youtube");
  const [showAddMedia, setShowAddMedia] = useState(false);
  const [addingMedia, setAddingMedia] = useState(false);

  // Publish
  const [kids, setKids] = useState<KidProfile[]>([]);
  const [selectedKids, setSelectedKids] = useState<number[]>([]);

  // Previous sessions
  const [previousSessions, setPreviousSessions] = useState<ResearchSession[]>(
    []
  );
  const [showPrevious, setShowPrevious] = useState(false);

  // Load subjects on mount
  useEffect(() => {
    api
      .get("/subjects/")
      .then((r) => setSubjects(r.data.results ?? r.data))
      .catch(() => {});
  }, []);

  // Load topics when subject changes
  useEffect(() => {
    if (subjectId) {
      api.get(`/topics/?subject=${subjectId}`).then((r) => {
        setTopics(r.data.results ?? r.data);
        setTopicId("");
        setTopicQuery("");
      });
    } else {
      setTopics([]);
      setTopicId("");
      setTopicQuery("");
    }
  }, [subjectId]);

  // Load kids for publish step
  useEffect(() => {
    api
      .get("/kids/")
      .then((r) => setKids(r.data.results ?? r.data))
      .catch(() => {});
  }, []);

  const fetchSession = useCallback(
    async (id: number) => {
      setLoadingSession(true);
      setError("");
      try {
        const { data } = await api.get(`/research/${id}/`);
        setSession(data);
        setCurrentStep(STATUS_STEP_MAP[data.status as PipelineStatus] ?? 0);

        // Populate edit states from finding
        if (data.finding) {
          setEditSummary(data.finding.summary);
          setEditFacts(data.finding.key_facts || []);
          setEditParentNotes(data.finding.parent_notes || "");
        }

        // Populate lesson content if available
        if (data.lesson_id) {
          try {
            const lessonRes = await api.get(`/lessons/${data.lesson_id}/`);
            setLessonTitle(lessonRes.data.title);
            setLessonDescription(lessonRes.data.description);
            setLessonContent(lessonRes.data.content || "");
          } catch {
            // Lesson may not be accessible
          }
        }

        // Update URL
        setSearchParams({ session: String(id) }, { replace: true });
      } catch {
        setError("Failed to load session.");
      } finally {
        setLoadingSession(false);
      }
    },
    [setSearchParams]
  );

  // Load session from URL param
  useEffect(() => {
    if (sessionIdParam) {
      fetchSession(Number(sessionIdParam));
    }
  }, [sessionIdParam, fetchSession]);

  // Load previous sessions
  useEffect(() => {
    api
      .get("/research/")
      .then((r) => setPreviousSessions(r.data.results ?? r.data))
      .catch(() => {});
  }, []);

  const handleTopicChange = (id: string) => {
    setTopicId(id);
    const t = topics.find((t) => t.id === Number(id));
    if (t) setTopicQuery(t.name);
  };

  const handleStartResearch = async () => {
    if (!subjectId) {
      setError("Please select a subject.");
      return;
    }
    if (!topicQuery.trim()) {
      setError("Please enter a topic query.");
      return;
    }
    setError("");
    setResearching(true);
    try {
      // Create session
      const { data: newSession } = await api.post("/research/", {
        subject: Number(subjectId),
        topic: topicId ? Number(topicId) : null,
        topic_query: topicQuery.trim(),
        grade_level: Number(gradeLevel),
        difficulty,
      });
      setSession(newSession);
      setSearchParams({ session: String(newSession.id) }, { replace: true });

      // Start research
      const { data: updated } = await api.post(
        `/research/${newSession.id}/research/`
      );
      setSession(updated);
      setCurrentStep(STATUS_STEP_MAP[updated.status as PipelineStatus] ?? 1);
      if (updated.finding) {
        setEditSummary(updated.finding.summary);
        setEditFacts(updated.finding.key_facts || []);
        setEditParentNotes(updated.finding.parent_notes || "");
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : undefined;
      setError(message || "Failed to start research. Please try again.");
    } finally {
      setResearching(false);
    }
  };

  const handleReResearch = async () => {
    if (!session || !confirm("Re-research will overwrite existing findings. Continue?")) return;
    setResearching(true);
    setError("");
    try {
      const { data } = await api.post(`/research/${session.id}/research/`);
      setSession(data);
      if (data.finding) {
        setEditSummary(data.finding.summary);
        setEditFacts(data.finding.key_facts || []);
        setEditParentNotes(data.finding.parent_notes || "");
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : undefined;
      setError(message || "Failed to re-research.");
    } finally {
      setResearching(false);
    }
  };

  const handleSaveFinding = async () => {
    if (!session) return;
    setSavingFinding(true);
    setError("");
    try {
      const { data } = await api.patch(
        `/research/${session.id}/update-finding/`,
        {
          summary: editSummary,
          key_facts: editFacts,
          parent_notes: editParentNotes,
        }
      );
      setSession(data);
      setSummaryEditMode(false);
    } catch {
      setError("Failed to save changes.");
    } finally {
      setSavingFinding(false);
    }
  };

  const handleGenerateLesson = async () => {
    if (!session) return;
    setGeneratingLesson(true);
    setError("");
    try {
      const { data } = await api.post(
        `/research/${session.id}/generate-lesson/`
      );
      setSession(data);
      setCurrentStep(STATUS_STEP_MAP[data.status as PipelineStatus] ?? 2);
      if (data.lesson_id) {
        const lessonRes = await api.get(`/lessons/${data.lesson_id}/`);
        setLessonTitle(lessonRes.data.title);
        setLessonDescription(lessonRes.data.description);
        setLessonContent(lessonRes.data.content || "");
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : undefined;
      setError(message || "Failed to generate lesson.");
    } finally {
      setGeneratingLesson(false);
    }
  };

  const handleDiscoverMedia = async () => {
    if (!session) return;
    setDiscoveringMedia(true);
    setError("");
    try {
      const { data } = await api.post(
        `/research/${session.id}/discover-media/`
      );
      setSession(data);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : undefined;
      setError(message || "Failed to discover media.");
    } finally {
      setDiscoveringMedia(false);
    }
  };

  const handleAddMedia = async () => {
    if (!session || !addMediaUrl.trim() || !addMediaTitle.trim()) return;
    setAddingMedia(true);
    setError("");
    try {
      const { data } = await api.post(
        `/research/${session.id}/add-media/`,
        {
          url: addMediaUrl.trim(),
          title: addMediaTitle.trim(),
          media_type: addMediaType,
        }
      );
      setSession(data);
      setAddMediaUrl("");
      setAddMediaTitle("");
      setAddMediaType("youtube");
      setShowAddMedia(false);
    } catch {
      setError("Failed to add media resource.");
    } finally {
      setAddingMedia(false);
    }
  };

  const handleToggleMedia = async (mediaId: number, included: boolean) => {
    try {
      await api.patch(`/media-resources/${mediaId}/`, {
        is_included: included,
      });
      setSession((prev) =>
        prev
          ? {
              ...prev,
              media_resources: prev.media_resources.map((m) =>
                m.id === mediaId ? { ...m, is_included: included } : m
              ),
            }
          : null
      );
    } catch {
      setError("Failed to update media resource.");
    }
  };

  const handleDeleteMedia = async (mediaId: number) => {
    try {
      await api.delete(`/media-resources/${mediaId}/`);
      setSession((prev) =>
        prev
          ? {
              ...prev,
              media_resources: prev.media_resources.filter(
                (m) => m.id !== mediaId
              ),
            }
          : null
      );
    } catch {
      setError("Failed to delete media resource.");
    }
  };

  const handleMoveMedia = async (
    mediaId: number,
    direction: "up" | "down"
  ) => {
    if (!session) return;
    const resources = [...session.media_resources].sort(
      (a, b) => a.order - b.order
    );
    const idx = resources.findIndex((m) => m.id === mediaId);
    if (
      (direction === "up" && idx === 0) ||
      (direction === "down" && idx === resources.length - 1)
    )
      return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const newOrder = resources[swapIdx].order;
    const swapOrder = resources[idx].order;

    try {
      await Promise.all([
        api.patch(`/media-resources/${resources[idx].id}/`, {
          order: newOrder,
        }),
        api.patch(`/media-resources/${resources[swapIdx].id}/`, {
          order: swapOrder,
        }),
      ]);
      setSession((prev) =>
        prev
          ? {
              ...prev,
              media_resources: prev.media_resources
                .map((m) => {
                  if (m.id === resources[idx].id)
                    return { ...m, order: newOrder };
                  if (m.id === resources[swapIdx].id)
                    return { ...m, order: swapOrder };
                  return m;
                })
                .sort((a, b) => a.order - b.order),
            }
          : null
      );
    } catch {
      setError("Failed to reorder media.");
    }
  };

  const handlePublish = async () => {
    if (!session) return;
    setPublishing(true);
    setError("");
    try {
      const { data } = await api.post(`/research/${session.id}/publish/`, {
        kid_ids: selectedKids,
      });
      setSession(data);
      setCurrentStep(4);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : undefined;
      setError(message || "Failed to publish.");
    } finally {
      setPublishing(false);
    }
  };

  const handleStepClick = (step: number) => {
    if (!session) return;
    const sessionStep = STATUS_STEP_MAP[session.status as PipelineStatus] ?? 0;
    // Allow navigating to completed steps or current step
    if (step <= sessionStep) {
      setCurrentStep(step);
    }
  };

  const handleResumeSession = (id: number) => {
    setSearchParams({ session: String(id) });
  };

  const handleNewSession = () => {
    setSession(null);
    setCurrentStep(0);
    setError("");
    setSearchParams({});
    setSubjectId("");
    setTopicId("");
    setTopicQuery("");
    setGradeLevel("5");
    setDifficulty("medium");
    setLessonContent("");
    setLessonTitle("");
    setLessonDescription("");
    setEditSummary("");
    setEditFacts([]);
    setEditParentNotes("");
    setSelectedKids([]);
  };

  const extractYouTubeId = (url: string): string | null => {
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  };

  if (loadingSession) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        <span className="ml-3 text-gray-500">Loading session...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Research Lab
          </h1>
          <p className="text-gray-500 mt-1">
            Research topics and create enriched lessons with AI.
          </p>
        </div>
        {session && (
          <button
            onClick={handleNewSession}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Session
          </button>
        )}
      </div>

      {/* Stepper */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <StepperBar currentStep={currentStep} onStepClick={handleStepClick} />
      </div>

      {/* Error display */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Step Content */}
      {currentStep === 0 && renderTopicInput()}
      {currentStep === 1 && renderResearchReview()}
      {currentStep === 2 && renderGenerateLesson()}
      {currentStep === 3 && renderMultimedia()}
      {currentStep === 4 && renderReviewPublish()}

      {/* Previous Sessions */}
      {renderPreviousSessions()}
    </div>
  );

  // ─── Step 1: Topic Input ───────────────────────────────────────────
  function renderTopicInput() {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">Research Topic</h2>
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

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Topic Query
            </label>
            <input
              type="text"
              value={topicQuery}
              onChange={(e) => setTopicQuery(e.target.value)}
              placeholder="e.g., Photosynthesis process in plants"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Auto-filled from topic selection, or type your own query.
            </p>
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

        <button
          onClick={handleStartResearch}
          disabled={researching || !subjectId || !topicQuery.trim()}
          className="mt-6 bg-primary-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-primary-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {researching ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Researching
              topic...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" /> Start Research
            </>
          )}
        </button>
      </div>
    );
  }

  // ─── Step 2: Research Review ───────────────────────────────────────
  function renderResearchReview() {
    if (!session?.finding) {
      return (
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-gray-500">
          No research findings yet. Go back to start research.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Research Summary</h2>
            <button
              onClick={() => setSummaryEditMode(!summaryEditMode)}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1.5 transition-colors"
            >
              {summaryEditMode ? (
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

          {summaryEditMode ? (
            <textarea
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              rows={10}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
            />
          ) : (
            <div className="prose max-w-none text-sm">
              <Markdown>{editSummary}</Markdown>
            </div>
          )}
        </div>

        {/* Key Facts */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-md font-bold mb-3">Key Facts</h3>
          <div className="space-y-2">
            {editFacts.map((fact, i) => (
              <div key={i} className="flex items-start gap-2">
                <input
                  type="text"
                  value={fact}
                  onChange={(e) => {
                    const updated = [...editFacts];
                    updated[i] = e.target.value;
                    setEditFacts(updated);
                  }}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={() =>
                    setEditFacts(editFacts.filter((_, j) => j !== i))
                  }
                  className="p-2 text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setEditFacts([...editFacts, ""])}
            className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Fact
          </button>
        </div>

        {/* Citations */}
        {session.finding.citations && session.finding.citations.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-md font-bold mb-3">Citations</h3>
            <div className="space-y-2">
              {session.finding.citations.map((c, i) => (
                <a
                  key={i}
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
                >
                  <ExternalLink className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-primary-600 group-hover:text-primary-700">
                      {c.title}
                    </div>
                    {c.snippet && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {c.snippet}
                      </div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Parent Notes */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-md font-bold mb-3">Parent Notes</h3>
          <textarea
            value={editParentNotes}
            onChange={(e) => setEditParentNotes(e.target.value)}
            rows={3}
            placeholder="Add notes for this research (optional)..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={handleSaveFinding}
            disabled={savingFinding}
            className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {savingFinding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {savingFinding ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={handleReResearch}
            disabled={researching}
            className="bg-amber-50 text-amber-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-amber-100 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {researching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {researching ? "Researching..." : "Re-Research"}
          </button>
          <button
            onClick={() => setCurrentStep(2)}
            className="bg-primary-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-600 transition-all flex items-center gap-2 ml-auto"
          >
            Next: Generate Lesson <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 3: Generate Lesson ───────────────────────────────────────
  function renderGenerateLesson() {
    return (
      <div className="space-y-6">
        {/* Research context card */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">Generate Lesson</h2>
          {session && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500">Topic</div>
                <div className="text-sm font-semibold mt-0.5">
                  {session.topic_query}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500">Grade</div>
                <div className="text-sm font-semibold mt-0.5">
                  Grade {session.grade_level}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500">Difficulty</div>
                <div className="text-sm font-semibold mt-0.5 capitalize">
                  {session.difficulty}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500">Facts</div>
                <div className="text-sm font-semibold mt-0.5">
                  {session.finding?.key_facts?.length || 0} facts
                </div>
              </div>
            </div>
          )}

          {!session?.lesson_id && (
            <button
              onClick={handleGenerateLesson}
              disabled={generatingLesson}
              className="bg-accent-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-accent-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingLesson ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Generating
                  lesson...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" /> Generate Lesson
                </>
              )}
            </button>
          )}
        </div>

        {/* Lesson preview/edit */}
        {session?.lesson_id && lessonContent && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Generated Lesson</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLessonEditMode(!lessonEditMode)}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1.5 transition-colors"
                >
                  {lessonEditMode ? (
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
            </div>

            {lessonEditMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={lessonDescription}
                    onChange={(e) => setLessonDescription(e.target.value)}
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content (Markdown)
                  </label>
                  <textarea
                    value={lessonContent}
                    onChange={(e) => setLessonContent(e.target.value)}
                    rows={20}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                  />
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {lessonTitle}
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  {lessonDescription}
                </p>
                <div className="prose max-w-none">
                  <Markdown>{lessonContent}</Markdown>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={handleGenerateLesson}
                disabled={generatingLesson}
                className="bg-amber-50 text-amber-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-amber-100 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {generatingLesson ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {generatingLesson ? "Regenerating..." : "Regenerate"}
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="bg-primary-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-600 transition-all flex items-center gap-2 ml-auto"
              >
                Next: Multimedia <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Step 4: Multimedia ────────────────────────────────────────────
  function renderMultimedia() {
    const media = session?.media_resources
      ? [...session.media_resources].sort((a, b) => a.order - b.order)
      : [];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Multimedia Resources</h2>
            <button
              onClick={handleDiscoverMedia}
              disabled={discoveringMedia}
              className="bg-primary-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-600 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {discoveringMedia ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Discovering...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Auto-Discover Resources
                </>
              )}
            </button>
          </div>

          {media.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No media resources yet. Click "Auto-Discover" or add manually
              below.
            </div>
          ) : (
            <div className="space-y-3">
              {media.map((m, idx) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                    m.is_included
                      ? "border-primary-200 bg-primary-50/30"
                      : "border-gray-200 bg-gray-50/50 opacity-60"
                  }`}
                >
                  {/* Thumbnail / icon */}
                  <div className="w-20 h-14 bg-gray-200 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                    {m.thumbnail_url ? (
                      <img
                        src={m.thumbnail_url}
                        alt={m.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <MediaIcon type={m.media_type} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MediaTypeBadge type={m.media_type} />
                      {m.source === "manual" && (
                        <span className="text-xs text-gray-400">Manual</span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {m.title}
                    </div>
                    {m.description && (
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {m.description}
                      </div>
                    )}
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary-500 hover:text-primary-600 mt-1 inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Open
                    </a>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMoveMedia(m.id, "up")}
                      disabled={idx === 0}
                      className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveMedia(m.id, "down")}
                      disabled={idx === media.length - 1}
                      className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer mx-2">
                      <input
                        type="checkbox"
                        checked={m.is_included}
                        onChange={(e) =>
                          handleToggleMedia(m.id, e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                    <button
                      onClick={() => handleDeleteMedia(m.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add media form */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            {showAddMedia ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={addMediaUrl}
                    onChange={(e) => setAddMediaUrl(e.target.value)}
                    placeholder="URL"
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={addMediaTitle}
                    onChange={(e) => setAddMediaTitle(e.target.value)}
                    placeholder="Title"
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <select
                    value={addMediaType}
                    onChange={(e) => setAddMediaType(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="khan_academy">Khan Academy</option>
                    <option value="article">Article</option>
                    <option value="interactive">Interactive</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddMedia}
                    disabled={
                      addingMedia ||
                      !addMediaUrl.trim() ||
                      !addMediaTitle.trim()
                    }
                    className="bg-primary-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-600 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {addingMedia ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddMedia(false)}
                    className="text-gray-500 hover:text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddMedia(true)}
                className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Resource Manually
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep(2)}
            className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button
            onClick={() => setCurrentStep(4)}
            className="bg-primary-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-600 transition-all flex items-center gap-2"
          >
            Next: Review <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 5: Review & Publish ──────────────────────────────────────
  function renderReviewPublish() {
    const includedMedia = session?.media_resources
      ? session.media_resources
          .filter((m) => m.is_included)
          .sort((a, b) => a.order - b.order)
      : [];

    const isPublished = session?.status === "published";

    return (
      <div className="space-y-6">
        {/* Lesson preview */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">Lesson Preview</h2>
          {lessonContent ? (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {lessonTitle}
              </h3>
              <p className="text-gray-500 text-sm mb-4">{lessonDescription}</p>
              <div className="prose max-w-none">
                <Markdown>{lessonContent}</Markdown>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No lesson generated yet.
            </div>
          )}
        </div>

        {/* Media resources */}
        {includedMedia.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">Media Resources</h2>
            <div className="space-y-4">
              {includedMedia.map((m) => {
                const ytId = extractYouTubeId(m.url);
                if (m.media_type === "youtube" && ytId) {
                  return (
                    <div key={m.id} className="space-y-2">
                      <div className="text-sm font-semibold">{m.title}</div>
                      <div className="aspect-video rounded-xl overflow-hidden bg-black">
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}`}
                          title={m.title}
                          allowFullScreen
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                  );
                }
                return (
                  <a
                    key={m.id}
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <MediaIcon type={m.media_type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold group-hover:text-primary-600 transition-colors">
                        {m.title}
                      </div>
                      {m.description && (
                        <div className="text-xs text-gray-500 truncate">
                          {m.description}
                        </div>
                      )}
                    </div>
                    <MediaTypeBadge type={m.media_type} />
                    <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Citations */}
        {session?.finding?.citations && session.finding.citations.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-3">Citations</h2>
            <div className="space-y-2">
              {session.finding.citations.map((c, i) => (
                <a
                  key={i}
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  {c.title}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Assign & Publish */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          {isPublished && (
            <div className="bg-emerald-50 rounded-xl p-4 mb-4 flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <span className="text-sm font-semibold text-emerald-800">
                  Published
                </span>
                <span className="text-sm text-emerald-600 ml-1">
                  — You can update assignments or republish changes below.
                </span>
              </div>
            </div>
          )}
          <h2 className="text-lg font-bold mb-4">Assign to Kids</h2>
          {kids.length > 0 ? (
            <div className="space-y-2 mb-6">
              {kids.map((kid) => (
                <label
                  key={kid.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedKids.includes(kid.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedKids([...selectedKids, kid.id]);
                      } else {
                        setSelectedKids(
                          selectedKids.filter((id) => id !== kid.id)
                        );
                      }
                    }}
                    className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                  />
                  <span className="text-xl">{kid.avatar || "👤"}</span>
                  <div>
                    <div className="text-sm font-semibold">
                      {kid.display_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      Grade {kid.grade_level}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-4">
              No kid profiles found. The lesson will be published without
              assignment.
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              to="/admin/review"
              className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center gap-2 text-center justify-center"
            >
              <Save className="w-4 h-4" /> Save as Draft
            </Link>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="bg-success-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Publishing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />{" "}
                  {isPublished ? "Republish" : "Publish"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Previous Sessions ─────────────────────────────────────────────
  function renderPreviousSessions() {
    return (
      <div className="bg-white rounded-2xl shadow-sm">
        <button
          onClick={() => setShowPrevious(!showPrevious)}
          className="w-full flex items-center justify-between p-6"
        >
          <h2 className="text-lg font-bold">Previous Sessions</h2>
          {showPrevious ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {showPrevious && (
          <div className="px-6 pb-6">
            {previousSessions.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm">
                No previous sessions.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {previousSessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleResumeSession(s.id)}
                    className={`text-left p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all ${
                      session?.id === s.id
                        ? "border-primary-400 bg-primary-50/50"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{s.subject_icon}</span>
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {s.topic_query}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          STATUS_COLORS[s.status as PipelineStatus] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {s.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-gray-400">
                        Grade {s.grade_level}
                      </span>
                      <span className="text-xs text-gray-400">
                        {s.subject_name}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(s.created_at).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}
