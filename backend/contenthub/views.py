"""
Content Hub API surface.

Primary responsibilities:
- Knowledge Articles (create/edit/publish) and linking them to CRM records
- Templates (email/signature/mailmerge/word) CRUD
- Reports (definitions, preview, export, share)

Exports:
- CSV: true CSV
- Excel/Word: HTML container formats for broad compatibility
- PDF: lightweight generated PDF for demo use
"""

import csv
import io
from datetime import datetime

from django.contrib.contenttypes.models import ContentType
from django.core.mail import send_mail
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from crm.models import Account, Campaign, Case, Contact, Incident, Lead, Opportunity, Product

from .models import ArticleLink, KnowledgeArticle, ReportDefinition, Template
from .serializers import ArticleLinkSerializer, KnowledgeArticleSerializer, ReportDefinitionSerializer, TemplateSerializer


def _crm_content_type(model_name: str):
    return ContentType.objects.get(app_label="crm", model=model_name)


def _entity_model(entity_type: str):
    mapping = {
        "account": Account,
        "campaign": Campaign,
        "case": Case,
        "contact": Contact,
        "incident": Incident,
        "lead": Lead,
        "opportunity": Opportunity,
        "product": Product,
    }
    return mapping.get(entity_type)


class KnowledgeArticleViewSet(viewsets.ModelViewSet):
    queryset = KnowledgeArticle.objects.all().select_related("created_by", "updated_by").order_by("-updated_at")
    serializer_class = KnowledgeArticleSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ("title", "summary", "tags", "content")
    ordering_fields = ("created_at", "updated_at", "title", "status")

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class ArticleLinkViewSet(viewsets.ModelViewSet):
    queryset = ArticleLink.objects.all().select_related("article", "content_type", "created_by").order_by("-created_at")
    serializer_class = ArticleLinkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        entity_type = p.get("entity_type")
        entity_id = p.get("entity_id")
        if entity_type and entity_id:
            try:
                ct = _crm_content_type(entity_type)
                qs = qs.filter(content_type=ct, object_id=int(entity_id))
            except Exception:
                return qs.none()
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(ArticleLinkSerializer(obj).data, status=status.HTTP_201_CREATED)


class TemplateViewSet(viewsets.ModelViewSet):
    queryset = Template.objects.all().select_related("created_by", "updated_by").order_by("-updated_at")
    serializer_class = TemplateSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ("name", "subject", "body")
    ordering_fields = ("created_at", "updated_at", "name", "type", "is_active")

    def get_queryset(self):
        qs = super().get_queryset()
        t = self.request.query_params.get("type")
        if t:
            qs = qs.filter(type=t)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


def _build_q(filters):
    q = Q()
    if not isinstance(filters, list):
        return q
    for f in filters:
        if not isinstance(f, dict):
            continue
        field = str(f.get("field", "")).strip()
        op = str(f.get("op", "")).strip()
        value = f.get("value")
        if not field or not op:
            continue
        if op == "eq":
            q &= Q(**{field: value})
        elif op == "contains":
            q &= Q(**{f"{field}__icontains": str(value)})
        elif op == "gte":
            q &= Q(**{f"{field}__gte": value})
        elif op == "lte":
            q &= Q(**{f"{field}__lte": value})
        elif op == "in":
            if isinstance(value, list):
                q &= Q(**{f"{field}__in": value})
    return q


def _get_value(obj, field: str):
    cur = obj
    for part in field.split("."):
        cur = getattr(cur, part, None)
        if cur is None:
            return ""
    if isinstance(cur, datetime):
        if timezone.is_aware(cur):
            cur = timezone.localtime(cur)
        return cur.isoformat(sep=" ", timespec="seconds")
    return str(cur)


def _simple_pdf_table(title: str, headers: list[str], rows: list[list[str]]):
    lines = [title, ""]
    lines.append(" | ".join(headers))
    lines.append("-" * max(20, len(lines[-1])))
    for r in rows:
        lines.append(" | ".join(r))
    text = "\n".join(lines)
    text = text.replace("\r", "")

    def esc(s: str):
        return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    content = esc(text)
    content_stream = f"BT /F1 10 Tf 50 780 Td ({content.replace(chr(10), ') Tj 0 -12 Td (')}) Tj ET"

    objects = []
    objects.append("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj")
    objects.append("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj")
    objects.append("3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources<< /Font<< /F1 4 0 R >> >> /Contents 5 0 R >>endobj")
    objects.append("4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj")
    objects.append(f"5 0 obj<< /Length {len(content_stream.encode('utf-8'))} >>stream\n{content_stream}\nendstream endobj")

    xref = []
    pdf = io.StringIO()
    pdf.write("%PDF-1.4\n")
    xref.append(0)
    for o in objects:
        xref.append(pdf.tell())
        pdf.write(o + "\n")
    xref_pos = pdf.tell()
    pdf.write("xref\n0 {}\n".format(len(xref)))
    pdf.write("0000000000 65535 f \n")
    for off in xref[1:]:
        pdf.write(f"{off:010d} 00000 n \n")
    pdf.write(f"trailer<< /Size {len(xref)} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n")
    return pdf.getvalue().encode("utf-8")


