from django.urls import path
from . import views

urlpatterns = [
    path("auth/login/", views.login_view),
    path("auth/logout/", views.logout_view),
    path("auth/me/", views.me_view),
    path("kids/", views.kids_list_view),
]
