from rest_framework import serializers
from .models import ChatSession, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["id", "role", "content", "created_at"]
        read_only_fields = ["id", "role", "created_at"]


class ChatSessionSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = ["id", "title", "context_type", "context_id", "is_active", "created_at", "updated_at", "last_message", "message_count"]

    def get_last_message(self, obj):
        msg = obj.messages.last()
        return msg.content[:100] if msg else None

    def get_message_count(self, obj):
        return obj.messages.count()


class ChatSendSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000)
    context = serializers.DictField(required=False, default=None)
