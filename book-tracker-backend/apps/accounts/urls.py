from django.urls import path

from apps.accounts.views import (
    CSRFView,
    GoogleLoginView,
    LoginView,
    LogoutView,
    MeView,
    RefreshView,
    RegisterView,
)

urlpatterns = [
    path("csrf/", CSRFView.as_view(), name="csrf"),
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("refresh/", RefreshView.as_view(), name="refresh"),
    path("google/", GoogleLoginView.as_view(), name="google-login"),
]
