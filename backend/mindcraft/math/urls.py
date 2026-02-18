from django.urls import path
from . import views

urlpatterns = [
    path("generate/", views.generate_problem),
    path("evaluate/", views.evaluate_answer),
]
