from rest_framework.permissions import BasePermission


class IsSchoolAdmin(BasePermission):
    """User must be authenticated AND have role=admin for this school."""
    message = "You must be a school administrator to perform this action."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "admin"
            and self._same_school(request)
        )

    def _same_school(self, request):
        if request.school:
            return request.user.school_id == request.school.id
        return request.user.school_id is not None

class IsTeacher(BasePermission):
    """User must be a teacher at this school."""
    message = "Only teachers can perform this action."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in ("teacher", "admin")
            and self._same_school(request)
        )

    def _same_school(self, request):
        if not request.school:
            return False
        return request.user.school_id == request.school.id


class IsAdminOrTeacher(BasePermission):
    """Admin or teacher access."""
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in ("admin", "teacher")
        )


class IsStudent(BasePermission):
    """Student-only access."""
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "student"
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level: the requesting user owns the object (e.g. their own profile)
    OR is an admin. Used in detail views.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        # obj must have a user or owner field
        owner = getattr(obj, "user", None) or getattr(obj, "owner", None)
        return owner == request.user
