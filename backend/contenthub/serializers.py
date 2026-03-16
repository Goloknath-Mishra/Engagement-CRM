from rest_framework import serializers

from crm.serializers import UserRefSerializer

from .models import ArticleLink, KnowledgeArticle, ReportDefinition, Template


class KnowledgeArticleSerializer(serializers.ModelSerializer):
    created_by = UserRefSerializer(read_only=True)
    updated_by = UserRefSerializer(read_only=True)

    class Meta:
        model = KnowledgeArticle
        fields = ("id", "title", "summary", "content", "tags", "status", "created_by", "updated_by", "created_at", "updated_at")


class ArticleLinkSerializer(serializers.ModelSerializer):
    article = KnowledgeArticleSerializer(read_only=True)
    article_id = serializers.PrimaryKeyRelatedField(source="article", queryset=KnowledgeArticle.objects.all(), write_only=True)
    entity_type = serializers.CharField(write_only=True)
    entity_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = ArticleLink
        fields = ("id", "created_at", "article", "article_id", "entity_type", "entity_id")

    def validate(self, attrs):
        entity_type = attrs.get("entity_type")
        entity_id = attrs.get("entity_id")
        if not entity_type or not entity_id:
            raise serializers.ValidationError("entity_type and entity_id are required.")
        return attrs

    def create(self, validated_data):
        entity_type = validated_data.pop("entity_type")
        entity_id = validated_data.pop("entity_id")
        ct = ContentType.objects.get(app_label="crm", model=entity_type)
        return ArticleLink.objects.create(content_type=ct, object_id=entity_id, created_by=self.context["request"].user, **validated_data)


class TemplateSerializer(serializers.ModelSerializer):
    created_by = UserRefSerializer(read_only=True)
    updated_by = UserRefSerializer(read_only=True)

    class Meta:
        model = Template
        fields = ("id", "name", "type", "subject", "body", "is_active", "created_by", "updated_by", "created_at", "updated_at")


class ReportDefinitionSerializer(serializers.ModelSerializer):
    created_by = UserRefSerializer(read_only=True)
    updated_by = UserRefSerializer(read_only=True)

    class Meta:
        model = ReportDefinition
        fields = ("id", "name", "entity_type", "columns", "filters", "is_shared", "created_by", "updated_by", "created_at", "updated_at")
