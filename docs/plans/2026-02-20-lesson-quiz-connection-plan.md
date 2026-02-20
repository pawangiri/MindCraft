# Lesson-Quiz Connection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect lessons and quizzes so admins auto-generate quizzes on publish, and kids see prominent quiz prompts inside lessons.

**Architecture:** Frontend-only changes plus one small API helper. The backend already has `Quiz.lesson` FK, `LessonDetailSerializer.has_quiz/quiz_id`, and `POST /api/v1/quizzes/generate/`. We add a frontend `generateQuiz()` API function, modify ContentReview to trigger quiz generation on publish, add quiz badges to lesson rows, and enhance LessonViewer with a prominent quiz card.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Lucide icons, existing DRF endpoints

---

### Task 1: Add `generateQuiz` API function

**Files:**
- Modify: `frontend/src/api/quizzes.ts`

**Step 1: Add the generateQuiz function**

Add to `frontend/src/api/quizzes.ts`:

```typescript
export async function generateQuiz(
  lessonId: number,
  numQuestions: number = 5,
): Promise<{ quiz_id: number; title: string; questions: number }> {
  const { data } = await api.post("/quizzes/generate/", {
    lesson_id: lessonId,
    num_questions: numQuestions,
  });
  return data;
}
```

**Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/api/quizzes.ts
git commit -m "feat: add generateQuiz API function"
```

---

### Task 2: Add `has_quiz` and `quiz_id` to LessonListSerializer

Currently `has_quiz` and `quiz_id` are only on `LessonDetailSerializer`. The admin's ContentReview uses the list endpoint, so it doesn't have quiz info. We need these fields on the list serializer too.

**Files:**
- Modify: `backend/mindcraft/content/serializers.py`

**Step 1: Add quiz fields to LessonListSerializer**

In `backend/mindcraft/content/serializers.py`, update `LessonListSerializer`:

```python
class LessonListSerializer(serializers.ModelSerializer):
    topic_name = serializers.CharField(source="topic.name", read_only=True)
    subject_name = serializers.CharField(source="topic.subject.name", read_only=True)
    subject_icon = serializers.CharField(source="topic.subject.icon", read_only=True)
    subject_color = serializers.CharField(source="topic.subject.color", read_only=True)
    has_quiz = serializers.SerializerMethodField()
    quiz_id = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            "id", "title", "description", "topic_name", "subject_name",
            "subject_icon", "subject_color", "grade_level", "difficulty",
            "estimated_minutes", "status", "ai_generated", "has_quiz", "quiz_id", "created_at",
        ]

    def get_has_quiz(self, obj):
        return obj.quizzes.filter(is_active=True).exists()

    def get_quiz_id(self, obj):
        quiz = obj.quizzes.filter(is_active=True).first()
        return quiz.id if quiz else None
