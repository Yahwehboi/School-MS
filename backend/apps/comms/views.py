from rest_framework import serializers, generics, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from apps.core.permissions import IsSchoolAdmin, IsAdminOrTeacher
from .models import Announcement


# ---------------------------------------------------------------------------
# Serializers
# ---------------------------------------------------------------------------

class AnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)
    target_class_name = serializers.CharField(source="target_class.name", read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id", "title", "body", "audience", "is_pinned",
            "author", "author_name", "target_class", "target_class_name",
            "published_at", "expires_at",
        ]
        read_only_fields = ["id", "author", "published_at"]

    def create(self, validated_data):
        validated_data["school"] = self.context["request"].school
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------

class AnnouncementListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/comms/announcements/   → filtered by role automatically
    POST /api/comms/announcements/   → admin/teacher creates announcement
    """
    serializer_class = AnnouncementSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["audience", "is_pinned", "target_class"]
    search_fields = ["title", "body"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminOrTeacher()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = Announcement.objects.filter(school=self.request.school)

        # Filter by role: students only see student or all announcements
        if user.is_student:
            qs = qs.filter(audience__in=["all", "students"])
        elif user.is_teacher:
            qs = qs.filter(audience__in=["all", "teachers"])
        # Admins see everything

        # Filter out expired
        from django.utils import timezone
        qs = qs.filter(
            models.Q(expires_at__isnull=True) | models.Q(expires_at__gte=timezone.now())
        )
        return qs.select_related("author", "target_class")


class AnnouncementDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAdminOrTeacher()]

    def get_queryset(self):
        return Announcement.objects.filter(school=self.request.school)


# Import needed for Q object in view
from django.db import models
