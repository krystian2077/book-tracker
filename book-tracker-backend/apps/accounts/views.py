from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from apps.accounts.csrf_tokens import issue_api_csrf_token
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.cookies import (
    clear_auth_cookies,
    issue_tokens_for_user,
    set_auth_cookies,
)
from apps.accounts.google import GoogleAuthError, verify_google_id_token
from apps.accounts.serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


def _unique_username(base: str) -> str:
    base = (base or "user").strip() or "user"
    username = base[:150]
    suffix = 1
    while User.objects.filter(username=username).exists():
        username = f"{base[:140]}{suffix}"
        suffix += 1
    return username


class CSRFView(APIView):
    """Returns a signed CSRF token for the SPA to send on unsafe requests."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {"detail": "CSRF token issued.", "csrf_token": issue_api_csrf_token()}
        )


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(request=RegisterSerializer, responses=UserSerializer)
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        access, refresh = issue_tokens_for_user(user)
        response = Response(
            UserSerializer(user).data, status=status.HTTP_201_CREATED
        )
        set_auth_cookies(response, access, refresh)
        return response


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(request=LoginSerializer, responses=UserSerializer)
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        access, refresh = issue_tokens_for_user(user)
        response = Response(UserSerializer(user).data)
        set_auth_cookies(response, access, refresh)
        return response


class LogoutView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"detail": "Logged out."})
        clear_auth_cookies(response)
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=UserSerializer)
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class GoogleLoginView(APIView):
    """Log in / sign up via a Google ID token; issues our cookie-JWT session."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        credential = request.data.get("credential", "")
        try:
            claims = verify_google_id_token(credential)
        except GoogleAuthError as exc:
            configured = bool(settings.GOOGLE_OAUTH_CLIENT_ID)
            return Response(
                {"detail": str(exc)},
                status=(
                    status.HTTP_503_SERVICE_UNAVAILABLE
                    if not configured
                    else status.HTTP_401_UNAUTHORIZED
                ),
            )

        email = claims["email"].lower()
        user = User.objects.filter(email__iexact=email).first()
        created = False
        if user is None:
            user = User.objects.create_user(
                username=_unique_username(email.split("@")[0]),
                email=email,
            )
            # Google-only account: no usable local password.
            user.set_unusable_password()
            user.save()
            created = True

        access, refresh = issue_tokens_for_user(user)
        response = Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
        set_auth_cookies(response, access, refresh)
        return response


class RefreshView(APIView):
    """Issue a new access cookie using the refresh cookie."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        raw_refresh = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)
        if not raw_refresh:
            return Response(
                {"detail": "No refresh token."}, status=status.HTTP_401_UNAUTHORIZED
            )
        try:
            refresh = RefreshToken(raw_refresh)
        except TokenError:
            response = Response(
                {"detail": "Invalid or expired refresh token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_auth_cookies(response)
            return response

        access = str(refresh.access_token)
        new_refresh = None
        if settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS"):
            refresh.set_jti()
            refresh.set_exp()
            new_refresh = str(refresh)

        response = Response({"detail": "Token refreshed."})
        set_auth_cookies(response, access, new_refresh)
        return response
