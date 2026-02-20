from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

admin.site.site_header = "Learning Monk Admin"
admin.site.site_title = "Learning Monk"
admin.site.index_title = "Dashboard"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("mindcraft.core.urls")),
    path("api/v1/", include("mindcraft.content.urls")),
    path("api/v1/quizzes/", include("mindcraft.quiz.urls")),
    path("api/v1/chat/", include("mindcraft.chat.urls")),
    path("api/v1/journal/", include("mindcraft.journal.urls")),
    path("api/v1/progress/", include("mindcraft.progress.urls")),
    path("api/v1/math/", include("mindcraft.math.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
