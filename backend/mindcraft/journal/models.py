from django.db import models


class JournalEntry(models.Model):
    kid = models.ForeignKey("core.KidProfile", on_delete=models.CASCADE, related_name="journal_entries")
    lesson = models.ForeignKey(
        "content.Lesson", on_delete=models.SET_NULL, null=True, blank=True, related_name="journal_entries"
    )
    title = models.CharField(max_length=300)
    content = models.TextField(help_text="What the kid wrote")
    ai_feedback = models.TextField(blank=True, help_text="AI-generated feedback")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "journal entries"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.kid.display_name}: {self.title}"
