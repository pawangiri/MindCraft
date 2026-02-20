# Subject/Topic Inline CRUD Design

## Summary
Add create/edit/delete capabilities for Subjects and Topics directly within the AI Generator and Research Lab pages via modal dialogs.

## Backend
- Upgrade `SubjectViewSet` and `TopicViewSet` from `ReadOnlyModelViewSet` to `ModelViewSet`
- Add `IsAdminUser` permission for write operations (create, update, delete)
- Override `destroy()` to block deletion when related objects exist (subjects with topics, topics with lessons)

## Frontend
- `SubjectPicker.tsx` — dropdown + create/edit/delete icon buttons with modals
- `TopicPicker.tsx` — same pattern, filtered by selected subject
- Modals: simple form dialogs with validation, using existing Tailwind theme
- Integration: replace bare selects in `LessonGenerator.tsx` and `ResearchPipeline.tsx`

## Modal Fields
- **Subject**: name, description, icon (emoji text input), color (hex with preview)
- **Topic**: name, description, grade_level_min, grade_level_max (auto-linked to selected subject)

## Delete Behavior
- Block deletion if subject has topics or topic has lessons
- Show clear error message telling user to remove children first
