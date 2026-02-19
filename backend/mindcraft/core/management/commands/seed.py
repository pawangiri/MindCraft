"""Seed the database with initial data for MindCraft."""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from mindcraft.core.models import KidProfile
from mindcraft.content.models import Subject, Topic, Lesson
from mindcraft.progress.models import Badge


class Command(BaseCommand):
    help = "Seed the database with sample data"

    def handle(self, *args, **options):
        self.stdout.write("🌱 Seeding MindCraft database...")

        # Create admin/parent user
        admin, created = User.objects.get_or_create(
            username="parent",
            defaults={
                "first_name": "Parent",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin.set_password("mindcraft")
            admin.save()
            Token.objects.get_or_create(user=admin)
            self.stdout.write(self.style.SUCCESS("  ✓ Admin user: parent / mindcraft"))

        # Create kid users
        kids_data = [
            {"username": "aaria123", "display_name": "Aaria", "avatar": "🌸", "grade_level": 4, "password": "alex123"},
            {"username": "atharva123", "display_name": "Atharva", "avatar": "🚀", "grade_level": 9, "password": "jordan123"},
        ]

        for kid_data in kids_data:
            user, created = User.objects.get_or_create(
                username=kid_data["username"],
                defaults={"first_name": kid_data["display_name"]},
            )
            if created:
                user.set_password(kid_data["password"])
                user.save()
                Token.objects.get_or_create(user=user)

                KidProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        "parent": admin,
                        "display_name": kid_data["display_name"],
                        "avatar": kid_data["avatar"],
                        "grade_level": kid_data["grade_level"],
                    },
                )
                self.stdout.write(self.style.SUCCESS(
                    f"  ✓ Kid: {kid_data['username']} / {kid_data['password']} (Grade {kid_data['grade_level']})"
                ))

        # Create subjects
        subjects_data = [
            {"name": "Money & Budgeting", "icon": "💰", "color": "#22c55e", "order": 1},
            {"name": "Science & Nature", "icon": "🔬", "color": "#3b82f6", "order": 2},
            {"name": "Life Skills", "icon": "🏠", "color": "#f59e0b", "order": 3},
            {"name": "Critical Thinking", "icon": "🧠", "color": "#8b5cf6", "order": 4},
            {"name": "Digital Literacy", "icon": "💻", "color": "#06b6d4", "order": 5},
            {"name": "Communication", "icon": "💬", "color": "#ec4899", "order": 6},
            {"name": "Health & Wellness", "icon": "❤️", "color": "#ef4444", "order": 7},
            {"name": "How Things Work", "icon": "⚙️", "color": "#64748b", "order": 8},
        ]

        for s_data in subjects_data:
            Subject.objects.get_or_create(name=s_data["name"], defaults=s_data)
        self.stdout.write(self.style.SUCCESS(f"  ✓ {len(subjects_data)} subjects created"))

        # Create some topics
        topics_data = [
            ("Money & Budgeting", [
                {"name": "What is Money?", "grade_level_min": 1, "grade_level_max": 4},
                {"name": "Saving & Spending", "grade_level_min": 3, "grade_level_max": 6},
                {"name": "Budgeting Basics", "grade_level_min": 5, "grade_level_max": 8},
                {"name": "Investing for Beginners", "grade_level_min": 7, "grade_level_max": 12},
            ]),
            ("Science & Nature", [
                {"name": "The Water Cycle", "grade_level_min": 2, "grade_level_max": 5},
                {"name": "How Plants Grow", "grade_level_min": 1, "grade_level_max": 4},
                {"name": "The Solar System", "grade_level_min": 3, "grade_level_max": 7},
                {"name": "Ecosystems", "grade_level_min": 5, "grade_level_max": 9},
            ]),
            ("Life Skills", [
                {"name": "Cooking Basics", "grade_level_min": 3, "grade_level_max": 12},
                {"name": "Time Management", "grade_level_min": 4, "grade_level_max": 12},
                {"name": "First Aid", "grade_level_min": 5, "grade_level_max": 12},
            ]),
            ("Critical Thinking", [
                {"name": "Asking Good Questions", "grade_level_min": 2, "grade_level_max": 6},
                {"name": "Fact vs Opinion", "grade_level_min": 3, "grade_level_max": 7},
                {"name": "Logical Reasoning", "grade_level_min": 6, "grade_level_max": 12},
            ]),
        ]

        for subject_name, topics in topics_data:
            subject = Subject.objects.get(name=subject_name)
            for i, t_data in enumerate(topics):
                Topic.objects.get_or_create(
                    subject=subject, name=t_data["name"],
                    defaults={**t_data, "order": i},
                )
        self.stdout.write(self.style.SUCCESS("  ✓ Topics created"))

        # Create a sample lesson
        topic = Topic.objects.filter(name="What is Money?").first()
        if topic:
            lesson, created = Lesson.objects.get_or_create(
                title="What is Money and Why Do We Need It?",
                defaults={
                    "topic": topic,
                    "description": "Learn what money is, where it came from, and why we use it every day.",
                    "content": SAMPLE_LESSON_CONTENT,
                    "grade_level": 3,
                    "difficulty": "easy",
                    "estimated_minutes": 15,
                    "created_by": admin,
                    "status": Lesson.Status.PUBLISHED,
                },
            )
            if created:
                # Assign to all kids
                for profile in KidProfile.objects.all():
                    lesson.assigned_to.add(profile)
                self.stdout.write(self.style.SUCCESS("  ✓ Sample lesson created and assigned"))

        # Create badges
        badges_data = [
            {"name": "First Steps", "description": "Complete your first lesson!", "icon": "👣", "badge_type": "first_steps"},
            {"name": "Quiz Whiz", "description": "Score 100% on a quiz!", "icon": "🏆", "badge_type": "quiz_ace"},
            {"name": "On Fire!", "description": "Keep a 7-day learning streak!", "icon": "🔥", "badge_type": "streak"},
            {"name": "Explorer", "description": "Complete lessons in 3 different subjects!", "icon": "🧭", "badge_type": "explorer"},
            {"name": "Bookworm", "description": "Write 5 journal entries!", "icon": "📖", "badge_type": "bookworm"},
            {"name": "Lesson Master", "description": "Complete 10 lessons!", "icon": "⭐", "badge_type": "lesson_complete"},
        ]
        for b_data in badges_data:
            Badge.objects.get_or_create(name=b_data["name"], defaults=b_data)
        self.stdout.write(self.style.SUCCESS(f"  ✓ {len(badges_data)} badges created"))

        self.stdout.write(self.style.SUCCESS("\n🎉 Seeding complete!"))
        self.stdout.write("\nLogin credentials:")
        self.stdout.write("  Admin:  parent / mindcraft")
        for kid in kids_data:
            self.stdout.write(f"  Kid:    {kid['username']} / {kid['password']} (Grade {kid['grade_level']})")


