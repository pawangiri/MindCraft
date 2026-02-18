from rest_framework import serializers
from .models import LessonProgress, Badge, KidBadge, Streak


class LessonProgressSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source="lesson.title", read_only=True)

    class Meta:
        model = LessonProgress
        fields = ["id", "lesson", "lesson_title", "status", "started_at", "completed_at", "time_spent_seconds"]


class BadgeSerializer(serializers.ModelSerializer):
    earned = serializers.SerializerMethodField()
    earned_at = serializers.SerializerMethodField()

    class Meta:
        model = Badge
        fields = ["id", "name", "description", "icon", "badge_type", "earned", "earned_at"]

    def get_earned(self, obj):
        kid = self.context.get("kid")
        if kid:
            return KidBadge.objects.filter(kid=kid, badge=obj).exists()
        return False

    def get_earned_at(self, obj):
        kid = self.context.get("kid")
        if kid:
            kb = KidBadge.objects.filter(kid=kid, badge=obj).first()
            return kb.earned_at if kb else None
        return None


class StreakSerializer(serializers.ModelSerializer):
    class Meta:
        model = Streak
        fields = ["current_streak", "longest_streak", "last_activity_date"]
