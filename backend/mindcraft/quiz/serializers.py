from rest_framework import serializers
from .models import Quiz, Question, Choice, QuizAttempt, QuestionAnswer


class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ["id", "choice_text", "order"]


class ChoiceWithAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ["id", "choice_text", "is_correct", "order"]


class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ["id", "question_text", "question_type", "order", "points", "choices"]


class QuestionWithAnswerSerializer(serializers.ModelSerializer):
    choices = ChoiceWithAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ["id", "question_text", "question_type", "order", "points", "hint", "explanation", "choices"]


class QuizListSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()
    lesson_id = serializers.IntegerField(source="lesson.id", read_only=True, default=None)
    lesson_title = serializers.CharField(source="lesson.title", read_only=True, default=None)

    class Meta:
        model = Quiz
        fields = ["id", "title", "description", "quiz_type", "time_limit_minutes", "lesson_id", "lesson_title", "question_count", "created_at"]

    def get_question_count(self, obj):
        return obj.questions.count()


class QuizDetailSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ["id", "title", "description", "quiz_type", "time_limit_minutes", "questions", "created_at"]


class QuizSubmitSerializer(serializers.Serializer):
    answers = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of {question_id, choice_id} or {question_id, text_answer}",
    )


class QuizAttemptSerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source="quiz.title", read_only=True)

    class Meta:
        model = QuizAttempt
        fields = ["id", "quiz", "quiz_title", "score", "max_score", "started_at", "completed_at"]
