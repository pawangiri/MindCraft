from django.db import models


class ChatSession(models.Model):
    class ContextType(models.TextChoices):
        GENERAL = "general", "General"
        LESSON = "lesson", "Lesson Help"
        QUIZ_HELP = "quiz_help", "Quiz Help"
        CANVAS = "canvas", "Canvas"
        MATH = "math", "Math Practice"

    kid = models.ForeignKey("core.KidProfile", on_delete=models.CASCADE, related_name="chat_sessions")
    title = models.CharField(max_length=200, default="New Chat")
    context_type = models.CharField(max_length=20, choices=ContextType.choices, default=ContextType.GENERAL)
    context_id = models.IntegerField(null=True, blank=True, help_text="ID of related lesson/quiz")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.kid.display_name}: {self.title}"


class ChatMessage(models.Model):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"
        SYSTEM = "system", "System"

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"[{self.role}] {self.content[:60]}"
