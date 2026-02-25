import secrets
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.contrib.gis.db import models as gis_models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class Address(models.Model):
    """Address model with street, house number, and GIS polygon geometry."""

    street_name = models.CharField(max_length=255)
    house_number = models.CharField(max_length=20)
    geometry = gis_models.PolygonField(srid=4326)

    class Meta:
        verbose_name_plural = "Addresses"

    def __str__(self):
        return f"{self.street_name} {self.house_number}"

    @property
    def display_address(self):
        return f"{self.street_name} {self.house_number}"

    @property
    def latitude(self):
        """Latitude from polygon centroid for map display."""
        if self.geometry:
            return self.geometry.centroid.y
        return None

    @property
    def longitude(self):
        """Longitude from polygon centroid for map display."""
        if self.geometry:
            return self.geometry.centroid.x
        return None


class User(AbstractUser):
    """User model with optional profile fields and address link."""

    username = None
    email = models.EmailField(unique=True)
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    photo = models.ImageField(upload_to="user_photos/", null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.ForeignKey(
        Address,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    is_active = models.BooleanField(default=True)
    last_login = models.DateTimeField(null=True, blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"


def _generate_invite_code():
    return secrets.token_urlsafe(12)


class Invite(models.Model):
    """Invite with random code linking to an address for onboarding."""

    code = models.CharField(max_length=32, unique=True, default=_generate_invite_code, editable=False)
    address = models.ForeignKey(
        Address,
        on_delete=models.CASCADE,
        related_name="invites",
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_invites",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    photo = models.ImageField(upload_to="invite_photos/", null=True, blank=True)

    class Meta:
        verbose_name = "Invite"
        verbose_name_plural = "Invites"

    def __str__(self):
        return f"Invite {self.code} → {self.address}"
