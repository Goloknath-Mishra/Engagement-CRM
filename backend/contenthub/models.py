from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class KnowledgeArticle(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    title = models.CharField(max_length=255)
    summary = models.CharField(max_length=500, blank=True)
    content = models.TextField()
    tags = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_articles")
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="updated_articles")

    def __str__(self) -> str:
        return self.title


class ArticleLink(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    article = models.ForeignKey(KnowledgeArticle, on_delete=models.CASCADE, related_name="links")
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_article_links")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["article", "content_type", "object_id"], name="uniq_article_link"),
        ]


class Template(models.Model):
    class Type(models.TextChoices):
        EMAIL = "email", "Email template"
        SIGNATURE = "signature", "Signature template"
        MAILMERGE = "mailmerge", "Mail merge template"
        WORD = "word", "Word template"

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    name = models.CharField(max_length=255, unique=True)
    type = models.CharField(max_length=24, choices=Type.choices)
    subject = models.CharField(max_length=255, blank=True)
    body = models.TextField()
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_templates")
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="updated_templates")

    def __str__(self) -> str:
        return self.name


class ReportDefinition(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    name = models.CharField(max_length=255, unique=True)
    entity_type = models.CharField(max_length=64)
    columns = models.JSONField(default=list, blank=True)
    filters = models.JSONField(default=list, blank=True)
    is_shared = models.BooleanField(default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_reports")
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="updated_reports")

    def __str__(self) -> str:
        return self.name

