"""
CRM data model.

Key concepts:
- Account: company record with optional `parent_account` for subsidiaries
- Contact: employee record linked to `account` with optional `manager` for org chart
- AuditLog: immutable record-change trail used by Governance and Gamification
- Attachment: generic file attachment linked to multiple entity types
"""

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Campaign(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    budget = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_campaigns",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_campaigns",
    )

    def __str__(self) -> str:
        return self.name


class Lead(TimeStampedModel):
    class Status(models.TextChoices):
        NEW = "new", "New"
        WORKING = "working", "Working"
        QUALIFIED = "qualified", "Qualified"
        DISQUALIFIED = "disqualified", "Disqualified"
        CONVERTED = "converted", "Converted"

    class Source(models.TextChoices):
        CAMPAIGN = "campaign", "Campaign"
        WEB = "web", "Web"
        EMAIL = "email", "Email"
        PHONE = "phone", "Phone"
        REFERRAL = "referral", "Referral"
        OTHER = "other", "Other"

    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150)
    company = models.CharField(max_length=255, blank=True)
    title = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.NEW)
    source = models.CharField(max_length=32, choices=Source.choices, default=Source.OTHER)
    campaign = models.ForeignKey(Campaign, on_delete=models.SET_NULL, null=True, blank=True, related_name="leads")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_leads",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_leads",
    )

    converted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name or self.last_name


class Contact(TimeStampedModel):
    class RelationshipTag(models.TextChoices):
        DECISION_MAKER = "decision_maker", "Decision maker"
        INFLUENCER = "influencer", "Influencer"
        BLOCKER = "blocker", "Blocker"
        UNKNOWN = "unknown", "Unknown"

    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150)
    account_name = models.CharField(max_length=255, blank=True)
    account = models.ForeignKey(
        "Account",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees",
    )
    manager = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="direct_reports",
    )
    relationship_tag = models.CharField(max_length=32, choices=RelationshipTag.choices, default=RelationshipTag.UNKNOWN)
    title = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_contacts",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_contacts",
    )

    def __str__(self) -> str:
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name or self.last_name


class Opportunity(TimeStampedModel):
    class Stage(models.TextChoices):
        PROSPECTING = "prospecting", "Prospecting"
        QUALIFICATION = "qualification", "Qualification"
        PROPOSAL = "proposal", "Proposal"
        NEGOTIATION = "negotiation", "Negotiation"
        CLOSED_WON = "closed_won", "Closed Won"
        CLOSED_LOST = "closed_lost", "Closed Lost"

    name = models.CharField(max_length=255)
    account_name = models.CharField(max_length=255, blank=True)
    stage = models.CharField(max_length=32, choices=Stage.choices, default=Stage.PROSPECTING)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    close_date = models.DateField(null=True, blank=True)
    lead = models.ForeignKey(Lead, on_delete=models.SET_NULL, null=True, blank=True, related_name="opportunities")
    campaign = models.ForeignKey(Campaign, on_delete=models.SET_NULL, null=True, blank=True, related_name="opportunities")
    primary_contact = models.ForeignKey(
        Contact,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="primary_for_opportunities",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_opportunities",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_opportunities",
    )

    def __str__(self) -> str:
        return self.name


class OpportunityContact(TimeStampedModel):
    class Role(models.TextChoices):
        PRIMARY = "primary", "Primary"
        DECISION_MAKER = "decision_maker", "Decision Maker"
        INFLUENCER = "influencer", "Influencer"
        OTHER = "other", "Other"

    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name="contact_links")
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="opportunity_links")
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.OTHER)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["opportunity", "contact"], name="uniq_opportunity_contact"),
        ]

    def __str__(self) -> str:
        return f"{self.opportunity_id}:{self.contact_id}"


class Product(TimeStampedModel):
    sku = models.CharField(max_length=80, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    active = models.BooleanField(default=True)
    currency = models.CharField(max_length=3, default="USD")
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    def __str__(self) -> str:
        return f"{self.sku} - {self.name}"


class OpportunityLineItem(TimeStampedModel):
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name="line_items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="line_items")
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2)
    discount_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["opportunity", "product"], name="uniq_opportunity_product"),
        ]

    @property
    def subtotal(self):
        return self.quantity * self.unit_price

    @property
    def discount_amount(self):
        return (self.subtotal * self.discount_pct) / 100

    @property
    def total(self):
        return self.subtotal - self.discount_amount

    def __str__(self) -> str:
        return f"{self.opportunity_id}:{self.product_id}"


class Account(TimeStampedModel):
    name = models.CharField(max_length=255, unique=True)
    parent_account = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subsidiaries",
    )
    website = models.URLField(blank=True)
    industry = models.CharField(max_length=120, blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_accounts",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_accounts",
    )

    def __str__(self) -> str:
        return self.name


class Case(TimeStampedModel):
    class Status(models.TextChoices):
        NEW = "new", "New"
        IN_PROGRESS = "in_progress", "In Progress"
        WAITING_ON_CUSTOMER = "waiting_on_customer", "Waiting on Customer"
        CLOSED = "closed", "Closed"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    subject = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.NEW)
    priority = models.CharField(max_length=16, choices=Priority.choices, default=Priority.MEDIUM)
    contact = models.ForeignKey(Contact, on_delete=models.PROTECT, related_name="cases")
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name="cases")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_cases",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_cases",
    )

    def __str__(self) -> str:
        return self.subject


class LeadConversion(TimeStampedModel):
    lead = models.OneToOneField(Lead, on_delete=models.PROTECT, related_name="conversion")
    contact = models.ForeignKey(Contact, on_delete=models.PROTECT, related_name="lead_conversions")
    opportunity = models.ForeignKey(Opportunity, on_delete=models.PROTECT, related_name="lead_conversions")
    converted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="lead_conversions")
    converted_at = models.DateTimeField(default=timezone.now)

    def __str__(self) -> str:
        return str(self.lead_id)


class Incident(TimeStampedModel):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        INVESTIGATING = "investigating", "Investigating"
        MITIGATING = "mitigating", "Mitigating"
        RESOLVED = "resolved", "Resolved"

    class Severity(models.TextChoices):
        SEV1 = "sev1", "Sev 1"
        SEV2 = "sev2", "Sev 2"
        SEV3 = "sev3", "Sev 3"
        SEV4 = "sev4", "Sev 4"

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.OPEN)
    severity = models.CharField(max_length=16, choices=Severity.choices, default=Severity.SEV3)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_incidents",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_incidents",
    )

    def __str__(self) -> str:
        return self.title


class IncidentMessage(TimeStampedModel):
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="incident_messages")
    message = models.TextField()

    def __str__(self) -> str:
        return f"{self.incident_id}:{self.author_id}"


class Attachment(TimeStampedModel):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")
    file = models.FileField(upload_to="attachments/%Y/%m/")
    filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="uploaded_attachments",
    )

    def __str__(self) -> str:
        return self.filename


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = "create", "Create"
        UPDATE = "update", "Update"
        DELETE = "delete", "Delete"

    created_at = models.DateTimeField(auto_now_add=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=16, choices=Action.choices)
    entity_type = models.CharField(max_length=64)
    entity_id = models.PositiveIntegerField()
    entity_label = models.CharField(max_length=255, blank=True)
    changes = models.JSONField(default=dict, blank=True)

    def __str__(self) -> str:
        return f"{self.action}:{self.entity_type}:{self.entity_id}"
