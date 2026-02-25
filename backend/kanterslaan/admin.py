from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, Address, Invite


from django.contrib.gis import admin as gis_admin


@admin.register(Address)
class AddressAdmin(gis_admin.GISModelAdmin):
    list_display = ["street_name", "house_number"]
    search_fields = ["street_name", "house_number"]


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "first_name", "last_name", "address", "is_active"]
    list_filter = ["is_active", "is_staff"]
    search_fields = ["email", "first_name", "last_name"]
    ordering = ["email"]
    filter_horizontal = []

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "photo", "date_of_birth", "address")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {"fields": ("email", "password1", "password2")}),
        ("Personal info", {"fields": ("first_name", "last_name", "photo", "date_of_birth", "address")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser")}),
    )


@admin.register(Invite)
class InviteAdmin(admin.ModelAdmin):
    list_display = ["code", "address", "first_name", "last_name", "created_by", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["code", "first_name", "last_name"]
    readonly_fields = ["code", "created_at"]
