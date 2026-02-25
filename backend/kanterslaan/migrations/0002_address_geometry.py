# Generated migration: Replace lat/long with GIS polygon

import django.contrib.gis.db.models.fields
from django.contrib.gis.geos import Polygon
from django.db import migrations, models


def migrate_latlon_to_geometry(apps, schema_editor):
    """Convert existing latitude/longitude to a small polygon."""
    Address = apps.get_model('kanterslaan', 'Address')
    for addr in Address.objects.all():
        lat = addr.latitude
        lon = addr.longitude
        size = 0.0001
        addr.geometry = Polygon(
            (
                (lon - size, lat - size),
                (lon + size, lat - size),
                (lon + size, lat + size),
                (lon - size, lat + size),
                (lon - size, lat - size),
            ),
            srid=4326,
        )
        addr.save()


def reverse_migrate(apps, schema_editor):
    """Reverse: extract centroid to lat/long (not used for rollback of AddField)."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('kanterslaan', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='address',
            name='geometry',
            field=django.contrib.gis.db.models.fields.PolygonField(null=True, srid=4326),
        ),
        migrations.RunPython(migrate_latlon_to_geometry, reverse_migrate),
        migrations.RemoveField(
            model_name='address',
            name='latitude',
        ),
        migrations.RemoveField(
            model_name='address',
            name='longitude',
        ),
        migrations.AlterField(
            model_name='address',
            name='geometry',
            field=django.contrib.gis.db.models.fields.PolygonField(srid=4326),
        ),
    ]
