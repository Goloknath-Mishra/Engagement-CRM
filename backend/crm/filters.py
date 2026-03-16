import django_filters

from .models import Account, Campaign, Case, Contact, Lead, Opportunity, Product


class CampaignFilter(django_filters.FilterSet):
    class Meta:
        model = Campaign
        fields = {
            "status": ["exact", "in"],
            "owner": ["exact"],
            "start_date": ["gte", "lte"],
            "end_date": ["gte", "lte"],
        }


class LeadFilter(django_filters.FilterSet):
    class Meta:
        model = Lead
        fields = {
            "status": ["exact", "in"],
            "source": ["exact", "in"],
            "campaign": ["exact"],
            "owner": ["exact"],
        }


class OpportunityFilter(django_filters.FilterSet):
    class Meta:
        model = Opportunity
        fields = {
            "stage": ["exact", "in"],
            "campaign": ["exact"],
            "lead": ["exact"],
            "owner": ["exact"],
            "close_date": ["gte", "lte"],
        }


class ContactFilter(django_filters.FilterSet):
    class Meta:
        model = Contact
        fields = {
            "owner": ["exact"],
            "account": ["exact"],
            "manager": ["exact"],
        }


class CaseFilter(django_filters.FilterSet):
    class Meta:
        model = Case
        fields = {
            "status": ["exact", "in"],
            "priority": ["exact", "in"],
            "contact": ["exact"],
            "owner": ["exact"],
            "product": ["exact"],
        }


class ProductFilter(django_filters.FilterSet):
    class Meta:
        model = Product
        fields = {"active": ["exact"], "currency": ["exact"], "sku": ["exact", "icontains"], "name": ["icontains"]}


class AccountFilter(django_filters.FilterSet):
    class Meta:
        model = Account
        fields = {"name": ["exact", "icontains"], "industry": ["exact", "icontains"], "owner": ["exact"], "parent_account": ["exact"]}
