import logging
from django.db import transaction
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.permissions import IsSchoolAdmin, IsAdminOrTeacher
from apps.academics.models import ClassRoom, Term
from apps.students.models import Student
from .models import Attendance, AttendanceSummary
from .serializers import AttendanceSerializer, BulkAttendanceSerializer, AttendanceSummarySerializer

logger = logging.getLogger(__name__)


class AttendanceListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/attendance/?class_room=&term=&date=&student=
    POST /api/attendance/   → single record (use bulk-mark for full class)
    """
    serializer_class = AttendanceSerializer
    permission_classes = [IsAdminOrTeacher]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["class_room", "term", "date", "student", "status"]

    def get_queryset(self):
        return (
            Attendance.objects
            .filter(school=self.request.school)
            .select_related("student__user", "class_room", "term", "marked_by")
            .order_by("-date", "student__user__last_name")
        )


class AttendanceDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = AttendanceSerializer
    permission_classes = [IsAdminOrTeacher]

    def get_queryset(self):
        return Attendance.objects.filter(school=self.request.school)


class BulkAttendanceView(APIView):
    """
    POST /api/attendance/bulk-mark/
    Teacher marks an entire class at once. This is the primary workflow —
    select class, select date, tick each student's status, submit.

    Body:
    {
      "class_room_id": "...",
      "term_id": "...",
      "date": "2025-01-15",
      "entries": [
        {"student_id": "...", "status": "present"},
        {"student_id": "...", "status": "absent", "note": "sick"}
      ]
    }
    """
    permission_classes = [IsAdminOrTeacher]

    def post(self, request):
        serializer = BulkAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        school = request.school

        try:
            class_room = ClassRoom.objects.get(id=data["class_room_id"], school=school)
            term = Term.objects.get(id=data["term_id"], school=school)
        except (ClassRoom.DoesNotExist, Term.DoesNotExist) as e:
            return Response({"error": str(e)}, status=400)

        created, updated, errors = 0, 0, []

        with transaction.atomic():
            students_updated = set()
            for entry in data["entries"]:
                try:
                    student = Student.objects.get(id=entry["student_id"], school=school)
                    _, was_created = Attendance.objects.update_or_create(
                        school=school,
                        student=student,
                        date=data["date"],
                        defaults={
                            "class_room": class_room,
                            "term": term,
                            "status": entry["status"],
                            "note": entry.get("note", ""),
                            "marked_by": request.user,
                        }
                    )
                    students_updated.add(student)
                    if was_created:
                        created += 1
                    else:
                        updated += 1
                except Student.DoesNotExist:
                    errors.append(f"Student {entry['student_id']} not found.")

            # Recompute summaries for all affected students
            for student in students_updated:
                AttendanceSummary.recompute(school, student, term)

        logger.info(
            f"Bulk attendance by {request.user.email}: "
            f"{created} created, {updated} updated for {class_room.name} on {data['date']}"
        )
        return Response({
            "message": f"Attendance saved. {created} new, {updated} updated.",
            "date": str(data["date"]),
            "class_room": class_room.name,
            "errors": errors,
        })


class AttendanceSummaryView(generics.ListAPIView):
    """
    GET /api/attendance/summary/?term=&class_room=&student=
    Returns pre-computed attendance stats per student per term.
    Used in the admin dashboard and report cards.
    """
    serializer_class = AttendanceSummarySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["term", "student"]

    def get_queryset(self):
        qs = (
            AttendanceSummary.objects
            .filter(school=self.request.school)
            .select_related("student__user", "term__session")
        )
        class_room_id = self.request.query_params.get("class_room")
        if class_room_id:
            qs = qs.filter(student__enrollments__class_room_id=class_room_id, student__enrollments__is_active=True)
        return qs


class MyAttendanceView(APIView):
    """
    GET /api/attendance/me/?term=<term_id>
    Student views their own attendance summary.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_student:
            return Response({"error": "Only students can access this endpoint."}, status=403)

        term_id = request.query_params.get("term")
        if not term_id:
            return Response({"error": "term query param is required."}, status=400)

        try:
            student = request.user.student_profile
            summary = AttendanceSummary.objects.get(
                school=request.school,
                student=student,
                term_id=term_id,
            )
        except Student.DoesNotExist:
            return Response({"error": "Student profile not found."}, status=404)
        except AttendanceSummary.DoesNotExist:
            return Response({"message": "No attendance records found for this term.", "data": None})

        # Also return the daily records for detail view
        records = Attendance.objects.filter(
            school=request.school, student=student, term_id=term_id
        ).order_by("-date")

        return Response({
            "summary": AttendanceSummarySerializer(summary).data,
            "records": AttendanceSerializer(records, many=True).data,
        })
