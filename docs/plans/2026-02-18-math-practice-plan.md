# Math Practice Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Promote Math Practice to a first-class sidebar feature where kids start independent practice sessions, save canvas work + problems + evaluations + chat, and return to past sessions.

**Architecture:** Add `MathPracticeSession` + `MathProblemAttempt` models to existing `math` app. New DRF ViewSet for CRUD. Refactor frontend `MathPractice.tsx` to decouple from lessons. New list and topic-picker pages. Add sidebar nav entry.

**Tech Stack:** Django 6 + DRF (backend), React 19 + TypeScript + Tailwind 4 (frontend), Excalidraw (canvas), Pillow (ImageField)

---

## Task 1: Backend Models

**Files:**
- Create: `backend/mindcraft/math/models.py`
- Modify: `backend/mindcraft/math/apps.py` (no change needed, already configured)

**Step 1: Create models**

Create `backend/mindcraft/math/models.py`:

```python
from django.db import models


class MathPracticeSession(models.Model):
    kid = models.ForeignKey(
        "core.KidProfile", on_delete=models.CASCADE, related_name="math_sessions"
    )
    topic = models.CharField(max_length=100)
    chat_session = models.OneToOneField(
        "chat.ChatSession", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="math_practice_session",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.kid.display_name}: {self.topic}"


class MathProblemAttempt(models.Model):
    class Difficulty(models.TextChoices):
        EASY = "easy", "Easy"
        MEDIUM = "medium", "Medium"
        HARD = "hard", "Hard"

    session = models.ForeignKey(
        MathPracticeSession, on_delete=models.CASCADE, related_name="attempts"
    )
    problem_text = models.TextField()
    difficulty = models.CharField(max_length=10, choices=Difficulty.choices, default=Difficulty.MEDIUM)
    hint = models.TextField(blank=True)
    canvas_image = models.ImageField(upload_to="math_canvas/", null=True, blank=True)
    is_correct = models.BooleanField(null=True, blank=True)
    correct_answer = models.TextField(blank=True)
    feedback = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self):
        status = "✓" if self.is_correct else "✗" if self.is_correct is False else "…"
        return f"[{status}] {self.problem_text[:60]}"
```

**Step 2: Create migration**

Run: `cd backend && uv run python manage.py makemigrations math`

**Step 3: Apply migration**

Run: `cd backend && uv run python manage.py migrate`

**Step 4: Install Pillow** (required for ImageField)

Run: `cd backend && uv add Pillow`

---

## Task 2: Backend Admin

**Files:**
- Create: `backend/mindcraft/math/admin.py`

**Step 1: Register models in admin**

Create `backend/mindcraft/math/admin.py`:

```python
from django.contrib import admin
from .models import MathPracticeSession, MathProblemAttempt


class MathProblemAttemptInline(admin.TabularInline):
    model = MathProblemAttempt
    extra = 0
    readonly_fields = ["created_at"]


@admin.register(MathPracticeSession)
class MathPracticeSessionAdmin(admin.ModelAdmin):
    list_display = ["kid", "topic", "attempt_count", "created_at"]
    list_filter = ["topic", "created_at"]
    inlines = [MathProblemAttemptInline]

    def attempt_count(self, obj):
        return obj.attempts.count()
```

---

## Task 3: Backend Serializers

**Files:**
- Create: `backend/mindcraft/math/serializers.py`

**Step 1: Create serializers**

Create `backend/mindcraft/math/serializers.py`:

```python
from rest_framework import serializers
from .models import MathPracticeSession, MathProblemAttempt


class MathProblemAttemptSerializer(serializers.ModelSerializer):
    canvas_image_url = serializers.SerializerMethodField()

    class Meta:
        model = MathProblemAttempt
        fields = [
            "id", "problem_text", "difficulty", "hint",
            "canvas_image", "canvas_image_url",
            "is_correct", "correct_answer", "feedback",
            "order", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
        extra_kwargs = {"canvas_image": {"write_only": True}}

    def get_canvas_image_url(self, obj):
        if obj.canvas_image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.canvas_image.url)
            return obj.canvas_image.url
        return None


class MathPracticeSessionListSerializer(serializers.ModelSerializer):
    attempt_count = serializers.SerializerMethodField()
    correct_count = serializers.SerializerMethodField()
    chat_session_id = serializers.IntegerField(source="chat_session_id", read_only=True)

    class Meta:
        model = MathPracticeSession
        fields = [
            "id", "topic", "chat_session_id",
            "attempt_count", "correct_count",
            "created_at", "updated_at",
        ]

    def get_attempt_count(self, obj):
        return obj.attempts.filter(is_correct__isnull=False).count()

    def get_correct_count(self, obj):
        return obj.attempts.filter(is_correct=True).count()


class MathPracticeSessionDetailSerializer(serializers.ModelSerializer):
    attempts = MathProblemAttemptSerializer(many=True, read_only=True)
    chat_session_id = serializers.IntegerField(source="chat_session_id", read_only=True)

    class Meta:
        model = MathPracticeSession
        fields = [
            "id", "topic", "chat_session_id",
            "attempts", "created_at", "updated_at",
        ]


class MathPracticeSessionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MathPracticeSession
        fields = ["topic"]
```

