from rest_framework import serializers
from django.contrib.auth.models import User
from .models import KidProfile


class KidProfileSerializer(serializers.ModelSerializer):
    age = serializers.ReadOnlyField()

    class Meta:
        model = KidProfile
        fields = [
            "id", "display_name", "avatar", "grade_level",
            "date_of_birth", "daily_chat_limit", "age",
        ]


class UserSerializer(serializers.ModelSerializer):
    kid_profile = KidProfileSerializer(read_only=True)
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "is_staff", "role", "kid_profile"]

    def get_role(self, obj):
        if obj.is_staff:
            return "admin"
        return "kid" if hasattr(obj, "kid_profile") else "user"


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
