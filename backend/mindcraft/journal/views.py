from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import JournalEntry
from .serializers import JournalEntrySerializer
from mindcraft.ai_service import generators


class JournalEntryViewSet(viewsets.ModelViewSet):
    serializer_class = JournalEntrySerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            kid_id = self.request.query_params.get("kid_id")
            if kid_id:
                return JournalEntry.objects.filter(kid_id=kid_id)
            return JournalEntry.objects.all()
        if hasattr(user, "kid_profile"):
            return JournalEntry.objects.filter(kid=user.kid_profile)
        return JournalEntry.objects.none()

    def perform_create(self, serializer):
        if hasattr(self.request.user, "kid_profile"):
            serializer.save(kid=self.request.user.kid_profile)

    @action(detail=True, methods=["post"])
    def feedback(self, request, pk=None):
        """Get AI feedback on a journal entry."""
        entry = self.get_object()
        kid_profile = entry.kid

        try:
            feedback = generators.generate_feedback(
                journal_content=entry.content,
                kid_name=kid_profile.display_name,
                age=kid_profile.age,
            )
            entry.ai_feedback = feedback
            entry.save()
            return Response({"feedback": feedback})
        except Exception as e:
            return Response({"error": str(e)}, status=500)
