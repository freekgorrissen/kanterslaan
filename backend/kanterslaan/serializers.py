from rest_framework import serializers
from dj_rest_auth.serializers import LoginSerializer as BaseLoginSerializer
from dj_rest_auth.registration.serializers import RegisterSerializer as BaseRegisterSerializer

from .models import User, Address, Invite


class CustomLoginSerializer(BaseLoginSerializer):
    """Login with email and password instead of username."""

    username = None
    email = serializers.EmailField(required=True)
    password = serializers.CharField(style={"input_type": "password"}, write_only=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        if email and password:
            from django.contrib.auth import get_user_model

            UserModel = get_user_model()
            try:
                user = UserModel.objects.get(email=email)
                if not user.check_password(password):
                    user = None
            except UserModel.DoesNotExist:
                user = None
            if user:
                if not user.is_active:
                    raise serializers.ValidationError("User account is disabled.")
                attrs["user"] = user
                return attrs
            raise serializers.ValidationError("Invalid email or password.")
        raise serializers.ValidationError("Must include 'email' and 'password'.")


class CustomRegisterSerializer(BaseRegisterSerializer):
    """Registration with email only."""


class AddressSerializer(serializers.ModelSerializer):
    """Serializer for Address model."""

    display_address = serializers.ReadOnlyField()
    latitude = serializers.ReadOnlyField()
    longitude = serializers.ReadOnlyField()
    geometry = serializers.SerializerMethodField()

    class Meta:
        model = Address
        fields = [
            "id",
            "street_name",
            "house_number",
            "latitude",
            "longitude",
            "display_address",
            "geometry",
        ]

    def get_geometry(self, obj):
        if obj.geometry:
            import json
            return json.loads(obj.geometry.geojson)
        return None


class UserListSerializer(serializers.ModelSerializer):
    """Serializer for listing users (includes address info)."""

    address = AddressSerializer(read_only=True)
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "photo",
            "photo_url",
            "date_of_birth",
            "address",
        ]

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None


class UserListRedactedSerializer(UserListSerializer):
    """User list serializer without email (for address residents)."""

    class Meta(UserListSerializer.Meta):
        fields = [f for f in UserListSerializer.Meta.fields if f != "email"]


class PendingInviteSerializer(serializers.ModelSerializer):
    """Lightweight serializer for pending invites in address residents list."""

    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Invite
        fields = ["id", "first_name", "last_name", "date_of_birth", "photo_url"]

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None


class AddressDetailSerializer(AddressSerializer):
    """Serializer for Address with associated users and pending invites."""

    users = UserListRedactedSerializer(many=True, read_only=True)
    invites = PendingInviteSerializer(many=True, read_only=True)
    user_lives_here = serializers.SerializerMethodField()
    
    def get_user_lives_here(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return request.user.address_id == obj.id
        return False

    class Meta(AddressSerializer.Meta):
        fields = AddressSerializer.Meta.fields + ["users", "invites", "user_lives_here"]


class UserDetailSerializer(serializers.ModelSerializer):
    """Serializer for user detail and update (editable by owner)."""

    address = AddressSerializer(read_only=True)
    photo_url = serializers.SerializerMethodField()
    address_id = serializers.PrimaryKeyRelatedField(
        queryset=Address.objects.all(),
        source="address",
        required=False,
        allow_null=True,
        write_only=True,
    )

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        if request and not request.user.is_staff:
            fields["address_id"].read_only = True
        return fields

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "photo",
            "photo_url",
            "date_of_birth",
            "address",
            "address_id",
            "is_staff",
        ]
        read_only_fields = ["email"]

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None


class BulkCreateAddressSerializer(serializers.Serializer):
    """Serializer for bulk address creation from BAG data."""

    street_name = serializers.CharField(max_length=255)
    house_number = serializers.CharField(max_length=20)
    geometry = serializers.DictField()

    def validate_geometry(self, value):
        geom_type = value.get("type")
        if geom_type not in ("Polygon", "MultiPolygon") or "coordinates" not in value:
            raise serializers.ValidationError(
                "Geometry must be a Polygon or MultiPolygon with coordinates"
            )
        return value

    def create(self, validated_data):
        import json
        from django.contrib.gis.geos import GEOSGeometry

        geom_data = validated_data["geometry"]
        geom = GEOSGeometry(json.dumps(geom_data), srid=4326)
        if geom.geom_type == "MultiPolygon":
            geom = geom[0]
        return Address.objects.create(
            street_name=validated_data["street_name"],
            house_number=validated_data["house_number"],
            geometry=geom,
        )


class InviteSerializer(serializers.ModelSerializer):
    """Serializer for Invite (read)."""

    address = AddressSerializer(read_only=True)
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Invite
        fields = [
            "id",
            "code",
            "address",
            "created_at",
            "first_name",
            "last_name",
            "date_of_birth",
            "photo",
            "photo_url",
        ]
        read_only_fields = ["code", "created_at"]

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None


class InviteCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating an Invite."""

    address_id = serializers.PrimaryKeyRelatedField(
        queryset=Address.objects.all(),
        source="address",
        required=False,
        allow_null=True,
    )
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    photo = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Invite
        fields = ["address_id", "first_name", "last_name", "date_of_birth", "photo"]

    def validate(self, attrs):
        request = self.context.get("request")
        if not request:
            return attrs
        address = attrs.get("address")
        if request.user.is_staff:
            if address is None:
                raise serializers.ValidationError({"address_id": "Address is required"})
        else:
            if not request.user.address_id:
                raise serializers.ValidationError(
                    "You must have an address to create an invite. Set your address in your profile."
                )
            if address is not None and address.id != request.user.address_id:
                raise serializers.ValidationError(
                    {"address_id": "You can only create invites for your own address"}
                )
            attrs["address"] = request.user.address
        return attrs


class InviteUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating an Invite (first_name, last_name, date_of_birth, photo)."""

    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    photo = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Invite
        fields = ["first_name", "last_name", "date_of_birth", "photo"]


class InviteRegisterSerializer(serializers.Serializer):
    """Serializer for registration via invite."""

    email = serializers.EmailField(required=True)
    password1 = serializers.CharField(style={"input_type": "password"}, write_only=True)
    password2 = serializers.CharField(style={"input_type": "password"}, write_only=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)

    def validate(self, attrs):
        if attrs.get("password1") != attrs.get("password2"):
            raise serializers.ValidationError({"password2": "Passwords do not match"})
        first = attrs.get("first_name", "").strip()
        last = attrs.get("last_name", "").strip()
        if not first and not last:
            raise serializers.ValidationError(
                "At least one of first name or last name is required"
            )
        return attrs
