"""
CRM API surface.

Primary responsibilities:
- CRUD APIs for CRM entities (Accounts, Contacts, Campaigns, Leads, Opportunities, Cases, Products, Incidents)
- Audit logging on create/update/delete via `_log`
- Seed data generation for demo environments (including hierarchy/org structure)

Common modification points:
- Filters/search behavior: `filterset_class`, `search_fields`, `ordering_fields`
- Audit payload structure: `_log(...)` calls
- Seed data shapes: `seed(...)`
"""

from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from .filters import AccountFilter, CampaignFilter, CaseFilter, ContactFilter, LeadFilter, OpportunityFilter, ProductFilter
from .models import (
    Account,
    Attachment,
    AuditLog,
    Campaign,
    Case,
    Contact,
    Incident,
    IncidentMessage,
    Lead,
    LeadConversion,
    Opportunity,
    OpportunityContact,
    OpportunityLineItem,
    Product,
)
from .serializers import (
    AccountSerializer,
    AttachmentSerializer,
    AuditLogSerializer,
    CampaignSerializer,
    CaseSerializer,
    ContactSerializer,
    IncidentMessageSerializer,
    IncidentSerializer,
    LeadConvertSerializer,
    LeadConversionSerializer,
    LeadSerializer,
    OpportunityContactSerializer,
    OpportunityLineItemSerializer,
    OpportunitySerializer,
    ProductSerializer,
)


def _log(actor, action: str, instance, changes=None):
    if changes is None:
        changes = {}
    AuditLog.objects.create(
        actor=actor,
        action=action,
        entity_type=instance.__class__.__name__.lower(),
        entity_id=instance.pk,
        entity_label=str(instance)[:255],
        changes=changes,
    )


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related("actor").order_by("-created_at")
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("entity_type"):
            qs = qs.filter(entity_type=p.get("entity_type"))
        if p.get("entity_id"):
            qs = qs.filter(entity_id=p.get("entity_id"))
        if p.get("action"):
            qs = qs.filter(action=p.get("action"))
        if p.get("actor"):
            qs = qs.filter(actor_id=p.get("actor"))
        if p.get("q"):
            qs = qs.filter(entity_label__icontains=p.get("q"))
        if p.get("created_after"):
            qs = qs.filter(created_at__gte=p.get("created_after"))
        if p.get("created_before"):
            qs = qs.filter(created_at__lte=p.get("created_before"))
        return qs


