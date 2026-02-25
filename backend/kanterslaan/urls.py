from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    UserViewSet,
    AddressViewSet,
    BAGBuildingsView,
    InviteViewSet,
    InviteValidateView,
    InviteRegisterView,
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"addresses", AddressViewSet, basename="address")
router.register(r"invites", InviteViewSet, basename="invite")

urlpatterns = [
    path("invites/<str:code>/validate/", InviteValidateView.as_view(), name="invite-validate"),
    path("invites/<str:code>/register/", InviteRegisterView.as_view(), name="invite-register"),
    path("", include(router.urls)),
    path("bag/buildings/", BAGBuildingsView.as_view(), name="bag-buildings"),
]
