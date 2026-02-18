from django.contrib import admin
from .models import LessonProgress, Badge, KidBadge, Streak


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ["kid", "lesson", "status", "time_spent_seconds", "completed_at"]
    list_filter = ["status", "kid"]


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ["icon", "name", "badge_type"]


@admin.register(KidBadge)
class KidBadgeAdmin(admin.ModelAdmin):
    list_display = ["kid", "badge", "earned_at"]
    list_filter = ["kid"]


@admin.register(Streak)
class StreakAdmin(admin.ModelAdmin):
    list_display = ["kid", "current_streak", "longest_streak", "last_activity_date"]