class ReportDefinitionViewSet(viewsets.ModelViewSet):
    queryset = ReportDefinition.objects.all().select_related("created_by", "updated_by").order_by("-updated_at")
    serializer_class = ReportDefinitionSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ("name", "entity_type")
    ordering_fields = ("created_at", "updated_at", "name", "entity_type")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def _query(self, report: ReportDefinition):
        model = _entity_model(report.entity_type)
        if model is None:
            raise ValueError("Unsupported entity_type")
        q = _build_q(report.filters)
        return model.objects.filter(q).order_by("-id")

    def _rows(self, report: ReportDefinition, limit: int):
        cols = report.columns if isinstance(report.columns, list) and report.columns else ["id"]
        qs = self._query(report)
        data = []
        for obj in qs[:limit]:
            row = {c: _get_value(obj, c) for c in cols}
            data.append(row)
        return cols, data

    @action(detail=True, methods=["get"])
    def preview(self, request, pk=None):
        report = self.get_object()
        cols, data = self._rows(report, limit=int(request.query_params.get("limit", "50")))
        return Response({"columns": cols, "rows": data})

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        report = self.get_object()
        fmt = request.query_params.get("format", "csv")
        cols, data = self._rows(report, limit=int(request.query_params.get("limit", "5000")))

        if fmt == "csv":
            buf = io.StringIO()
            w = csv.DictWriter(buf, fieldnames=cols)
            w.writeheader()
            for r in data:
                w.writerow(r)
            resp = HttpResponse(buf.getvalue(), content_type="text/csv")
            resp["Content-Disposition"] = f'attachment; filename="{report.name}.csv"'
            return resp

        if fmt == "excel":
            html = "<html><head><meta charset='utf-8'></head><body><table border='1'><thead><tr>"
            html += "".join([f"<th>{c}</th>" for c in cols])
            html += "</tr></thead><tbody>"
            for r in data:
                html += "<tr>" + "".join([f"<td>{r.get(c,'')}</td>" for c in cols]) + "</tr>"
            html += "</tbody></table></body></html>"
            resp = HttpResponse(html, content_type="application/vnd.ms-excel")
            resp["Content-Disposition"] = f'attachment; filename="{report.name}.xls"'
            return resp

        if fmt == "word":
            html = "<html><head><meta charset='utf-8'></head><body>"
            html += f"<h2>{report.name}</h2>"
            html += "<table border='1' style='border-collapse:collapse'><thead><tr>"
            html += "".join([f"<th>{c}</th>" for c in cols])
            html += "</tr></thead><tbody>"
            for r in data:
                html += "<tr>" + "".join([f"<td>{r.get(c,'')}</td>" for c in cols]) + "</tr>"
            html += "</tbody></table></body></html>"
            resp = HttpResponse(html, content_type="application/msword")
            resp["Content-Disposition"] = f'attachment; filename="{report.name}.doc"'
            return resp

        if fmt == "pdf":
            headers = [str(c) for c in cols]
            rows = [[str(r.get(c, "")) for c in cols] for r in data]
            pdf_bytes = _simple_pdf_table(report.name, headers, rows)
            resp = HttpResponse(pdf_bytes, content_type="application/pdf")
            resp["Content-Disposition"] = f'attachment; filename="{report.name}.pdf"'
            return resp

        return Response({"detail": "Unsupported format."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def share(self, request, pk=None):
        report = self.get_object()
        to = request.data.get("to")
        if isinstance(to, str):
            recipients = [x.strip() for x in to.split(",") if x.strip()]
        elif isinstance(to, list):
            recipients = [str(x).strip() for x in to if str(x).strip()]
        else:
            recipients = []
        if not recipients:
            return Response({"detail": "Recipients required."}, status=status.HTTP_400_BAD_REQUEST)
        base_url = request.data.get("base_url") or ""
        link = f"{base_url}/api/contenthub/reports/{report.id}/export/?format=csv" if base_url else ""
        body = f"Report: {report.name}\n\nPreview link: {link}\n"
        send_mail(
            subject=f"Shared report: {report.name}",
            message=body,
            from_email=None,
            recipient_list=recipients,
            fail_silently=True,
        )
        return Response({"sent": True})
