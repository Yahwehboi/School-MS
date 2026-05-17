from rest_framework import generics, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import IsSchoolAdmin, IsAdminOrTeacher
from .models import AcademicSession, Term, ClassRoom, Subject, Enrollment
from .serializers import (
    AcademicSessionSerializer, TermSerializer,
    ClassRoomSerializer, ClassRoomListSerializer,
    SubjectSerializer, EnrollmentSerializer,
)


# -- Sessions -----------------------------------------------------------------

class SessionListCreateView(generics.ListCreateAPIView):
    serializer_class = AcademicSessionSerializer

    def get_permissions(self):
        return [IsSchoolAdmin()] if self.request.method == "POST" else [IsAuthenticated()]

    def get_queryset(self):
        return AcademicSession.objects.filter(school=self.request.school)

    def perform_create(self, serializer):
        serializer.save(school=self.request.school)


class SessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AcademicSessionSerializer
    permission_classes = [IsSchoolAdmin]

    def get_queryset(self):
        return AcademicSession.objects.filter(school=self.request.school)


# -- Terms --------------------------------------------------------------------

class TermListCreateView(generics.ListCreateAPIView):
    serializer_class = TermSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["session", "is_current"]

    def get_permissions(self):
        return [IsSchoolAdmin()] if self.request.method == "POST" else [IsAuthenticated()]

    def get_queryset(self):
        return Term.objects.filter(school=self.request.school).select_related("session")

    def perform_create(self, serializer):
        serializer.save(school=self.request.school)


class TermDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TermSerializer
    permission_classes = [IsSchoolAdmin]

    def get_queryset(self):
        return Term.objects.filter(school=self.request.school)


# -- Classes ------------------------------------------------------------------

class ClassRoomListCreateView(generics.ListCreateAPIView):
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["level"]
    search_fields = ["name", "arm"]

    def get_permissions(self):
        return [IsSchoolAdmin()] if self.request.method == "POST" else [IsAdminOrTeacher()]

    def get_serializer_class(self):
        return ClassRoomSerializer if self.request.method == "POST" else ClassRoomListSerializer

    def get_queryset(self):
        return ClassRoom.objects.filter(school=self.request.school).select_related("form_teacher")

    def perform_create(self, serializer):
        serializer.save(school=self.request.school)


class ClassRoomDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ClassRoomSerializer
    permission_classes = [IsSchoolAdmin]

    def get_queryset(self):
        return ClassRoom.objects.filter(school=self.request.school).prefetch_related("subjects")


# -- Subjects -----------------------------------------------------------------

class SubjectListCreateView(generics.ListCreateAPIView):
    serializer_class = SubjectSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["class_room", "teacher", "is_active"]

    def get_permissions(self):
        return [IsSchoolAdmin()] if self.request.method == "POST" else [IsAdminOrTeacher()]

    def get_queryset(self):
        return Subject.objects.filter(school=self.request.school).select_related("class_room", "teacher")

    def perform_create(self, serializer):
        serializer.save(school=self.request.school)


class SubjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SubjectSerializer
    permission_classes = [IsSchoolAdmin]

    def get_queryset(self):
        return Subject.objects.filter(school=self.request.school)


# -- Enrollments --------------------------------------------------------------

class EnrollmentListCreateView(generics.ListCreateAPIView):
    serializer_class = EnrollmentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["class_room", "term", "student", "is_active"]

    def get_permissions(self):
        return [IsSchoolAdmin()] if self.request.method == "POST" else [IsAdminOrTeacher()]

    def get_queryset(self):
        return (
            Enrollment.objects
            .filter(school=self.request.school)
            .select_related("student__user", "class_room", "term__session")
        )


class EnrollmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EnrollmentSerializer
    permission_classes = [IsSchoolAdmin]

    def get_queryset(self):
        return Enrollment.objects.filter(school=self.request.school)
