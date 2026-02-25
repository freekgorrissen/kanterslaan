# Generated manually for Invite profile fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("kanterslaan", "0004_invite"),
    ]

    operations = [
        migrations.AddField(
            model_name="invite",
            name="first_name",
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name="invite",
            name="last_name",
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name="invite",
            name="date_of_birth",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="invite",
            name="photo",
            field=models.ImageField(blank=True, null=True, upload_to="invite_photos/"),
        ),
    ]