---

## Task 4: Backend Views

**Files:**
- Modify: `backend/mindcraft/math/views.py` (add ViewSet, keep existing function views)

**Step 1: Add ViewSet to views.py**

Add the following to the **top** of `backend/mindcraft/math/views.py` (after existing imports):

```python
from rest_framework import viewsets, status as drf_status
from rest_framework.decorators import action
from .models import MathPracticeSession, MathProblemAttempt
from .serializers import (
    MathPracticeSessionListSerializer,
    MathPracticeSessionDetailSerializer,
    MathPracticeSessionCreateSerializer,
    MathProblemAttemptSerializer,
)
from mindcraft.chat.models import ChatSession


class MathPracticeSessionViewSet(viewsets.ModelViewSet):
    """CRUD for math practice sessions, scoped to the logged-in kid."""

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return MathPracticeSession.objects.all()
        if hasattr(user, "kid_profile"):
            return MathPracticeSession.objects.filter(kid=user.kid_profile)
        return MathPracticeSession.objects.none()

    def get_serializer_class(self):
        if self.action == "list":
            return MathPracticeSessionListSerializer
        if self.action == "create":
            return MathPracticeSessionCreateSerializer
        return MathPracticeSessionDetailSerializer

    def perform_create(self, serializer):
        kid = self.request.user.kid_profile
        # Create a linked chat session
        chat_session = ChatSession.objects.create(
            kid=kid,
            title=f"Math: {serializer.validated_data['topic']}",
            context_type=ChatSession.ContextType.MATH,
        )
        session = serializer.save(kid=kid, chat_session=chat_session)
        # Set context_id to point to this practice session
        chat_session.context_id = session.id
        chat_session.save()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=True, methods=["post"])
    def attempts(self, request, pk=None):
        """Create a new problem attempt for this session."""
        session = self.get_object()
        serializer = MathProblemAttemptSerializer(
            data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        # Auto-set order
        last_order = session.attempts.aggregate(models.Max("order"))["order__max"] or 0
        serializer.save(session=session, order=last_order + 1)
        return Response(serializer.data, status=drf_status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"], url_path=r"attempts/(?P<attempt_id>\d+)")
    def update_attempt(self, request, pk=None, attempt_id=None):
        """Update an attempt (canvas image, evaluation results)."""
        session = self.get_object()
        attempt = session.attempts.get(id=attempt_id)
        serializer = MathProblemAttemptSerializer(
            attempt, data=request.data, partial=True,
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
```

Note: The `models` import is already present via `from .models import ...`. You'll also need to add `from rest_framework.response import Response` if not already imported (it is — via the existing function views).

**Step 2: Add the `models` import for Max aggregate**

Add at the top of views.py:
```python
from django.db import models as db_models
```

And change the `last_order` line to use `db_models.Max("order")`.

---

## Task 5: Backend URLs

**Files:**
- Modify: `backend/mindcraft/math/urls.py`

**Step 1: Add router for the ViewSet**

Replace `backend/mindcraft/math/urls.py` with:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("sessions", views.MathPracticeSessionViewSet, basename="math-session")

