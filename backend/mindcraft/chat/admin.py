from django.contrib import admin
from .models import ChatSession, ChatMessage


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ["role", "content", "created_at"]


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ["kid", "title", "context_type", "is_active", "created_at"]
    list_filter = ["context_type", "is_active", "kid"]
    inlines = [ChatMessageInline]


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ["session", "role", "content_short", "created_at"]
    list_filter = ["role", "session__kid"]
    readonly_fields = ["session", "role", "content", "created_at"]

    @admin.display(description="Content")
    def content_short(self, obj):
        return obj.content[:100]
