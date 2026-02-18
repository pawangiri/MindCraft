from rest_framework import serializers
from .models import JournalEntry


class JournalEntrySerializer(serializers.ModelSerializer):
    kid_name = serializers.CharField(source="kid.display_name", read_only=True)
    lesson_title = serializers.CharField(source="lesson.title", read_only=True, default=None)

    class Meta:
        model = JournalEntry
        fields = [
            "id", "kid_name", "lesson", "lesson_title", "title",
            "content", "ai_feedback", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "kid_name", "ai_feedback", "created_at", "updated_at"]
