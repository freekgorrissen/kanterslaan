"""Social login views for OAuth providers."""

from django.conf import settings
from django.http import JsonResponse
from django.views import View
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.twitter_oauth2.views import TwitterOAuth2Adapter
from allauth.socialaccount.providers.github.views import GitHubOAuth2Adapter
from allauth.socialaccount.providers.facebook.views import FacebookOAuth2Adapter
from allauth.socialaccount.models import SocialApp
from dj_rest_auth.registration.views import SocialLoginView


def _get_oauth_url(provider: str, redirect_uri: str) -> str | None:
    """Build OAuth authorization URL for the given provider."""
    try:
        app = SocialApp.objects.get(provider=provider)
    except SocialApp.DoesNotExist:
        return None
    client_id = app.client_id
    if provider == "google":
        from urllib.parse import urlencode
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "consent",
        }
        return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    if provider == "github":
        from urllib.parse import urlencode
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": "user:email",
        }
        return f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    if provider == "facebook":
        from urllib.parse import urlencode
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": "email,public_profile",
        }
        return f"https://www.facebook.com/v18.0/dialog/oauth?{urlencode(params)}"
    return None


class SocialLoginURLView(View):
    """Return OAuth URLs for frontend redirect (no auth required)."""

    def get(self, request, provider):
        redirect_uri = request.GET.get("redirect_uri") or request.build_absolute_uri("/")
        url = _get_oauth_url(provider, redirect_uri)
        if url:
            return JsonResponse({"url": url})
        return JsonResponse({"error": "Provider not configured"}, status=404)


class GoogleLoginView(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter


class TwitterLoginView(SocialLoginView):
    adapter_class = TwitterOAuth2Adapter


class GitHubLoginView(SocialLoginView):
    adapter_class = GitHubOAuth2Adapter


class FacebookLoginView(SocialLoginView):
    adapter_class = FacebookOAuth2Adapter
