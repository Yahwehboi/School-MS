from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import serializers
from .models import School


class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = ["id", "name", "subdomain", "address", "phone", "email", "logo", "settings"]


class SchoolInfoView(APIView):
    """
    Public endpoint — returns basic school info by subdomain.
    Frontend calls this on load to get the school name/logo for the login page.
    GET /api/core/school-info/?subdomain=greenfield
    """
    permission_classes = [AllowAny]

    def get(self, request):
        subdomain = request.query_params.get("subdomain", "").strip().lower()
        if not subdomain:
            return Response({"error": "subdomain is required"}, status=400)
        try:
            school = School.objects.get(subdomain=subdomain, is_active=True)
        except School.DoesNotExist:
            return Response({"error": "School not found."}, status=404)
        return Response(SchoolSerializer(school).data)
