"""AI content generation functions."""

import json
from django.conf import settings
from . import client, prompts


def generate_lesson(
    topic: str,
    grade_level: int,
    difficulty: str = "medium",
    additional_context: str = "",
) -> dict:
    """Generate a lesson using AI.

    Returns:
        {"title": str, "content": str, "description": str, "estimated_minutes": int}
    """
    user_message = f"""Create a lesson about: {topic}
Grade level: {grade_level}
Difficulty: {difficulty}
{f"Additional context: {additional_context}" if additional_context else ""}

Make it engaging, fun, and appropriate for this grade level."""

    content = client.chat_completion(
        messages=[{"role": "user", "content": user_message}],
        system=prompts.LESSON_GENERATOR_PROMPT,
        model=settings.AI_MODEL,
    )

    # Extract title from first markdown heading
    title = topic
    for line in content.split("\n"):
        if line.startswith("# "):
            title = line.lstrip("# ").strip()
            break

    return {
        "title": title,
        "content": content,
        "description": f"AI-generated lesson about {topic} for grade {grade_level}",
        "estimated_minutes": 15 if difficulty == "easy" else 20 if difficulty == "medium" else 25,
    }


def generate_lesson_from_research(
    topic: str,
    grade_level: int,
    difficulty: str = "medium",
    research_summary: str = "",
    key_facts: list[str] | None = None,
    citations: list[dict] | None = None,
    media_resources: list[dict] | None = None,
    parent_notes: str = "",
) -> dict:
    """Generate a lesson using research findings.

    Returns:
        {"title": str, "content": str, "description": str, "estimated_minutes": int}
    """
    facts_text = "\n".join(f"- {fact}" for fact in (key_facts or []))

    citations_text = ""
    if citations:
        citations_text = "\n".join(
            f"[Source {i+1}] {c.get('title', c.get('url', ''))} — {c.get('url', '')}"
            for i, c in enumerate(citations)
        )

    media_text = ""
    if media_resources:
        media_text = "\n".join(
            f"- {r.get('title', '')} ({r.get('media_type', '')}): {r.get('url', '')}"
            for r in media_resources
        )

    user_message = f"""Create a research-backed lesson about: {topic}
Grade level: {grade_level}
Difficulty: {difficulty}

RESEARCH SUMMARY:
{research_summary}

KEY FACTS:
{facts_text}

CITATIONS:
{citations_text}

{f"AVAILABLE MULTIMEDIA RESOURCES (reference where relevant):{chr(10)}{media_text}" if media_text else ""}

{f"PARENT/TEACHER NOTES:{chr(10)}{parent_notes}" if parent_notes else ""}

Make it engaging, accurate, and appropriate for grade {grade_level}. Cite sources using [Source N] notation."""

    content = client.chat_completion(
        messages=[{"role": "user", "content": user_message}],
        system=prompts.RESEARCH_LESSON_GENERATOR_PROMPT,
        model=settings.AI_MODEL,
    )

    title = topic
    for line in content.split("\n"):
        if line.startswith("# "):
            title = line.lstrip("# ").strip()
            break

    return {
        "title": title,
        "content": content,
        "description": f"Research-backed lesson about {topic} for grade {grade_level}",
        "estimated_minutes": 15 if difficulty == "easy" else 20 if difficulty == "medium" else 25,
    }


def generate_quiz(
    lesson_content: str,
    num_questions: int = 5,
    grade_level: int = 5,
) -> dict:
    """Generate a quiz from lesson content.

    Returns:
        Parsed JSON with quiz structure
    """
    user_message = f"""Based on this lesson content, create a quiz with {num_questions} questions.
Grade level: {grade_level}

LESSON CONTENT:
{lesson_content}

Remember to respond with ONLY valid JSON."""

    response = client.chat_completion(
        messages=[{"role": "user", "content": user_message}],
        system=prompts.QUIZ_GENERATOR_PROMPT,
        model=settings.AI_MODEL,
    )

    # Parse JSON from response (handle markdown code blocks)
    json_str = response.strip()
    if json_str.startswith("```"):
        json_str = "\n".join(json_str.split("\n")[1:-1])

    return json.loads(json_str)


def generate_feedback(
    journal_content: str,
    kid_name: str,
    age: int | None = None,
) -> str:
    """Generate encouraging feedback for a journal entry."""
    age_context = f"The student is {age} years old." if age else ""

    user_message = f"""{kid_name} wrote this journal entry:

---
{journal_content}
---

{age_context}
Please give them warm, encouraging feedback."""

    return client.chat_completion(
        messages=[{"role": "user", "content": user_message}],
        system=prompts.FEEDBACK_PROMPT,
        model=settings.AI_MODEL_CHAT,
    )


