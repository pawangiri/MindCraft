# Math Practice — First-Class Sidebar Feature

**Date:** 2026-02-18
**Status:** Approved

## Summary

Promote Math Practice from a lesson-scoped button to a standalone sidebar category. Kids can start independent practice sessions (pick a topic freely), save their work (canvas drawings, problems, evaluations, chat), and return to past sessions.

## Requirements

- **Independent sessions:** Kids pick a math topic freely — no lesson required
- **Full persistence:** Save problems, canvas images (PNG files), evaluation results, and chat history
- **Session list landing:** Sidebar click shows list of past sessions + "New Practice" button
- **Simple topic picker:** Text input with preset topic chips, grade auto-detected from kid profile
- **Reviewable history:** Returning to a session shows all past attempts with canvas images and chat

## Data Models (backend `math` app)

### MathPracticeSession

| Field | Type | Notes |
|-------|------|-------|
| kid | FK → KidProfile | CASCADE |
| topic | CharField(100) | "Fractions", "Algebra", etc. |
| chat_session | OneToOne → ChatSession | SET_NULL, nullable |
| created_at | DateTimeField | auto_now_add |
| updated_at | DateTimeField | auto_now |

### MathProblemAttempt

| Field | Type | Notes |
|-------|------|-------|
| session | FK → MathPracticeSession | CASCADE, related_name="attempts" |
| problem_text | TextField | Generated problem |
| difficulty | CharField | easy/medium/hard |
| hint | TextField | blank=True |
| canvas_image | ImageField | upload_to="math_canvas/", nullable |
| is_correct | BooleanField | nullable (null = not yet submitted) |
| correct_answer | TextField | blank=True |
| feedback | TextField | blank=True |
| created_at | DateTimeField | auto_now_add |
| order | PositiveIntegerField | default=0 |

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/math/sessions/` | GET | List kid's practice sessions |
| `/api/v1/math/sessions/` | POST | Create new session (topic) |
| `/api/v1/math/sessions/:id/` | GET | Session detail with all attempts |
| `/api/v1/math/sessions/:id/attempts/` | POST | Save a problem attempt |
| `/api/v1/math/sessions/:id/attempts/:id/` | PATCH | Update attempt with evaluation/canvas |

Existing `/api/v1/math/generate/` and `/api/v1/math/evaluate/` remain unchanged.

## Frontend Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/math-practice` | MathPracticeList | Session list + "New Practice" button |
| `/math-practice/new` | MathPracticeNew | Topic picker |
| `/math-practice/:sessionId` | MathPractice (refactored) | Practice workspace |

## Frontend Components

### New
- **MathPracticeList.tsx** — Lists sessions (topic, date, problem count, accuracy). "New Practice" CTA.
- **MathPracticeNew.tsx** — Topic input with preset chips, grade auto-detected.

### Refactored
- **MathPractice.tsx** — Decoupled from lessons. Works with MathPracticeSession. Saves canvas images on submit. Shows past attempts when revisiting.

### Navigation
- Add "Math Practice" with Calculator icon to kid sidebar nav (between Canvas and Progress).

## Data Flow

```
Sidebar → Session List (GET /math/sessions/)
  → "New Practice" → Topic Picker → POST /math/sessions/ (creates session + ChatSession)
    → Practice Workspace
      → Generate problem (existing /math/generate/)
      → Save as attempt (POST /sessions/:id/attempts/)
      → Kid draws, submits
        → Export canvas PNG, save to attempt
        → Evaluate (existing /math/evaluate/)
        → Save evaluation to attempt
      → Kid can continue or leave
  → Click past session → loads attempts + chat → can continue practicing
```

## What stays unchanged
- Problem generation (Claude Sonnet)
- Answer evaluation (GPT-4o-mini vision)
- Chat tutor (Claude Haiku with math system prompt)
- Existing "Practice Math" button on math lessons (keep as shortcut or remove later)

## Architecture choice
Models added directly to existing `math` app (was stateless, now gets persistence). Keeps all math logic in one place.