class AttachmentViewSet(viewsets.ModelViewSet):
    queryset = Attachment.objects.select_related("uploaded_by", "content_type").order_by("-created_at")
    serializer_class = AttachmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        entity_type = p.get("entity_type")
        entity_id = p.get("entity_id")
        if entity_type and entity_id:
            ct = _content_type_for_entity(entity_type)
            if ct is not None:
                qs = qs.filter(content_type=ct, object_id=entity_id)
        return qs

    def create(self, request, *args, **kwargs):
        entity_type = request.data.get("entity_type")
        entity_id = request.data.get("entity_id")
        upload = request.FILES.get("file")
        if not entity_type or not entity_id or not upload:
            return Response({"detail": "entity_type, entity_id and file are required."}, status=status.HTTP_400_BAD_REQUEST)
        ct = _content_type_for_entity(entity_type)
        if ct is None:
            return Response({"detail": "Unsupported entity_type."}, status=status.HTTP_400_BAD_REQUEST)

        obj = Attachment.objects.create(
            content_type=ct,
            object_id=int(entity_id),
            file=upload,
            filename=getattr(upload, "name", "attachment"),
            uploaded_by=request.user,
        )
        _log(request.user, AuditLog.Action.CREATE, obj, {"entity_type": entity_type, "entity_id": int(entity_id)})
        return Response(AttachmentSerializer(obj).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        _log(request.user, AuditLog.Action.DELETE, obj, {})
        return super().destroy(request, *args, **kwargs)


def _content_type_for_entity(entity_type: str):
    from django.contrib.contenttypes.models import ContentType

    mapping = {
        "campaign": Campaign,
        "lead": Lead,
        "contact": Contact,
        "opportunity": Opportunity,
        "case": Case,
        "product": Product,
        "incident": Incident,
        "account": Account,
    }
    model = mapping.get(entity_type)
    if model is None:
        return None
    return ContentType.objects.get_for_model(model)


class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all().select_related("owner", "created_by").order_by("-created_at")
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = AccountFilter
    search_fields = ("name", "website", "industry")
    ordering_fields = ("created_at", "updated_at", "name")

    def perform_create(self, serializer):
        instance = serializer.save(owner=self.request.user, created_by=self.request.user)
        _log(self.request.user, AuditLog.Action.CREATE, instance, {})

    def perform_update(self, serializer):
        instance = serializer.save()
        _log(self.request.user, AuditLog.Action.UPDATE, instance, {"patch": serializer.validated_data})

    def perform_destroy(self, instance):
        _log(self.request.user, AuditLog.Action.DELETE, instance, {})
        instance.delete()


class CampaignViewSet(viewsets.ModelViewSet):
    queryset = Campaign.objects.all().select_related("owner", "created_by").order_by("-created_at")
    serializer_class = CampaignSerializer
    filterset_class = CampaignFilter
    search_fields = ("name", "description")
    ordering_fields = ("created_at", "updated_at", "start_date", "end_date", "budget", "name")

    def perform_create(self, serializer):
        instance = serializer.save(owner=self.request.user, created_by=self.request.user)
        _log(self.request.user, AuditLog.Action.CREATE, instance, {})

    def perform_update(self, serializer):
        instance = serializer.save()
        _log(self.request.user, AuditLog.Action.UPDATE, instance, {"patch": serializer.validated_data})

    def perform_destroy(self, instance):
        _log(self.request.user, AuditLog.Action.DELETE, instance, {})
        instance.delete()

    @action(detail=False, methods=["post"], permission_classes=[IsAdminUser])
    def seed(self, request):
        import random
        from datetime import date, timedelta
        from uuid import uuid4

        from django.contrib.auth import get_user_model
        from django.contrib.auth.models import Group

        user = request.user
        now = timezone.now()

        first_names = ["Asha", "David", "Maria", "John", "Alice", "Priya", "Chen", "Omar", "Sara", "Liam", "Noah", "Emma"]
        last_names = ["Kim", "Johnson", "Rodriguez", "Singh", "Patel", "Garcia", "Nguyen", "Brown", "Miller", "Davis", "Wilson"]
        companies = ["Acme Corp", "Globex", "Initech", "Umbrella", "Stark Industries", "Wayne Enterprises", "Hooli", "Aperture Labs"]

        def pick_name():
            return random.choice(first_names), random.choice(last_names)

        def pick_company():
            return random.choice(companies)

        created = {
            "users": 0,
            "accounts": 0,
            "campaigns": 0,
            "leads": 0,
            "contacts": 0,
            "opportunities": 0,
            "line_items": 0,
            "cases": 0,
            "products": 0,
            "incidents": 0,
            "incident_messages": 0,
            "gamification_badges": 0,
            "gamification_challenges": 0,
        }

        with transaction.atomic():
            UserModel = get_user_model()
            seeded_users = []
            for idx in range(1, 21):
                fn, ln = pick_name()
                username = f"user{idx:02d}"
                email = f"{username}@example.com"
                u, was_created = UserModel.objects.get_or_create(
                    username=username,
                    defaults={
                        "first_name": fn,
                        "last_name": ln,
                        "email": email,
                        "is_active": True,
                        "is_staff": False,
                        "is_superuser": False,
                    },
                )
                if was_created:
                    u.set_password("User@12345")
                    u.save()
                    created["users"] += 1
                seeded_users.append(u)

            owners = [user, *seeded_users]

            sales_team, _ = Group.objects.get_or_create(name="Sales Team")
            service_team, _ = Group.objects.get_or_create(name="Service Team")
            marketing_team, _ = Group.objects.get_or_create(name="Marketing Team")
            team_alpha, _ = Group.objects.get_or_create(name="Team Alpha")
            team_bravo, _ = Group.objects.get_or_create(name="Team Bravo")
            all_teams = [sales_team, service_team, marketing_team, team_alpha, team_bravo]

            for u in seeded_users:
                primary = random.choice([sales_team, service_team, marketing_team])
                u.groups.add(primary)
                u.groups.add(random.choice([team_alpha, team_bravo]))

            user.groups.add(sales_team, service_team, marketing_team, team_alpha, team_bravo)

            accounts = []
            global_acc, created_global = Account.objects.get_or_create(
                name="Global Holdings",
                defaults={
                    "website": "https://example.com",
                    "industry": "Conglomerate",
                    "owner": random.choice(owners),
                    "created_by": user,
                },
            )
            if created_global:
                created["accounts"] += 1
                _log(global_acc.owner, AuditLog.Action.CREATE, global_acc, {})
            accounts.append(global_acc)

            subsidiaries = []
            for i in range(10):
                name = f"{random.choice(companies)} Subsidiary {i + 1}"
                sub, was_created = Account.objects.get_or_create(
                    name=name,
                    defaults={
                        "parent_account": global_acc,
                        "website": "https://example.com",
                        "industry": random.choice(["SaaS", "Retail", "Finance", "Manufacturing", "Healthcare", "Education"]),
                        "owner": random.choice(owners),
                        "created_by": user,
                    },
                )
                if was_created:
                    created["accounts"] += 1
                    _log(sub.owner, AuditLog.Action.CREATE, sub, {"parent_account": global_acc.pk})
                subsidiaries.append(sub)
                accounts.append(sub)

            for i in range(20):
                name = random.choice(companies) + ("" if i < 8 else f" {i - 7}")
                acc, was_created = Account.objects.get_or_create(
                    name=name,
                    defaults={
                        "website": "https://example.com",
                        "industry": random.choice(["SaaS", "Retail", "Finance", "Manufacturing", "Healthcare", "Education"]),
                        "owner": random.choice(owners),
                        "created_by": user,
                    },
                )
                if was_created:
                    created["accounts"] += 1
                accounts.append(acc)
                _log(acc.owner, AuditLog.Action.CREATE, acc, {})

            products = []
            for _ in range(20):
                sku = f"SKU-{uuid4().hex[:8].upper()}"
                p = Product.objects.create(
                    sku=sku,
                    name=random.choice(["Starter", "Pro", "Enterprise", "Add-on"]) + f" {random.choice(['Support', 'License', 'Package', 'Bundle'])}",
                    description="",
                    active=True,
                    currency="USD",
                    unit_price=random.choice([49, 99, 199, 499, 999]),
                    tax_rate=random.choice([0, 5, 8.25]),
                )
                products.append(p)
                created["products"] += 1
                _log(user, AuditLog.Action.CREATE, p, {})

            campaigns = []
            for i in range(20):
                name = random.choice(
                    [
                        "Summer Promo",
                        "New Product Launch",
                        "Year End Clearance",
                        "Holiday Deals",
                        "Spring Sale",
                        "Customer Upgrade Drive",
                        "Partner Webinar Series",
                        "Industry Conference Outreach",
                        "Referral Boost",
                        "Winback Campaign",
                    ]
                ) + ("" if i < 10 else f" {i - 9}")
                start = date.today() - timedelta(days=random.choice([10, 30, 60]))
                end = start + timedelta(days=random.choice([14, 30, 45]))
                c = Campaign.objects.create(
                    name=name,
                    description="",
                    status=random.choice([Campaign.Status.ACTIVE, Campaign.Status.DRAFT, Campaign.Status.COMPLETED]),
                    start_date=start,
                    end_date=end,
                    budget=random.choice([5000, 8000, 12000, 15000, 20000]),
                    owner=random.choice(owners),
                    created_by=user,
                )
                campaigns.append(c)
                created["campaigns"] += 1
                _log(c.owner, AuditLog.Action.CREATE, c, {})

            contacts = []
            def create_employee(account, title, manager=None):
                fn, ln = pick_name()
                tag = random.choices(
                    [Contact.RelationshipTag.DECISION_MAKER, Contact.RelationshipTag.INFLUENCER, Contact.RelationshipTag.BLOCKER, Contact.RelationshipTag.UNKNOWN],
                    weights=[15, 20, 5, 60],
                )[0]
                c = Contact.objects.create(
                    first_name=fn,
                    last_name=ln,
                    account_name=account.name,
                    account=account,
                    manager=manager,
                    relationship_tag=tag,
                    title=title,
                    email=f"{fn.lower()}.{ln.lower()}@example.com",
                    phone=f"+1-555-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
                    owner=random.choice(owners),
                    created_by=user,
                )
                contacts.append(c)
                created["contacts"] += 1
                _log(c.owner, AuditLog.Action.CREATE, c, {"account": account.pk, "manager": manager.pk if manager else None})
                return c

            ceo = create_employee(global_acc, "CEO")
            vp_sales = create_employee(global_acc, "VP Sales", manager=ceo)
            vp_service = create_employee(global_acc, "VP Customer Service", manager=ceo)
            vp_marketing = create_employee(global_acc, "VP Marketing", manager=ceo)
            cfo = create_employee(global_acc, "CFO", manager=ceo)

            for _ in range(5):
                create_employee(global_acc, random.choice(["Director", "Senior Manager", "Manager"]), manager=random.choice([vp_sales, vp_service, vp_marketing, cfo]))

            for sub in subsidiaries:
                gm = create_employee(sub, "General Manager", manager=ceo)
                director = create_employee(sub, "Director", manager=gm)
                mgr1 = create_employee(sub, "Manager", manager=director)
                mgr2 = create_employee(sub, "Manager", manager=director)
                for _ in range(4):
                    create_employee(sub, random.choice(["Engineer", "Analyst", "Specialist"]), manager=random.choice([mgr1, mgr2]))

            for _ in range(24):
                account = random.choice(accounts)
                title = random.choice(["Manager", "Director", "Engineer", "Analyst", "Specialist"])
                manager = random.choice(contacts) if contacts and random.random() > 0.6 else None
                create_employee(account, title, manager=manager)

            leads = []
            for _ in range(40):
                fn, ln = pick_name()
                campaign = random.choice(campaigns)
                lead = Lead.objects.create(
                    first_name=fn,
                    last_name=ln,
                    company=pick_company(),
                    title=random.choice(["Manager", "Director", "VP", "Engineer", "Analyst"]),
                    email=f"{fn.lower()}.{ln.lower()}@example.com",
                    phone=f"+1-555-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
                    status=random.choice([Lead.Status.NEW, Lead.Status.WORKING, Lead.Status.QUALIFIED, Lead.Status.DISQUALIFIED]),
                    source=Lead.Source.CAMPAIGN,
                    campaign=campaign,
                    owner=random.choice(owners),
                    created_by=user,
                )
                leads.append(lead)
                created["leads"] += 1
                _log(lead.owner, AuditLog.Action.CREATE, lead, {"campaign": campaign.pk})

            opportunities = []
            for i in range(25):
                lead = random.choice(leads)
                contact = random.choice(contacts)
                stage = random.choice(
                    [
                        Opportunity.Stage.PROSPECTING,
                        Opportunity.Stage.QUALIFICATION,
                        Opportunity.Stage.PROPOSAL,
                        Opportunity.Stage.NEGOTIATION,
                        Opportunity.Stage.CLOSED_WON,
                        Opportunity.Stage.CLOSED_LOST,
                    ]
                )
                opp = Opportunity.objects.create(
                    name=f"{lead.company or contact.account_name or 'Account'} Deal {i + 1}",
                    account_name=lead.company or contact.account_name or "",
                    stage=stage,
                    amount=random.choice([2500, 5000, 7500, 10000, 15000, 25000]),
                    close_date=date.today() + timedelta(days=random.choice([10, 30, 60])),
                    lead=lead,
                    campaign=lead.campaign,
                    primary_contact=contact,
                    owner=random.choice(owners),
                    created_by=user,
                )
                OpportunityContact.objects.get_or_create(
                    opportunity=opp,
                    contact=contact,
                    defaults={"role": OpportunityContact.Role.PRIMARY},
                )
                opportunities.append(opp)
                created["opportunities"] += 1
                _log(opp.owner, AuditLog.Action.CREATE, opp, {"campaign": opp.campaign_id, "lead": opp.lead_id})

                for p in random.sample(products, k=random.randint(1, 3)):
                    li, created_flag = OpportunityLineItem.objects.get_or_create(
                        opportunity=opp,
                        product=p,
                        defaults={
                            "quantity": random.randint(1, 6),
                            "unit_price": p.unit_price,
                            "discount_pct": random.choice([0, 0, 5, 10]),
                        },
                    )
                    if created_flag:
                        created["line_items"] += 1
                        _log(opp.owner, AuditLog.Action.CREATE, li, {"opportunity": opp.pk})

            for i in range(30):
                contact = random.choice(contacts)
                product = random.choice(products) if random.random() > 0.25 else None
                priority = random.choice([Case.Priority.LOW, Case.Priority.MEDIUM, Case.Priority.HIGH, Case.Priority.URGENT])
                status_value = random.choice([Case.Status.NEW, Case.Status.IN_PROGRESS, Case.Status.WAITING_ON_CUSTOMER, Case.Status.CLOSED])
                case = Case.objects.create(
                    subject=random.choice(
                        [
                            "Payment failure",
                            "Refund request",
                            "Login issue",
                            "Integration setup",
                            "Feature question",
                            "API error",
                            "Billing update",
                        ]
                    )
                    + f" #{i + 1}",
                    description="",
                    status=status_value,
                    priority=priority,
                    contact=contact,
                    product=product,
                    owner=random.choice(owners),
                    created_by=user,
                )
                created["cases"] += 1
                _log(case.owner, AuditLog.Action.CREATE, case, {})
                age_minutes = random.randint(5, 2000)
                Case.objects.filter(pk=case.pk).update(created_at=now - timedelta(minutes=age_minutes), updated_at=now)

            for i in range(20):
                inc = Incident.objects.create(
                    title=random.choice(
                        [
                            "Service degradation",
                            "API latency spike",
                            "Payment provider outage",
                            "Login errors",
                            "Background job backlog",
                            "Database failover",
                        ]
                    )
                    + f" #{i + 1}",
                    description="",
                    status=random.choice([Incident.Status.OPEN, Incident.Status.INVESTIGATING, Incident.Status.MITIGATING, Incident.Status.RESOLVED]),
                    severity=random.choice([Incident.Severity.SEV1, Incident.Severity.SEV2, Incident.Severity.SEV3, Incident.Severity.SEV4]),
                    owner=random.choice(owners),
                    created_by=user,
                )
                created["incidents"] += 1
                _log(inc.owner, AuditLog.Action.CREATE, inc, {})
                for msg in [
                    "Initial report received. Investigating.",
                    "Checking logs and recent deploys.",
                    "Mitigation in progress; monitoring impact.",
                    "Next update in 15 minutes.",
                ]:
                    author = random.choice(owners)
                    m = IncidentMessage.objects.create(incident=inc, author=author, message=msg)
                    created["incident_messages"] += 1
                    _log(author, AuditLog.Action.CREATE, m, {"incident": inc.pk})

            from gamification.models import Badge, Challenge

            badge_defs = [
                (Badge.Module.SALES, "Pipeline Builder", "Earn points by creating opportunities and building pipeline.", "trending_up", "#2563eb", "#22c55e"),
                (Badge.Module.SALES, "Closer", "Close deals and celebrate wins.", "paid", "#16a34a", "#22c55e"),
                (Badge.Module.SALES, "Forecast Hero", "Maintain healthy pipeline updates.", "analytics", "#0ea5e9", "#2563eb"),
                (Badge.Module.SERVICE, "SLA Guardian", "Keep cases moving and protect SLA.", "support_agent", "#f97316", "#ef4444"),
                (Badge.Module.SERVICE, "Case Commander", "Drive cases through progress stages.", "task_alt", "#a855f7", "#7c3aed"),
                (Badge.Module.SERVICE, "Incident Wrangler", "Run war room updates and stabilize incidents.", "report_problem", "#111827", "#4f46e5"),
                (Badge.Module.MARKETING, "Lead Magnet", "Generate and qualify leads from campaigns.", "campaign", "#7c3aed", "#06b6d4"),
                (Badge.Module.MARKETING, "Campaign Captain", "Launch campaigns and drive engagement.", "rocket_launch", "#db2777", "#f97316"),
                (Badge.Module.MARKETING, "Conversion Catalyst", "Turn working leads into qualified pipeline.", "bolt", "#22c55e", "#06b6d4"),
            ]

            badges = {}
            for module, name, desc, icon, c1, c2 in badge_defs:
                b, created_badge = Badge.objects.get_or_create(
                    name=name,
                    defaults={
                        "module": module,
                        "description": desc,
                        "icon": icon,
                        "color_primary": c1,
                        "color_secondary": c2,
                    },
                )
                badges[name] = b
                created["gamification_badges"] += int(created_badge)

            now2 = timezone.now()
            start = now2 - timedelta(days=14)
            end = now2 + timedelta(days=14)

            challenge_defs = [
                (
                    "Deal Sprint",
                    Challenge.Module.SALES,
                    Challenge.Mode.INDIVIDUAL,
                    "Create opportunities and keep the pipeline moving.",
                    40,
                    [{"entity_type": "opportunity", "action": "create", "points": 10}, {"entity_type": "opportunity", "action": "update", "points": 2}],
                    "Deal Sprint Winner",
                    badges["Pipeline Builder"],
                ),
                (
                    "Pipeline Push (Team)",
                    Challenge.Module.SALES,
                    Challenge.Mode.TEAM,
                    "As a team, build pipeline through consistent opportunity activity.",
                    120,
                    [{"entity_type": "opportunity", "action": "create", "points": 10}, {"entity_type": "opportunity", "action": "update", "points": 1}],
                    "Pipeline Push Team",
                    badges["Forecast Hero"],
                ),
                (
                    "SLA Sprint",
                    Challenge.Module.SERVICE,
                    Challenge.Mode.INDIVIDUAL,
                    "Update cases frequently and keep SLA healthy.",
                    30,
                    [{"entity_type": "case", "action": "update", "points": 3}, {"entity_type": "case", "action": "create", "points": 6}],
                    "SLA Sprint Champion",
                    badges["SLA Guardian"],
                ),
                (
                    "Case Rescue (Team)",
                    Challenge.Module.SERVICE,
                    Challenge.Mode.TEAM,
                    "Move cases through the pipeline as a team.",
                    140,
                    [{"entity_type": "case", "action": "update", "points": 3}, {"entity_type": "case", "action": "create", "points": 6}],
                    "Case Rescue Team",
                    badges["Case Commander"],
                ),
                (
                    "Lead Qualification Quest",
                    Challenge.Module.MARKETING,
                    Challenge.Mode.INDIVIDUAL,
                    "Create leads and build a qualified pipeline.",
                    35,
                    [{"entity_type": "lead", "action": "create", "points": 5}, {"entity_type": "lead", "action": "update", "points": 2}, {"entity_type": "campaign", "action": "create", "points": 8}],
                    "Lead Qualification Champion",
                    badges["Lead Magnet"],
                ),
                (
                    "Campaign Blitz (Team)",
                    Challenge.Module.MARKETING,
                    Challenge.Mode.TEAM,
                    "Launch campaigns and generate lead activity as a team.",
                    120,
                    [{"entity_type": "campaign", "action": "create", "points": 8}, {"entity_type": "lead", "action": "create", "points": 4}, {"entity_type": "lead", "action": "update", "points": 1}],
                    "Campaign Blitz Team",
                    badges["Campaign Captain"],
                ),
            ]

            for name, module, mode, desc, target, rules, reward_title, reward_badge in challenge_defs:
                _, created_ch = Challenge.objects.get_or_create(
                    name=name,
                    defaults={
                        "module": module,
                        "mode": mode,
                        "description": desc,
                        "start_at": start,
                        "end_at": end,
                        "target_points": target,
                        "rules": rules,
                        "reward_title": reward_title,
                        "reward_badge": reward_badge,
                        "is_active": True,
                        "created_by": user,
                    },
                )
                created["gamification_challenges"] += int(created_ch)

        return Response({"created": created}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"])
    def leads(self, request, pk=None):
        campaign = self.get_object()
        if request.method.lower() == "get":
            qs = Lead.objects.filter(campaign=campaign).select_related("owner", "created_by", "campaign").order_by(
                "-created_at"
            )
            page = self.paginate_queryset(qs)
            if page is not None:
                data = LeadSerializer(page, many=True).data
                return self.get_paginated_response(data)
            return Response(LeadSerializer(qs, many=True).data)

        serializer = LeadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lead = serializer.save(campaign=campaign, owner=request.user, created_by=request.user)
        _log(request.user, AuditLog.Action.CREATE, lead, {"campaign": campaign.pk})
        return Response(LeadSerializer(lead).data, status=status.HTTP_201_CREATED)


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.all().select_related("owner", "created_by", "campaign").order_by("-created_at")
    serializer_class = LeadSerializer
    filterset_class = LeadFilter
    search_fields = ("first_name", "last_name", "company", "email", "phone")
    ordering_fields = ("created_at", "updated_at", "last_name", "company", "status")

    def perform_create(self, serializer):
        instance = serializer.save(owner=self.request.user, created_by=self.request.user)
        _log(self.request.user, AuditLog.Action.CREATE, instance, {})

    def perform_update(self, serializer):
        instance = serializer.save()
        _log(self.request.user, AuditLog.Action.UPDATE, instance, {"patch": serializer.validated_data})

    def perform_destroy(self, instance):
        _log(self.request.user, AuditLog.Action.DELETE, instance, {})
        instance.delete()

    @action(detail=True, methods=["post"])
    def convert(self, request, pk=None):
        lead = self.get_object()
        if lead.status == Lead.Status.CONVERTED or hasattr(lead, "conversion"):
            conv = getattr(lead, "conversion", None)
            if conv:
                return Response(LeadConversionSerializer(conv).data, status=status.HTTP_200_OK)
            return Response({"detail": "Lead already converted."}, status=status.HTTP_400_BAD_REQUEST)

        input_serializer = LeadConvertSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        data = input_serializer.validated_data

        create_contact = data.get("create_contact", True)
        create_opportunity = data.get("create_opportunity", True)

        if not create_contact and not create_opportunity:
            return Response({"detail": "Select at least one target to create."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            contact = None
            if create_contact:
                acc_name = data.get("contact_account_name", lead.company)
                acc = None
                if acc_name:
                    acc, _ = Account.objects.get_or_create(
                        name=acc_name,
                        defaults={"website": "", "industry": "", "owner": request.user, "created_by": request.user},
                    )
                contact = Contact.objects.create(
                    first_name=data.get("contact_first_name", lead.first_name),
                    last_name=data.get("contact_last_name", lead.last_name) or lead.last_name,
                    email=data.get("contact_email", lead.email),
                    phone=data.get("contact_phone", lead.phone),
                    account_name=acc_name,
                    account=acc,
                    owner=request.user,
                    created_by=request.user,
                )

            opportunity = None
            if create_opportunity:
                opportunity = Opportunity.objects.create(
                    name=data.get("opportunity_name") or f"{lead.company or lead.last_name} Opportunity",
                    account_name=data.get("opportunity_account_name", lead.company),
                    stage=data.get("opportunity_stage", Opportunity.Stage.PROSPECTING),
                    amount=data.get("opportunity_amount", 0),
                    close_date=data.get("opportunity_close_date"),
                    lead=lead,
                    campaign=lead.campaign,
                    primary_contact=contact,
                    owner=request.user,
                    created_by=request.user,
                )

            if opportunity and contact:
                OpportunityContact.objects.get_or_create(
                    opportunity=opportunity,
                    contact=contact,
                    defaults={"role": OpportunityContact.Role.PRIMARY},
                )

            lead.status = Lead.Status.CONVERTED
            lead.converted_at = timezone.now()
            lead.save(update_fields=["status", "converted_at", "updated_at"])

            conversion = LeadConversion.objects.create(
                lead=lead,
                contact=contact or Contact.objects.create(
                    first_name=lead.first_name,
                    last_name=lead.last_name,
                    email=lead.email,
                    phone=lead.phone,
                    account_name=lead.company,
                    account=Account.objects.filter(name=lead.company).first() if lead.company else None,
                    owner=request.user,
                    created_by=request.user,
                ),
                opportunity=opportunity
                or Opportunity.objects.create(
                    name=f"{lead.company or lead.last_name} Opportunity",
                    account_name=lead.company,
                    stage=Opportunity.Stage.PROSPECTING,
                    amount=0,
                    lead=lead,
                    campaign=lead.campaign,
                    primary_contact=contact,
                    owner=request.user,
                    created_by=request.user,
                ),
                converted_by=request.user,
                converted_at=lead.converted_at,
            )

        return Response(LeadConversionSerializer(conversion).data, status=status.HTTP_201_CREATED)


class OpportunityViewSet(viewsets.ModelViewSet):
    queryset = (
        Opportunity.objects.all()
        .select_related("owner", "created_by", "lead", "campaign", "primary_contact")
        .prefetch_related("contact_links__contact", "line_items__product")
        .order_by("-created_at")
    )
    serializer_class = OpportunitySerializer
    filterset_class = OpportunityFilter
    search_fields = ("name", "account_name")
    ordering_fields = ("created_at", "updated_at", "close_date", "amount", "stage", "name")

    def perform_create(self, serializer):
        instance = serializer.save(owner=self.request.user, created_by=self.request.user)
        _log(self.request.user, AuditLog.Action.CREATE, instance, {})

    def perform_update(self, serializer):
        instance = serializer.save()
        _log(self.request.user, AuditLog.Action.UPDATE, instance, {"patch": serializer.validated_data})

    def perform_destroy(self, instance):
        _log(self.request.user, AuditLog.Action.DELETE, instance, {})
        instance.delete()

    @action(detail=True, methods=["get", "post"])
    def contacts(self, request, pk=None):
        opportunity = self.get_object()
        if request.method.lower() == "get":
            links = opportunity.contact_links.select_related("contact").order_by("created_at")
            return Response(OpportunityContactSerializer(links, many=True).data)

        serializer = OpportunityContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        link = OpportunityContact.objects.create(
            opportunity=opportunity,
            contact=serializer.validated_data["contact"],
            role=serializer.validated_data.get("role", OpportunityContact.Role.OTHER),
        )
        _log(request.user, AuditLog.Action.CREATE, link, {"opportunity": opportunity.pk})
        if link.role == OpportunityContact.Role.PRIMARY:
            opportunity.primary_contact = link.contact
            opportunity.save(update_fields=["primary_contact", "updated_at"])
        return Response(OpportunityContactSerializer(link).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="contacts/(?P<link_id>[^/.]+)")
    def unlink_contact(self, request, pk=None, link_id=None):
        opportunity = self.get_object()
        try:
            link = opportunity.contact_links.get(pk=link_id)
        except OpportunityContact.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if opportunity.primary_contact_id == link.contact_id:
            opportunity.primary_contact = None
            opportunity.save(update_fields=["primary_contact", "updated_at"])
        _log(request.user, AuditLog.Action.DELETE, link, {"opportunity": opportunity.pk})
        link.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get", "post"])
    def line_items(self, request, pk=None):
        opportunity = self.get_object()
        if request.method.lower() == "get":
            items = opportunity.line_items.select_related("product").order_by("created_at")
            return Response(OpportunityLineItemSerializer(items, many=True).data)

        serializer = OpportunityLineItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.validated_data["product"]
        line_item = OpportunityLineItem.objects.create(
            opportunity=opportunity,
            product=product,
            quantity=serializer.validated_data.get("quantity", 1),
            unit_price=serializer.validated_data.get("unit_price", product.unit_price),
            discount_pct=serializer.validated_data.get("discount_pct", 0),
        )
        _log(request.user, AuditLog.Action.CREATE, line_item, {"opportunity": opportunity.pk})
        return Response(OpportunityLineItemSerializer(line_item).data, status=status.HTTP_201_CREATED)


class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all().select_related("owner", "created_by", "account", "manager").order_by("-created_at")
    serializer_class = ContactSerializer
    filterset_class = ContactFilter
    search_fields = ("first_name", "last_name", "email", "phone", "account_name", "account__name")
    ordering_fields = ("created_at", "updated_at", "last_name", "account_name")

    def perform_create(self, serializer):
        instance = serializer.save(owner=self.request.user, created_by=self.request.user)
        _log(self.request.user, AuditLog.Action.CREATE, instance, {})

    def perform_update(self, serializer):
        instance = serializer.save()
        _log(self.request.user, AuditLog.Action.UPDATE, instance, {"patch": serializer.validated_data})

    def perform_destroy(self, instance):
        _log(self.request.user, AuditLog.Action.DELETE, instance, {})
        instance.delete()

    @action(detail=True, methods=["get", "post"])
    def cases(self, request, pk=None):
        contact = self.get_object()
        if request.method.lower() == "get":
            qs = Case.objects.filter(contact=contact).select_related("owner", "created_by", "product").order_by(
                "-created_at"
            )
            page = self.paginate_queryset(qs)
            if page is not None:
                return self.get_paginated_response(CaseSerializer(page, many=True).data)
            return Response(CaseSerializer(qs, many=True).data)

        payload = request.data.copy()
        payload["contact"] = contact.pk
        serializer = CaseSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        case = serializer.save(contact=contact, owner=request.user, created_by=request.user)
        _log(request.user, AuditLog.Action.CREATE, case, {"contact": contact.pk})
        return Response(CaseSerializer(case).data, status=status.HTTP_201_CREATED)


class CaseViewSet(viewsets.ModelViewSet):
    queryset = Case.objects.all().select_related("contact", "product", "owner", "created_by").order_by("-created_at")
    serializer_class = CaseSerializer
    filterset_class = CaseFilter
    search_fields = ("subject", "description")
    ordering_fields = ("created_at", "updated_at", "status", "priority")

    def perform_create(self, serializer):
        instance = serializer.save(owner=self.request.user, created_by=self.request.user)
        _log(self.request.user, AuditLog.Action.CREATE, instance, {})

    def perform_update(self, serializer):
        instance = serializer.save()
        _log(self.request.user, AuditLog.Action.UPDATE, instance, {"patch": serializer.validated_data})

    def perform_destroy(self, instance):
        _log(self.request.user, AuditLog.Action.DELETE, instance, {})
        instance.delete()


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by("-created_at")
    serializer_class = ProductSerializer
    filterset_class = ProductFilter
    search_fields = ("sku", "name", "description")
    ordering_fields = ("created_at", "updated_at", "sku", "name", "unit_price", "active")

    def perform_create(self, serializer):
        instance = serializer.save()
        _log(self.request.user, AuditLog.Action.CREATE, instance, {})

    def perform_update(self, serializer):
        instance = serializer.save()
        _log(self.request.user, AuditLog.Action.UPDATE, instance, {"patch": serializer.validated_data})

    def perform_destroy(self, instance):
        _log(self.request.user, AuditLog.Action.DELETE, instance, {})
        instance.delete()


class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.all().select_related("owner", "created_by").order_by("-created_at")
    serializer_class = IncidentSerializer
    search_fields = ("title", "description")
    ordering_fields = ("created_at", "updated_at", "status", "severity", "title")

    def perform_create(self, serializer):
        instance = serializer.save(owner=self.request.user, created_by=self.request.user)
        _log(self.request.user, AuditLog.Action.CREATE, instance, {})

    def perform_update(self, serializer):
        instance = serializer.save()
        _log(self.request.user, AuditLog.Action.UPDATE, instance, {"patch": serializer.validated_data})

    def perform_destroy(self, instance):
        _log(self.request.user, AuditLog.Action.DELETE, instance, {})
        instance.delete()

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        incident = self.get_object()
        if request.method.lower() == "get":
            qs = IncidentMessage.objects.filter(incident=incident).select_related("author").order_by("created_at")
            return Response(IncidentMessageSerializer(qs, many=True).data)

        serializer = IncidentMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        msg = serializer.save(incident=incident, author=request.user)
        _log(request.user, AuditLog.Action.CREATE, msg, {"incident": incident.pk})
        return Response(IncidentMessageSerializer(msg).data, status=status.HTTP_201_CREATED)
