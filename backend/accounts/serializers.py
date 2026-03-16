from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    groups = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "email", "is_staff", "is_active", "groups")

    def get_groups(self, obj):
        return list(obj.groups.values_list("name", flat=True))


class AdminUserSerializer(serializers.ModelSerializer):
    groups = serializers.ListField(child=serializers.CharField(), required=False)
    password = serializers.CharField(write_only=True, required=False, allow_blank=False, trim_whitespace=False)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "is_staff",
            "is_active",
            "groups",
            "password",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["groups"] = list(instance.groups.values_list("name", flat=True))
        data.pop("password", None)
        return data

    def validate_groups(self, value):
        names = [v.strip() for v in value if v and v.strip()]
        existing = set(Group.objects.filter(name__in=names).values_list("name", flat=True))
        missing = [n for n in names if n not in existing]
        if missing:
            raise serializers.ValidationError(f"Unknown group(s): {', '.join(missing)}")
        return names

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        groups = validated_data.pop("groups", [])
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])
        if groups is not None:
            user.groups.set(Group.objects.filter(name__in=groups))
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        groups = validated_data.pop("groups", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        if groups is not None:
            instance.groups.set(Group.objects.filter(name__in=groups))
        return instance
