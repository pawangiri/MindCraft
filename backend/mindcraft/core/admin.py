from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import KidProfile


class KidProfileInline(admin.StackedInline):
    model = KidProfile
    can_delete = False
    fk_name = "user"
    verbose_name_plural = "Kid Profile"
    filter_horizontal = ("allowed_subjects",)


class UserAdmin(BaseUserAdmin):
    inlines = [KidProfileInline]
    list_display = ["username", "first_name", "is_staff", "get_role"]

    @admin.display(description="Role")
    def get_role(self, obj):
        if obj.is_staff:
            return "Admin/Parent"
        return "Kid" if hasattr(obj, "kid_profile") else "User"


admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(KidProfile)
class KidProfileAdmin(admin.ModelAdmin):
    list_display = ["display_name", "user", "grade_level", "parent", "daily_chat_limit"]
    list_filter = ["grade_level", "is_active"]
    filter_horizontal = ("allowed_subjects",)