urlpatterns = [
    path("generate/", views.generate_problem),
    path("evaluate/", views.evaluate_answer),
    path("", include(router.urls)),
]
```

---

## Task 6: Backend Chat Integration

**Files:**
- Modify: `backend/mindcraft/chat/views.py` (lines 118-124)

**Step 1: Update `_get_system_prompt` for independent sessions**

In `backend/mindcraft/chat/views.py`, update the math context block in `_get_system_prompt` to handle `MathPracticeSession` (where `context_id` points to a practice session, not a lesson):

```python
if session.context_type == ChatSession.ContextType.MATH and session.context_id:
    try:
        from mindcraft.math.models import MathPracticeSession
        practice = MathPracticeSession.objects.get(id=session.context_id)
        topic = practice.topic
        # Get the latest problem for context
        latest = practice.attempts.last()
        problem_text = latest.problem_text if latest else topic
        return prompts.math_tutor_system_prompt(kid_name, grade, problem_text, topic)
    except MathPracticeSession.DoesNotExist:
        # Fallback: try legacy lesson-based lookup
        try:
            lesson = Lesson.objects.get(id=session.context_id)
            topic = lesson.topic.name if lesson.topic else "math"
            return prompts.math_tutor_system_prompt(kid_name, grade, lesson.title, topic)
        except Lesson.DoesNotExist:
            pass
```

This supports both new practice sessions and legacy lesson-based sessions.

---

## Task 7: Backend — Serve media files in dev

**Files:**
- Modify: `backend/mindcraft/urls.py`

**Step 1: Add media URL config for development**

Add to `backend/mindcraft/urls.py`:

```python
from django.conf import settings
from django.conf.urls.static import static

# ... existing urlpatterns ...

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

---

## Task 8: Frontend Types + API

**Files:**
- Modify: `frontend/src/api/client.ts` (add types)
- Modify: `frontend/src/api/math.ts` (add session API functions)

**Step 1: Add TypeScript types**

Add to the bottom of `frontend/src/api/client.ts` (before the closing of the file):

```typescript
export interface MathPracticeSession {
  id: number;
  topic: string;
  chat_session_id: number | null;
  attempt_count: number;
  correct_count: number;
  created_at: string;
  updated_at: string;
}

export interface MathPracticeSessionDetail {
  id: number;
  topic: string;
  chat_session_id: number | null;
  attempts: MathProblemAttempt[];
  created_at: string;
  updated_at: string;
}

export interface MathProblemAttempt {
  id: number;
  problem_text: string;
  difficulty: string;
  hint: string;
  canvas_image_url: string | null;
  is_correct: boolean | null;
  correct_answer: string;
  feedback: string;
  order: number;
  created_at: string;
}
```

**Step 2: Add API functions**

Add to `frontend/src/api/math.ts`:

```typescript
import type {
  MathPracticeSession,
  MathPracticeSessionDetail,
  MathProblemAttempt,
} from "./client";

export async function getSessions(): Promise<MathPracticeSession[]> {
  const { data } = await api.get("/math/sessions/");
  return data;
}

export async function createSession(topic: string): Promise<MathPracticeSessionDetail> {
  const { data } = await api.post("/math/sessions/", { topic });
  return data;
}

export async function getSession(id: number): Promise<MathPracticeSessionDetail> {
  const { data } = await api.get(`/math/sessions/${id}/`);
  return data;
}

export async function createAttempt(
  sessionId: number,
  attempt: { problem_text: string; difficulty: string; hint: string }
): Promise<MathProblemAttempt> {
  const { data } = await api.post(`/math/sessions/${sessionId}/attempts/`, attempt);
  return data;
}

export async function updateAttempt(
  sessionId: number,
  attemptId: number,
  updates: Partial<{ canvas_image: File; is_correct: boolean; correct_answer: string; feedback: string }>
): Promise<MathProblemAttempt> {
  // Use FormData if canvas_image is present (file upload)
  if (updates.canvas_image) {
    const formData = new FormData();
    formData.append("canvas_image", updates.canvas_image);
    if (updates.is_correct !== undefined) formData.append("is_correct", String(updates.is_correct));
    if (updates.correct_answer) formData.append("correct_answer", updates.correct_answer);
    if (updates.feedback) formData.append("feedback", updates.feedback);
    const { data } = await api.patch(
      `/math/sessions/${sessionId}/attempts/${attemptId}/`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  }
  const { data } = await api.patch(`/math/sessions/${sessionId}/attempts/${attemptId}/`, updates);
  return data;
}
```

---

## Task 9: Frontend — Session List Page

**Files:**
- Create: `frontend/src/features/math/MathPracticeList.tsx`

**Step 1: Create the session list component**

This page shows past practice sessions with topic, date, attempt count, and accuracy. Has a prominent "New Practice" button.

```typescript
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
```

---

## Task 10: Frontend — Topic Picker Page

