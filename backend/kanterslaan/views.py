from rest_framework import viewsets, permissions, status
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import User, Address, Invite
from django.db.models import Q

from .serializers import (
    UserListSerializer,
    UserDetailSerializer,
    AddressSerializer,
    AddressDetailSerializer,
    BulkCreateAddressSerializer,
    InviteSerializer,
    InviteCreateSerializer,
    InviteUpdateSerializer,
    InviteRegisterSerializer,
)
from . import bag_api


class AddressViewSet(viewsets.ModelViewSet):
    """ViewSet for Address model."""

    queryset = Address.objects.prefetch_related("users", "invites").all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return AddressDetailSerializer
        if self.action == "bulk_create":
            return BulkCreateAddressSerializer
        return AddressSerializer

    def get_permissions(self):
        if self.action == "bulk_create":
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=["post"])
    def bulk_create(self, request):
        """Create multiple addresses from BAG data (staff only)."""
        serializer = BulkCreateAddressSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        created = serializer.save()
        return Response(
            AddressSerializer(created, many=True).data,
            status=status.HTTP_201_CREATED,
        )


class BAGBuildingsView(APIView):
    """Proxy to PDOK BAG API for buildings/addresses in bbox (staff only)."""

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        bbox = request.query_params.get("bbox")
        crs = request.query_params.get("crs", "wgs84")
        if not bbox:
            return Response(
                {"error": "bbox required (minlon,minlat,maxlon,maxlat)"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            parts = [float(x) for x in bbox.split(",")]
            if len(parts) != 4:
                raise ValueError("bbox must have 4 values")
            min_lon, min_lat, max_lon, max_lat = parts
        except (ValueError, TypeError) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if crs == "epsg:28992" or crs == "28992":
                min_x, min_y, max_x, max_y = min_lon, min_lat, max_lon, max_lat
                buildings = bag_api.fetch_bag_buildings_bbox_rd(
                    min_x, min_y, max_x, max_y
                )
            else:
                buildings = bag_api.fetch_bag_addresses_bbox(
                    min_lon, min_lat, max_lon, max_lat
                )
            return Response({"features": buildings})
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for User model."""

    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ("retrieve", "update", "partial_update"):
            return UserDetailSerializer
        return UserListSerializer

    def get_queryset(self):
        return User.objects.select_related("address").all()

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if self.action in ("update", "partial_update", "destroy") and obj != request.user:
            raise PermissionDenied("You can only edit your own profile.")


class InviteViewSet(viewsets.ModelViewSet):
    """ViewSet for Invite model. Users create invites for addresses."""

    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "put", "delete", "head", "options"]

    def get_queryset(self):
        qs = Invite.objects.select_related("address", "created_by").all()
        if not self.request.user.is_staff:
            qs = qs.filter(
                Q(created_by=self.request.user)
                | Q(address__users=self.request.user)
            ).distinct()
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return InviteCreateSerializer
        if self.action in ("update", "partial_update"):
            return InviteUpdateSerializer
        return InviteSerializer

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if self.action in ("update", "partial_update"):
            if not request.user.is_staff and request.user.address_id != obj.address_id:
                raise PermissionDenied(
                    "Only residents of this address or staff can edit invites."
                )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        invite = serializer.instance
        response_serializer = InviteSerializer(invite, context={"request": request})
        headers = self.get_success_headers(response_serializer.data)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def perform_create(self, serializer):
        address = serializer.validated_data["address"]
        serializer.save(created_by=self.request.user, address=address)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        response_serializer = InviteSerializer(instance, context={"request": request})
        return Response(response_serializer.data)

    def perform_update(self, serializer):
        serializer.save()


class InviteValidateView(APIView):
    """Validate invite code and return address info (public, no auth)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, code):
        try:
            invite = Invite.objects.select_related("address").get(code=code)
        except Invite.DoesNotExist:
            raise NotFound("Invalid or expired invite code")
        data = {
            "valid": True,
            "address": AddressSerializer(invite.address).data,
        }
        if invite.first_name or invite.last_name or invite.date_of_birth:
            data["first_name"] = invite.first_name or ""
            data["last_name"] = invite.last_name or ""
            data["date_of_birth"] = invite.date_of_birth
        return Response(data)


class InviteRegisterView(APIView):
    """Register a new user via invite code (public, no auth)."""

    permission_classes = [permissions.AllowAny]

    def post(self, request, code):
        try:
            invite = Invite.objects.select_related("address").get(code=code)
        except Invite.DoesNotExist:
            raise NotFound("Invalid or expired invite code")

        serializer = InviteRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        if User.objects.filter(email=data["email"]).exists():
            return Response(
                {"email": ["A user with this email already exists."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        first_name = (data.get("first_name") or "").strip() or (invite.first_name or "")
        last_name = (data.get("last_name") or "").strip() or (invite.last_name or "")
        date_of_birth = data.get("date_of_birth") or invite.date_of_birth

        user = User.objects.create_user(
            email=data["email"],
            password=data["password1"],
            first_name=first_name,
            last_name=last_name,
            date_of_birth=date_of_birth,
            address=invite.address,
        )
        if invite.photo:
            from django.core.files.base import ContentFile

            name = invite.photo.name.split("/")[-1] or "photo.jpg"
            user.photo.save(name, ContentFile(invite.photo.read()), save=True)
        invite.delete()
        from rest_framework_simplejwt.tokens import RefreshToken
        from django.conf import settings as django_settings

        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)
        response = Response({
            "user": UserDetailSerializer(user, context={"request": request}).data,
            "access": access,
            "refresh": str(refresh),
        }, status=status.HTTP_201_CREATED)

        cookie_name = django_settings.REST_AUTH.get("JWT_AUTH_COOKIE", "jwt-auth")
        http_only = django_settings.REST_AUTH.get("JWT_AUTH_HTTPONLY", True)
        samesite = django_settings.REST_AUTH.get("JWT_AUTH_SAMESITE", "Lax")
        response.set_cookie(
            cookie_name,
            access,
            httponly=http_only,
            samesite=samesite,
            secure=request.is_secure(),
        )
        return response
