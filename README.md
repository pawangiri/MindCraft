# 🧠 Learning Monk

A local family learning platform where parents create AI-assisted educational content, and kids learn through interactive lessons, quizzes, AI chat tutoring, drawing, and journaling.

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Copy env file and add your Anthropic API key
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Install dependencies (requires UV - https://docs.astral.sh/uv/)
uv sync

# Run migrations and seed database
uv run python manage.py migrate
uv run python manage.py seed

# Start the server
uv run python manage.py runserver
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### 3. Open Learning Monk

- **Frontend:** http://localhost:5173
- **Django Admin:** http://localhost:8000/admin/

### Login Credentials

| User    | Username | Password  | Role          |
|---------|----------|-----------|---------------|
| Parent  | parent   | mindcraft | Admin/Parent  |
| Alex    | alex     | alex123   | Kid (Grade 3) |
| Sam     | sam      | sam123    | Kid (Grade 6) |
| Jordan  | jordan   | jordan123 | Kid (Grade 9) |

## Tech Stack

- **Backend:** Python 3.12+, Django 6, Django REST Framework, UV
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS
- **Database:** SQLite
- **AI:** Anthropic Claude API

## Project Structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.
See [TODO.md](./TODO.md) for task breakdown and agent handoff instructions.

## Features

### ✅ Built
- User authentication (admin/kid roles)
- Lesson management (create, assign, view, complete)
- AI Chat Tutor with streaming responses
- Django Admin panel (full content management)
- Kid Dashboard with progress stats
- Lesson viewer with markdown rendering
- AI lesson generation (backend API ready)
- AI quiz generation (backend API ready)
- Journal system (backend API ready)
- Progress tracking (backend API ready)
- Badge system (backend models ready)

### 🔧 Ready for Agent Handoff
- Quiz player UI (models + API done)
- Journal editor UI (models + API done)
- Canvas/drawing board (tldraw integration)
- Progress dashboard UI
- Admin content generator UI
- Badge animations
- Kid activity monitor

## AI Features

Learning Monk uses Claude for:
- **Chat Tutor** — Age-appropriate AI tutor per kid, with lesson context
- **Lesson Generator** — Admin generates lessons by topic + grade
- **Quiz Generator** — Auto-generate quizzes from lesson content
- **Journal Feedback** — Encouraging AI feedback on journal entries
- **Hint System** — Progressive hints for quiz questions

All AI interactions are logged, rate-limited, and filtered through a safety layer.

## Adding Your API Key

Edit `backend/.env`:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

The chat and AI generation features require a valid Anthropic API key.
