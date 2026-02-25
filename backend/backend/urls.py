"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET
from django.http import JsonResponse

from django.conf import settings
from django.conf.urls.static import static

from kanterslaan.social_views import (
    GoogleLoginView,
    TwitterLoginView,
    GitHubLoginView,
    FacebookLoginView,
    SocialLoginURLView,
)

@require_GET
@ensure_csrf_cookie
def csrf_cookie(request):
    return JsonResponse({'detail': 'CSRF cookie set'})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('kanterslaan.urls')),
    path('dj-rest-auth/csrf/', csrf_cookie),
    path('dj-rest-auth/', include('dj_rest_auth.urls')),
    # Registration disabled - users must sign up via invite link
    path('dj-rest-auth/oauth/<str:provider>/url/', SocialLoginURLView.as_view(), name='social_login_url'),
    path('dj-rest-auth/google/', GoogleLoginView.as_view(), name='google_login'),
    path('dj-rest-auth/twitter/', TwitterLoginView.as_view(), name='twitter_login'),
    path('dj-rest-auth/github/', GitHubLoginView.as_view(), name='github_login'),
    path('dj-rest-auth/facebook/', FacebookLoginView.as_view(), name='facebook_login'),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
