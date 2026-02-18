import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import api from "../../api/client";
import type {
  CurriculumPlan,
  CurriculumOutline,
  CurriculumStatus,
  KidProfile,
} from "../../api/client";
import { cn } from "../../utils/cn";
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Edit3,
  Eye,
  RotateCcw,
  Users,
  ArrowLeft,
  ArrowRight,
  Trash2,
  RefreshCw,
  Send,
} from "lucide-react";

const STEPS = [
  { label: "Setup", icon: GraduationCap },
  { label: "Outline", icon: BookOpen },
  { label: "Lessons", icon: Sparkles },
  { label: "Publish", icon: Send },
];

const STATUS_STEP_MAP: Record<CurriculumStatus, number> = {
  planning: 0,
  outline_ready: 1,
  generating: 2,
  complete: 2,
  published: 3,
};

const STATUS_COLORS: Record<CurriculumStatus, string> = {
  planning: "bg-gray-100 text-gray-600",
  outline_ready: "bg-blue-100 text-blue-700",
  generating: "bg-yellow-100 text-yellow-700",
  complete: "bg-purple-100 text-purple-700",
  published: "bg-emerald-100 text-emerald-700",
};

function StepperBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between w-full">
      {STEPS.map(({ label, icon: Icon }, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                i < currentStep
                  ? "bg-green-500 text-white"
                  : i === currentStep
                    ? "bg-accent-500 text-white ring-4 ring-accent-100"
                    : "bg-gray-200 text-gray-400"
              )}
            >
              {i < currentStep ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
            </div>
            <span
              className={cn(
                "text-xs font-medium hidden md:block",
                i === currentStep
                  ? "text-accent-600"
                  : i < currentStep
                    ? "text-green-600"
                    : "text-gray-400"
              )}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "flex-1 h-0.5 mx-2",
                i < currentStep ? "bg-green-400" : "bg-gray-200"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function CurriculumPlanner() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Core state
  const [plan, setPlan] = useState<CurriculumPlan | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");

  // Step 0: Form state
  const [concept, setConcept] = useState("");
  const [gradeLevel, setGradeLevel] = useState("5");
  const [difficulty, setDifficulty] = useState("medium");
  const [durationWeeks, setDurationWeeks] = useState("2");
  const [lessonsPerWeek, setLessonsPerWeek] = useState("2");

  // Loading states
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [generatingLessons, setGeneratingLessons] = useState(false);
  const [generatingSingleLesson, setGeneratingSingleLesson] = useState<
    string | null
  >(null);
  const [publishing, setPublishing] = useState(false);

  // Step 1: Outline editing
  const [editingOutline, setEditingOutline] = useState(false);
  const [editableOutline, setEditableOutline] =
    useState<CurriculumOutline | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());

  // Step 2: Lesson preview
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);

  // Step 3: Publish
  const [kids, setKids] = useState<KidProfile[]>([]);
  const [selectedKids, setSelectedKids] = useState<number[]>([]);

  // Previous plans list
  const [previousPlans, setPreviousPlans] = useState<CurriculumPlan[]>([]);
  const [showPrevious, setShowPrevious] = useState(false);

  // Load previous plans and kids on mount
  useEffect(() => {
    api
      .get("/curriculum/")
      .then((r) => setPreviousPlans(r.data.results ?? r.data))
      .catch(() => {});
    api
      .get("/kids/")
      .then((r) => setKids(r.data.results ?? r.data))
      .catch(() => {});
  }, []);

  // Load plan from URL param
  const planIdParam = searchParams.get("plan");

  const fetchPlan = useCallback(
    async (id: number) => {
      try {
        const { data } = await api.get(`/curriculum/${id}/`);
        setPlan(data);
        setEditableOutline(data.outline);
        setCurrentStep(STATUS_STEP_MAP[data.status as CurriculumStatus] ?? 0);
        if (data.outline?.weeks) {
          setExpandedWeeks(
            new Set(
              data.outline.weeks.map(
                (w: { week_number: number }) => w.week_number
              )
            )
          );
        }
      } catch {
        setError("Failed to load plan");
      }
    },
    []
  );

  useEffect(() => {
    if (planIdParam) fetchPlan(Number(planIdParam));
  }, [planIdParam, fetchPlan]);

  // ─── API Handlers ─────────────────────────────────────────────────

  const handleGenerateOutline = async () => {
    if (!concept.trim()) {
      setError("Please enter a concept or topic.");
      return;
    }
    setError("");
    setGeneratingOutline(true);
    try {
      const { data: newPlan } = await api.post("/curriculum/", {
        concept: concept.trim(),
        grade_level: Number(gradeLevel),
        difficulty,
        duration_weeks: Number(durationWeeks),
        lessons_per_week: Number(lessonsPerWeek),
      });
      setSearchParams({ plan: String(newPlan.id) }, { replace: true });
      const { data: updated } = await api.post(
        `/curriculum/${newPlan.id}/generate-outline/`
      );
      setPlan(updated);
      setEditableOutline(updated.outline);
      setCurrentStep(1);
      if (updated.outline?.weeks) {
        setExpandedWeeks(
          new Set(
            updated.outline.weeks.map(
              (w: { week_number: number }) => w.week_number
            )
          )
        );
      }
      // Refresh previous plans
      api
        .get("/curriculum/")
        .then((r) => setPreviousPlans(r.data.results ?? r.data))
        .catch(() => {});
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : undefined;
      setError(message || "Failed to generate outline");
    } finally {
      setGeneratingOutline(false);
    }
  };

  const handleRegenerateOutline = async () => {
    if (!plan) return;
    setGeneratingOutline(true);
    setError("");
    try {
      const { data: updated } = await api.post(
        `/curriculum/${plan.id}/generate-outline/`
      );
      setPlan(updated);
      setEditableOutline(updated.outline);
      if (updated.outline?.weeks) {
        setExpandedWeeks(
          new Set(
            updated.outline.weeks.map(
              (w: { week_number: number }) => w.week_number
            )
          )
        );
      }
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : undefined;
      setError(message || "Failed to regenerate outline");
    } finally {
      setGeneratingOutline(false);
    }
  };

  const handleSaveOutline = async () => {
    if (!plan || !editableOutline) return;
    setError("");
    try {
      const { data: updated } = await api.patch(
        `/curriculum/${plan.id}/update-outline/`,
        {
          outline: editableOutline,
          title: editableOutline.title,
          description: editableOutline.description,
        }
      );
      setPlan(updated);
      setEditingOutline(false);
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : undefined;
      setError(message || "Failed to save outline");
    }
  };

  const handleGenerateLessons = async () => {
    if (!plan) return;
    setError("");
    setGeneratingLessons(true);
    try {
      const { data: updated } = await api.post(
        `/curriculum/${plan.id}/generate-lessons/`
      );
      setPlan(updated);
      setCurrentStep(2);
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : undefined;
      setError(message || "Failed to generate lessons");
    } finally {
      setGeneratingLessons(false);
    }
  };

  const handleGenerateSingleLesson = async (
    weekNumber: number,
    lessonIndex: number
  ) => {
    if (!plan) return;
    const key = `${weekNumber}-${lessonIndex}`;
    setGeneratingSingleLesson(key);
    setError("");
    try {
      const { data: updated } = await api.post(
        `/curriculum/${plan.id}/generate-single-lesson/`,
        { week_number: weekNumber, lesson_index: lessonIndex }
      );
      setPlan(updated);
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : undefined;
      setError(message || "Failed to generate lesson");
    } finally {
      setGeneratingSingleLesson(null);
    }
  };

  const handlePublish = async () => {
    if (!plan) return;
    setPublishing(true);
    setError("");
    try {
      const { data: updated } = await api.post(
        `/curriculum/${plan.id}/publish/`,
        { kid_ids: selectedKids }
      );
      setPlan(updated);
      setCurrentStep(3);
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : undefined;
      setError(message || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const handleDeletePlan = async (id: number) => {
    try {
      await api.delete(`/curriculum/${id}/`);
      setPreviousPlans((prev) => prev.filter((p) => p.id !== id));
      if (plan?.id === id) {
        setPlan(null);
        setCurrentStep(0);
        setSearchParams({});
      }
    } catch {
      setError("Failed to delete plan");
    }
  };

  const handleResumePlan = (id: number) => {
    setSearchParams({ plan: String(id) });
  };

  const handleNewPlan = () => {
    setPlan(null);
    setCurrentStep(0);
    setError("");
    setSearchParams({});
    setConcept("");
    setGradeLevel("5");
    setDifficulty("medium");
    setDurationWeeks("2");
    setLessonsPerWeek("2");
    setEditableOutline(null);
    setEditingOutline(false);
    setExpandedWeeks(new Set());
    setExpandedLesson(null);
    setSelectedKids([]);
  };

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNumber)) {
        next.delete(weekNumber);
      } else {
        next.add(weekNumber);
      }
      return next;
    });
  };

  const toggleLessonExpand = (key: string) => {
    setExpandedLesson((prev) => (prev === key ? null : key));
  };

  // Helper to find a curriculum lesson by week and order
  const findCurriculumLesson = (weekNumber: number, order: number) => {
    return plan?.curriculum_lessons?.find(
      (cl) => cl.week_number === weekNumber && cl.order === order
    );
  };

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gradient-to-br from-accent-400 to-primary-500 rounded-xl flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1
            className="text-2xl md:text-3xl font-bold text-gray-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Curriculum Planner
          </h1>
          <p className="text-gray-500 mt-1">
            Design multi-week AI-powered learning plans on any topic.
          </p>
        </div>
        {plan && (
          <button
            onClick={handleNewPlan}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-4 h-4" /> New Plan
          </button>
        )}
      </div>

      {/* Stepper */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <StepperBar currentStep={currentStep} />
      </div>

      {/* Error display */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Step Content */}
      {currentStep === 0 && renderSetup()}
      {currentStep === 1 && renderOutlineReview()}
      {currentStep === 2 && renderGenerateLessons()}
      {currentStep === 3 && renderReviewPublish()}

      {/* Previous Plans */}
      {renderPreviousPlans()}
    </div>
  );

  // ─── Step 0: Setup ──────────────────────────────────────────────

  function renderSetup() {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap className="w-5 h-5 text-accent-500" />
          <h2
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Create a Curriculum
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Enter any topic and let AI design a multi-week learning plan.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Concept or Topic
            </label>
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="e.g., The Solar System, Introduction to Fractions, Ancient Egypt"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (Weeks)
            </label>
            <select
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {[1, 2, 3, 4, 5].map((w) => (
                <option key={w} value={w}>
                  {w} {w === 1 ? "week" : "weeks"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lessons per Week
            </label>
            <select
              value={lessonsPerWeek}
              onChange={(e) => setLessonsPerWeek(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {[1, 2, 3].map((l) => (
                <option key={l} value={l}>
                  {l} {l === 1 ? "lesson" : "lessons"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerateOutline}
          disabled={generatingOutline || !concept.trim()}
          className="mt-6 bg-accent-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-accent-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generatingOutline ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Generating
              outline...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" /> Generate Outline
            </>
          )}
        </button>
      </div>
    );
  }

  // ─── Step 1: Outline Review ─────────────────────────────────────

  function renderOutlineReview() {
    if (!plan || !editableOutline) {
      return (
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-gray-500">
          No outline available. Go back to setup.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Outline header */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {editableOutline.subject_icon || "📚"}
              </span>
              <div>
                {editingOutline ? (
                  <input
                    type="text"
                    value={editableOutline.title}
                    onChange={(e) =>
                      setEditableOutline({
                        ...editableOutline,
                        title: e.target.value,
                      })
                    }
                    className="text-lg font-bold border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <h2
                    className="text-lg font-bold text-gray-900"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {editableOutline.title}
                  </h2>
                )}
                {editingOutline ? (
                  <textarea
                    value={editableOutline.description}
                    onChange={(e) =>
                      setEditableOutline({
                        ...editableOutline,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                ) : (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {editableOutline.description}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditingOutline(!editingOutline)}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1.5 transition-colors"
            >
              {editingOutline ? (
                <>
                  <Eye className="w-4 h-4" /> Preview
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" /> Edit
                </>
              )}
            </button>
          </div>

          {/* Plan summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500">Grade</div>
              <div className="text-sm font-semibold mt-0.5">
                Grade {plan.grade_level}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500">Difficulty</div>
              <div className="text-sm font-semibold mt-0.5 capitalize">
                {plan.difficulty}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500">Duration</div>
              <div className="text-sm font-semibold mt-0.5">
                {plan.duration_weeks}{" "}
                {plan.duration_weeks === 1 ? "week" : "weeks"}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500">Total Lessons</div>
              <div className="text-sm font-semibold mt-0.5">
                {plan.total_lessons}
              </div>
            </div>
          </div>
        </div>

        {/* Week cards */}
        {editableOutline.weeks.map((week) => (
          <div
            key={week.week_number}
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <button
              onClick={() => toggleWeek(week.week_number)}
              className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent-100 text-accent-700 rounded-lg flex items-center justify-center text-sm font-bold">
                  {week.week_number}
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-bold text-gray-900">
                    {week.title}
                  </h3>
                  <p className="text-xs text-gray-500">{week.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {week.lessons.length}{" "}
                  {week.lessons.length === 1 ? "lesson" : "lessons"}
                </span>
                {expandedWeeks.has(week.week_number) ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>

            {expandedWeeks.has(week.week_number) && (
              <div className="px-6 pb-6 space-y-4">
                {week.lessons.map((lesson, lessonIdx) => (
                  <div
                    key={lessonIdx}
                    className="border border-gray-100 rounded-xl p-4"
                  >
                    {editingOutline ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Title
                          </label>
                          <input
                            type="text"
                            value={lesson.title}
                            onChange={(e) => {
                              const updated = { ...editableOutline };
                              const weekIdx = updated.weeks.findIndex(
                                (w) => w.week_number === week.week_number
                              );
                              updated.weeks[weekIdx].lessons[lessonIdx].title =
                                e.target.value;
                              setEditableOutline({ ...updated });
                            }}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Description
                          </label>
                          <textarea
                            value={lesson.description}
                            onChange={(e) => {
                              const updated = { ...editableOutline };
                              const weekIdx = updated.weeks.findIndex(
                                (w) => w.week_number === week.week_number
                              );
                              updated.weeks[weekIdx].lessons[
                                lessonIdx
                              ].description = e.target.value;
                              setEditableOutline({ ...updated });
                            }}
                            rows={2}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Learning Objectives
                          </label>
                          {lesson.learning_objectives.map((obj, objIdx) => (
                            <div
                              key={objIdx}
                              className="flex items-center gap-2 mb-2"
                            >
                              <input
                                type="text"
                                value={obj}
                                onChange={(e) => {
                                  const updated = { ...editableOutline };
                                  const weekIdx = updated.weeks.findIndex(
                                    (w) => w.week_number === week.week_number
                                  );
                                  updated.weeks[weekIdx].lessons[
                                    lessonIdx
                                  ].learning_objectives[objIdx] =
                                    e.target.value;
                                  setEditableOutline({ ...updated });
                                }}
                                className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                              <button
                                onClick={() => {
                                  const updated = { ...editableOutline };
                                  const weekIdx = updated.weeks.findIndex(
                                    (w) => w.week_number === week.week_number
                                  );
                                  updated.weeks[weekIdx].lessons[
                                    lessonIdx
                                  ].learning_objectives = lesson.learning_objectives.filter(
                                    (_, j) => j !== objIdx
                                  );
                                  setEditableOutline({ ...updated });
                                }}
                                className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const updated = { ...editableOutline };
                              const weekIdx = updated.weeks.findIndex(
                                (w) => w.week_number === week.week_number
                              );
                              updated.weeks[weekIdx].lessons[
                                lessonIdx
                              ].learning_objectives = [
                                ...lesson.learning_objectives,
                                "",
                              ];
                              setEditableOutline({ ...updated });
                            }}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                          >
                            + Add objective
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">
                              {lesson.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {lesson.description}
                            </p>
                          </div>
                          {lesson.estimated_minutes > 0 && (
                            <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                              <Clock className="w-3.5 h-3.5" />
                              {lesson.estimated_minutes} min
                            </div>
                          )}
                        </div>
                        {lesson.learning_objectives.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {lesson.learning_objectives.map((obj, i) => (
                              <li
                                key={i}
                                className="text-xs text-gray-600 flex items-start gap-1.5"
                              >
                                <ChevronRight className="w-3 h-3 text-accent-400 mt-0.5 shrink-0" />
                                {obj}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => setCurrentStep(0)}
            className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {editingOutline && (
            <button
              onClick={handleSaveOutline}
              className="bg-primary-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-600 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Outline Changes
            </button>
          )}

          <button
            onClick={handleRegenerateOutline}
            disabled={generatingOutline}
            className="bg-amber-50 text-amber-700 px-4 py-2.5 rounded-xl font-medium hover:bg-amber-100 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {generatingOutline ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            {generatingOutline ? "Regenerating..." : "Regenerate Outline"}
          </button>

          <button
            onClick={() => {
              setCurrentStep(2);
            }}
            className="bg-accent-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-accent-600 transition-all flex items-center gap-2 sm:ml-auto"
          >
            Generate Lessons <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 2: Generate Lessons ───────────────────────────────────

  function renderGenerateLessons() {
    if (!plan || !plan.outline) {
      return (
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-gray-500">
          No plan loaded. Go back to setup.
        </div>
      );
    }

    const totalLessons = plan.total_lessons || 0;
    const generatedCount = plan.generated_lessons || 0;
    const progressPercent =
      totalLessons > 0 ? Math.round((generatedCount / totalLessons) * 100) : 0;
    const allGenerated = generatedCount >= totalLessons && totalLessons > 0;

    return (
      <div className="space-y-6">
        {/* Progress card */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-bold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Generate Lessons
            </h2>
            <span className="text-sm text-gray-500">
              {generatedCount} / {totalLessons} lessons generated
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-3 mb-4">
            <div
              className={cn(
                "h-3 rounded-full transition-all duration-500",
                allGenerated ? "bg-green-500" : "bg-accent-500"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {!allGenerated && (
            <button
              onClick={handleGenerateLessons}
              disabled={generatingLessons}
              className="bg-accent-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-accent-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingLessons ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Generating all
                  lessons...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> Generate All Lessons
                </>
              )}
            </button>
          )}

          {allGenerated && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5" /> All lessons generated
              successfully!
            </div>
          )}
        </div>

        {/* Week sections with lessons */}
        {plan.outline.weeks.map((week) => (
          <div key={week.week_number} className="space-y-3">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <div className="w-6 h-6 bg-accent-100 text-accent-700 rounded-md flex items-center justify-center text-xs font-bold">
                {week.week_number}
              </div>
              {week.title}
            </h3>

            {week.lessons.map((lessonOutline, lessonIdx) => {
              const key = `${week.week_number}-${lessonIdx}`;
              const currLesson = findCurriculumLesson(
                week.week_number,
                lessonIdx
              );
              const isExpanded = expandedLesson === key;
              const isGenerating = generatingSingleLesson === key;
              const hasContent = currLesson && currLesson.lesson_content;

              return (
                <div
                  key={key}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => toggleLessonExpand(key)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          hasContent
                            ? "bg-green-100 text-green-600"
                            : "bg-gray-100 text-gray-400"
                        )}
                      >
                        {hasContent ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <BookOpen className="w-4 h-4" />
                        )}
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {currLesson?.lesson_title || lessonOutline.title}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {lessonOutline.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {currLesson && (
                        <span
                          className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            currLesson.lesson_status === "published"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          )}
                        >
                          {currLesson.lesson_status}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      {hasContent ? (
                        <div className="prose max-w-none text-sm mt-4">
                          <ReactMarkdown>
                            {currLesson.lesson_content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-400 text-sm">
                          Lesson content not yet generated.
                        </div>
                      )}

                      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                        <button
                          onClick={() =>
                            handleGenerateSingleLesson(
                              week.week_number,
                              lessonIdx
                            )
                          }
                          disabled={isGenerating}
                          className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-100 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {isGenerating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          {isGenerating
                            ? "Generating..."
                            : hasContent
                              ? "Regenerate"
                              : "Generate"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep(1)}
            className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button
            onClick={() => setCurrentStep(3)}
            className="bg-accent-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-accent-600 transition-all flex items-center gap-2"
          >
            Review & Publish <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 3: Review & Publish ───────────────────────────────────

  function renderReviewPublish() {
    if (!plan) {
      return (
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-gray-500">
          No plan loaded.
        </div>
      );
    }

    const isPublished = plan.status === "published";

    return (
      <div className="space-y-6">
        {/* Published badge */}
        {isPublished && (
          <div className="bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <span className="text-sm font-semibold text-emerald-800">
                Published
              </span>
              <span className="text-sm text-emerald-600 ml-1">
                -- All lessons have been published and assigned.
              </span>
            </div>
          </div>
        )}

        {/* Curriculum summary */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">
              {plan.subject_icon || plan.outline?.subject_icon || "📚"}
            </span>
            <div>
              <h2
                className="text-lg font-bold text-gray-900"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {plan.title}
              </h2>
              <p className="text-sm text-gray-500">{plan.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500">Grade</div>
              <div className="text-sm font-semibold mt-0.5">
                Grade {plan.grade_level}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500">Difficulty</div>
              <div className="text-sm font-semibold mt-0.5 capitalize">
                {plan.difficulty}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500">Duration</div>
              <div className="text-sm font-semibold mt-0.5">
                {plan.duration_weeks}{" "}
                {plan.duration_weeks === 1 ? "week" : "weeks"}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500">Lessons</div>
              <div className="text-sm font-semibold mt-0.5">
                {plan.generated_lessons} / {plan.total_lessons} ready
              </div>
            </div>
          </div>
        </div>

        {/* Expandable week/lesson preview */}
        {plan.outline?.weeks?.map((week) => (
          <div
            key={week.week_number}
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <button
              onClick={() => toggleWeek(week.week_number)}
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent-100 text-accent-700 rounded-lg flex items-center justify-center text-sm font-bold">
                  {week.week_number}
                </div>
                <h3 className="text-sm font-bold text-gray-900">
                  {week.title}
                </h3>
              </div>
              {expandedWeeks.has(week.week_number) ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {expandedWeeks.has(week.week_number) && (
              <div className="px-5 pb-5 space-y-3">
                {week.lessons.map((lessonOutline, lessonIdx) => {
                  const key = `review-${week.week_number}-${lessonIdx}`;
                  const currLesson = findCurriculumLesson(
                    week.week_number,
                    lessonIdx
                  );
                  const isExpanded = expandedLesson === key;

                  return (
                    <div
                      key={key}
                      className="border border-gray-100 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => toggleLessonExpand(key)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {currLesson?.lesson_content ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-gray-300" />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {currLesson?.lesson_title || lessonOutline.title}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      {isExpanded && currLesson?.lesson_content && (
                        <div className="px-4 pb-4 border-t border-gray-100">
                          <div className="prose max-w-none text-sm mt-3">
                            <ReactMarkdown>
                              {currLesson.lesson_content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Kid assignment */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-accent-500" /> Assign to Kids
          </h2>
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
              No kid profiles found. The lessons will be published without
              assignment.
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => setCurrentStep(2)}
              className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="bg-success-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 transition-all flex items-center gap-2 disabled:opacity-50 sm:ml-auto"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Publishing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />{" "}
                  {isPublished ? "Republish" : "Publish All Lessons"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Previous Plans ─────────────────────────────────────────────

  function renderPreviousPlans() {
    return (
      <div className="bg-white rounded-2xl shadow-sm">
        <button
          onClick={() => setShowPrevious(!showPrevious)}
          className="w-full flex items-center justify-between p-6"
        >
          <h2 className="text-lg font-bold">Previous Plans</h2>
          {showPrevious ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {showPrevious && (
          <div className="px-6 pb-6">
            {previousPlans.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm">
                No previous plans.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {previousPlans.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      "text-left p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all relative group",
                      plan?.id === p.id
                        ? "border-primary-400 bg-primary-50/50"
                        : ""
                    )}
                  >
                    <button
                      onClick={() => handleResumePlan(p.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">
                          {p.subject_icon || "📚"}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {p.title || p.concept}
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                          {p.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            STATUS_COLORS[p.status as CurriculumStatus] ||
                              "bg-gray-100 text-gray-600"
                          )}
                        >
                          {p.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-gray-400">
                          Grade {p.grade_level}
                        </span>
                        <span className="text-xs text-gray-400">
                          {p.duration_weeks}w
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(p.created_at).toLocaleDateString()}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlan(p.id);
                      }}
                      className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}
