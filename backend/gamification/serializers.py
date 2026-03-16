from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import serializers

from .models import Badge, BadgeAward, Challenge, ChallengeParticipation

User = get_user_model()


class UserRefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "email")


class GroupRefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ("id", "name")


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ("id", "module", "name", "description", "icon", "color_primary", "color_secondary", "created_at", "updated_at")


class ChallengeSerializer(serializers.ModelSerializer):
    reward_badge = BadgeSerializer(read_only=True)

    class Meta:
        model = Challenge
        fields = (
            "id",
            "module",
            "mode",
            "name",
            "description",
            "start_at",
            "end_at",
            "target_points",
            "rules",
            "reward_title",
            "reward_badge",
            "is_active",
            "created_at",
            "updated_at",
        )


class ChallengeParticipationSerializer(serializers.ModelSerializer):
    user = UserRefSerializer(read_only=True)
    team = GroupRefSerializer(read_only=True)

    class Meta:
        model = ChallengeParticipation
        fields = ("id", "created_at", "challenge", "user", "team")
        read_only_fields = ("challenge", "user", "team")


class BadgeAwardSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = BadgeAward
        fields = ("id", "created_at", "badge", "challenge", "points_at_award")

