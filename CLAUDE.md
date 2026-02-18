# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MindCraft is a local family learning platform. Parents/admins create AI-assisted educational content; kids learn through interactive lessons, quizzes, AI chat tutoring, drawing, and journaling. Built with Django + DRF backend and React + TypeScript frontend.

## Development Commands

### Backend (Python/Django with UV)
```bash
cd backend
uv sync                                    # Install/sync dependencies
uv run python manage.py runserver           # Dev server on :8000
uv run python manage.py migrate             # Apply migrations
uv run python manage.py makemigrations      # Create new migrations
uv run python manage.py seed               # Seed DB with sample data
```

### Frontend (React/TypeScript with Vite)
```bash
cd frontend
npm install                                # Install dependencies
npm run dev                                # Dev server on :5173
npm run build                              # Production build (tsc + vite)
npm run lint                               # ESLint
```

### Running Both Servers
Frontend proxies `/api` requests to `localhost:8000` via Vite config, so both servers must run simultaneously.

### Seed Accounts
- Admin: `parent` / `mindcraft`
- Kids: `alex` / `alex123` (Grade 3), `sam` / `sam123` (Grade 6), `jordan` / `jordan123` (Grade 9)

## Architecture

### Monorepo Layout
```
backend/          # Django 6.0 + DRF, Python 3.12+, UV package manager, SQLite
frontend/         # React 19 + TypeScript, Vite 7, Tailwind CSS 4, Zustand
```

### Backend: Django Apps
Each app follows the pattern: **models → serializers → views (ViewSets) → urls → admin**.

- **core/** — User auth (token-based), KidProfile management
- **content/** — Subjects, Topics, Lessons (CRUD + AI generation)
- **quiz/** — Quizzes, Questions, Choices, QuizAttempts
- **chat/** — AI chat sessions with streaming SSE responses
- **journal/** — Journal entries with AI feedback
- **progress/** — LessonProgress, Badges, Streaks
- **ai_service/** — NOT a Django app. Centralized AI integration layer:
  - `client.py` — Anthropic API wrapper
  - `prompts.py` — System prompts per AI context (tutor, lesson generator, quiz generator, journal feedback)
  - `generators.py` — Content generation functions
  - `safety.py` — Content filtering and rate limiting

All API endpoints are under `/api/v1/`. URL routing is in `backend/mindcraft/urls.py`.

### Frontend: Feature-Based Structure
- **api/client.ts** — Axios instance, all TypeScript type definitions, auth header injection
- **stores/authStore.ts** — Zustand store for auth state (user, kid profile, token)
- **features/** — One directory per feature (auth, dashboard, lessons, chat, etc.)
- **components/Layout.tsx** — Sidebar navigation + main content area with `<Outlet />`
- **utils/cn.ts** — Tailwind class merge utility (clsx + tailwind-merge)

### Key Patterns

**Auth:** Token authentication via DRF. Frontend stores token in Zustand and sends `Authorization: Token <token>` header.

**Kid-scoped data:** ViewSets filter querysets — kids see only their assigned content, admins see everything:
```python
def get_queryset(self):
    if user.is_staff:
        return Model.objects.all()
    if hasattr(user, "kid_profile"):
        return Model.objects.filter(assigned_to=user.kid_profile)
    return Model.objects.none()
```

**AI chat streaming:** Uses Django `StreamingHttpResponse` with SSE. Frontend reads via `EventSource`-style fetch with `getReader()`.

**AI models:** `claude-sonnet-4-5` for content generation, `claude-haiku-4-5` for chat. Configured via env vars in `backend/.env`.

### Frontend Styling
- Tailwind CSS 4 with custom theme variables defined in `frontend/src/index.css` via `@theme`
- Fonts: Fredoka (headings), Nunito (body), JetBrains Mono (code)
- Color tokens: `primary-*`, `accent-*`, `success-*`, `surface-*`
- Icons: Lucide React for UI, emoji for subject categories

## Environment Variables

Copy `backend/.env.example` to `backend/.env`. Required:
- `DJANGO_SECRET_KEY`
- `ANTHROPIC_API_KEY` (needed for AI features: chat, lesson/quiz generation, journal feedback)
