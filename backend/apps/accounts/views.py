import logging
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from apps.core.permissions import IsSchoolAdmin
from .models import User
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    SetParentPinSerializer,
    ParentPinLoginSerializer,
)

logger = logging.getLogger(__name__)


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"error": "Refresh token is required."}, status=400)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Logged out successfully."}, status=200)
        except TokenError as e:
            return Response({"error": str(e)}, status=400)


class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Password updated successfully."})


class SetParentPinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.is_student:
            return Response({"error": "Only students can set a parent PIN."}, status=403)
        serializer = SetParentPinSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Parent PIN set successfully."})


class ParentPinLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ParentPinLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = serializer.validated_data["student"]
        refresh = RefreshToken.for_user(student)
        refresh["parent_view"] = True
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "student": {
                "id": str(student.id),
                "full_name": student.get_full_name(),
                "school_id": str(student.school_id),
            },
            "mode": "parent_view",
        })


class UserListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsSchoolAdmin]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        school = self.request.school or self.request.user.school
        qs = User.objects.filter(school=school).select_related("school")
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        return qs

    def perform_create(self, serializer):
        school = self.request.school or self.request.user.school
        serializer.save(school=school)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsSchoolAdmin]
    serializer_class = UserSerializer

    def get_queryset(self):
        school = self.request.school or self.request.user.school
        return User.objects.filter(school=school)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=["is_active"])
        logger.info(f"User {user.email} deactivated by {request.user.email}")
        return Response({"message": f"{user.get_full_name()} has been deactivated."}, status=200)