from django.db import models


class MathPracticeSession(models.Model):
    kid = models.ForeignKey(
        "core.KidProfile", on_delete=models.CASCADE, related_name="math_sessions"
    )
    topic = models.CharField(max_length=100)
    chat_session = models.OneToOneField(
        "chat.ChatSession", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="math_practice_session",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.kid.display_name}: {self.topic}"


class MathProblemAttempt(models.Model):
    class Difficulty(models.TextChoices):
        EASY = "easy", "Easy"
        MEDIUM = "medium", "Medium"
        HARD = "hard", "Hard"

    session = models.ForeignKey(
        MathPracticeSession, on_delete=models.CASCADE, related_name="attempts"
    )
    problem_text = models.TextField()
    difficulty = models.CharField(max_length=10, choices=Difficulty.choices, default=Difficulty.MEDIUM)
    hint = models.TextField(blank=True)
    canvas_image = models.ImageField(upload_to="math_canvas/", null=True, blank=True)
    is_correct = models.BooleanField(null=True, blank=True)
    correct_answer = models.TextField(blank=True)
    feedback = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self):
        status = "✓" if self.is_correct else "✗" if self.is_correct is False else "…"
        return f"[{status}] {self.problem_text[:60]}"
