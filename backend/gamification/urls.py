from rest_framework.routers import DefaultRouter

from .views import BadgeViewSet, BootstrapGamificationViewSet, ChallengeViewSet, MyBadgesViewSet, TeamsViewSet

router = DefaultRouter()
router.register(r"gamification/badges", BadgeViewSet, basename="g-badge")
router.register(r"gamification/challenges", ChallengeViewSet, basename="g-challenge")
router.register(r"gamification/my-badges", MyBadgesViewSet, basename="g-my-badge")
router.register(r"gamification/teams", TeamsViewSet, basename="g-teams")
router.register(r"gamification/admin", BootstrapGamificationViewSet, basename="g-admin")

urlpatterns = router.urls

