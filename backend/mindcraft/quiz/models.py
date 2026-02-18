from django.db import models


class Quiz(models.Model):
    class QuizType(models.TextChoices):
        LESSON_REVIEW = "lesson_review", "Lesson Review"
        TOPIC_TEST = "topic_test", "Topic Test"
        CHALLENGE = "challenge", "Challenge"

    lesson = models.ForeignKey(
        "content.Lesson", on_delete=models.CASCADE, null=True, blank=True, related_name="quizzes"
    )
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    quiz_type = models.CharField(max_length=20, choices=QuizType.choices, default=QuizType.LESSON_REVIEW)
    time_limit_minutes = models.IntegerField(null=True, blank=True)
    ai_generated = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "quizzes"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Question(models.Model):
    class QuestionType(models.TextChoices):
        MULTIPLE_CHOICE = "multiple_choice", "Multiple Choice"
        TRUE_FALSE = "true_false", "True/False"
        FILL_BLANK = "fill_blank", "Fill in the Blank"
        SHORT_ANSWER = "short_answer", "Short Answer"

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    question_text = models.TextField()
    question_type = models.CharField(
        max_length=20, choices=QuestionType.choices, default=QuestionType.MULTIPLE_CHOICE
    )
    order = models.IntegerField(default=0)
    points = models.IntegerField(default=1)
    hint = models.TextField(blank=True, help_text="AI hint for this question")
    explanation = models.TextField(blank=True, help_text="Explanation shown after answering")

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"Q{self.order}: {self.question_text[:60]}"


class Choice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="choices")
    choice_text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{'✓' if self.is_correct else '✗'} {self.choice_text[:40]}"


class QuizAttempt(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")
    kid = models.ForeignKey("core.KidProfile", on_delete=models.CASCADE, related_name="quiz_attempts")
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    score = models.IntegerField(default=0)
    max_score = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.kid} — {self.quiz} ({self.score}/{self.max_score})"


class QuestionAnswer(models.Model):
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_choice = models.ForeignKey(Choice, on_delete=models.SET_NULL, null=True, blank=True)
    text_answer = models.TextField(blank=True)
    is_correct = models.BooleanField(default=False)
    hints_used = models.IntegerField(default=0)

    def __str__(self):
        return f"{'✓' if self.is_correct else '✗'} {self.question}"
