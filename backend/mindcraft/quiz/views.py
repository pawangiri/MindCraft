from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from .models import Quiz, Question, Choice, QuizAttempt, QuestionAnswer
from .serializers import (
    QuizListSerializer, QuizDetailSerializer, QuizSubmitSerializer, QuizAttemptSerializer,
)
from mindcraft.ai_service import generators


class QuizViewSet(viewsets.ReadOnlyModelViewSet):
    def get_serializer_class(self):
        if self.action == "retrieve":
            return QuizDetailSerializer
        return QuizListSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Quiz.objects.filter(is_active=True)
        if hasattr(user, "kid_profile"):
            return Quiz.objects.filter(
                is_active=True,
                lesson__assigned_to=user.kid_profile,
                lesson__status="published",
            )
        return Quiz.objects.none()

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        quiz = self.get_object()
        if not hasattr(request.user, "kid_profile"):
            return Response({"error": "Only kids can take quizzes"}, status=400)

        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            kid=request.user.kid_profile,
            max_score=sum(q.points for q in quiz.questions.all()),
        )
        return Response(QuizAttemptSerializer(attempt).data)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        quiz = self.get_object()
        serializer = QuizSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not hasattr(request.user, "kid_profile"):
            return Response({"error": "Only kids can submit quizzes"}, status=400)

        # Get or create attempt
        attempt = QuizAttempt.objects.filter(
            quiz=quiz, kid=request.user.kid_profile, completed_at__isnull=True
        ).first()
        if not attempt:
            attempt = QuizAttempt.objects.create(
                quiz=quiz,
                kid=request.user.kid_profile,
                max_score=sum(q.points for q in quiz.questions.all()),
            )

        score = 0
        results = []
        for answer_data in serializer.validated_data["answers"]:
            question_id = answer_data.get("question_id")
            choice_id = answer_data.get("choice_id")
            text_answer = answer_data.get("text_answer", "")

            try:
                question = quiz.questions.get(id=question_id)
            except Question.DoesNotExist:
                continue

            is_correct = False
            if choice_id:
                try:
                    choice = question.choices.get(id=choice_id)
                    is_correct = choice.is_correct
                except Choice.DoesNotExist:
                    pass

            if is_correct:
                score += question.points

            QuestionAnswer.objects.create(
                attempt=attempt,
                question=question,
                selected_choice_id=choice_id,
                text_answer=text_answer,
                is_correct=is_correct,
            )
            correct_choice = question.choices.filter(is_correct=True).first()
            results.append({
                "question_id": question_id,
                "is_correct": is_correct,
                "correct_choice_id": correct_choice.id if correct_choice else None,
                "selected_choice_id": choice_id,
                "explanation": question.explanation,
            })

        attempt.score = score
        attempt.completed_at = timezone.now()
        attempt.save()

        return Response({
            "score": score,
            "max_score": attempt.max_score,
            "percentage": round(score / attempt.max_score * 100) if attempt.max_score > 0 else 0,
            "results": results,
        })

    @action(detail=True, methods=["post"])
    def hint(self, request, pk=None):
        question_id = request.data.get("question_id")
        attempt_number = request.data.get("attempt_number", 1)

        # Rate limit: max 3 hints per question
        if attempt_number > 3:
            return Response(
                {"error": "Maximum hints reached for this question"},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        try:
            question = Question.objects.get(id=question_id, quiz_id=pk)
        except Question.DoesNotExist:
            return Response({"error": "Question not found"}, status=404)

        choices = list(question.choices.values_list("choice_text", flat=True))

        try:
            hint = generators.generate_hint(question.question_text, choices, attempt_number)
            return Response({"hint": hint})
        except Exception as e:
            # Fall back to stored hint
            if question.hint:
                return Response({"hint": question.hint})
            return Response({"error": str(e)}, status=500)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def generate_quiz_view(request):
    """AI-generate a quiz from a lesson."""
    lesson_id = request.data.get("lesson_id")
    num_questions = request.data.get("num_questions", 5)

    if not lesson_id:
        return Response({"error": "lesson_id is required"}, status=400)

    from mindcraft.content.models import Lesson
    try:
        lesson = Lesson.objects.get(id=lesson_id)
    except Lesson.DoesNotExist:
        return Response({"error": "Lesson not found"}, status=404)

    try:
        quiz_data = generators.generate_quiz(lesson.content, num_questions, lesson.grade_level)

        quiz = Quiz.objects.create(
            lesson=lesson,
            title=quiz_data.get("title", f"Quiz: {lesson.title}"),
            quiz_type=Quiz.QuizType.LESSON_REVIEW,
            ai_generated=True,
        )

        for i, q_data in enumerate(quiz_data.get("questions", [])):
            question = Question.objects.create(
                quiz=quiz,
                question_text=q_data["question_text"],
                question_type=q_data.get("question_type", "multiple_choice"),
                order=i,
                points=q_data.get("points", 1),
                hint=q_data.get("hint", ""),
                explanation=q_data.get("explanation", ""),
            )
            for j, c_data in enumerate(q_data.get("choices", [])):
                Choice.objects.create(
                    question=question,
                    choice_text=c_data["text"],
                    is_correct=c_data.get("is_correct", False),
                    order=j,
                )

        return Response({"quiz_id": quiz.id, "title": quiz.title, "questions": len(quiz_data.get("questions", []))})
    except Exception as e:
        return Response({"error": str(e)}, status=500)