SAMPLE_LESSON_CONTENT = """# What is Money and Why Do We Need It?

## 🎯 What You'll Learn
In this lesson, you'll discover what money really is, how people traded before money existed, and why money makes our lives easier.

## 🪝 Have You Ever Wondered...
Imagine you're really good at making sandwiches, and your friend is amazing at drawing. You want a cool drawing, and your friend wants a sandwich. Easy — you trade! 🥪↔️🎨

But what if your friend isn't hungry? What if they want a basketball instead? Now you need to find someone with a basketball who wants a sandwich... This could take forever!

This is exactly the problem that money solves. Let's find out how!

## 📖 Before Money: The Barter System

Long, long ago — thousands of years before your grandparents were born — people didn't have money at all. Instead, they **bartered**, which means they traded things directly.

A farmer might trade 10 apples for a basket of fish. A weaver might trade a blanket for a new pair of shoes.

### The Problem with Bartering
Bartering only works when both people want what the other has. This is called the **"double coincidence of wants"** (fancy words for "we both have to want each other's stuff").

## 📖 Money to the Rescue!

People figured out they needed something that **everyone** would accept in a trade. Over time, they tried different things:

- **Shells** 🐚 — Some cultures used beautiful cowrie shells
- **Salt** 🧂 — Roman soldiers were sometimes paid in salt (that's where the word "salary" comes from!)
- **Metal coins** 🪙 — Made from gold, silver, or copper
- **Paper money** 💵 — Easier to carry than heavy coins!
- **Digital money** 💳 — Today, money often lives in computers and phones

## 📖 What Makes Something "Money"?

For something to work as money, it needs to do three important jobs:

1. **Store of Value** — It keeps its worth over time (unlike a sandwich that goes bad! 🤢)
2. **Medium of Exchange** — Everyone agrees to accept it
3. **Unit of Account** — You can use it to measure how much things are worth

## 🤔 Think About It

1. Why wouldn't ice cream work well as money? (Think about what happens on a hot day!)
2. If you could create your own money system for your school, what would you use?
3. Can you think of three things you "traded" with friends or family recently?

## ⭐ Key Takeaways

- Before money, people bartered (traded stuff directly)
- Bartering was hard because both people had to want what the other had
- Money solves this problem — it's something everyone agrees has value
- Money has evolved from shells and salt to coins, paper, and digital forms
- Good money stores value, is accepted by everyone, and measures worth

## 🎮 Try This!

**The Barter Game:** At dinner tonight, try to "trade" with your family. Instead of everyone getting their own food, try to barter for what you want. See how hard it is when someone doesn't want what you're offering!

**Money Timeline:** Draw a timeline showing how money changed over history — from shells to digital payments. Can you guess what money might look like in the future? 🚀
"""
