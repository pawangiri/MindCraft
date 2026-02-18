from django.contrib import admin
from .models import MathPracticeSession, MathProblemAttempt


class MathProblemAttemptInline(admin.TabularInline):
    model = MathProblemAttempt
    extra = 0
    readonly_fields = ["created_at"]


@admin.register(MathPracticeSession)
class MathPracticeSessionAdmin(admin.ModelAdmin):
    list_display = ["kid", "topic", "attempt_count", "created_at"]
    list_filter = ["topic", "created_at"]
    inlines = [MathProblemAttemptInline]

    def attempt_count(self, obj):
        return obj.attempts.count()
