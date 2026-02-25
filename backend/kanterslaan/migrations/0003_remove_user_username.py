# Generated manually for username removal

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("kanterslaan", "0002_address_geometry"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="user",
            name="username",
        ),
    ]
