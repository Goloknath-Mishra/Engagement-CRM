from django.contrib import admin

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


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ("name", "status", "start_date", "end_date", "budget", "owner", "created_at")
    search_fields = ("name",)
    list_filter = ("status", "owner")


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ("last_name", "first_name", "company", "status", "source", "campaign", "owner", "created_at")
    search_fields = ("first_name", "last_name", "company", "email")
    list_filter = ("status", "source", "campaign", "owner")


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("last_name", "first_name", "account_name", "email", "phone", "owner", "created_at")
    search_fields = ("first_name", "last_name", "account_name", "email")
    list_filter = ("owner",)


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ("name", "industry", "website", "owner", "created_at")
    search_fields = ("name", "industry", "website")
    list_filter = ("industry", "owner")


@admin.register(Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    list_display = ("name", "account_name", "stage", "amount", "close_date", "owner", "created_at")
    search_fields = ("name", "account_name")
    list_filter = ("stage", "owner")


@admin.register(OpportunityContact)
class OpportunityContactAdmin(admin.ModelAdmin):
    list_display = ("opportunity", "contact", "role", "created_at")
    list_filter = ("role",)


@admin.register(OpportunityLineItem)
class OpportunityLineItemAdmin(admin.ModelAdmin):
    list_display = ("opportunity", "product", "quantity", "unit_price", "discount_pct", "created_at")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("sku", "name", "active", "currency", "unit_price", "created_at")
    search_fields = ("sku", "name")
    list_filter = ("active", "currency")


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ("subject", "status", "priority", "contact", "product", "owner", "created_at")
    search_fields = ("subject",)
    list_filter = ("status", "priority", "owner")


@admin.register(LeadConversion)
class LeadConversionAdmin(admin.ModelAdmin):
    list_display = ("lead", "contact", "opportunity", "converted_by", "converted_at")


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "severity", "owner", "created_at")
    search_fields = ("title",)
    list_filter = ("status", "severity", "owner")


@admin.register(IncidentMessage)
class IncidentMessageAdmin(admin.ModelAdmin):
    list_display = ("incident", "author", "created_at")


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ("filename", "content_type", "object_id", "uploaded_by", "created_at")
    search_fields = ("filename",)
    list_filter = ("content_type", "uploaded_by")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor", "action", "entity_type", "entity_id", "entity_label")
    list_filter = ("action", "entity_type", "actor")
    search_fields = ("entity_label",)
