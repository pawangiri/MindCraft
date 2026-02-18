from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("sessions", views.MathPracticeSessionViewSet, basename="math-session")

urlpatterns = [
    path("generate/", views.generate_problem),
    path("evaluate/", views.evaluate_answer),
    path("", include(router.urls)),
]
