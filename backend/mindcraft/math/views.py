from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from mindcraft.ai_service import generators
from . import openai_client


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_problem(request):
    """Generate a math problem for the given grade and topic."""
    grade = request.data.get("grade")
    topic = request.data.get("topic", "arithmetic")

    if grade is None:
        return Response({"error": "grade is required"}, status=400)

    try:
        grade = int(grade)
    except (TypeError, ValueError):
        return Response({"error": "grade must be an integer"}, status=400)

    try:
        result = generators.generate_math_problem(topic=topic, grade_level=grade)
        return Response(result)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def evaluate_answer(request):
    """Evaluate a student's handwritten math answer from a canvas image."""
    problem = request.data.get("problem")
    image_base64 = request.data.get("image_base64")
    grade = request.data.get("grade")

    if not problem:
        return Response({"error": "problem is required"}, status=400)
    if not image_base64:
        return Response({"error": "image_base64 is required"}, status=400)
    if grade is None:
        return Response({"error": "grade is required"}, status=400)

    try:
        grade = int(grade)
    except (TypeError, ValueError):
        return Response({"error": "grade must be an integer"}, status=400)

    try:
        result = openai_client.evaluate_math_answer(
            problem=problem,
            image_base64=image_base64,
            grade=grade,
        )
        return Response(result)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
