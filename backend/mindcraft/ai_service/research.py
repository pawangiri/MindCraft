"""Perplexity Sonar integration for topic research."""

import re
from openai import OpenAI
from django.conf import settings


def _get_perplexity_client() -> OpenAI:
    return OpenAI(
        api_key=settings.PERPLEXITY_API_KEY,
        base_url="https://api.perplexity.ai",
    )


def research_topic(topic: str, grade_level: int, subject: str) -> dict:
    """Research a topic using Perplexity Sonar API.

    Returns:
        {"summary": str, "key_facts": list[str], "citations": list[dict], "raw_response": dict}
    """
    client = _get_perplexity_client()

    system_prompt = f"""You are an educational research assistant. Research the following topic
for a grade {grade_level} student studying {subject}.

Provide your response in this exact format:

## Summary
[A comprehensive but grade-appropriate summary of the topic, 2-3 paragraphs]

## Key Facts
- [Fact 1]
- [Fact 2]
- [Fact 3]
- [Fact 4]
- [Fact 5]
- [Add more facts as relevant]

Focus on accuracy, educational value, and age-appropriateness for grade {grade_level}."""

    response = client.chat.completions.create(
        model=settings.PERPLEXITY_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Research this topic thoroughly: {topic}"},
        ],
    )

    content = response.choices[0].message.content or ""

    # Extract citations from Perplexity response
    citations = []
    if hasattr(response, "citations") and response.citations:
        for i, url in enumerate(response.citations):
            citations.append({"url": url, "title": f"Source {i + 1}", "snippet": ""})

    # Parse summary and key facts from response
    summary = ""
    key_facts = []

    # Extract summary section
    summary_match = re.search(r"## Summary\s*\n(.*?)(?=\n## |\Z)", content, re.DOTALL)
    if summary_match:
        summary = summary_match.group(1).strip()
    else:
        summary = content

    # Extract key facts
    facts_match = re.search(r"## Key Facts\s*\n(.*?)(?=\n## |\Z)", content, re.DOTALL)
    if facts_match:
        facts_text = facts_match.group(1).strip()
        key_facts = [
            line.lstrip("- ").strip()
            for line in facts_text.split("\n")
            if line.strip().startswith("-")
        ]

    return {
        "summary": summary,
        "key_facts": key_facts,
        "citations": citations,
        "raw_response": {
            "content": content,
            "model": settings.PERPLEXITY_MODEL,
            "citations": [c["url"] for c in citations],
        },
    }


def discover_multimedia(topic: str, grade_level: int, subject: str) -> list[dict]:
    """Discover educational multimedia resources for a topic.

    Returns:
        list of {"url": str, "title": str, "description": str, "media_type": str, "thumbnail_url": str}
    """
    client = _get_perplexity_client()

    system_prompt = f"""Find educational video and interactive resources for a grade {grade_level}
student learning about the following topic in {subject}.

For each resource, provide it in this exact format (one per line):
[TYPE] Title | URL | Brief description

Where TYPE is one of: YOUTUBE, KHAN_ACADEMY, INTERACTIVE

Find 3-6 high-quality, age-appropriate resources. Prioritize:
1. Khan Academy lessons/videos
2. YouTube educational videos (from channels like CrashCourse, SciShow, TED-Ed, etc.)
3. Interactive simulations (PhET, etc.)"""

    response = client.chat.completions.create(
        model=settings.PERPLEXITY_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Find educational resources for: {topic}"},
        ],
    )

    content = response.choices[0].message.content or ""
    resources = []

    type_map = {
        "YOUTUBE": "youtube",
        "KHAN_ACADEMY": "khan_academy",
        "INTERACTIVE": "interactive",
    }

    for line in content.split("\n"):
        line = line.strip()
        match = re.match(r"\[(\w+)\]\s*(.+?)\s*\|\s*(https?://\S+)\s*\|\s*(.+)", line)
        if match:
            media_type_key = match.group(1).upper()
            media_type = type_map.get(media_type_key, "other")
            url = match.group(3).strip()

            # Generate thumbnail for YouTube
            thumbnail_url = ""
            if media_type == "youtube":
                yt_match = re.search(r"(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})", url)
                if yt_match:
                    thumbnail_url = f"https://img.youtube.com/vi/{yt_match.group(1)}/mqdefault.jpg"

            resources.append({
                "url": url,
                "title": match.group(2).strip(),
                "description": match.group(4).strip(),
                "media_type": media_type,
                "thumbnail_url": thumbnail_url,
            })

    return resources
