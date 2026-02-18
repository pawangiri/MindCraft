"""
Signals for auto-awarding badges and updating streaks.

Listens for:
- LessonProgress saved (lesson completion)
- QuizAttempt saved (quiz submission)
- JournalEntry saved (journal creation)
"""

from datetime import date

from django.db.models.signals import post_save
from django.dispatch import receiver

from mindcraft.progress.models import LessonProgress, Badge, KidBadge, Streak


def _update_streak(kid):
    """Update the kid's streak on any activity."""
    streak, _ = Streak.objects.get_or_create(kid=kid)
    today = date.today()

    if streak.last_activity_date == today:
        return  # Already active today

    if streak.last_activity_date and (today - streak.last_activity_date).days == 1:
        streak.current_streak += 1
    elif streak.last_activity_date and (today - streak.last_activity_date).days > 1:
        streak.current_streak = 1
    else:
        streak.current_streak = 1

    streak.last_activity_date = today
    if streak.current_streak > streak.longest_streak:
        streak.longest_streak = streak.current_streak
    streak.save()

    # Check streak badge (7-day streak)
    if streak.current_streak >= 7:
        _award_badge(kid, Badge.BadgeType.STREAK)


def _award_badge(kid, badge_type):
    """Award a badge to a kid if they haven't earned it yet."""
    badge = Badge.objects.filter(badge_type=badge_type).first()
    if badge:
        KidBadge.objects.get_or_create(kid=kid, badge=badge)


def _check_first_steps(kid):
    """Award First Steps badge on any first activity."""
    _award_badge(kid, Badge.BadgeType.FIRST_STEPS)


def _check_explorer(kid):
    """Award Explorer badge when lessons completed in 3+ subjects."""
    from mindcraft.progress.models import LessonProgress

    completed = LessonProgress.objects.filter(
        kid=kid, status=LessonProgress.Status.COMPLETED
    ).select_related("lesson__topic__subject")

    subjects = set()
    for p in completed:
        if p.lesson and p.lesson.topic and p.lesson.topic.subject:
            subjects.add(p.lesson.topic.subject_id)

    if len(subjects) >= 3:
        _award_badge(kid, Badge.BadgeType.EXPLORER)


@receiver(post_save, sender=LessonProgress)
def on_lesson_progress_save(sender, instance, **kwargs):
    """Handle lesson progress updates."""
    if instance.status != LessonProgress.Status.COMPLETED:
        return

    kid = instance.kid

    _update_streak(kid)
    _check_first_steps(kid)

    # Check "Lesson Master" — complete 10 lessons
    completed_count = LessonProgress.objects.filter(
        kid=kid, status=LessonProgress.Status.COMPLETED
    ).count()
    if completed_count >= 1:
        # "First Steps" is also triggered by first lesson
        _award_badge(kid, Badge.BadgeType.FIRST_STEPS)
    if completed_count >= 10:
        _award_badge(kid, Badge.BadgeType.LESSON_COMPLETE)

    _check_explorer(kid)


@receiver(post_save, sender="quiz.QuizAttempt")
def on_quiz_attempt_save(sender, instance, **kwargs):
    """Handle quiz attempt completion."""
    if instance.completed_at is None:
        return

    kid = instance.kid

    _update_streak(kid)
    _check_first_steps(kid)

    # Check "Quiz Whiz" — score 100% on a quiz
    if instance.max_score > 0 and instance.score >= instance.max_score:
        _award_badge(kid, Badge.BadgeType.QUIZ_ACE)


@receiver(post_save, sender="journal.JournalEntry")
def on_journal_entry_save(sender, instance, created, **kwargs):
    """Handle journal entry creation."""
    if not created:
        return

    kid = instance.kid

    _update_streak(kid)
    _check_first_steps(kid)

    # Check "Bookworm" — 5 journal entries
    from mindcraft.journal.models import JournalEntry

    journal_count = JournalEntry.objects.filter(kid=kid).count()
    if journal_count >= 5:
        _award_badge(kid, Badge.BadgeType.BOOKWORM)
