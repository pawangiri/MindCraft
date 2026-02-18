from django.db import models as db_models
from rest_framework import viewsets, status as drf_status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from mindcraft.ai_service import generators
from mindcraft.chat.models import ChatSession
from .models import MathPracticeSession, MathProblemAttempt
from .serializers import (
    MathPracticeSessionListSerializer,
    MathPracticeSessionDetailSerializer,
    MathPracticeSessionCreateSerializer,
    MathProblemAttemptSerializer,
)
from . import openai_client


class MathPracticeSessionViewSet(viewsets.ModelViewSet):
    """CRUD for math practice sessions, scoped to the logged-in kid."""

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return MathPracticeSession.objects.all()
        if hasattr(user, "kid_profile"):
            return MathPracticeSession.objects.filter(kid=user.kid_profile)
        return MathPracticeSession.objects.none()

    def get_serializer_class(self):
        if self.action == "list":
            return MathPracticeSessionListSerializer
        if self.action == "create":
            return MathPracticeSessionCreateSerializer
        return MathPracticeSessionDetailSerializer

    def perform_create(self, serializer):
        kid = self.request.user.kid_profile
        # Create a linked chat session
        chat_session = ChatSession.objects.create(
            kid=kid,
            title=f"Math: {serializer.validated_data['topic']}",
            context_type=ChatSession.ContextType.MATH,
        )
        session = serializer.save(kid=kid, chat_session=chat_session)
        # Set context_id to point to this practice session
        chat_session.context_id = session.id
        chat_session.save()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=True, methods=["post"])
    def attempts(self, request, pk=None):
        """Create a new problem attempt for this session."""
        session = self.get_object()
        serializer = MathProblemAttemptSerializer(
            data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        # Auto-set order
        last_order = session.attempts.aggregate(db_models.Max("order"))["order__max"] or 0
        serializer.save(session=session, order=last_order + 1)
        return Response(serializer.data, status=drf_status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"], url_path=r"attempts/(?P<attempt_id>\d+)")
    def update_attempt(self, request, pk=None, attempt_id=None):
        """Update an attempt (canvas image, evaluation results)."""
        session = self.get_object()
        attempt = session.attempts.get(id=attempt_id)
        serializer = MathProblemAttemptSerializer(
            attempt, data=request.data, partial=True,
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_problem(request):
    """Generate a math problem for the given grade and topic."""
    grade = request.data.get("grade")
    topic = request.data.get("topic", "arithmetic")

    if grade is None:
        return Response({"error": "grade is required"}, status=400)

    try:
        grade = int(grade)
    except (TypeError, ValueError):
        return Response({"error": "grade must be an integer"}, status=400)

    try:
        result = generators.generate_math_problem(topic=topic, grade_level=grade)
        return Response(result)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def evaluate_answer(request):
    """Evaluate a student's handwritten math answer from a canvas image."""
    problem = request.data.get("problem")
    image_base64 = request.data.get("image_base64")
    grade = request.data.get("grade")

    if not problem:
        return Response({"error": "problem is required"}, status=400)
    if not image_base64:
        return Response({"error": "image_base64 is required"}, status=400)
    if grade is None:
        return Response({"error": "grade is required"}, status=400)

    try:
        grade = int(grade)
    except (TypeError, ValueError):
        return Response({"error": "grade must be an integer"}, status=400)

    try:
        result = openai_client.evaluate_math_answer(
            problem=problem,
            image_base64=image_base64,
            grade=grade,
        )
        return Response(result)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
