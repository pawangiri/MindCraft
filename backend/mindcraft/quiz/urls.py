from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.QuizViewSet, basename="quiz")

urlpatterns = [
    path("generate/", views.generate_quiz_view),
    path("", include(router.urls)),
]
