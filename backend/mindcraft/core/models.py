from django.db import models
from django.contrib.auth.models import User
from django.conf import settings


class KidProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="kid_profile")
    parent = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="children", limit_choices_to={"is_staff": True}
    )
    display_name = models.CharField(max_length=50)
    avatar = models.CharField(max_length=50, default="🧒")
    grade_level = models.IntegerField(default=1)
    date_of_birth = models.DateField(null=True, blank=True)
    daily_chat_limit = models.IntegerField(default=settings.AI_DEFAULT_DAILY_CHAT_LIMIT)
    allowed_subjects = models.ManyToManyField("content.Subject", blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "core"

    def __str__(self):
        return f"{self.display_name} (Grade {self.grade_level})"

    @property
    def age(self):
        if not self.date_of_birth:
            return None
        from datetime import date
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )
