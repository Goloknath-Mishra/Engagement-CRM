"""
Gamification API surface.

Primary responsibilities:
- Challenges (individual/team) defined by rules evaluated against AuditLog events
- Progress computation (points, percent, badge award)
- Leaderboards (team and individual)
"""

from django.contrib.auth.models import Group
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from crm.models import AuditLog

from .models import Badge, BadgeAward, Challenge, ChallengeParticipation
from .serializers import BadgeAwardSerializer, BadgeSerializer, ChallengeParticipationSerializer, ChallengeSerializer, GroupRefSerializer


def _parse_rules(rules):
    out = []
    if not isinstance(rules, list):
        return out
    for r in rules:
        if not isinstance(r, dict):
            continue
        entity_type = str(r.get("entity_type", "")).strip() or "*"
        action = str(r.get("action", "")).strip() or "*"
        try:
            points = int(r.get("points", 0))
        except Exception:
            points = 0
        if points <= 0:
            continue
        out.append({"entity_type": entity_type, "action": action, "points": points})
    return out


def _points_for_log(rules, log: AuditLog) -> int:
    for r in rules:
        if r["entity_type"] != "*" and r["entity_type"] != log.entity_type:
            continue
        if r["action"] != "*" and r["action"] != log.action:
            continue
        return r["points"]
    return 0


def _challenge_window(ch: Challenge):
    start = ch.start_at
    end = ch.end_at
    if timezone.is_naive(start):
        start = timezone.make_aware(start, timezone.get_current_timezone())
    if timezone.is_naive(end):
        end = timezone.make_aware(end, timezone.get_current_timezone())
    return start, end


def _compute_points_for_user(ch: Challenge, user_id: int):
    rules = _parse_rules(ch.rules)
    start, end = _challenge_window(ch)
    qs = AuditLog.objects.filter(created_at__gte=start, created_at__lte=end, actor_id=user_id)
    total = 0
    count = 0
    for log in qs.iterator():
        p = _points_for_log(rules, log)
        if p:
            total += p
            count += 1
    return total, count


def _compute_points_for_team(ch: Challenge, group_id: int):
    rules = _parse_rules(ch.rules)
    start, end = _challenge_window(ch)
    qs = AuditLog.objects.filter(created_at__gte=start, created_at__lte=end, actor__groups__id=group_id).distinct()
    total = 0
    count = 0
    for log in qs.iterator():
        p = _points_for_log(rules, log)
        if p:
            total += p
            count += 1
    return total, count


def _maybe_award_badge(user, ch: Challenge, points: int):
    if not ch.reward_badge_id or points < ch.target_points:
        return None
    award, created = BadgeAward.objects.get_or_create(
        user=user,
        badge_id=ch.reward_badge_id,
        challenge=ch,
        defaults={"points_at_award": points},
    )
    if not created and award.points_at_award != points:
        award.points_at_award = points
        award.save(update_fields=["points_at_award"])
    return award


class BadgeViewSet(viewsets.ModelViewSet):
    queryset = Badge.objects.all().order_by("module", "name")
    serializer_class = BadgeSerializer

    def get_permissions(self):
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("module"):
            qs = qs.filter(module=p.get("module"))
        return qs


