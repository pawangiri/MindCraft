from django.contrib import admin
from .models import Subject, Topic, Lesson, ResearchSession, ResearchFinding, MediaResource, CurriculumPlan, CurriculumLesson


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ["icon", "name", "order", "is_active"]
    list_editable = ["order", "is_active"]


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ["name", "subject", "grade_level_min", "grade_level_max", "order"]
    list_filter = ["subject"]
    list_editable = ["order"]


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ["title", "topic", "grade_level", "difficulty", "status", "ai_generated", "created_at"]
    list_filter = ["status", "difficulty", "ai_generated", "topic__subject"]
    search_fields = ["title", "content"]
    filter_horizontal = ("assigned_to",)
    actions = ["publish_lessons"]

    @admin.action(description="Publish selected lessons")
    def publish_lessons(self, request, queryset):
        queryset.update(status=Lesson.Status.PUBLISHED)


class ResearchFindingInline(admin.StackedInline):
    model = ResearchFinding
    extra = 0


class MediaResourceInline(admin.TabularInline):
    model = MediaResource
    extra = 0


@admin.register(ResearchSession)
class ResearchSessionAdmin(admin.ModelAdmin):
    list_display = ["topic_query", "subject", "grade_level", "status", "created_by", "created_at"]
    list_filter = ["status", "subject", "difficulty"]
    inlines = [ResearchFindingInline, MediaResourceInline]


@admin.register(MediaResource)
class MediaResourceAdmin(admin.ModelAdmin):
    list_display = ["title", "media_type", "source", "is_included", "session"]
    list_filter = ["media_type", "source", "is_included"]


class CurriculumLessonInline(admin.TabularInline):
    model = CurriculumLesson
    extra = 0


@admin.register(CurriculumPlan)
class CurriculumPlanAdmin(admin.ModelAdmin):
    list_display = ["concept", "title", "grade_level", "difficulty", "status", "duration_weeks", "lessons_per_week", "created_by", "created_at"]
    list_filter = ["status", "difficulty", "grade_level", "subject"]
    search_fields = ["concept", "title", "description"]
    filter_horizontal = ("assigned_to",)
    inlines = [CurriculumLessonInline]


@admin.register(CurriculumLesson)
class CurriculumLessonAdmin(admin.ModelAdmin):
    list_display = ["curriculum", "lesson", "week_number", "order"]
    list_filter = ["week_number", "curriculum"]
