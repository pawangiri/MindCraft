"""Thin wrapper for OpenAI GPT-4o-mini vision API — evaluates handwritten math answers."""

import json
import logging

from django.conf import settings
from openai import OpenAI

logger = logging.getLogger(__name__)


def evaluate_math_answer(problem: str, image_base64: str, grade: int) -> dict:
    """Send a canvas image to GPT-4o-mini for math answer evaluation.

    Args:
        problem: The math problem text shown to the student.
        image_base64: Base64-encoded PNG of the student's drawn answer.
        grade: The student's grade level (used to estimate age).

    Returns:
        {"correct": bool, "correct_answer": str, "feedback": str}
    """
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    age = grade + 5
    prompt = (
        f"The math problem shown to the student was: {problem}. "
        f"The student drew this answer on a canvas. "
        f"Look at their work and tell me: "
        f"(1) Is the answer correct? "
        f"(2) If wrong, what is the correct answer? "
        f"(3) Give one short encouraging sentence. "
        f"Keep language appropriate for a child aged {age} years. "
        f"Respond ONLY with valid JSON: "
        f'{{"correct": true/false, "correct_answer": "...", "feedback": "..."}}'
    )

    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{image_base64}",
                        },
                    },
                ],
            }
        ],
        max_tokens=300,
    )

    raw = response.choices[0].message.content.strip()

    # Parse JSON (handle markdown code blocks)
    json_str = raw
    if json_str.startswith("```"):
        json_str = "\n".join(json_str.split("\n")[1:-1])

    try:
        result = json.loads(json_str)
    except json.JSONDecodeError:
        logger.error("Failed to parse OpenAI response as JSON: %s", raw)
        result = {
            "correct": False,
            "correct_answer": "",
            "feedback": "Great effort! Let me take another look at your work.",
        }

    return {
        "correct": bool(result.get("correct", False)),
        "correct_answer": str(result.get("correct_answer", "")),
        "feedback": str(result.get("feedback", "")),
    }
