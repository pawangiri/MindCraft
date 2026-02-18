"""Safety and filtering layer for AI responses."""

from datetime import date
from django.utils import timezone
from mindcraft.chat.models import ChatMessage


# Topics that should be blocked or redirected
BLOCKED_TOPICS = [
    "violence",
    "weapons",
    "drugs",
    "alcohol",
    "gambling",
    "dating",
    "romance",
    "politics",
    "religion",
]


def check_rate_limit(kid_profile) -> tuple[bool, str]:
    """Check if kid has exceeded their daily chat limit.

    Returns:
        (is_allowed, message)
    """
    today = timezone.now().date()
    message_count = ChatMessage.objects.filter(
        session__kid=kid_profile,
        role=ChatMessage.Role.USER,
        created_at__date=today,
    ).count()

    if message_count >= kid_profile.daily_chat_limit:
        return False, f"You've reached your daily chat limit of {kid_profile.daily_chat_limit} messages. Come back tomorrow! 🌅"

    remaining = kid_profile.daily_chat_limit - message_count
    return True, f"{remaining} messages remaining today"


def validate_kid_message(message: str) -> tuple[bool, str]:
    """Basic validation of kid's message before sending to AI.

    Returns:
        (is_valid, cleaned_message_or_error)
    """
    if not message or not message.strip():
        return False, "Please type a message!"

    if len(message) > 2000:
        return False, "That message is too long! Try keeping it shorter."

    return True, message.strip()


def validate_ai_response(response: str) -> tuple[bool, str]:
    """Validate AI response before sending to kid.

    Returns:
        (is_valid, response_or_error)
    """
    if not response or not response.strip():
        return False, "Hmm, I'm having trouble thinking right now. Try asking again!"

    return True, response