**Files:**
- Create: `frontend/src/features/math/MathPracticeNew.tsx`

**Step 1: Create the topic picker component**

Simple form with topic input + preset chips. Grade auto-detected from kid profile. Creates session and navigates to workspace.

```typescript
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calculator, ArrowLeft, Loader2 } from "lucide-react";
import { createSession } from "../../api/math";
import { useAuthStore } from "../../stores/authStore";
import { cn } from "../../utils/cn";

const TOPIC_PRESETS = [
  "Addition & Subtraction",
  "Multiplication & Division",
  "Fractions",
  "Decimals",
  "Geometry",
  "Algebra",
  "Word Problems",
  "Measurement",
  "Percentages",
  "Ratios",
];

export default function MathPracticeNew() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const grade = user?.kid_profile?.grade_level ?? 4;
  const [topic, setTopic] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async (selectedTopic: string) => {
    if (!selectedTopic.trim() || creating) return;
    setCreating(true);
    try {
      const session = await createSession(selectedTopic.trim());
      navigate(`/math-practice/${session.id}`);
    } catch {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate("/math-practice")}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-amber-500" />
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
            New Practice Session
          </h1>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <p className="text-sm text-gray-500 mb-1">
          Grade {grade} math practice
        </p>
        <h2 className="text-lg font-bold text-gray-900 mb-5" style={{ fontFamily: "var(--font-display)" }}>
          What do you want to practice?
        </h2>

        {/* Preset chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TOPIC_PRESETS.map((t) => (
            <button
              key={t}
              onClick={() => handleCreate(t)}
              disabled={creating}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all",
                "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:border-amber-300",
                "disabled:opacity-40"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Custom topic */}
        <div className="border-t border-gray-100 pt-5">
          <label className="text-sm font-medium text-gray-600 mb-2 block">
            Or type your own topic:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate(topic)}
              placeholder="e.g., Long division, Area of triangles..."
              className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 text-sm"
            />
            <button
              onClick={() => handleCreate(topic)}
              disabled={!topic.trim() || creating}
              className="bg-amber-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-amber-600 transition-all disabled:opacity-40 flex items-center gap-2 text-sm shrink-0"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Task 11: Frontend — Refactor MathPractice.tsx

**Files:**
- Modify: `frontend/src/features/math/MathPractice.tsx`

**Step 1: Refactor to work with MathPracticeSession**

This is the biggest change. The refactored component:
1. Takes `sessionId` from URL params instead of lesson `id`
2. Loads session detail (with past attempts) on mount
3. Uses the session's `chat_session_id` instead of creating a new one
4. Saves each problem as an attempt via API
5. Saves canvas image + evaluation to the attempt via API
6. Shows past attempts in a scrollable history when revisiting

Key changes from current code:
- Replace `useParams` `id` (lesson) with `sessionId` (practice session)
- Remove lesson fetch — use session's topic directly
- Remove chat session creation — use session's linked `chat_session_id`
- After generating a problem, POST to `/math/sessions/:id/attempts/` to save it
- After evaluating, PATCH the attempt with canvas image + evaluation results
- On mount, if session has existing attempts, show the last problem or a "Continue" state
- Add a "Back" link to `/math-practice` instead of `/lessons/:id`

The full component is large (~500 lines). The key structural changes:

**State changes:**
```typescript
// OLD: lesson-based
const { id } = useParams();
const [lesson, setLesson] = useState<Lesson | null>(null);

