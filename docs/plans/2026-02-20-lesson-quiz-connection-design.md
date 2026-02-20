# Lesson-Quiz Connection Design

**Date:** 2026-02-20
**Status:** Approved

## Problem

Lessons and quizzes are disconnected in the kid experience. Lessons have "Mark as Complete" but no quiz prompt. Quizzes exist as a separate sidebar section. Admins have no streamlined way to generate a quiz when publishing a lesson.

## Decisions

- Quiz is **recommended but optional** — kids can mark a lesson complete without taking the quiz
- Quiz generation happens **automatically on publish** (with toggle to skip)
- **Keep both** sidebar items (Lessons + Quizzes) — quizzes sidebar serves as review/retake tool

## Existing Infrastructure

Already in place (no model changes needed):
- `Quiz.lesson` ForeignKey (nullable) in `quiz/models.py`
- `LessonDetailSerializer` exposes `has_quiz` and `quiz_id`
- `LessonViewer` shows "Take Quiz" button when quiz exists
- `POST /api/v1/quizzes/generate/` generates quiz from lesson content

## Design

### 1. Admin: Auto-Generate Quiz on Publish

When admin publishes a lesson with no existing quiz, show a confirmation dialog:
- **"Publish with Quiz"** (primary, default) — publishes lesson + triggers quiz generation
- **"Publish without Quiz"** — publishes lesson only
- Toast feedback: "Quiz is being generated..." → "Quiz generated with N questions"
- If lesson already has a quiz, publish normally without the dialog

### 2. Admin: Quiz Management in ContentReview

Each lesson row gets a quiz status indicator:
- **No quiz:** Gray badge + "Generate Quiz" button
- **Has quiz:** Green badge "Quiz (N questions)" + "View Quiz" link

"View Quiz" opens a modal/expandable showing questions, correct answers, and a "Regenerate" option.
"Generate Quiz" triggers generation for published lessons that were published without one.

### 3. Kid: Enhanced Lesson Viewer

Replace the small "Take Quiz" button with a prominent card after lesson content:
- **Quiz exists, not attempted:** Highlighted card — "Ready to test your knowledge?" + large button
- **Quiz exists, already passed:** Success card — "You scored X%!" + retake option
- **No quiz:** No change, just "Mark as Complete"

"Mark as Complete" remains available regardless of quiz status (quiz is recommended, not required).

### 4. No Model Changes

Zero migrations. Everything uses existing `Quiz.lesson` FK and serializer fields.

## Scope

| Area | Changes |
|------|---------|
| Backend | Minor: publish endpoint may need quiz generation trigger, or frontend handles it |
| Frontend Admin (ContentReview) | Publish dialog, quiz badges, view/generate quiz buttons |
| Frontend Kid (LessonViewer) | Enhanced quiz card with attempt status |
| Models | None |
| Migrations | None |