```

**Step 2: Verify it works**

Run: `cd backend && uv run python manage.py shell -c "from mindcraft.content.serializers import LessonListSerializer; print('OK')"`
Expected: `OK`

**Step 3: Update the Lesson TypeScript type**

The `Lesson` type in `frontend/src/api/client.ts` already has `has_quiz?: boolean` and `quiz_id?: number | null` as optional fields, so no change needed. They'll just start appearing in list responses now.

**Step 4: Commit**

```bash
git add backend/mindcraft/content/serializers.py
git commit -m "feat: expose has_quiz and quiz_id on lesson list endpoint"
```

---

### Task 3: Add publish confirmation dialog with quiz generation to ContentReview

**Files:**
- Modify: `frontend/src/features/admin/ContentReview.tsx`

**Step 1: Add imports and state**

Add to the imports at top of ContentReview.tsx:

```typescript
import { generateQuiz } from "../../api/quizzes";
import { ClipboardList, Sparkles as SparklesIcon } from "lucide-react";
```

Note: `Sparkles` is already imported. We need `ClipboardList` for quiz badge.

Add state variables inside the component:

```typescript
const [publishConfirm, setPublishConfirm] = useState<number | null>(null);
const [quizGenerating, setQuizGenerating] = useState<number | null>(null);
```

**Step 2: Replace handlePublish with a two-step flow**

Replace the existing `handlePublish` function:

```typescript
const handlePublishClick = (lesson: Lesson) => {
  // If lesson already has a quiz, publish directly
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
```

**Step 3: Add the confirmation dialog**

Add this JSX right before the closing `</div>` of the root element (before `</div>` at the very end of the return):

```tsx
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
```

**Step 4: Update the publish button to use handlePublishClick**

Change the publish button's `onClick` from `() => handlePublish(lesson.id)` to `() => handlePublishClick(lesson)`.

**Step 5: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add frontend/src/features/admin/ContentReview.tsx
git commit -m "feat: add publish confirmation dialog with quiz auto-generation"
```

---

### Task 4: Add quiz badges and generate button to ContentReview lesson rows

**Files:**
- Modify: `frontend/src/features/admin/ContentReview.tsx`

**Step 1: Add a handleGenerateQuiz function**

```typescript
const handleGenerateQuiz = async (lessonId: number) => {
  setError(null);
  setQuizGenerating(lessonId);
  try {
    const result = await generateQuiz(lessonId);
    setLessons((prev) =>
      prev.map((l) =>
        l.id === lessonId
          ? { ...l, has_quiz: true, quiz_id: result.quiz_id }
          : l
      )
    );
  } catch {
    setError("Failed to generate quiz. Please try again.");
  }
  setQuizGenerating(null);
};
```

**Step 2: Add quiz badge in the lesson header row**

In the lesson header row (inside the metadata `<div>` that shows topic_name, clock, zap), add a quiz indicator after the grade level span:

```tsx
{lesson.has_quiz ? (
  <span className="flex items-center gap-1 text-green-600">
    <ClipboardList className="w-3.5 h-3.5" /> Quiz
  </span>
) : lesson.status === "published" ? (
  <button
    onClick={(e) => { e.stopPropagation(); handleGenerateQuiz(lesson.id); }}
    disabled={quizGenerating === lesson.id}
    className="flex items-center gap-1 text-amber-600 hover:text-amber-700 transition-colors"
  >
    {quizGenerating === lesson.id ? (
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
    ) : (
      <ClipboardList className="w-3.5 h-3.5" />
    )}
    {quizGenerating === lesson.id ? "Generating..." : "Generate Quiz"}
  </button>
) : null}
```

**Step 3: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add frontend/src/features/admin/ContentReview.tsx
git commit -m "feat: add quiz badges and generate button to lesson rows"
```

---

### Task 5: Enhance LessonViewer with prominent quiz card

**Files:**
- Modify: `frontend/src/features/lessons/LessonViewer.tsx`

**Step 1: Add QuizAttempt import and fetch best attempt**

Add to imports:

```typescript
import api, { type Lesson, type QuizAttempt } from "../../api/client";
```

Wait — `api` and `Lesson` are already imported. Add `QuizAttempt` to the existing import.

Add state for best quiz attempt:

```typescript
const [bestAttempt, setBestAttempt] = useState<QuizAttempt | null>(null);
```

We need a way to get the kid's best attempt for this quiz. The simplest approach: fetch `/api/v1/quizzes/{quiz_id}/` won't give us attempts. But we can check the QuizAttempt list. Actually, the backend doesn't expose a quiz-attempts-by-quiz endpoint right now. The simplest approach is to add a field to the lesson detail serializer.

**Alternative: Add `quiz_best_score` to LessonDetailSerializer**

In `backend/mindcraft/content/serializers.py`, add to `LessonDetailSerializer`:

```python
quiz_best_score = serializers.SerializerMethodField()

# Add to Meta.fields: "quiz_best_score"

def get_quiz_best_score(self, obj):
    request = self.context.get("request")
    if not request or not hasattr(request.user, "kid_profile"):
        return None
    from mindcraft.quiz.models import QuizAttempt
    quiz = obj.quizzes.filter(is_active=True).first()
    if not quiz:
        return None
    attempt = QuizAttempt.objects.filter(
        quiz=quiz, kid=request.user.kid_profile, completed_at__isnull=False
    ).order_by("-score").first()
    if not attempt:
        return None
    return {
        "score": attempt.score,
        "max_score": attempt.max_score,
        "percentage": round(attempt.score / attempt.max_score * 100) if attempt.max_score > 0 else 0,
    }
```

**Step 2: Update TypeScript Lesson type**

In `frontend/src/api/client.ts`, add to the `Lesson` interface:

```typescript
quiz_best_score?: { score: number; max_score: number; percentage: number } | null;
```

**Step 3: Replace the actions section in LessonViewer**

Replace the entire actions `<div>` (the bottom card with Mark as Complete, Ask AI Tutor, Take Quiz) with an enhanced version:

```tsx
{/* Actions */}
<div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
  {/* Quiz card — prominent if quiz exists */}
  {lesson.has_quiz && lesson.quiz_id && (
    <div
      className={cn(
        "rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3",
        lesson.quiz_best_score
          ? "bg-green-50 border border-green-200"
          : "bg-primary-50 border border-primary-200"
      )}
    >
      <div className="flex-1">
        <div className="font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          {lesson.quiz_best_score
            ? `You scored ${lesson.quiz_best_score.percentage}%!`
            : "Ready to test your knowledge?"}
        </div>
        <p className="text-sm text-gray-600 mt-0.5">
          {lesson.quiz_best_score
            ? `${lesson.quiz_best_score.score}/${lesson.quiz_best_score.max_score} points — try again to improve!`
            : "Take a quick quiz to see how well you understood this lesson."}
        </p>
      </div>
      <Link
        to={`/quizzes/${lesson.quiz_id}`}
        state={{ lessonId: lesson.id }}
        className={cn(
          "px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 shrink-0",
          lesson.quiz_best_score
            ? "bg-green-500 text-white hover:bg-green-600"
            : "bg-primary-500 text-white hover:bg-primary-600"
        )}
      >
        <ClipboardList className="w-4 h-4" />
        {lesson.quiz_best_score ? "Retake Quiz" : "Take Quiz"}
      </Link>
    </div>
  )}

  {/* Other actions row */}
  <div className="flex flex-wrap items-center gap-3">
    {completed ? (
      <div className="flex items-center gap-2 text-success-500 font-semibold">
        <BookCheck className="w-5 h-5" /> Lesson Complete! 🎉
      </div>
    ) : (
      <button
        onClick={handleComplete}
        disabled={completing}
        className="bg-success-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 transition-all flex items-center gap-2 disabled:opacity-60"
      >
        <BookCheck className="w-5 h-5" />
        {completing ? "Saving..." : "Mark as Complete"}
      </button>
    )}

    <Link
      to={`/chat?lesson=${id}`}
      className="bg-accent-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-accent-600 transition-all flex items-center gap-2"
    >
      <MessageCircle className="w-5 h-5" /> Ask AI Tutor
    </Link>

    {lesson.subject_name?.toLowerCase().includes("math") && (
      <Link
        to={`/lessons/${id}/practice`}
        className="bg-amber-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-amber-600 transition-all flex items-center gap-2"
      >
        <Calculator className="w-5 h-5" /> Practice Math
      </Link>
    )}
  </div>
