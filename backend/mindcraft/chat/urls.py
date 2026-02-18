from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("sessions", views.ChatSessionViewSet, basename="chat-session")

urlpatterns = [
    path("", include(router.urls)),
]
