from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginView,
    LogoutView,
    MeView,
    ChangePasswordView,
    SetParentPinView,
    ParentPinLoginView,
    UserListCreateView,
    UserDetailView,
)

urlpatterns = [
    # Authentication
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),

    # Own profile
    path("me/", MeView.as_view(), name="me"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),

    # Parent access (no separate account needed)
    path("set-parent-pin/", SetParentPinView.as_view(), name="set-parent-pin"),
    path("parent-login/", ParentPinLoginView.as_view(), name="parent-login"),

    # Admin: manage school users
    path("users/", UserListCreateView.as_view(), name="user-list-create"),
    path("users/<uuid:pk>/", UserDetailView.as_view(), name="user-detail"),
]
