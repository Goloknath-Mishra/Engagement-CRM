from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AdminUserViewSet, PasswordResetRequestView, UserViewSet

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"admin/users", AdminUserViewSet, basename="admin-user")

urlpatterns = [
    path("auth/password-reset/", PasswordResetRequestView.as_view(), name="password_reset_request"),
    path("", include(router.urls)),
]
