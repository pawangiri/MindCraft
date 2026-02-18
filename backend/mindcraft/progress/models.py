from django.db import models


class LessonProgress(models.Model):
    class Status(models.TextChoices):
        NOT_STARTED = "not_started", "Not Started"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"

    kid = models.ForeignKey("core.KidProfile", on_delete=models.CASCADE, related_name="lesson_progress")
    lesson = models.ForeignKey("content.Lesson", on_delete=models.CASCADE, related_name="progress")
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.NOT_STARTED)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_spent_seconds = models.IntegerField(default=0)

    class Meta:
        unique_together = ["kid", "lesson"]
        verbose_name_plural = "lesson progress"

    def __str__(self):
        return f"{self.kid.display_name} — {self.lesson.title}: {self.status}"


class Badge(models.Model):
    class BadgeType(models.TextChoices):
        LESSON_COMPLETE = "lesson_complete", "Lesson Complete"
        QUIZ_ACE = "quiz_ace", "Quiz Ace"
        STREAK = "streak", "Streak"
        EXPLORER = "explorer", "Explorer"
        BOOKWORM = "bookworm", "Bookworm"
        FIRST_STEPS = "first_steps", "First Steps"

    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=50, default="⭐")
    badge_type = models.CharField(max_length=20, choices=BadgeType.choices)
    criteria = models.JSONField(default=dict, help_text="Conditions to earn this badge")

    def __str__(self):
        return f"{self.icon} {self.name}"


class KidBadge(models.Model):
    kid = models.ForeignKey("core.KidProfile", on_delete=models.CASCADE, related_name="badges")
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["kid", "badge"]

    def __str__(self):
        return f"{self.kid.display_name} earned {self.badge.name}"


class Streak(models.Model):
    kid = models.OneToOneField("core.KidProfile", on_delete=models.CASCADE, related_name="streak")
    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.kid.display_name}: {self.current_streak} day streak"
