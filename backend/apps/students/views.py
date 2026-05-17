import logging
from rest_framework import generics, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.permissions import IsSchoolAdmin, IsAdminOrTeacher, IsOwnerOrAdmin
from .models import Student
from .serializers import (
    StudentSerializer,
    StudentListSerializer,
    StudentCreateSerializer,
    StudentUpdateSerializer,
)

logger = logging.getLogger(__name__)


class StudentListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/students/            → list all students (admin/teacher)
    POST /api/students/            → create student + user account (admin only)
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["gender", "is_active"]
    search_fields = ["user__first_name", "user__last_name", "user__email", "student_id"]
    ordering_fields = ["user__last_name", "student_id", "created_at"]
    ordering = ["user__last_name"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsSchoolAdmin()]
        return [IsAdminOrTeacher()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return StudentCreateSerializer
        return StudentListSerializer

    def get_queryset(self):
        return (
            Student.objects
            .filter(school=self.request.school)
            .select_related("user")
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        student = serializer.save()
        logger.info(f"Student {student.student_id} created by {request.user.email}")
        return Response(StudentSerializer(student).data, status=status.HTTP_201_CREATED)


class StudentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/students/<id>/     → full profile
    PUT    /api/students/<id>/     → update profile (admin)
    DELETE /api/students/<id>/     → deactivate (admin)
    """
    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsSchoolAdmin()]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return StudentUpdateSerializer
        return StudentSerializer

    def get_queryset(self):
        return Student.objects.filter(school=self.request.school).select_related("user")

    def destroy(self, request, *args, **kwargs):
        student = self.get_object()
        student.is_active = False
        student.save(update_fields=["is_active"])
        student.user.is_active = False
        student.user.save(update_fields=["is_active"])
        return Response({"message": f"{student.full_name} has been deactivated."})


class MyStudentProfileView(APIView):
    """
    GET /api/students/me/
    A student views their own profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_student:
            return Response({"error": "Only students can access this endpoint."}, status=403)
        try:
            student = request.user.student_profile
        except Student.DoesNotExist:
            return Response({"error": "Student profile not found."}, status=404)
        return Response(StudentSerializer(student).data)