// NEW: session-based
const { sessionId } = useParams();
const [session, setSession] = useState<MathPracticeSessionDetail | null>(null);
const [currentAttemptId, setCurrentAttemptId] = useState<number | null>(null);
```

**Mount logic:**
```typescript
// Load session + past attempts
useEffect(() => {
  if (!sessionId) return;
  getSession(Number(sessionId)).then((s) => {
    setSession(s);
    setChatSessionId(s.chat_session_id);
    // If session has attempts, show last problem; otherwise generate new
    if (s.attempts.length > 0) {
      const last = s.attempts[s.attempts.length - 1];
      setProblem({ problem_text: last.problem_text, difficulty: last.difficulty, hint: last.hint });
      setCurrentAttemptId(last.id);
      if (last.is_correct !== null) {
        setEvaluation({ correct: last.is_correct, correct_answer: last.correct_answer, feedback: last.feedback });
      }
    } else {
      fetchNewProblem();
    }
    setLoading(false);
  });
}, [sessionId]);
```

**Problem generation — save as attempt:**
```typescript
const fetchNewProblem = async () => {
  if (!session) return;
  setGeneratingProblem(true);
  setEvaluation(null);
  setShowHint(false);
  try {
    const p = await generateProblem(grade, session.topic);
    setProblem(p);
    // Save to DB
    const attempt = await createAttempt(session.id, {
      problem_text: p.problem_text,
      difficulty: p.difficulty,
      hint: p.hint,
    });
    setCurrentAttemptId(attempt.id);
  } catch { /* error handling */ }
  setGeneratingProblem(false);
};
```

**Submit — save canvas + evaluation:**
```typescript
const handleSubmit = useCallback(async () => {
  if (!excalidrawAPI || !problem || !session || !currentAttemptId) return;
  // ... export blob (same as current) ...

  // Convert blob to File for upload
  const file = new File([blob], "canvas.png", { type: "image/png" });

  // Evaluate (same as current)
  const result = await evaluateAnswer(problem.problem_text, base64, grade);
  setEvaluation(result);

  // Save to DB
  await updateAttempt(session.id, currentAttemptId, {
    canvas_image: file,
    is_correct: result.correct,
    correct_answer: result.correct_answer,
    feedback: result.feedback,
  });
}, [excalidrawAPI, problem, grade, session, currentAttemptId]);
```

**Back link:**
```typescript
// OLD
<Link to={`/lessons/${id}`}>Back</Link>

// NEW
<Link to="/math-practice">Back</Link>
```

**Topic display:**
```typescript
// OLD: lesson.topic_name
// NEW: session.topic
```

---

## Task 12: Frontend — Routes + Navigation

**Files:**
- Modify: `frontend/src/App.tsx` (add routes)
- Modify: `frontend/src/components/Layout.tsx` (add sidebar item)

**Step 1: Add routes in App.tsx**

Add imports at top:
```typescript
import MathPracticeList from "./features/math/MathPracticeList";
import MathPracticeNew from "./features/math/MathPracticeNew";
```

Add routes (inside the protected `<Route>` block, after the canvas route):
```typescript
<Route path="/math-practice" element={<MathPracticeList />} />
<Route path="/math-practice/new" element={<MathPracticeNew />} />
<Route path="/math-practice/:sessionId" element={<MathPractice />} />
```

Keep the old `/lessons/:id/practice` route for backwards compatibility (or remove it — your call).

**Step 2: Add sidebar nav item in Layout.tsx**

Add `Calculator` to the lucide imports (already imported).

Update `kidNavItems` to add Math Practice between Canvas and Progress:

```typescript
const kidNavItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/lessons", icon: BookOpen, label: "Lessons" },
  { to: "/chat", icon: MessageCircle, label: "AI Tutor" },
  { to: "/quizzes", icon: ClipboardList, label: "Quizzes" },
  { to: "/journal", icon: PenTool, label: "Journal" },
  { to: "/canvas", icon: Palette, label: "Canvas" },
  { to: "/math-practice", icon: Calculator, label: "Math Practice" },
  { to: "/progress", icon: Trophy, label: "Progress" },
];
```

---

## Task 13: Frontend — Vite proxy for media files

**Files:**
- Modify: `frontend/vite.config.ts`

**Step 1: Add proxy rule for `/media`**

In the Vite config's `server.proxy` section, add:

```typescript
"/media": {
  target: "http://localhost:8000",
  changeOrigin: true,
},
```

This ensures canvas images served from Django's media folder are accessible in dev.

---

## Execution Notes

**Parallelizable tracks:**

- **Backend track (Tasks 1-7):** Sequential — models first, then serializers, views, URLs, chat integration, media config
- **Frontend track (Tasks 8-13):** Can start after Task 8 (types/API) since components build against the API shape

**For agent team execution:**
- **Agent A (Backend):** Tasks 1 → 2 → 3 → 4 → 5 → 6 → 7
- **Agent B (Frontend):** Tasks 8 → 9 → 10 → 11 → 12 → 13

Agents A and B can run in parallel.

**Verification:** After all tasks, start both servers and test:
1. Log in as kid (alex/alex123)
2. Click "Math Practice" in sidebar
3. See empty state, click "New Practice"
4. Pick a topic, verify session creates
5. Solve a problem, verify canvas + evaluation saves
6. Leave and return — verify session shows in list with stats
7. Click session — verify past attempts load with chat history