class ChallengeViewSet(viewsets.ModelViewSet):
    queryset = Challenge.objects.select_related("reward_badge", "created_by").order_by("-start_at")
    serializer_class = ChallengeSerializer

    def get_permissions(self):
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("module"):
            qs = qs.filter(module=p.get("module"))
        if p.get("is_active") in ("true", "false"):
            qs = qs.filter(is_active=p.get("is_active") == "true")
        return qs

    @action(detail=True, methods=["post"])
    def join(self, request, pk=None):
        ch = self.get_object()
        team_id = request.data.get("team_id")
        team = None
        if ch.mode == Challenge.Mode.TEAM:
            if team_id:
                try:
                    team = Group.objects.get(pk=int(team_id))
                except Exception:
                    return Response({"detail": "Invalid team_id."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                team = request.user.groups.first()
            if not team:
                return Response({"detail": "No team available for this user."}, status=status.HTTP_400_BAD_REQUEST)
        participation, _ = ChallengeParticipation.objects.get_or_create(challenge=ch, user=request.user, defaults={"team": team})
        if ch.mode == Challenge.Mode.TEAM and participation.team_id != (team.id if team else None):
            participation.team = team
            participation.save(update_fields=["team"])
        return Response(ChallengeParticipationSerializer(participation).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def progress(self, request, pk=None):
        ch = self.get_object()
        try:
            participation = ChallengeParticipation.objects.get(challenge=ch, user=request.user)
        except ChallengeParticipation.DoesNotExist:
            participation = None

        if ch.mode == Challenge.Mode.TEAM:
            team_id = participation.team_id if participation else request.user.groups.values_list("id", flat=True).first()
            if not team_id:
                return Response({"detail": "Not joined and no team available."}, status=status.HTTP_400_BAD_REQUEST)
            points, count = _compute_points_for_team(ch, int(team_id))
        else:
            points, count = _compute_points_for_user(ch, request.user.id)

        pct = 0
        if ch.target_points:
            pct = min(100, int((points / ch.target_points) * 100))
        award = _maybe_award_badge(request.user, ch, points)
        return Response(
            {
                "challenge_id": ch.id,
                "mode": ch.mode,
                "joined": bool(participation),
                "team_id": participation.team_id if participation else None,
                "points": points,
                "events_count": count,
                "target_points": ch.target_points,
                "percent": pct,
                "badge_awarded": bool(award),
            }
        )

    @action(detail=True, methods=["get"])
    def leaderboard(self, request, pk=None):
        ch = self.get_object()
        rules = _parse_rules(ch.rules)
        start, end = _challenge_window(ch)
        logs = AuditLog.objects.filter(created_at__gte=start, created_at__lte=end).select_related("actor")

        if ch.mode == Challenge.Mode.TEAM:
            totals = {}
            group_names = {}
            for group in Group.objects.all().only("id", "name"):
                group_names[group.id] = group.name
            for log in logs.iterator():
                p = _points_for_log(rules, log)
                if not p:
                    continue
                group_ids = list(log.actor.groups.values_list("id", flat=True))
                for gid in group_ids:
                    totals[gid] = totals.get(gid, 0) + p
            rows = [{"team_id": gid, "team_name": group_names.get(gid, f"Team {gid}"), "points": pts} for gid, pts in totals.items()]
            rows.sort(key=lambda x: x["points"], reverse=True)
            return Response({"mode": "team", "rows": rows[:20]})

        totals = {}
        users = {}
        for log in logs.iterator():
            p = _points_for_log(rules, log)
            if not p:
                continue
            uid = log.actor_id
            totals[uid] = totals.get(uid, 0) + p
            if uid not in users:
                users[uid] = {"id": log.actor_id, "username": log.actor.username, "first_name": log.actor.first_name, "last_name": log.actor.last_name, "email": log.actor.email}
        rows = [{"user": users[uid], "points": pts} for uid, pts in totals.items()]
        rows.sort(key=lambda x: x["points"], reverse=True)
        return Response({"mode": "individual", "rows": rows[:20]})


class MyBadgesViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BadgeAwardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BadgeAward.objects.filter(user=self.request.user).select_related("badge", "challenge").order_by("-created_at")


class TeamsViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = GroupRefSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(user=self.request.user).order_by("name")


class BootstrapGamificationViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=["post"])
    def bootstrap(self, request):
        now = timezone.now()
        start = now - timezone.timedelta(days=14)
        end = now + timezone.timedelta(days=14)

        sales_team, _ = Group.objects.get_or_create(name="Sales Team")
        service_team, _ = Group.objects.get_or_create(name="Service Team")
        marketing_team, _ = Group.objects.get_or_create(name="Marketing Team")
        team_alpha, _ = Group.objects.get_or_create(name="Team Alpha")
        team_bravo, _ = Group.objects.get_or_create(name="Team Bravo")

        sales_badges = [
            ("Pipeline Builder", "Earn points by creating opportunities and building pipeline.", "trending_up", "#2563eb", "#22c55e"),
            ("Closer", "Close deals and celebrate wins.", "paid", "#16a34a", "#22c55e"),
            ("Forecast Hero", "Maintain healthy pipeline updates.", "analytics", "#0ea5e9", "#2563eb"),
        ]
        service_badges = [
            ("SLA Guardian", "Keep cases moving and protect SLA.", "support_agent", "#f97316", "#ef4444"),
            ("Case Commander", "Drive cases through progress stages.", "task_alt", "#a855f7", "#7c3aed"),
            ("Incident Wrangler", "Run war room updates and stabilize incidents.", "report_problem", "#111827", "#4f46e5"),
        ]
        marketing_badges = [
            ("Lead Magnet", "Generate and qualify leads from campaigns.", "campaign", "#7c3aed", "#06b6d4"),
            ("Campaign Captain", "Launch campaigns and drive engagement.", "rocket_launch", "#db2777", "#f97316"),
            ("Conversion Catalyst", "Turn working leads into qualified pipeline.", "bolt", "#22c55e", "#06b6d4"),
        ]

        created_badges = []
        for name, desc, icon, c1, c2 in [*sales_badges, *service_badges, *marketing_badges]:
            module = Badge.Module.SALES if name in {x[0] for x in sales_badges} else Badge.Module.SERVICE if name in {x[0] for x in service_badges} else Badge.Module.MARKETING
            b, _ = Badge.objects.get_or_create(
                name=name,
                defaults={
                    "module": module,
                    "description": desc,
                    "icon": icon,
                    "color_primary": c1,
                    "color_secondary": c2,
                },
            )
            created_badges.append(b)

        badge_by_name = {b.name: b for b in created_badges}

        challenges = []
        challenge_defs = [
            {
                "name": "Deal Sprint",
                "module": Challenge.Module.SALES,
                "mode": Challenge.Mode.INDIVIDUAL,
                "description": "Create opportunities and keep the pipeline moving.",
                "target_points": 40,
                "rules": [{"entity_type": "opportunity", "action": "create", "points": 10}, {"entity_type": "opportunity", "action": "update", "points": 2}],
                "reward_title": "Deal Sprint Winner",
                "reward_badge": badge_by_name.get("Pipeline Builder"),
            },
            {
                "name": "Pipeline Push (Team)",
                "module": Challenge.Module.SALES,
                "mode": Challenge.Mode.TEAM,
                "description": "As a team, build pipeline through consistent opportunity activity.",
                "target_points": 120,
                "rules": [{"entity_type": "opportunity", "action": "create", "points": 10}, {"entity_type": "opportunity", "action": "update", "points": 1}],
                "reward_title": "Pipeline Push Team",
                "reward_badge": badge_by_name.get("Forecast Hero"),
            },
            {
                "name": "SLA Sprint",
                "module": Challenge.Module.SERVICE,
                "mode": Challenge.Mode.INDIVIDUAL,
                "description": "Update cases frequently and keep SLA healthy.",
                "target_points": 30,
                "rules": [{"entity_type": "case", "action": "update", "points": 3}, {"entity_type": "case", "action": "create", "points": 6}],
                "reward_title": "SLA Sprint Champion",
                "reward_badge": badge_by_name.get("SLA Guardian"),
            },
            {
                "name": "Case Rescue (Team)",
                "module": Challenge.Module.SERVICE,
                "mode": Challenge.Mode.TEAM,
                "description": "Move cases through the pipeline as a team.",
                "target_points": 140,
                "rules": [{"entity_type": "case", "action": "update", "points": 3}, {"entity_type": "case", "action": "create", "points": 6}],
                "reward_title": "Case Rescue Team",
                "reward_badge": badge_by_name.get("Case Commander"),
            },
            {
                "name": "Lead Qualification Quest",
                "module": Challenge.Module.MARKETING,
                "mode": Challenge.Mode.INDIVIDUAL,
                "description": "Create leads and build a qualified pipeline.",
                "target_points": 35,
                "rules": [{"entity_type": "lead", "action": "create", "points": 5}, {"entity_type": "lead", "action": "update", "points": 2}, {"entity_type": "campaign", "action": "create", "points": 8}],
                "reward_title": "Lead Qualification Champion",
                "reward_badge": badge_by_name.get("Lead Magnet"),
            },
            {
                "name": "Campaign Blitz (Team)",
                "module": Challenge.Module.MARKETING,
                "mode": Challenge.Mode.TEAM,
                "description": "Launch campaigns and generate lead activity as a team.",
                "target_points": 120,
                "rules": [{"entity_type": "campaign", "action": "create", "points": 8}, {"entity_type": "lead", "action": "create", "points": 4}, {"entity_type": "lead", "action": "update", "points": 1}],
                "reward_title": "Campaign Blitz Team",
                "reward_badge": badge_by_name.get("Campaign Captain"),
            },
        ]

        for d in challenge_defs:
            ch, _ = Challenge.objects.get_or_create(
                name=d["name"],
                defaults={
                    "module": d["module"],
                    "mode": d["mode"],
                    "description": d["description"],
                    "start_at": start,
                    "end_at": end,
                    "target_points": d["target_points"],
                    "rules": d["rules"],
                    "reward_title": d["reward_title"],
                    "reward_badge": d["reward_badge"],
                    "is_active": True,
                    "created_by": request.user,
                },
            )
            challenges.append(ch)

        ChallengeParticipation.objects.get_or_create(challenge=challenges[0], user=request.user)
        ChallengeParticipation.objects.get_or_create(challenge=challenges[2], user=request.user)
        ChallengeParticipation.objects.get_or_create(challenge=challenges[4], user=request.user)
        for ch in [challenges[1], challenges[3], challenges[5]]:
            ChallengeParticipation.objects.get_or_create(challenge=ch, user=request.user, defaults={"team": team_alpha})

        awards = []
        for ch in [challenges[0], challenges[2], challenges[4]]:
            if ch.reward_badge_id:
                a, _ = BadgeAward.objects.get_or_create(
                    user=request.user,
                    badge_id=ch.reward_badge_id,
                    challenge=ch,
                    defaults={"points_at_award": ch.target_points},
                )
                awards.append(a.id)

        return Response(
            {
                "teams": [sales_team.id, service_team.id, marketing_team.id, team_alpha.id, team_bravo.id],
                "badges": len(created_badges),
                "challenges": [c.id for c in challenges],
                "awards": awards,
            },
            status=status.HTTP_201_CREATED,
        )
