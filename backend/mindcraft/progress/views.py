from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import LessonProgress, Badge, KidBadge, Streak
from .serializers import LessonProgressSerializer, BadgeSerializer, StreakSerializer


@api_view(["GET"])
def progress_overview(request):
    """Get overall progress for the current kid."""
    if not hasattr(request.user, "kid_profile"):
        return Response({"error": "Only kids have progress"}, status=400)

    kid = request.user.kid_profile
    progress = LessonProgress.objects.filter(kid=kid)

    total = progress.count()
    completed = progress.filter(status=LessonProgress.Status.COMPLETED).count()
    in_progress = progress.filter(status=LessonProgress.Status.IN_PROGRESS).count()

    # Get quiz stats
    from mindcraft.quiz.models import QuizAttempt
    quiz_attempts = QuizAttempt.objects.filter(kid=kid, completed_at__isnull=False)
    total_quizzes = quiz_attempts.count()
    avg_score = 0
    if total_quizzes:
        scores = [a.score / a.max_score * 100 for a in quiz_attempts if a.max_score > 0]
        avg_score = round(sum(scores) / len(scores)) if scores else 0

    # Get streak
    streak, _ = Streak.objects.get_or_create(kid=kid)

    return Response({
        "lessons": {
            "total": total,
            "completed": completed,
            "in_progress": in_progress,
        },
        "quizzes": {
            "total_attempts": total_quizzes,
            "average_score": avg_score,
        },
        "streak": StreakSerializer(streak).data,
        "badges_earned": KidBadge.objects.filter(kid=kid).count(),
    })


@api_view(["GET"])
def badges_view(request):
    """Get all badges with earned status."""
    kid = None
    if hasattr(request.user, "kid_profile"):
        kid = request.user.kid_profile

    badges = Badge.objects.all()
    serializer = BadgeSerializer(badges, many=True, context={"kid": kid})
    return Response(serializer.data)


@api_view(["GET"])
def streak_view(request):
    """Get current streak info."""
    if not hasattr(request.user, "kid_profile"):
        return Response({"error": "Only kids have streaks"}, status=400)

    streak, _ = Streak.objects.get_or_create(kid=request.user.kid_profile)
    return Response(StreakSerializer(streak).data)


@api_view(["GET"])
def lesson_progress_list(request):
    """Get lesson-by-lesson progress."""
    if not hasattr(request.user, "kid_profile"):
        return Response({"error": "Only kids have progress"}, status=400)

    progress = LessonProgress.objects.filter(kid=request.user.kid_profile)
    return Response(LessonProgressSerializer(progress, many=True).data)
