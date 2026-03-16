from rest_framework.routers import DefaultRouter

from .views import ArticleLinkViewSet, KnowledgeArticleViewSet, ReportDefinitionViewSet, TemplateViewSet

router = DefaultRouter()
router.register(r"contenthub/articles", KnowledgeArticleViewSet, basename="knowledge-article")
router.register(r"contenthub/article-links", ArticleLinkViewSet, basename="article-link")
router.register(r"contenthub/templates", TemplateViewSet, basename="template")
router.register(r"contenthub/reports", ReportDefinitionViewSet, basename="report")

urlpatterns = router.urls

