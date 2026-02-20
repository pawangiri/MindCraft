from rest_framework import serializers
from .models import Subject, Topic, Lesson, ResearchSession, ResearchFinding, MediaResource, CurriculumPlan, CurriculumLesson


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ["id", "name", "description", "icon", "color", "order"]


class TopicSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)

    class Meta:
        model = Topic
        fields = ["id", "subject", "subject_name", "name", "description", "order", "grade_level_min", "grade_level_max"]


class LessonListSerializer(serializers.ModelSerializer):
    topic_name = serializers.CharField(source="topic.name", read_only=True)
    subject_name = serializers.CharField(source="topic.subject.name", read_only=True)
    subject_icon = serializers.CharField(source="topic.subject.icon", read_only=True)
    subject_color = serializers.CharField(source="topic.subject.color", read_only=True)
    has_quiz = serializers.SerializerMethodField()
    quiz_id = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            "id", "title", "description", "topic_name", "subject_name",
            "subject_icon", "subject_color", "grade_level", "difficulty",
            "estimated_minutes", "status", "ai_generated", "has_quiz", "quiz_id", "created_at",
        ]

    def get_has_quiz(self, obj):
        return obj.quizzes.filter(is_active=True).exists()

    def get_quiz_id(self, obj):
        quiz = obj.quizzes.filter(is_active=True).first()
        return quiz.id if quiz else None


class LessonDetailSerializer(serializers.ModelSerializer):
    topic_name = serializers.CharField(source="topic.name", read_only=True)
    subject_name = serializers.CharField(source="topic.subject.name", read_only=True)
    subject_icon = serializers.CharField(source="topic.subject.icon", read_only=True)
    has_quiz = serializers.SerializerMethodField()
    quiz_id = serializers.SerializerMethodField()
    quiz_best_score = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            "id", "title", "description", "content", "topic", "topic_name",
            "subject_name", "subject_icon", "grade_level", "difficulty",
            "estimated_minutes", "status", "ai_generated", "has_quiz", "quiz_id",
            "quiz_best_score", "created_at",
        ]

    def get_has_quiz(self, obj):
        return obj.quizzes.filter(is_active=True).exists()

    def get_quiz_id(self, obj):
        quiz = obj.quizzes.filter(is_active=True).first()
        return quiz.id if quiz else None

    def get_quiz_best_score(self, obj):
        request = self.context.get("request")
        if not request or not hasattr(request.user, "kid_profile"):
            return None
        from mindcraft.quiz.models import QuizAttempt
        quiz = obj.quizzes.filter(is_active=True).first()
        if not quiz:
            return None
        attempt = QuizAttempt.objects.filter(
            quiz=quiz, kid=request.user.kid_profile, completed_at__isnull=False
        ).order_by("-score").first()
        if not attempt:
            return None
        return {
            "score": attempt.score,
            "max_score": attempt.max_score,
            "percentage": round(attempt.score / attempt.max_score * 100) if attempt.max_score > 0 else 0,
        }


class LessonCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = [
            "title", "description", "content", "topic", "grade_level",
            "difficulty", "estimated_minutes", "status",
        ]


class MediaResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaResource
        fields = [
            "id", "session", "lesson", "url", "title", "description",
            "media_type", "source", "thumbnail_url", "order", "is_included", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ResearchFindingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchFinding
        fields = [
            "id", "session", "summary", "key_facts", "citations",
            "parent_notes", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "session", "created_at", "updated_at"]


class ResearchSessionListSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    subject_icon = serializers.CharField(source="subject.icon", read_only=True)
    topic_name = serializers.CharField(source="topic.name", read_only=True, default="")
    lesson_id = serializers.IntegerField(source="lesson.id", read_only=True, default=None)

    class Meta:
        model = ResearchSession
        fields = [
            "id", "subject_name", "subject_icon", "topic_name", "topic_query",
            "grade_level", "difficulty", "status", "lesson_id", "created_at", "updated_at",
        ]


class ResearchSessionDetailSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    subject_icon = serializers.CharField(source="subject.icon", read_only=True)
    topic_name = serializers.CharField(source="topic.name", read_only=True, default="")
    finding = ResearchFindingSerializer(read_only=True)
    media_resources = MediaResourceSerializer(many=True, read_only=True)
    lesson_id = serializers.IntegerField(source="lesson.id", read_only=True, default=None)

    class Meta:
        model = ResearchSession
        fields = [
            "id", "subject", "subject_name", "subject_icon", "topic", "topic_name",
            "topic_query", "grade_level", "difficulty", "status", "lesson_id",
            "finding", "media_resources", "created_at", "updated_at",
        ]


class ResearchSessionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchSession
        fields = ["id", "subject", "topic", "topic_query", "grade_level", "difficulty", "status"]
        read_only_fields = ["id", "status"]


class CurriculumLessonSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source="lesson.title", read_only=True, default="")
    lesson_status = serializers.CharField(source="lesson.status", read_only=True, default="")
    lesson_content = serializers.CharField(source="lesson.content", read_only=True, default="")

    class Meta:
        model = CurriculumLesson
        fields = [
            "id", "curriculum", "lesson", "lesson_title", "lesson_status",
            "lesson_content", "week_number", "order", "learning_objectives",
        ]
        read_only_fields = ["id"]


class CurriculumPlanListSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True, default="")
    subject_icon = serializers.CharField(source="subject.icon", read_only=True, default="")
    subject_color = serializers.CharField(source="subject.color", read_only=True, default="")
    total_lessons = serializers.SerializerMethodField()
    generated_lessons = serializers.SerializerMethodField()

    class Meta:
        model = CurriculumPlan
        fields = [
            "id", "title", "description", "concept", "grade_level", "difficulty",
            "duration_weeks", "lessons_per_week", "status", "subject_name",
            "subject_icon", "subject_color", "total_lessons", "generated_lessons",
            "created_at", "updated_at",
        ]

    def get_total_lessons(self, obj):
        return obj.duration_weeks * obj.lessons_per_week

    def get_generated_lessons(self, obj):
        return obj.curriculum_lessons.count()


class CurriculumPlanDetailSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True, default="")
    subject_icon = serializers.CharField(source="subject.icon", read_only=True, default="")
    subject_color = serializers.CharField(source="subject.color", read_only=True, default="")
    curriculum_lessons = CurriculumLessonSerializer(many=True, read_only=True)
    total_lessons = serializers.SerializerMethodField()
    generated_lessons = serializers.SerializerMethodField()

    class Meta:
        model = CurriculumPlan
        fields = [
            "id", "title", "description", "concept", "grade_level", "difficulty",
            "duration_weeks", "lessons_per_week", "status", "outline",
            "subject", "subject_name", "subject_icon", "subject_color",
            "curriculum_lessons", "total_lessons", "generated_lessons",
            "created_at", "updated_at",
        ]

    def get_total_lessons(self, obj):
        return obj.duration_weeks * obj.lessons_per_week

    def get_generated_lessons(self, obj):
        return obj.curriculum_lessons.count()


class CurriculumPlanCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CurriculumPlan
        fields = ["id", "concept", "grade_level", "difficulty", "duration_weeks", "lessons_per_week"]
        read_only_fields = ["id"]
