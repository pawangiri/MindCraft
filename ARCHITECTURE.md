# Learning Monk — Architecture Guide

## Overview

Learning Monk is a local family learning platform where parents create and curate AI-assisted educational content, and kids learn through interactive lessons, quizzes, AI chat tutoring, canvas/drawing, and journaling.

## Tech Stack

- **Backend:** Python 3.13+ with Django 5.x, Django REST Framework, UV package manager
- **Frontend:** React 18+ with Vite, TypeScript, Tailwind CSS
- **Database:** SQLite (local use)
- **AI:** Anthropic Claude API (via Python SDK)
- **Canvas:** tldraw or Excalidraw (future integration)

## Project Structure

```
MindCraft/
├── backend/                    # Django project
│   ├── pyproject.toml          # UV/Python dependencies
│   ├── manage.py
│   └── mindcraft/
│       ├── settings.py
│       ├── urls.py
│       ├── wsgi.py
│       ├── core/               # Core app: users, auth
│       │   ├── models.py       # User, KidProfile
│       │   ├── views.py        # Auth views
│       │   ├── serializers.py
│       │   ├── urls.py
│       │   └── admin.py
│       ├── content/            # Content app: lessons, topics
│       │   ├── models.py       # Subject, Topic, Lesson, LessonContent
│       │   ├── views.py
│       │   ├── serializers.py
│       │   ├── urls.py
│       │   └── admin.py
│       ├── quiz/               # Quiz app
│       │   ├── models.py       # Quiz, Question, Choice, QuizAttempt, Answer
│       │   ├── views.py
│       │   ├── serializers.py
│       │   ├── urls.py
│       │   └── admin.py
│       ├── chat/               # AI Chat app
│       │   ├── models.py       # ChatSession, ChatMessage
│       │   ├── views.py        # Streaming chat endpoint
│       │   ├── serializers.py
│       │   ├── urls.py
│       │   └── admin.py
│       ├── journal/            # Journal/reflection app
│       │   ├── models.py       # JournalEntry, AIFeedback
│       │   ├── views.py
│       │   ├── serializers.py
│       │   ├── urls.py
│       │   └── admin.py
│       ├── progress/           # Progress tracking app
│       │   ├── models.py       # LessonProgress, Badge, KidBadge, Streak
│       │   ├── views.py
│       │   ├── serializers.py
│       │   ├── urls.py
│       │   └── admin.py
│       └── ai_service/         # AI integration layer (not a Django app)
│           ├── __init__.py
│           ├── client.py       # Claude API wrapper
│           ├── prompts.py      # System prompts per feature
│           ├── safety.py       # Content filtering, guardrails
│           └── generators.py   # Lesson gen, quiz gen, feedback gen
├── frontend/                   # React + Vite project
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/                # API client, hooks
│       │   ├── client.ts       # Axios/fetch wrapper
│       │   ├── auth.ts         # Auth API calls
│       │   ├── lessons.ts
│       │   ├── quizzes.ts
│       │   ├── chat.ts
│       │   └── progress.ts
│       ├── stores/             # State management (zustand)
│       │   └── authStore.ts
│       ├── components/         # Shared components
│       │   ├── Layout.tsx
│       │   ├── Sidebar.tsx
│       │   ├── Header.tsx
│       │   └── ui/             # Base UI components
│       ├── features/           # Feature modules
│       │   ├── auth/
│       │   │   └── LoginPage.tsx
│       │   ├── dashboard/
│       │   │   ├── KidDashboard.tsx
│       │   │   └── AdminDashboard.tsx
│       │   ├── lessons/
│       │   │   ├── LessonList.tsx
│       │   │   ├── LessonViewer.tsx
│       │   │   └── LessonCreator.tsx  (admin)
│       │   ├── quiz/
│       │   │   ├── QuizPlayer.tsx
│       │   │   └── QuizResult.tsx
│       │   ├── chat/
│       │   │   ├── ChatWindow.tsx
│       │   │   └── ChatMessage.tsx
│       │   ├── journal/
│       │   │   ├── JournalList.tsx
│       │   │   └── JournalEditor.tsx
│       │   ├── canvas/
│       │   │   └── CanvasBoard.tsx
│       │   └── progress/
│       │       ├── ProgressDashboard.tsx
│       │       └── BadgeDisplay.tsx
│       └── utils/
│           ├── cn.ts           # classnames helper
│           └── constants.ts
├── ARCHITECTURE.md             # This file
├── TODO.md                     # Task breakdown for agents
└── README.md                   # Setup instructions
```

## Data Models

### Core (core app)

**User** — Django's built-in User model extended with:
- `role`: "admin" | "kid"

**KidProfile** — extends User for kid-specific data:
- `user` → FK to User
- `display_name` — fun name shown in UI
- `avatar` — avatar image/identifier
- `grade_level` — integer (1-12)
- `date_of_birth` — for age-appropriate content
- `daily_chat_limit` — max AI messages per day
- `allowed_subjects` — M2M to Subject
- `parent` → FK to User (the admin parent)

### Content (content app)

**Subject** — top-level category (e.g., "Money & Budgeting", "Science"):
- `name`, `description`, `icon`, `color`, `order`

**Topic** — sub-category within a subject:
- `subject` → FK to Subject
- `name`, `description`, `order`, `grade_level_min`, `grade_level_max`

**Lesson** — individual lesson:
- `topic` → FK to Topic
- `title`, `description`, `content` (rich text/markdown)
- `grade_level` — target grade
- `difficulty` — easy/medium/hard
- `estimated_minutes`
- `created_by` → FK to User
- `ai_generated` — boolean
- `status` — draft/review/published
- `assigned_to` — M2M to KidProfile

