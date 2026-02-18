from django.contrib import admin
from .models import JournalEntry


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ["kid", "title", "lesson", "has_feedback", "created_at"]
    list_filter = ["kid", "lesson"]
    search_fields = ["title", "content"]

    @admin.display(boolean=True, description="AI Feedback")
    def has_feedback(self, obj):
        return bool(obj.ai_feedback)
