import json
from django.http import StreamingHttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer, ChatMessageSerializer, ChatSendSerializer
from mindcraft.ai_service import client as ai_client, prompts, safety
from mindcraft.content.models import Lesson


class ChatSessionViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSessionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            kid_id = self.request.query_params.get("kid_id")
            if kid_id:
                return ChatSession.objects.filter(kid_id=kid_id)
            return ChatSession.objects.all()
        if hasattr(user, "kid_profile"):
            return ChatSession.objects.filter(kid=user.kid_profile)
        return ChatSession.objects.none()

    def perform_create(self, serializer):
        if hasattr(self.request.user, "kid_profile"):
            serializer.save(kid=self.request.user.kid_profile)

    @action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        session = self.get_object()
        messages = session.messages.all()
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        """Send a message and get AI response (streaming via SSE)."""
        session = self.get_object()
        kid_profile = session.kid
        send_serializer = ChatSendSerializer(data=request.data)
        send_serializer.is_valid(raise_exception=True)
        user_message = send_serializer.validated_data["message"]

        # Safety checks
        allowed, rate_msg = safety.check_rate_limit(kid_profile)
        if not allowed:
            return Response({"error": rate_msg}, status=429)

        valid, validated_msg = safety.validate_kid_message(user_message)
        if not valid:
            return Response({"error": validated_msg}, status=400)

        # Save user message
        ChatMessage.objects.create(
            session=session,
            role=ChatMessage.Role.USER,
            content=validated_msg,
        )

        # Build conversation history
        history = list(
            session.messages.exclude(role=ChatMessage.Role.SYSTEM)
            .values_list("role", "content")
        )
        messages = [{"role": role, "content": content} for role, content in history]

        # Build system prompt based on context
        context = send_serializer.validated_data.get("context")
        system = self._get_system_prompt(session, kid_profile, context=context)

        # Stream response via SSE
        def event_stream():
            full_response = ""
            try:
                for chunk in ai_client.chat_completion_stream(
                    messages=messages,
                    system=system,
                    model=None,  # Uses AI_MODEL_CHAT default
                ):
                    full_response += chunk
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

                # Save assistant message
                ChatMessage.objects.create(
                    session=session,
                    role=ChatMessage.Role.ASSISTANT,
                    content=full_response,
                )

                # Update session title if it's the first exchange
                if session.messages.count() <= 2 and session.title == "New Chat":
                    session.title = validated_msg[:50]
                    session.save()

                yield f"data: {json.dumps({'type': 'done', 'content': full_response})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

        response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response

    def _get_system_prompt(self, session, kid_profile, context=None):
        """Build system prompt based on chat context."""
        kid_name = kid_profile.display_name
        grade = kid_profile.grade_level
        age = kid_profile.age

        if session.context_type == ChatSession.ContextType.LESSON and session.context_id:
            try:
                lesson = Lesson.objects.get(id=session.context_id)
                return prompts.lesson_system_prompt(kid_name, grade, lesson.content[:3000])
            except Lesson.DoesNotExist:
                pass

        if session.context_type == ChatSession.ContextType.MATH:
            # Prefer frontend-provided context (has the exact problem the kid sees)
            if context and context.get("problem_text"):
                return prompts.math_tutor_system_prompt(
                    kid_name, grade,
                    context["problem_text"],
                    context.get("topic", "math"),
                    evaluation=context.get("evaluation"),
                )

            # Fallback: look up from DB
            if session.context_id:
                try:
                    from mindcraft.math.models import MathPracticeSession
                    practice = MathPracticeSession.objects.get(id=session.context_id)
                    topic = practice.topic
                    latest = practice.attempts.last()
                    problem_text = latest.problem_text if latest else topic
                    return prompts.math_tutor_system_prompt(kid_name, grade, problem_text, topic)
                except MathPracticeSession.DoesNotExist:
                    try:
                        lesson = Lesson.objects.get(id=session.context_id)
                        topic = lesson.topic.name if lesson.topic else "math"
                        return prompts.math_tutor_system_prompt(kid_name, grade, lesson.title, topic)
                    except Lesson.DoesNotExist:
                        pass

        return prompts.tutor_system_prompt(kid_name, grade, age)
