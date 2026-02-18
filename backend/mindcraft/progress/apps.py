from django.apps import AppConfig


class ProgressConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "mindcraft.progress"

    def ready(self):
        import mindcraft.progress.signals  # noqa: F401
