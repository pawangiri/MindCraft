from django.contrib import admin
from .models import Quiz, Question, Choice, QuizAttempt, QuestionAnswer


class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 4


class QuestionInline(admin.StackedInline):
    model = Question
    extra = 1
    show_change_link = True


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ["title", "lesson", "quiz_type", "ai_generated", "is_active"]
    list_filter = ["quiz_type", "ai_generated", "is_active"]
    inlines = [QuestionInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ["question_text_short", "quiz", "question_type", "points"]
    list_filter = ["question_type"]
    inlines = [ChoiceInline]

    @admin.display(description="Question")
    def question_text_short(self, obj):
        return obj.question_text[:80]


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ["kid", "quiz", "score", "max_score", "started_at", "completed_at"]
    list_filter = ["kid", "quiz"]
