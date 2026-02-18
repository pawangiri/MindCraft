# MindCraft — Task Breakdown

Status: ✅ Done | 🔧 In Progress | ⬜ Todo

## Phase 1: Foundation (Built in initial context)

- ✅ Project scaffolding (Django + React)
- ✅ Data models (all apps)
- ✅ Django admin configuration
- ✅ Auth system (login/logout/me)
- ✅ AI service layer (client, prompts, safety, generators)
- ✅ Content API (lessons CRUD + assignment)
- ✅ React shell (routing, layout, auth flow)
- ✅ Kid Dashboard
- ✅ Lesson viewer (end-to-end working)
- ✅ AI Chat tutor (streaming, end-to-end working)
- ✅ Admin Dashboard

## Phase 2: Core Features (Agent tasks)

### Task: Quiz Engine
**Priority:** High
**Files to create/modify:**
- backend: `mindcraft/quiz/views.py`, `mindcraft/quiz/serializers.py`, `mindcraft/quiz/urls.py`
- frontend: `src/features/quiz/QuizPlayer.tsx`, `src/features/quiz/QuizResult.tsx`
- frontend: `src/api/quizzes.ts`
**Pattern to follow:** See how Lessons work (content/views.py → LessonViewer.tsx)
**Models already exist:** Quiz, Question, Choice, QuizAttempt, QuestionAnswer
**API endpoints needed:**
- `GET /api/v1/quizzes/` — list quizzes assigned to kid (via lesson assignments)
- `GET /api/v1/quizzes/{id}/` — quiz with questions and choices
- `POST /api/v1/quizzes/{id}/start/` — create QuizAttempt
- `POST /api/v1/quizzes/{id}/submit/` — submit answers, calculate score
- `POST /api/v1/quizzes/{id}/hint/` — call ai_service.generate_hint()
**Frontend requirements:**
- Quiz player with question navigation, timer (optional), answer selection
- Progressive hint button that calls AI
- Result screen with score, correct answers, badge earned
- Add quiz link to lesson viewer ("Take Quiz" button after completing lesson)

### Task: AI Quiz Generator (Admin)
**Priority:** High
**Files to create/modify:**
- backend: Add `generate_quiz` endpoint to quiz/views.py
- frontend: Add button in admin lesson detail to "Generate Quiz"
**AI integration:** Use `ai_service.generators.generate_quiz()` — already implemented
**Flow:** Admin views a lesson → clicks "Generate Quiz" → backend sends lesson content to Claude → Claude returns structured quiz JSON → backend creates Quiz + Questions + Choices → admin reviews in Django admin or frontend

### Task: Journal System
**Priority:** Medium
**Files to create/modify:**
- backend: `mindcraft/journal/views.py`, `mindcraft/journal/serializers.py`, `mindcraft/journal/urls.py`
- frontend: `src/features/journal/JournalList.tsx`, `src/features/journal/JournalEditor.tsx`
- frontend: `src/api/journal.ts`
**Pattern to follow:** Same as lessons but with create/edit capability
**Models already exist:** JournalEntry
**API endpoints needed:**
- `GET /api/v1/journal/` — list kid's entries
- `POST /api/v1/journal/` — create entry
- `PUT /api/v1/journal/{id}/` — update entry
- `POST /api/v1/journal/{id}/feedback/` — get AI feedback
**Frontend requirements:**
- Rich text editor for journal entries (use a markdown editor like MDXEditor or similar)
- Linked to lessons (optional — "reflect on what you learned")
- AI feedback button — calls backend, shows encouraging response
- Journal list with dates and lesson links

### Task: Canvas / Drawing Board
**Priority:** Medium
**Files to create/modify:**
- frontend: `src/features/canvas/CanvasBoard.tsx`
- Consider using tldraw (https://tldraw.dev) or Excalidraw
**Requirements:**
- Standalone drawing canvas accessible from kid dashboard
- Can be linked to lessons ("Draw what you learned")
- Future: AI integration — "describe your drawing" or "help me draw X"
- Save drawings as images, attach to journal entries
**Notes:** Start with tldraw embed, it's the most feature-rich and easiest to integrate in React

### Task: Progress & Badges System
**Priority:** Medium
**Files to create/modify:**
- backend: `mindcraft/progress/views.py`, `mindcraft/progress/serializers.py`, `mindcraft/progress/urls.py`
- frontend: `src/features/progress/ProgressDashboard.tsx`, `src/features/progress/BadgeDisplay.tsx`
- frontend: `src/api/progress.ts`
**Models already exist:** LessonProgress, Badge, KidBadge, Streak
**API endpoints needed:**
- `GET /api/v1/progress/` — overall stats (lessons completed, quizzes taken, streak)
- `GET /api/v1/progress/badges/` — all badges with earned status
- `GET /api/v1/progress/streak/` — streak data
**Backend logic needed:**
- Auto-award badges when conditions are met (use Django signals):
  - "First Lesson" — complete first lesson
  - "Quiz Whiz" — score 100% on a quiz
  - "Streak Master" — 7 day streak
  - "Explorer" — complete lessons in 3+ subjects
  - "Bookworm" — write 5 journal entries
- Update streak on any activity (lesson complete, quiz submit, journal entry)
**Frontend requirements:**
- Visual progress dashboard with stats cards
- Badge grid showing earned (colorful) and locked (grayed out) badges
- Streak display with flame/fire icon
- Animations when badges are earned (use Framer Motion)

### Task: Admin Content Generator UI
**Priority:** Medium
**Files to create/modify:**
- frontend: `src/features/admin/LessonGenerator.tsx`, `src/features/admin/ContentReview.tsx`
**Requirements:**
- Form: select subject, topic, grade level, difficulty → "Generate with AI"
- Shows AI-generated lesson in preview
- Admin can edit, then save as draft or publish directly
- Content review queue — list of AI-generated drafts awaiting approval
**API endpoints (already exist):**
- `POST /api/v1/admin/lessons/generate/`
- `PUT /api/v1/admin/lessons/{id}/`
- `POST /api/v1/admin/lessons/{id}/publish/`

### Task: Admin Kid Activity Monitor
**Priority:** Low
**Files to create/modify:**
- frontend: `src/features/admin/KidActivity.tsx`
- backend: Add admin progress endpoint
**Requirements:**
- Per-kid view showing: recent lessons, quiz scores, chat sessions, journal entries
- Chat log viewer — read all AI conversations
- Weekly AI-generated summary of each kid's activity

## Phase 3: Polish & Extensions

### Task: Kid-Friendly Animations & Transitions
- Page transitions with Framer Motion
- Confetti on quiz completion / badge earned
- Fun loading states (bouncing books, spinning stars)
- Sound effects (optional, toggleable)

### Task: Rich Lesson Content
- Support for embedded videos (YouTube)
- Interactive code blocks (for older kids)
- Image galleries
- Step-by-step instructions with illustrations

### Task: Adaptive Difficulty
- AI adjusts quiz difficulty based on past performance
- Suggest next lessons based on progress
- Flag areas where kid is struggling

### Task: Multi-Device Support
- Responsive design for tablets (kids might use iPads)
- Touch-friendly interactions
- Offline support for lessons (PWA)

### Task: Canvas AI Integration
- Kid draws something → AI describes/explains it
- AI generates drawing prompts
- Collaborative canvas where AI adds to drawings
- Diagram generation from lesson content
