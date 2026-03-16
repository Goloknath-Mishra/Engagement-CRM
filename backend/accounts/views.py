from django.contrib.auth import get_user_model
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import AdminUserSerializer, UserSerializer

User = get_user_model()


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)
    search_fields = ("username", "first_name", "last_name", "email")
    ordering_fields = ("id", "username", "first_name", "last_name", "email")

    @action(detail=False, methods=["get"])
    def me(self, request):
        return Response(UserSerializer(request.user).data)


class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("id")
    serializer_class = AdminUserSerializer
    permission_classes = (permissions.IsAdminUser,)
    search_fields = ("username", "first_name", "last_name", "email")
    ordering_fields = ("id", "username", "first_name", "last_name", "email", "is_staff", "is_active")


class PasswordResetRequestView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        email = (request.data.get("email") or "").strip()
        username = (request.data.get("username") or "").strip()

        if not email and not username:
            return Response({"detail": "Provide email or username."}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"detail": "If the account exists, password reset instructions have been sent."},
            status=status.HTTP_200_OK,
        )