### Quiz (quiz app)

**Quiz**:
- `lesson` → FK to Lesson (optional, can be standalone)
- `title`, `description`
- `quiz_type` — lesson_review/topic_test/challenge
- `time_limit_minutes` (optional)
- `ai_generated` — boolean

**Question**:
- `quiz` → FK to Quiz
- `question_text`, `question_type` — multiple_choice/true_false/fill_blank/short_answer
- `order`, `points`, `hint` (AI progressive hint)

**Choice**:
- `question` → FK to Question
- `choice_text`, `is_correct`, `order`

**QuizAttempt**:
- `quiz` → FK, `kid` → FK to KidProfile
- `started_at`, `completed_at`, `score`, `max_score`

**QuestionAnswer**:
- `attempt` → FK, `question` → FK
- `selected_choice` → FK (nullable), `text_answer`, `is_correct`, `hints_used`

### Chat (chat app)

**ChatSession**:
- `kid` → FK to KidProfile
- `title`, `context_type` — general/lesson/quiz_help/canvas
- `context_id` — optional FK to related lesson/quiz
- `created_at`, `is_active`

**ChatMessage**:
- `session` → FK to ChatSession
- `role` — user/assistant/system
- `content` — message text
- `created_at`

### Journal (journal app)

**JournalEntry**:
- `kid` → FK to KidProfile
- `lesson` → FK to Lesson (optional)
- `title`, `content` (what the kid wrote)
- `ai_feedback` — AI's response/encouragement
- `created_at`, `updated_at`

### Progress (progress app)

**LessonProgress**:
- `kid` → FK, `lesson` → FK
- `status` — not_started/in_progress/completed
- `started_at`, `completed_at`
- `time_spent_seconds`

**Badge**:
- `name`, `description`, `icon`
- `badge_type` — lesson_complete/quiz_ace/streak/explorer/etc.
- `criteria` — JSON field describing unlock conditions

**KidBadge**:
- `kid` → FK, `badge` → FK
- `earned_at`

**Streak**:
- `kid` → FK
- `current_streak`, `longest_streak`, `last_activity_date`

## API Endpoints

All endpoints prefixed with `/api/v1/`

### Auth
- `POST /auth/login/` — login, returns token
- `POST /auth/logout/` — logout
- `GET /auth/me/` — current user info + kid profile

### Content (kid-facing)
- `GET /lessons/` — list assigned lessons for current kid
- `GET /lessons/{id}/` — lesson detail with content
- `POST /lessons/{id}/complete/` — mark lesson complete

### Content (admin)
- `GET /admin/lessons/` — all lessons
- `POST /admin/lessons/` — create lesson
- `POST /admin/lessons/generate/` — AI generate lesson
- `PUT /admin/lessons/{id}/` — edit lesson
- `POST /admin/lessons/{id}/publish/` — publish lesson
- `POST /admin/lessons/{id}/assign/` — assign to kids

### Quiz
- `GET /quizzes/` — available quizzes for current kid
- `GET /quizzes/{id}/` — quiz with questions
- `POST /quizzes/{id}/start/` — start attempt
- `POST /quizzes/{id}/submit/` — submit answers
- `POST /quizzes/{id}/hint/` — get AI hint for a question
- `POST /admin/quizzes/generate/` — AI generate quiz from lesson

### Chat
- `GET /chat/sessions/` — kid's chat sessions
- `POST /chat/sessions/` — start new session
- `GET /chat/sessions/{id}/messages/` — message history
- `POST /chat/sessions/{id}/messages/` — send message (streams AI response)

### Journal
- `GET /journal/` — kid's journal entries
- `POST /journal/` — create entry
- `PUT /journal/{id}/` — update entry
- `POST /journal/{id}/feedback/` — request AI feedback

### Progress
- `GET /progress/` — kid's overall progress
- `GET /progress/badges/` — earned badges
- `GET /progress/streak/` — current streak info
- `GET /admin/progress/{kid_id}/` — admin view of kid's progress

## AI Service Layer

All AI calls go through `backend/mindcraft/ai_service/`. This is NOT a Django app — it's a service module used by the apps.

### client.py
- Wraps Anthropic Python SDK
- Handles streaming responses
- Applies token limits
- Logs all interactions

### prompts.py
- System prompts for each context:
  - `TUTOR_SYSTEM_PROMPT` — chat tutor, age-adapted
  - `LESSON_GENERATOR_PROMPT` — creates lessons from topic + grade
  - `QUIZ_GENERATOR_PROMPT` — creates quizzes from lesson content
  - `FEEDBACK_PROMPT` — journal feedback, encouraging tone
  - `HINT_PROMPT` — progressive quiz hints without giving answers

### safety.py
- Age-appropriate content filtering
- Topic boundary enforcement
- Response validation before sending to kids
- Rate limiting per kid

### generators.py
- `generate_lesson(topic, grade_level, difficulty)` → lesson content
- `generate_quiz(lesson_content, num_questions, question_types)` → quiz data
- `generate_feedback(journal_entry, kid_age)` → encouraging feedback
- `generate_hint(question, attempt_number)` → progressive hint

## Key Patterns

### API Pattern (for agents to replicate)
Every feature follows: Model → Serializer → ViewSet → URL → Frontend Hook → Component

### AI Integration Pattern
Every AI feature follows: Frontend triggers → API endpoint → ai_service function → Claude API → safety filter → response to frontend

### Auth Pattern
Token-based auth. Every request includes `Authorization: Token xxx`. Backend checks user role for admin-only endpoints.
