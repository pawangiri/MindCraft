from django.db import models
from django.contrib.auth.models import User


class Subject(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default="📚")
    color = models.CharField(max_length=7, default="#6366f1", help_text="Hex color")
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class Topic(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="topics")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.IntegerField(default=0)
    grade_level_min = models.IntegerField(default=1)
    grade_level_max = models.IntegerField(default=12)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return f"{self.subject.name} → {self.name}"


class Lesson(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        REVIEW = "review", "Review"
        PUBLISHED = "published", "Published"

    class Difficulty(models.TextChoices):
        EASY = "easy", "Easy"
        MEDIUM = "medium", "Medium"
        HARD = "hard", "Hard"

    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    content = models.TextField(help_text="Lesson content in Markdown")
    grade_level = models.IntegerField(default=1)
    difficulty = models.CharField(max_length=10, choices=Difficulty.choices, default=Difficulty.MEDIUM)
    estimated_minutes = models.IntegerField(default=15)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="created_lessons")
    ai_generated = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    assigned_to = models.ManyToManyField("core.KidProfile", blank=True, related_name="assigned_lessons")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ResearchSession(models.Model):
    class PipelineStatus(models.TextChoices):
        TOPIC_INPUT = "topic_input", "Topic Input"
        RESEARCHING = "researching", "Researching"
        RESEARCH_COMPLETE = "research_complete", "Research Complete"
        GENERATING = "generating", "Generating"
        GENERATED = "generated", "Generated"
        ENRICHING = "enriching", "Enriching"
        READY = "ready", "Ready"
        PUBLISHED = "published", "Published"

    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="research_sessions")
    topic = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True, related_name="research_sessions")
    topic_query = models.CharField(max_length=300)
    grade_level = models.IntegerField(default=5)
    difficulty = models.CharField(max_length=10, choices=Lesson.Difficulty.choices, default=Lesson.Difficulty.MEDIUM)
    status = models.CharField(max_length=20, choices=PipelineStatus.choices, default=PipelineStatus.TOPIC_INPUT)
    lesson = models.OneToOneField(Lesson, on_delete=models.SET_NULL, null=True, blank=True, related_name="research_session")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="research_sessions")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Research: {self.topic_query} ({self.status})"


class ResearchFinding(models.Model):
    session = models.OneToOneField(ResearchSession, on_delete=models.CASCADE, related_name="finding")
    summary = models.TextField()
    key_facts = models.JSONField(default=list)
    citations = models.JSONField(default=list)
    raw_response = models.JSONField(default=dict)
    parent_notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Findings for: {self.session.topic_query}"


class MediaResource(models.Model):
    class MediaType(models.TextChoices):
        YOUTUBE = "youtube", "YouTube"
        KHAN_ACADEMY = "khan_academy", "Khan Academy"
        ARTICLE = "article", "Article"
        INTERACTIVE = "interactive", "Interactive"
        OTHER = "other", "Other"

    class Source(models.TextChoices):
        AUTO = "auto", "Auto-discovered"
        MANUAL = "manual", "Manually Added"

    session = models.ForeignKey(ResearchSession, on_delete=models.CASCADE, related_name="media_resources")
    lesson = models.ForeignKey(Lesson, on_delete=models.SET_NULL, null=True, blank=True, related_name="media_resources")
    url = models.URLField(max_length=500)
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True, default="")
    media_type = models.CharField(max_length=20, choices=MediaType.choices, default=MediaType.OTHER)
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.MANUAL)
    thumbnail_url = models.URLField(max_length=500, blank=True, default="")
    order = models.IntegerField(default=0)
    is_included = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self):
        return self.title


class CurriculumPlan(models.Model):
    class Status(models.TextChoices):
        PLANNING = "planning", "Planning"
        OUTLINE_READY = "outline_ready", "Outline Ready"
        GENERATING = "generating", "Generating Lessons"
        COMPLETE = "complete", "Complete"
        PUBLISHED = "published", "Published"

    title = models.CharField(max_length=300, blank=True)
    description = models.TextField(blank=True)
    concept = models.CharField(max_length=300, help_text="The topic/concept to build a curriculum around")
    grade_level = models.IntegerField(default=5)
    difficulty = models.CharField(max_length=10, choices=Lesson.Difficulty.choices, default=Lesson.Difficulty.MEDIUM)
    duration_weeks = models.IntegerField(default=2, help_text="Number of weeks (1-5)")
    lessons_per_week = models.IntegerField(default=2, help_text="Lessons per week (1-3)")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLANNING)
    outline = models.JSONField(default=dict, blank=True, help_text="AI-generated week-by-week outline")
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name="curriculum_plans")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="curriculum_plans")
    assigned_to = models.ManyToManyField("core.KidProfile", blank=True, related_name="assigned_curricula")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Curriculum: {self.concept} ({self.status})"


class CurriculumLesson(models.Model):
    curriculum = models.ForeignKey(CurriculumPlan, on_delete=models.CASCADE, related_name="curriculum_lessons")
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="curriculum_entry")
    week_number = models.IntegerField()
    order = models.IntegerField(default=0, help_text="Order within the week")
    learning_objectives = models.TextField(blank=True)

    class Meta:
        ordering = ["week_number", "order"]
        unique_together = ["curriculum", "lesson"]

    def __str__(self):
        return f"Week {self.week_number}, Lesson {self.order}: {self.lesson.title}"