def generate_hint(
    question_text: str,
    choices: list[str],
    attempt_number: int = 1,
) -> str:
    """Generate a progressive hint for a quiz question."""
    user_message = f"""Question: {question_text}
Options: {', '.join(choices)}
Hint level: {min(attempt_number, 3)} out of 3

Give a hint appropriate for this level."""

    return client.chat_completion(
        messages=[{"role": "user", "content": user_message}],
        system=prompts.HINT_PROMPT,
        model=settings.AI_MODEL_CHAT,
        max_tokens=200,
    )


def generate_math_problem(topic: str, grade_level: int) -> dict:
    """Generate a math problem using AI.

    Returns:
        {"problem_text": str, "difficulty": str, "hint": str}
    """
    user_message = f"""Generate a math problem about: {topic}
Grade level: {grade_level}

Remember to respond with ONLY valid JSON."""

    response = client.chat_completion(
        messages=[{"role": "user", "content": user_message}],
        system=prompts.MATH_PROBLEM_PROMPT,
        model=settings.AI_MODEL,
    )

    # Parse JSON from response (handle markdown code blocks)
    json_str = response.strip()
    if json_str.startswith("```"):
        json_str = "\n".join(json_str.split("\n")[1:-1])

    return json.loads(json_str)


def generate_curriculum_outline(
    concept: str,
    grade_level: int,
    duration_weeks: int = 2,
    lessons_per_week: int = 2,
    difficulty: str = "medium",
) -> dict:
    """Generate a curriculum outline (week-by-week plan).

    Returns:
        Parsed JSON with curriculum structure including weeks and lessons.
    """
    user_message = f"""Design a {duration_weeks}-week curriculum about: {concept}
Grade level: {grade_level}
Difficulty: {difficulty}
Lessons per week: {lessons_per_week}
Total lessons: {duration_weeks * lessons_per_week}

Create a structured, progressive learning plan that builds knowledge week by week.
Remember to respond with ONLY valid JSON."""

    response = client.chat_completion(
        messages=[{"role": "user", "content": user_message}],
        system=prompts.CURRICULUM_OUTLINE_PROMPT,
        model=settings.AI_MODEL,
    )

    # Parse JSON from response (handle markdown code blocks)
    json_str = response.strip()
    if json_str.startswith("```"):
        json_str = "\n".join(json_str.split("\n")[1:-1])

    return json.loads(json_str)


def generate_curriculum_lesson(
    concept: str,
    grade_level: int,
    difficulty: str,
    week_number: int,
    lesson_number: int,
    lesson_title: str,
    learning_objectives: list[str],
    lesson_description: str = "",
    previous_lessons_context: str = "",
    upcoming_lesson_title: str = "",
) -> dict:
    """Generate a single lesson within a curriculum context.

    The lesson is aware of its position in the curriculum and connects to
    previous and upcoming lessons.

    Returns:
        {"title": str, "content": str, "description": str, "estimated_minutes": int}
    """
    objectives_text = "\n".join(f"- {obj}" for obj in learning_objectives)

    user_message = f"""Create a lesson for a multi-week curriculum about: {concept}

CURRICULUM POSITION:
- Week {week_number}, Lesson {lesson_number}
- Grade level: {grade_level}
- Difficulty: {difficulty}

LESSON DETAILS:
- Title: {lesson_title}
- Description: {lesson_description}
- Learning Objectives:
{objectives_text}

{f"PREVIOUS LESSONS COVERED:{chr(10)}{previous_lessons_context}" if previous_lessons_context else "This is the first lesson in the curriculum."}

{f"NEXT LESSON: {upcoming_lesson_title}" if upcoming_lesson_title else "This is the final lesson in the curriculum."}

Make it engaging, build on what came before, and set up what comes next. Appropriate for grade {grade_level}."""

    content = client.chat_completion(
        messages=[{"role": "user", "content": user_message}],
        system=prompts.CURRICULUM_LESSON_PROMPT,
        model=settings.AI_MODEL,
    )

    # Extract title from first markdown heading
    title = lesson_title
    for line in content.split("\n"):
        if line.startswith("# "):
            title = line.lstrip("# ").strip()
            break

    return {
        "title": title,
        "content": content,
        "description": lesson_description or f"Week {week_number} lesson about {lesson_title}",
        "estimated_minutes": 15 if difficulty == "easy" else 20 if difficulty == "medium" else 25,
    }
