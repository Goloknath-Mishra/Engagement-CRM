from django.conf import settings
from django.contrib.auth.models import Group
from django.db import models


class Badge(models.Model):
    class Module(models.TextChoices):
        SALES = "sales", "Sales"
        SERVICE = "service", "Service"
        MARKETING = "marketing", "Marketing"

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    module = models.CharField(max_length=24, choices=Module.choices)
    name = models.CharField(max_length=120, unique=True)
    description = models.CharField(max_length=255, blank=True)
    icon = models.CharField(max_length=64, blank=True)
    color_primary = models.CharField(max_length=32, blank=True)
    color_secondary = models.CharField(max_length=32, blank=True)

    def __str__(self) -> str:
        return self.name


class Challenge(models.Model):
    class Module(models.TextChoices):
        SALES = "sales", "Sales"
        SERVICE = "service", "Service"
        MARKETING = "marketing", "Marketing"

    class Mode(models.TextChoices):
        INDIVIDUAL = "individual", "Individual"
        TEAM = "team", "Team"

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    module = models.CharField(max_length=24, choices=Module.choices)
    mode = models.CharField(max_length=24, choices=Mode.choices)
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    target_points = models.PositiveIntegerField(default=0)
    rules = models.JSONField(default=list, blank=True)
    reward_title = models.CharField(max_length=160, blank=True)
    reward_badge = models.ForeignKey(Badge, null=True, blank=True, on_delete=models.SET_NULL, related_name="challenges")
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_challenges")

    def __str__(self) -> str:
        return self.name


class ChallengeParticipation(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="challenge_participations")
    team = models.ForeignKey(Group, null=True, blank=True, on_delete=models.PROTECT, related_name="challenge_participations")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["challenge", "user"], name="uniq_challenge_user"),
        ]

    def __str__(self) -> str:
        return f"{self.challenge_id}:{self.user_id}"


class BadgeAward(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="badge_awards")
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name="awards")
    challenge = models.ForeignKey(Challenge, null=True, blank=True, on_delete=models.SET_NULL, related_name="badge_awards")
    points_at_award = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "badge", "challenge"], name="uniq_badge_award"),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.badge_id}"

