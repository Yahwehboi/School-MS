import logging
from django.http import JsonResponse
from .models import School

logger = logging.getLogger(__name__)


class SchoolContextMiddleware:
    PUBLIC_PATHS = [
    "/admin/",
    "/api/docs/",
    "/api/schema/",
    "/api/auth/login/",
    "/api/auth/logout/",
    "/api/auth/token/",
    "/api/auth/parent-login/",
    "/__debug__/",
    "/api/core/",
]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.school = None

        # Skip school resolution for public paths
        if any(request.path.startswith(p) for p in self.PUBLIC_PATHS):
            return self.get_response(request)

        # Try header first, then subdomain
        subdomain = (
            request.META.get("HTTP_X_SCHOOL_SUBDOMAIN", "").strip().lower()
            or self._get_subdomain(request)
        )

        if subdomain:
            try:
                request.school = School.objects.get(subdomain=subdomain, is_active=True)
            except School.DoesNotExist:
                return JsonResponse({"error": "School not found or inactive."}, status=404)

        return self.get_response(request)

    def _get_subdomain(self, request):
        host = request.get_host().split(":")[0]
        parts = host.split(".")
        if len(parts) >= 3:
            return parts[0].lower()
        return None