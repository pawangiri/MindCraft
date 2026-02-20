import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.utils import timezone
from .models import Subject, Topic, Lesson, ResearchSession, ResearchFinding, MediaResource, CurriculumPlan, CurriculumLesson
from .serializers import (
    SubjectSerializer, TopicSerializer,
    LessonListSerializer, LessonDetailSerializer, LessonCreateSerializer,
    ResearchSessionListSerializer, ResearchSessionDetailSerializer,
    ResearchSessionCreateSerializer, ResearchFindingSerializer,
    MediaResourceSerializer,
    CurriculumPlanListSerializer, CurriculumPlanDetailSerializer,
    CurriculumPlanCreateSerializer, CurriculumLessonSerializer,
)
from mindcraft.progress.models import LessonProgress
from mindcraft.ai_service import generators
from mindcraft.ai_service import research as research_service
from openai import AuthenticationError as OpenAIAuthError, APIError as OpenAIAPIError

logger = logging.getLogger(__name__)


def _clean_api_error(e: Exception) -> str:
    """Return a user-friendly error message from API exceptions."""
    if isinstance(e, OpenAIAuthError):
        return "Perplexity API key is invalid or missing. Check PERPLEXITY_API_KEY in .env."
    if isinstance(e, OpenAIAPIError):
        return f"Perplexity API error: {e.message}"
    msg = str(e)
    if "Claude CLI error" in msg:
        # Extract the useful part from CLI stderr
        cli_msg = msg.replace("Claude CLI error: ", "")
        if "auth" in cli_msg.lower() or "token" in cli_msg.lower():
            return "Claude CLI authentication failed. Check your Claude Code login."
        if len(cli_msg) > 200:
            return "Claude CLI error. Check the server logs for details."
        return f"Claude CLI error: {cli_msg}"
    if "<html" in msg.lower() or len(msg) > 300:
        return "An external API error occurred. Check the server logs for details."
    return msg


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.filter(is_active=True)
    serializer_class = SubjectSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAdminUser()]

    def destroy(self, request, *args, **kwargs):
        subject = self.get_object()
        topic_count = subject.topics.count()
        if topic_count > 0:
            return Response(
                {"error": f"Cannot delete this subject — it has {topic_count} topic(s). Remove them first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="suggest-topics")
    def suggest_topics(self, request, pk=None):
        """AI-suggest topics for this subject."""
        subject = self.get_object()
        try:
            suggestions = generators.suggest_topics(
                subject_name=subject.name,
                subject_description=subject.description,
            )
            return Response({"topics": suggestions})
        except Exception as e:
            logger.exception("Topic suggestion failed for subject %s", subject.id)
            return Response(
                {"error": _clean_api_error(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class TopicViewSet(viewsets.ModelViewSet):
    serializer_class = TopicSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAdminUser()]

    def get_queryset(self):
        qs = Topic.objects.all()
        subject = self.request.query_params.get("subject")
        if subject:
            qs = qs.filter(subject_id=subject)
        return qs

    def destroy(self, request, *args, **kwargs):
        topic = self.get_object()
        lesson_count = topic.lessons.count()
        if lesson_count > 0:
            return Response(
                {"error": f"Cannot delete this topic — it has {lesson_count} lesson(s). Remove them first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class LessonViewSet(viewsets.ModelViewSet):
    """Lessons — kids see their assigned published lessons, admins see all."""

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return LessonCreateSerializer
        if self.action == "retrieve":
            return LessonDetailSerializer
        return LessonListSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Lesson.objects.all()
        # Kids see only published lessons assigned to them
        if hasattr(user, "kid_profile"):
            return Lesson.objects.filter(
                status=Lesson.Status.PUBLISHED,
                assigned_to=user.kid_profile,
            )
        return Lesson.objects.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Mark a lesson as completed by the current kid."""
        lesson = self.get_object()
        if not hasattr(request.user, "kid_profile"):
            return Response({"error": "Only kids can complete lessons"}, status=400)

        progress, created = LessonProgress.objects.get_or_create(
            kid=request.user.kid_profile,
            lesson=lesson,
            defaults={"status": LessonProgress.Status.COMPLETED, "completed_at": timezone.now()},
        )
        if not created:
            progress.status = LessonProgress.Status.COMPLETED
            progress.completed_at = timezone.now()
            progress.save()

        return Response({"status": "completed"})

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Mark a lesson as started by the current kid."""
        lesson = self.get_object()
        if not hasattr(request.user, "kid_profile"):
            return Response({"error": "Only kids can start lessons"}, status=400)

        progress, created = LessonProgress.objects.get_or_create(
            kid=request.user.kid_profile,
            lesson=lesson,
            defaults={"status": LessonProgress.Status.IN_PROGRESS, "started_at": timezone.now()},
        )
        if not created and progress.status == LessonProgress.Status.NOT_STARTED:
            progress.status = LessonProgress.Status.IN_PROGRESS
            progress.started_at = timezone.now()
            progress.save()

        return Response({"status": progress.status})

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUser])
    def publish(self, request, pk=None):
        """Publish a lesson."""
        lesson = self.get_object()
        lesson.status = Lesson.Status.PUBLISHED
        lesson.save()
        return Response({"status": "published"})

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUser])
    def assign(self, request, pk=None):
        """Assign lesson to kids. Body: {"kid_ids": [1, 2, 3]}"""
        lesson = self.get_object()
        kid_ids = request.data.get("kid_ids", [])
        lesson.assigned_to.set(kid_ids)
        return Response({"assigned_to": kid_ids})


@api_view(["POST"])
@permission_classes([IsAdminUser])
def generate_lesson_view(request):
    """AI-generate a lesson. Body: {"topic": str, "grade_level": int, "difficulty": str, "topic_id": int}"""
    topic = request.data.get("topic", "")
    grade_level = request.data.get("grade_level", 5)
    difficulty = request.data.get("difficulty", "medium")
    topic_id = request.data.get("topic_id")

    if not topic:
        return Response({"error": "Topic is required"}, status=400)

    try:
        result = generators.generate_lesson(topic, grade_level, difficulty)

        # Save as draft if topic_id provided
        if topic_id:
            lesson = Lesson.objects.create(
                topic_id=topic_id,
                title=result["title"],
                description=result["description"],
                content=result["content"],
                grade_level=grade_level,
                difficulty=difficulty,
                estimated_minutes=result["estimated_minutes"],
                created_by=request.user,
                ai_generated=True,
                status=Lesson.Status.DRAFT,
            )
            return Response({
                "lesson_id": lesson.id,
                **result,
            })

        return Response(result)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


class ResearchSessionViewSet(viewsets.ModelViewSet):
    """Research pipeline sessions — admin only."""
    permission_classes = [IsAdminUser]

    def get_serializer_class(self):
        if self.action == "create":
            return ResearchSessionCreateSerializer
        if self.action == "retrieve":
            return ResearchSessionDetailSerializer
        return ResearchSessionListSerializer

    def get_queryset(self):
        return ResearchSession.objects.select_related("subject", "topic", "lesson").all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def _session_detail_response(self, session):
        """Return the full session detail (re-fetched to include relations)."""
        session.refresh_from_db()
        serializer = ResearchSessionDetailSerializer(session)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def research(self, request, pk=None):
        """Run Perplexity research on the session topic."""
        session = self.get_object()
        session.status = ResearchSession.PipelineStatus.RESEARCHING
        session.save()

        try:
            result = research_service.research_topic(
                topic=session.topic_query,
                grade_level=session.grade_level,
                subject=session.subject.name,
            )

            finding, _ = ResearchFinding.objects.update_or_create(
                session=session,
                defaults={
                    "summary": result["summary"],
                    "key_facts": result["key_facts"],
                    "citations": result["citations"],
                    "raw_response": result["raw_response"],
                },
            )

            session.status = ResearchSession.PipelineStatus.RESEARCH_COMPLETE
            session.save()

            return self._session_detail_response(session)
        except Exception as e:
            logger.exception("Research failed for session %s", session.id)
            session.status = ResearchSession.PipelineStatus.TOPIC_INPUT
            session.save()
            return Response({"error": _clean_api_error(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["patch"], url_path="update-finding")
    def update_finding(self, request, pk=None):
        """Update research finding (summary, key_facts, parent_notes)."""
        session = self.get_object()
        finding = session.finding

        for field in ("summary", "key_facts", "parent_notes"):
            if field in request.data:
                setattr(finding, field, request.data[field])
        finding.save()

        return self._session_detail_response(session)

    @action(detail=True, methods=["post"], url_path="generate-lesson")
    def generate_lesson(self, request, pk=None):
        """Generate a lesson from the research findings."""
        session = self.get_object()
        session.status = ResearchSession.PipelineStatus.GENERATING
        session.save()

        try:
            finding = session.finding
            media_qs = session.media_resources.filter(is_included=True)
            media_data = [
                {"title": m.title, "media_type": m.media_type, "url": m.url}
                for m in media_qs
            ]

            result = generators.generate_lesson_from_research(
                topic=session.topic_query,
                grade_level=session.grade_level,
                difficulty=session.difficulty,
                research_summary=finding.summary,
                key_facts=finding.key_facts,
                citations=finding.citations,
                media_resources=media_data,
                parent_notes=finding.parent_notes,
            )

            # Create or get the topic for this lesson
            topic_obj = session.topic
            if not topic_obj:
                topic_obj, _ = Topic.objects.get_or_create(
                    subject=session.subject,
                    name=session.topic_query,
                    defaults={"description": f"Auto-created topic for: {session.topic_query}"},
                )
                session.topic = topic_obj

            lesson = Lesson.objects.create(
                topic=topic_obj,
                title=result["title"],
                description=result["description"],
                content=result["content"],
                grade_level=session.grade_level,
                difficulty=session.difficulty,
                estimated_minutes=result["estimated_minutes"],
                created_by=session.created_by,
                ai_generated=True,
                status=Lesson.Status.DRAFT,
            )

            # Link media resources to the lesson
            session.media_resources.filter(is_included=True).update(lesson=lesson)

            session.lesson = lesson
            session.status = ResearchSession.PipelineStatus.GENERATED
            session.save()

            return self._session_detail_response(session)
        except Exception as e:
            logger.exception("Lesson generation failed for session %s", session.id)
            session.status = ResearchSession.PipelineStatus.RESEARCH_COMPLETE
            session.save()
            return Response({"error": _clean_api_error(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"], url_path="discover-media")
    def discover_media(self, request, pk=None):
        """Discover multimedia resources for the session topic."""
        session = self.get_object()
        session.status = ResearchSession.PipelineStatus.ENRICHING
        session.save()

        try:
            resources = research_service.discover_multimedia(
                topic=session.topic_query,
                grade_level=session.grade_level,
                subject=session.subject.name,
            )

            created = []
            for i, r in enumerate(resources):
                media = MediaResource.objects.create(
                    session=session,
                    url=r["url"],
                    title=r["title"],
                    description=r.get("description", ""),
                    media_type=r.get("media_type", "other"),
                    source=MediaResource.Source.AUTO,
                    thumbnail_url=r.get("thumbnail_url", ""),
                    order=i,
                )
                created.append(media)

            # Link discovered media to the lesson if one already exists
            if session.lesson:
                session.media_resources.filter(is_included=True, lesson__isnull=True).update(lesson=session.lesson)

            session.status = ResearchSession.PipelineStatus.READY
            session.save()

            return self._session_detail_response(session)
        except Exception as e:
            logger.exception("Media discovery failed for session %s", session.id)
            session.status = ResearchSession.PipelineStatus.RESEARCH_COMPLETE
            session.save()
            return Response({"error": _clean_api_error(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"], url_path="add-media")
    def add_media(self, request, pk=None):
        """Manually add a media resource."""
        session = self.get_object()
        serializer = MediaResourceSerializer(data={
            **request.data,
            "session": session.id,
            "source": MediaResource.Source.MANUAL,
        })
        serializer.is_valid(raise_exception=True)
        media = serializer.save()
        # Link to lesson if one exists
        if session.lesson and not media.lesson:
            media.lesson = session.lesson
            media.save()
        return self._session_detail_response(session)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        """Publish the lesson and optionally assign to kids."""
        session = self.get_object()
        lesson = session.lesson
        if not lesson:
            return Response({"error": "No lesson generated yet"}, status=status.HTTP_400_BAD_REQUEST)

        lesson.status = Lesson.Status.PUBLISHED
        lesson.save()

        # Ensure all included media are linked to the lesson
        session.media_resources.filter(is_included=True, lesson__isnull=True).update(lesson=lesson)

        kid_ids = request.data.get("kid_ids", [])
        if kid_ids:
            lesson.assigned_to.set(kid_ids)

        session.status = ResearchSession.PipelineStatus.PUBLISHED
        session.save()

        return self._session_detail_response(session)


@api_view(["DELETE", "PATCH"])
@permission_classes([IsAdminUser])
def media_resource_detail_view(request, pk):
    """Delete or update a single media resource."""
    try:
        resource = MediaResource.objects.get(pk=pk)
    except MediaResource.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        resource.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH
    for field in ("url", "title", "description", "media_type", "thumbnail_url", "order", "is_included"):
        if field in request.data:
            setattr(resource, field, request.data[field])
    resource.save()
    return Response(MediaResourceSerializer(resource).data)


class CurriculumPlanViewSet(viewsets.ModelViewSet):
    """Curriculum planner — admin only. Create multi-week learning plans on any topic."""
    permission_classes = [IsAdminUser]

    def get_serializer_class(self):
        if self.action == "create":
            return CurriculumPlanCreateSerializer
        if self.action == "retrieve":
            return CurriculumPlanDetailSerializer
        return CurriculumPlanListSerializer

    def get_queryset(self):
        return CurriculumPlan.objects.select_related("subject").prefetch_related("curriculum_lessons__lesson").all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def _plan_detail_response(self, plan):
        """Return the full plan detail (re-fetched to include relations)."""
        plan.refresh_from_db()
        serializer = CurriculumPlanDetailSerializer(plan)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="generate-outline")
    def generate_outline(self, request, pk=None):
        """AI-generate the curriculum outline."""
        plan = self.get_object()
        plan.status = CurriculumPlan.Status.PLANNING
        plan.save()

        try:
            result = generators.generate_curriculum_outline(
                concept=plan.concept,
                grade_level=plan.grade_level,
                duration_weeks=plan.duration_weeks,
                lessons_per_week=plan.lessons_per_week,
                difficulty=plan.difficulty,
            )

            plan.outline = result
            plan.title = result.get("title", plan.concept)
            plan.description = result.get("description", "")

            # Auto-create or find a subject for this curriculum
            subject_name = result.get("subject_name", plan.concept)
            subject_icon = result.get("subject_icon", "📚")
            subject_color = result.get("subject_color", "#6366f1")

            if not plan.subject:
                subject, _ = Subject.objects.get_or_create(
                    name=subject_name,
                    defaults={
                        "icon": subject_icon,
                        "color": subject_color,
                        "description": f"Auto-created for curriculum: {plan.concept}",
                    },
                )
                plan.subject = subject

            plan.status = CurriculumPlan.Status.OUTLINE_READY
            plan.save()

            return self._plan_detail_response(plan)
        except Exception as e:
            logger.exception("Outline generation failed for plan %s", plan.id)
            plan.status = CurriculumPlan.Status.PLANNING
            plan.save()
            return Response({"error": _clean_api_error(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["patch"], url_path="update-outline")
    def update_outline(self, request, pk=None):
        """Update the curriculum outline (parent edits)."""
        plan = self.get_object()
        if "outline" in request.data:
            plan.outline = request.data["outline"]
        if "title" in request.data:
            plan.title = request.data["title"]
        if "description" in request.data:
            plan.description = request.data["description"]
        plan.save()
        return self._plan_detail_response(plan)

    @action(detail=True, methods=["post"], url_path="generate-lessons")
    def generate_lessons(self, request, pk=None):
        """Generate all lessons from the outline. Can also regenerate specific ones."""
        plan = self.get_object()
        if not plan.outline or "weeks" not in plan.outline:
            return Response({"error": "No outline available. Generate an outline first."}, status=status.HTTP_400_BAD_REQUEST)

        plan.status = CurriculumPlan.Status.GENERATING
        plan.save()

        try:
            outline = plan.outline
            weeks = outline.get("weeks", [])

            # Ensure subject exists
            if not plan.subject:
                subject, _ = Subject.objects.get_or_create(
                    name=outline.get("subject_name", plan.concept),
                    defaults={
                        "icon": outline.get("subject_icon", "📚"),
                        "color": outline.get("subject_color", "#6366f1"),
                    },
                )
                plan.subject = subject
                plan.save()

            # Create a topic for this curriculum under the subject
            topic, _ = Topic.objects.get_or_create(
                subject=plan.subject,
                name=plan.concept,
                defaults={
                    "description": plan.description,
                    "grade_level_min": max(1, plan.grade_level - 1),
                    "grade_level_max": min(12, plan.grade_level + 1),
                },
            )

            # Build context as we generate each lesson
            previous_context_parts = []

            for week in weeks:
                week_num = week.get("week_number", 1)
                week_lessons = week.get("lessons", [])

                for lesson_idx, lesson_outline in enumerate(week_lessons):
                    lesson_title = lesson_outline.get("title", f"Week {week_num} Lesson {lesson_idx + 1}")
                    objectives = lesson_outline.get("learning_objectives", [])
                    description = lesson_outline.get("description", "")

                    # Check if this lesson already exists (skip if regenerating)
                    existing = CurriculumLesson.objects.filter(
                        curriculum=plan,
                        week_number=week_num,
                        order=lesson_idx,
                    ).first()
                    if existing:
                        # Add to context and skip
                        previous_context_parts.append(
                            f"Week {week_num}, Lesson {lesson_idx + 1}: {existing.lesson.title} — {existing.learning_objectives}"
                        )
                        continue

                    # Figure out upcoming lesson title
                    upcoming_title = ""
                    if lesson_idx + 1 < len(week_lessons):
                        upcoming_title = week_lessons[lesson_idx + 1].get("title", "")
                    else:
                        # Check next week
                        week_index = weeks.index(week)
                        if week_index + 1 < len(weeks):
                            next_week_lessons = weeks[week_index + 1].get("lessons", [])
                            if next_week_lessons:
                                upcoming_title = next_week_lessons[0].get("title", "")

                    previous_context = "\n".join(previous_context_parts) if previous_context_parts else ""

                    result = generators.generate_curriculum_lesson(
                        concept=plan.concept,
                        grade_level=plan.grade_level,
                        difficulty=plan.difficulty,
                        week_number=week_num,
                        lesson_number=lesson_idx + 1,
                        lesson_title=lesson_title,
                        learning_objectives=objectives,
                        lesson_description=description,
                        previous_lessons_context=previous_context,
                        upcoming_lesson_title=upcoming_title,
                    )

                    lesson = Lesson.objects.create(
                        topic=topic,
                        title=result["title"],
                        description=result["description"],
                        content=result["content"],
                        grade_level=plan.grade_level,
                        difficulty=plan.difficulty,
                        estimated_minutes=result["estimated_minutes"],
                        created_by=plan.created_by,
                        ai_generated=True,
                        status=Lesson.Status.DRAFT,
                    )

                    CurriculumLesson.objects.create(
                        curriculum=plan,
                        lesson=lesson,
                        week_number=week_num,
                        order=lesson_idx,
                        learning_objectives="\n".join(objectives),
                    )

                    previous_context_parts.append(
                        f"Week {week_num}, Lesson {lesson_idx + 1}: {result['title']} — {', '.join(objectives)}"
                    )

            plan.status = CurriculumPlan.Status.COMPLETE
            plan.save()
            return self._plan_detail_response(plan)

        except Exception as e:
            logger.exception("Lesson generation failed for plan %s", plan.id)
            plan.status = CurriculumPlan.Status.OUTLINE_READY
            plan.save()
            return Response({"error": _clean_api_error(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"], url_path="generate-single-lesson")
    def generate_single_lesson(self, request, pk=None):
        """Generate or regenerate a single lesson. Body: {"week_number": int, "lesson_index": int}"""
        plan = self.get_object()
        week_number = request.data.get("week_number")
        lesson_index = request.data.get("lesson_index")

        if week_number is None or lesson_index is None:
            return Response({"error": "week_number and lesson_index are required"}, status=status.HTTP_400_BAD_REQUEST)

        outline = plan.outline
        weeks = outline.get("weeks", [])

        # Find the lesson in the outline
        target_week = None
        for w in weeks:
            if w.get("week_number") == week_number:
                target_week = w
                break

        if not target_week:
            return Response({"error": f"Week {week_number} not found in outline"}, status=status.HTTP_404_NOT_FOUND)

        week_lessons = target_week.get("lessons", [])
        if lesson_index >= len(week_lessons):
            return Response({"error": f"Lesson index {lesson_index} out of range"}, status=status.HTTP_404_NOT_FOUND)

        lesson_outline = week_lessons[lesson_index]

        try:
            # Ensure subject and topic exist
            if not plan.subject:
                subject, _ = Subject.objects.get_or_create(
                    name=outline.get("subject_name", plan.concept),
                    defaults={"icon": outline.get("subject_icon", "📚"), "color": outline.get("subject_color", "#6366f1")},
                )
                plan.subject = subject
                plan.save()

            topic, _ = Topic.objects.get_or_create(
                subject=plan.subject,
                name=plan.concept,
                defaults={"description": plan.description},
            )

            # Build previous context from existing lessons
            existing_lessons = plan.curriculum_lessons.select_related("lesson").order_by("week_number", "order")
            previous_parts = []
            for cl in existing_lessons:
                if cl.week_number < week_number or (cl.week_number == week_number and cl.order < lesson_index):
                    previous_parts.append(f"Week {cl.week_number}, Lesson {cl.order + 1}: {cl.lesson.title} — {cl.learning_objectives}")

            # Figure out upcoming
            upcoming_title = ""
            if lesson_index + 1 < len(week_lessons):
                upcoming_title = week_lessons[lesson_index + 1].get("title", "")
            else:
                week_idx = weeks.index(target_week)
                if week_idx + 1 < len(weeks):
                    next_lessons = weeks[week_idx + 1].get("lessons", [])
                    if next_lessons:
                        upcoming_title = next_lessons[0].get("title", "")

            result = generators.generate_curriculum_lesson(
                concept=plan.concept,
                grade_level=plan.grade_level,
                difficulty=plan.difficulty,
                week_number=week_number,
                lesson_number=lesson_index + 1,
                lesson_title=lesson_outline.get("title", ""),
                learning_objectives=lesson_outline.get("learning_objectives", []),
                lesson_description=lesson_outline.get("description", ""),
                previous_lessons_context="\n".join(previous_parts),
                upcoming_lesson_title=upcoming_title,
            )

            # Delete existing curriculum lesson entry if regenerating
            existing_entry = CurriculumLesson.objects.filter(
                curriculum=plan, week_number=week_number, order=lesson_index,
            ).first()
            if existing_entry:
                existing_entry.lesson.delete()
                existing_entry.delete()

            lesson = Lesson.objects.create(
                topic=topic,
                title=result["title"],
                description=result["description"],
                content=result["content"],
                grade_level=plan.grade_level,
                difficulty=plan.difficulty,
                estimated_minutes=result["estimated_minutes"],
                created_by=plan.created_by,
                ai_generated=True,
                status=Lesson.Status.DRAFT,
            )

            CurriculumLesson.objects.create(
                curriculum=plan,
                lesson=lesson,
                week_number=week_number,
                order=lesson_index,
                learning_objectives="\n".join(lesson_outline.get("learning_objectives", [])),
            )

            return self._plan_detail_response(plan)
        except Exception as e:
            logger.exception("Single lesson generation failed for plan %s", plan.id)
            return Response({"error": _clean_api_error(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        """Publish all lessons in the curriculum and assign to kids."""
        plan = self.get_object()
        kid_ids = request.data.get("kid_ids", [])

        curriculum_lessons = plan.curriculum_lessons.select_related("lesson").all()
        if not curriculum_lessons.exists():
            return Response({"error": "No lessons generated yet"}, status=status.HTTP_400_BAD_REQUEST)

        for cl in curriculum_lessons:
            cl.lesson.status = Lesson.Status.PUBLISHED
            cl.lesson.save()
            if kid_ids:
                cl.lesson.assigned_to.set(kid_ids)

        plan.status = CurriculumPlan.Status.PUBLISHED
        if kid_ids:
            plan.assigned_to.set(kid_ids)
        plan.save()

        return self._plan_detail_response(plan)
