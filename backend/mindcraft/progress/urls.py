from django.urls import path
from . import views

urlpatterns = [
    path("", views.progress_overview),
    path("badges/", views.badges_view),
    path("streak/", views.streak_view),
    path("lessons/", views.lesson_progress_list),
]
