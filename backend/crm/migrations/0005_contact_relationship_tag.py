from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0004_contact_account_manager_account_parent_account"),
    ]

    operations = [
        migrations.AddField(
            model_name="contact",
            name="relationship_tag",
            field=models.CharField(
                choices=[("decision_maker", "Decision maker"), ("influencer", "Influencer"), ("blocker", "Blocker"), ("unknown", "Unknown")],
                default="unknown",
                max_length=32,
            ),
        ),
    ]

