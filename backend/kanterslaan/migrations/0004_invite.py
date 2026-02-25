# Generated manually for Invite model

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def generate_invite_code():
    import secrets
    return secrets.token_urlsafe(12)


class Migration(migrations.Migration):

    dependencies = [
        ("kanterslaan", "0003_remove_user_username"),
    ]

    operations = [
        migrations.CreateModel(
            name="Invite",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(default=generate_invite_code, editable=False, max_length=32, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("address", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="invites", to="kanterslaan.address")),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="created_invites", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Invite",
                "verbose_name_plural": "Invites",
            },
        ),
    ]
