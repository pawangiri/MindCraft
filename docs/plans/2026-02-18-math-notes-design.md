# Math Notes Feature Design

**Date:** 2026-02-18
**Status:** Approved

## Overview

Math Notes is a new feature where kids read a math concept, then practice problems using a split-screen canvas + chat interface. Problems are AI-generated per grade level. Kids draw their work on an Excalidraw canvas and submit for AI evaluation via OpenAI GPT-4o-mini vision.

## Architecture

### Backend: `backend/mindcraft/math/` (new Django app)

No models — math problems are ephemeral (generated per session, not persisted).

**Endpoints:**
- `POST /api/v1/math/generate/` — `{grade: int, topic: string}` → Claude generates age-appropriate problem → `{problem_text: string, difficulty: string, hint: string}`
- `POST /api/v1/math/evaluate/` — `{problem: string, image_base64: string, grade: int}` → GPT-4o-mini vision evaluates drawn answer → `{correct: bool, correct_answer: string, feedback: string}`

**Files:**
- `math/__init__.py`, `apps.py` (MathConfig)
- `math/views.py` — Two `@api_view(["POST"])` endpoints
- `math/urls.py` — URL patterns
- `math/openai_client.py` — Thin OpenAI vision wrapper

**AI Service Changes:**
- `ai_service/generators.py` — Add `generate_math_problem(topic, grade_level)`
- `ai_service/prompts.py` — Add `MATH_PROBLEM_PROMPT`, `math_tutor_system_prompt()`
- `chat/models.py` — Add `math` to `ChatSession.ContextType` choices

**Dependencies:**
- Add `openai` package to backend deps (UV)
- Add `OPENAI_API_KEY` to `.env`

### Frontend: `src/features/math/`

**Components:**
- `MathPractice.tsx` — Split-screen layout (canvas left, chat right)
- `src/api/math.ts` — API calls

**Integration Points:**
- Reuses `CanvasBoard` Excalidraw integration (`exportToBlob()` for PNG export)
- Reuses `ChatWindow` with `context_type="math"` and problem context
- `LessonViewer.tsx` — Add "Practice" button for math lessons
- `App.tsx` — Add `/lessons/:id/practice` route

### Data Flow

1. Kid opens math lesson → LessonViewer shows concept
2. Clicks "Practice" → navigates to `/lessons/:id/practice`
3. MathPractice mounts → calls `/math/generate/` with kid's grade + lesson topic
4. Problem displayed at top of canvas panel
5. Kid draws answer on Excalidraw canvas
6. Kid can ask chat tutor (right panel, pre-loaded with problem context)
7. Clicks "Submit" → `exportToBlob()` → base64 → `/math/evaluate/`
8. Feedback shown inline (green/orange, encouraging)
9. "Try Another" generates a new problem

### Vision API

Using OpenAI GPT-4o-mini for cost efficiency:
- ~$0.15/1M input tokens
- Each evaluation: ~1 small PNG + short prompt
- Isolated in `math/openai_client.py`

### UI Design

- Split screen: 60% canvas (left), 40% chat (right)
- Problem text in a highlighted card at top of canvas
- Large, kid-friendly buttons
- Color-coded feedback: green (correct), orange (try again)
- Encouraging language in all feedback
- Consistent with existing Tailwind theme
