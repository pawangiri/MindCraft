# Math Tutor Context Fix + Graph Paper Canvas

**Date:** 2026-02-20
**Status:** Approved

## Problem

The AI math tutor operates in isolation — it doesn't know which problem the kid is working on, whether they got it right/wrong, or what feedback was given. The chat sends only `{ message: "user text" }` with zero problem context. The backend tries to reconstruct context via `practice.attempts.last()` but this has race conditions and staleness issues.

Additionally, the Excalidraw canvas is a generic whiteboard with no math-specific feel.

## Root Cause

1. `MathPractice.tsx:212` sends only `{ message: userMsg }` — no problem or evaluation context
2. `chat/views.py:124` uses `practice.attempts.last()` which may not match what the kid sees (race condition during problem generation, staleness after "Try Another")
3. The system prompt has no knowledge of evaluation results
4. Excalidraw has no grid enabled

## Design

### Part 1: Frontend Sends Problem Context

**File: `frontend/src/features/math/MathPractice.tsx`**

Change `sendChatMessage()` to include context in the POST body:

```typescript
body: JSON.stringify({
  message: userMsg,
  context: {
    problem_text: problem?.problem_text ?? null,
    topic: session.topic,
    difficulty: problem?.difficulty ?? null,
    hint: problem?.hint ?? null,
    evaluation: evaluation ? {
      correct: evaluation.correct,
      correct_answer: evaluation.correct_answer,
      feedback: evaluation.feedback,
    } : null,
  },
})
```

### Part 2: Backend Accepts and Uses Context

**File: `backend/mindcraft/chat/serializers.py`**

Add optional `context` field to `ChatSendSerializer`:

```python
class ChatSendSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000)
    context = serializers.DictField(required=False, default=None)
```

**File: `backend/mindcraft/chat/views.py`**

- Pass `context` from request data into `_get_system_prompt`
- In `_get_system_prompt`, prefer frontend-provided context over DB lookup for math sessions
- Fall back to existing `attempts.last()` if no frontend context provided (backward compat)

### Part 3: Enriched System Prompt

**File: `backend/mindcraft/ai_service/prompts.py`**

Add optional `evaluation` parameter to `math_tutor_system_prompt()`:

```python
def math_tutor_system_prompt(kid_name, grade, problem_text, topic, evaluation=None):
    prompt = f"""...(existing)...
    Problem: {problem_text}
    """
    if evaluation:
        prompt += f"\nSTUDENT'S LATEST ATTEMPT:\n"
        prompt += f"Result: {'Correct' if evaluation['correct'] else 'Incorrect'}\n"
        if evaluation.get('correct_answer'):
            prompt += f"Correct answer: {evaluation['correct_answer']}\n"
        if evaluation.get('feedback'):
            prompt += f"Feedback given: {evaluation['feedback']}\n"
    return prompt
```

### Part 4: Graph Paper Canvas

**File: `frontend/src/features/math/MathPractice.tsx`**

Enable Excalidraw's built-in grid mode:

```tsx
<Excalidraw
  gridModeEnabled={true}
  initialData={{ appState: { gridSize: 20 } }}
  ...
/>
```

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/features/math/MathPractice.tsx` | Send context with chat, enable grid mode |
| `backend/mindcraft/chat/serializers.py` | Accept optional `context` field |
| `backend/mindcraft/chat/views.py` | Pass context to `_get_system_prompt`, prefer frontend context |
| `backend/mindcraft/ai_service/prompts.py` | Add evaluation state to math tutor prompt |
