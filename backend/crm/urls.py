from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AccountViewSet,
    AttachmentViewSet,
    AuditLogViewSet,
    CampaignViewSet,
    CaseViewSet,
    ContactViewSet,
    IncidentViewSet,
    LeadViewSet,
    OpportunityViewSet,
    ProductViewSet,
)

router = DefaultRouter()
router.register(r"accounts", AccountViewSet, basename="account")
router.register(r"campaigns", CampaignViewSet, basename="campaign")
router.register(r"leads", LeadViewSet, basename="lead")
router.register(r"opportunities", OpportunityViewSet, basename="opportunity")
router.register(r"contacts", ContactViewSet, basename="contact")
router.register(r"cases", CaseViewSet, basename="case")
router.register(r"products", ProductViewSet, basename="product")
router.register(r"incidents", IncidentViewSet, basename="incident")
router.register(r"attachments", AttachmentViewSet, basename="attachment")
router.register(r"audit-logs", AuditLogViewSet, basename="audit-log")

urlpatterns = [
    path("", include(router.urls)),
]