</div>
```

**Step 4: Add cn import to LessonViewer**

Add at top of file:

```typescript
import { cn } from "../../utils/cn";
```

**Step 5: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add backend/mindcraft/content/serializers.py frontend/src/api/client.ts frontend/src/features/lessons/LessonViewer.tsx
git commit -m "feat: enhance lesson viewer with prominent quiz card and score display"
```

---

### Task 6: Manual smoke test

**Step 1: Start both servers**

Terminal 1: `cd backend && uv run python manage.py runserver`
Terminal 2: `cd frontend && npm run dev`

**Step 2: Admin flow test**

1. Log in as `parent` / `mindcraft`
2. Go to Content Review
3. Find a draft lesson
4. Click publish → verify dialog appears with "Publish with Quiz" / "Publish without Quiz"
5. Click "Publish with Quiz" → verify lesson publishes and quiz badge appears
6. For a published lesson without quiz → verify "Generate Quiz" button appears and works

**Step 3: Kid flow test**

1. Log in as `aaria123` / `alex123`
2. Go to Lessons → open a lesson that has a quiz
3. Verify the prominent quiz card appears below lesson content
4. Take the quiz → come back to lesson → verify score displays
5. Check Quizzes sidebar → verify quizzes still show there too

**Step 4: Commit any fixes**

If any issues found, fix and commit.
