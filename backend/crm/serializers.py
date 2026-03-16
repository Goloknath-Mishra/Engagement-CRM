from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework import serializers

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

User = get_user_model()


class UserRefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "email")


class CampaignSerializer(serializers.ModelSerializer):
    owner = UserRefSerializer(read_only=True)
    created_by = UserRefSerializer(read_only=True)

    class Meta:
        model = Campaign
        fields = (
            "id",
            "name",
            "description",
            "status",
            "start_date",
            "end_date",
            "budget",
            "owner",
            "created_by",
            "created_at",
            "updated_at",
        )


class LeadSerializer(serializers.ModelSerializer):
    owner = UserRefSerializer(read_only=True)
    created_by = UserRefSerializer(read_only=True)

    class Meta:
        model = Lead
        fields = (
            "id",
            "first_name",
            "last_name",
            "company",
            "title",
            "email",
            "phone",
            "status",
            "source",
            "campaign",
            "owner",
            "created_by",
            "converted_at",
            "created_at",
            "updated_at",
        )


class ContactSerializer(serializers.ModelSerializer):
    owner = UserRefSerializer(read_only=True)
    created_by = UserRefSerializer(read_only=True)
    account = serializers.SerializerMethodField()
    account_id = serializers.PrimaryKeyRelatedField(
        source="account",
        queryset=Account.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    manager = serializers.SerializerMethodField()
    manager_id = serializers.PrimaryKeyRelatedField(
        source="manager",
        queryset=Contact.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    relationship_tag = serializers.CharField(required=False)

    class Meta:
        model = Contact
        fields = (
            "id",
            "first_name",
            "last_name",
            "account_name",
            "account",
            "account_id",
            "title",
            "email",
            "phone",
            "manager",
            "manager_id",
            "relationship_tag",
            "owner",
            "created_by",
            "created_at",
            "updated_at",
        )

    def get_manager(self, obj):
        if not obj.manager_id:
            return None
        m = obj.manager
        return {"id": m.id, "first_name": m.first_name, "last_name": m.last_name, "email": m.email}

    def get_account(self, obj):
        if not obj.account_id:
            return None
        a = obj.account
        return {"id": a.id, "name": a.name}


class OpportunityContactSerializer(serializers.ModelSerializer):
    contact = ContactSerializer(read_only=True)
    contact_id = serializers.PrimaryKeyRelatedField(
        source="contact",
        queryset=Contact.objects.all(),
        write_only=True,
    )

    class Meta:
        model = OpportunityContact
        fields = ("id", "opportunity", "contact", "contact_id", "role", "created_at", "updated_at")
        read_only_fields = ("opportunity",)


class OpportunityLineItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    subtotal = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    discount_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    quantity = serializers.IntegerField(required=False, min_value=1, default=1)
    unit_price = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    discount_pct = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0)

    class Meta:
        model = OpportunityLineItem
        fields = (
            "id",
            "opportunity",
            "product",
            "product_sku",
            "product_name",
            "quantity",
            "unit_price",
            "discount_pct",
            "subtotal",
            "discount_amount",
            "total",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("opportunity",)


class OpportunitySerializer(serializers.ModelSerializer):
    owner = UserRefSerializer(read_only=True)
    created_by = UserRefSerializer(read_only=True)
    primary_contact = ContactSerializer(read_only=True)
    primary_contact_id = serializers.PrimaryKeyRelatedField(
        source="primary_contact",
        queryset=Contact.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    contacts = serializers.SerializerMethodField()
    line_items = OpportunityLineItemSerializer(many=True, read_only=True)

    class Meta:
        model = Opportunity
        fields = (
            "id",
            "name",
            "account_name",
            "stage",
            "amount",
            "close_date",
            "lead",
            "campaign",
            "primary_contact",
            "primary_contact_id",
            "contacts",
            "line_items",
            "owner",
            "created_by",
            "created_at",
            "updated_at",
        )

    def get_contacts(self, obj):
        links = obj.contact_links.select_related("contact").order_by("created_at")
        return OpportunityContactSerializer(links, many=True).data


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = (
            "id",
            "sku",
            "name",
            "description",
            "active",
            "currency",
            "unit_price",
            "tax_rate",
            "created_at",
            "updated_at",
        )


class AccountSerializer(serializers.ModelSerializer):
    owner = UserRefSerializer(read_only=True)
    created_by = UserRefSerializer(read_only=True)
    parent_account = serializers.SerializerMethodField()
    parent_account_id = serializers.PrimaryKeyRelatedField(
        source="parent_account",
        queryset=Account.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Account
        fields = (
            "id",
            "name",
            "parent_account",
            "parent_account_id",
            "website",
            "industry",
            "owner",
            "created_by",
            "created_at",
            "updated_at",
        )

    def get_parent_account(self, obj):
        if not obj.parent_account_id:
            return None
        p = obj.parent_account
        return {"id": p.id, "name": p.name}


class CaseSerializer(serializers.ModelSerializer):
    owner = UserRefSerializer(read_only=True)
    created_by = UserRefSerializer(read_only=True)
    sla_due_at = serializers.SerializerMethodField()
    sla_remaining_seconds = serializers.SerializerMethodField()
    sla_breached = serializers.SerializerMethodField()
    sla_minutes = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = (
            "id",
            "subject",
            "description",
            "status",
            "priority",
            "contact",
            "product",
            "sla_minutes",
            "sla_due_at",
            "sla_remaining_seconds",
            "sla_breached",
            "owner",
            "created_by",
            "created_at",
            "updated_at",
        )

    def get_sla_minutes(self, obj):
        mapping = {"low": 1440, "medium": 480, "high": 240, "urgent": 60}
        return mapping.get(obj.priority, 480)

    def get_sla_due_at(self, obj):
        return obj.created_at + timedelta(minutes=self.get_sla_minutes(obj))

    def get_sla_remaining_seconds(self, obj):
        due = self.get_sla_due_at(obj)
        remaining = int((due - timezone.now()).total_seconds())
        return remaining if remaining > 0 else 0

    def get_sla_breached(self, obj):
        return self.get_sla_remaining_seconds(obj) == 0 and obj.status != Case.Status.CLOSED


class LeadConvertSerializer(serializers.Serializer):
    create_contact = serializers.BooleanField(default=True)
    create_opportunity = serializers.BooleanField(default=True)

    contact_first_name = serializers.CharField(required=False, allow_blank=True)
    contact_last_name = serializers.CharField(required=False, allow_blank=True)
    contact_email = serializers.EmailField(required=False, allow_blank=True)
    contact_phone = serializers.CharField(required=False, allow_blank=True)
    contact_account_name = serializers.CharField(required=False, allow_blank=True)

    opportunity_name = serializers.CharField(required=False, allow_blank=True)
    opportunity_account_name = serializers.CharField(required=False, allow_blank=True)
    opportunity_stage = serializers.ChoiceField(choices=Opportunity.Stage.choices, required=False)
    opportunity_amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    opportunity_close_date = serializers.DateField(required=False)


class LeadConversionSerializer(serializers.ModelSerializer):
    lead = LeadSerializer(read_only=True)
    contact = ContactSerializer(read_only=True)
    opportunity = OpportunitySerializer(read_only=True)
    converted_by = UserRefSerializer(read_only=True)

    class Meta:
        model = LeadConversion
        fields = ("id", "lead", "contact", "opportunity", "converted_by", "converted_at", "created_at", "updated_at")


class IncidentSerializer(serializers.ModelSerializer):
    owner = UserRefSerializer(read_only=True)
    created_by = UserRefSerializer(read_only=True)

    class Meta:
        model = Incident
        fields = (
            "id",
            "title",
            "description",
            "status",
            "severity",
            "owner",
            "created_by",
            "created_at",
            "updated_at",
        )


class IncidentMessageSerializer(serializers.ModelSerializer):
    author = UserRefSerializer(read_only=True)

    class Meta:
        model = IncidentMessage
        fields = ("id", "incident", "author", "message", "created_at", "updated_at")
        read_only_fields = ("incident",)


class AttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = UserRefSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = ("id", "content_type", "object_id", "filename", "file_url", "uploaded_by", "created_at", "updated_at")
        read_only_fields = ("content_type", "object_id", "filename", "uploaded_by")

    def get_file_url(self, obj):
        try:
            return obj.file.url
        except Exception:
            return ""


class AuditLogSerializer(serializers.ModelSerializer):
    actor = UserRefSerializer(read_only=True)

    class Meta:
        model = AuditLog
        fields = ("id", "created_at", "actor", "action", "entity_type", "entity_id", "entity_label", "changes")
