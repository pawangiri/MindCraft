from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("subjects", views.SubjectViewSet)
router.register("topics", views.TopicViewSet, basename="topic")
router.register("lessons", views.LessonViewSet, basename="lesson")
router.register("research", views.ResearchSessionViewSet, basename="research")
router.register("curriculum", views.CurriculumPlanViewSet, basename="curriculum")

urlpatterns = [
    path("", include(router.urls)),
    path("admin/lessons/generate/", views.generate_lesson_view),
    path("media-resources/<int:pk>/", views.media_resource_detail_view),
]
