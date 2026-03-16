from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def backfill_contact_account(apps, schema_editor):
    Account = apps.get_model("crm", "Account")
    Contact = apps.get_model("crm", "Contact")

    accounts = {a.name: a.id for a in Account.objects.all().only("id", "name")}
    to_update = []
    for c in Contact.objects.all().only("id", "account_name", "account_id"):
        if c.account_id:
            continue
        if not c.account_name:
            continue
        acc_id = accounts.get(c.account_name)
        if acc_id:
            c.account_id = acc_id
            to_update.append(c)
    if to_update:
        Contact.objects.bulk_update(to_update, ["account"])


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0003_account_attachment_auditlog"),
    ]

    operations = [
        migrations.AddField(
            model_name="account",
            name="parent_account",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="subsidiaries",
                to="crm.account",
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="account",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="employees",
                to="crm.account",
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="manager",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="direct_reports",
                to="crm.contact",
            ),
        ),
        migrations.RunPython(backfill_contact_account, migrations.RunPython.noop),
    ]
