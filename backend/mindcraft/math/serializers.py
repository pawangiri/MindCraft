from rest_framework import serializers
from .models import MathPracticeSession, MathProblemAttempt


class MathProblemAttemptSerializer(serializers.ModelSerializer):
    canvas_image_url = serializers.SerializerMethodField()

    class Meta:
        model = MathProblemAttempt
        fields = [
            "id", "problem_text", "difficulty", "hint",
            "canvas_image", "canvas_image_url",
            "is_correct", "correct_answer", "feedback",
            "order", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
        extra_kwargs = {"canvas_image": {"write_only": True}}

    def get_canvas_image_url(self, obj):
        if obj.canvas_image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.canvas_image.url)
            return obj.canvas_image.url
        return None


class MathPracticeSessionListSerializer(serializers.ModelSerializer):
    attempt_count = serializers.SerializerMethodField()
    correct_count = serializers.SerializerMethodField()
    chat_session_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = MathPracticeSession
        fields = [
            "id", "topic", "chat_session_id",
            "attempt_count", "correct_count",
            "created_at", "updated_at",
        ]

    def get_attempt_count(self, obj):
        return obj.attempts.filter(is_correct__isnull=False).count()

    def get_correct_count(self, obj):
        return obj.attempts.filter(is_correct=True).count()


class MathPracticeSessionDetailSerializer(serializers.ModelSerializer):
    attempts = MathProblemAttemptSerializer(many=True, read_only=True)
    chat_session_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = MathPracticeSession
        fields = [
            "id", "topic", "chat_session_id",
            "attempts", "created_at", "updated_at",
        ]


class MathPracticeSessionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MathPracticeSession
        fields = ["id", "topic", "chat_session_id"]
        read_only_fields = ["id", "chat_session_id"]
