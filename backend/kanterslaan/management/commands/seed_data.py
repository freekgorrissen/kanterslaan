"""Create sample addresses and a test user for development."""

from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Polygon
from kanterslaan.models import Address, User


def _create_polygon(lat: float, lon: float, size: float = 0.0001) -> Polygon:
    """Create a small square polygon around (lat, lon). WGS84: (x, y) = (lon, lat)."""
    return Polygon(
        (
            (lon - size, lat - size),
            (lon + size, lat - size),
            (lon + size, lat + size),
            (lon - size, lat + size),
            (lon - size, lat - size),
        ),
        srid=4326,
    )


class Command(BaseCommand):
    help = "Create sample addresses and test user"

    def handle(self, *args, **options):
        if Address.objects.exists():
            self.stdout.write("Addresses already exist, skipping.")
            return

        addresses = [
            ("Kanterslaan", "1", 52.3676, 4.9041),
            ("Kanterslaan", "3", 52.3678, 4.9043),
            ("Kanterslaan", "5", 52.3680, 4.9045),
            ("Kanterslaan", "7", 52.3682, 4.9047),
        ]
        for street, num, lat, lon in addresses:
            Address.objects.create(
                street_name=street,
                house_number=num,
                geometry=_create_polygon(lat, lon),
            )
        self.stdout.write(self.style.SUCCESS(f"Created {len(addresses)} addresses"))

        if not User.objects.filter(email="test@example.com").exists():
            user = User.objects.create_user(
                email="test@example.com",
                password="testpass123",
                first_name="Test",
                last_name="User",
            )
            user.address = Address.objects.first()
            user.save()
            self.stdout.write(self.style.SUCCESS("Created test user: test@example.com / testpass123"))
