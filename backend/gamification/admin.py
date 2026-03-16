from django.contrib import admin

from .models import Badge, BadgeAward, Challenge, ChallengeParticipation


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ("name", "module", "icon", "created_at")
    search_fields = ("name", "description")
    list_filter = ("module",)


@admin.register(Challenge)
class ChallengeAdmin(admin.ModelAdmin):
    list_display = ("name", "module", "mode", "is_active", "start_at", "end_at", "target_points")
    search_fields = ("name", "description")
    list_filter = ("module", "mode", "is_active")


@admin.register(ChallengeParticipation)
class ChallengeParticipationAdmin(admin.ModelAdmin):
    list_display = ("challenge", "user", "team", "created_at")
    list_filter = ("team",)
    search_fields = ("user__username", "challenge__name")


@admin.register(BadgeAward)
class BadgeAwardAdmin(admin.ModelAdmin):
    list_display = ("badge", "user", "challenge", "points_at_award", "created_at")
    list_filter = ("badge",)
    search_fields = ("user__username", "badge__name", "challenge__name")

