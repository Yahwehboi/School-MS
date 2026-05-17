import logging
from django.db import transaction
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.permissions import IsSchoolAdmin, IsAdminOrTeacher
from apps.academics.models import Enrollment, Subject, Term, ClassRoom
from apps.students.models import Student
from .models import Result, GradeScale, get_default_grade_scale
from .serializers import (
    ResultSerializer, BulkResultSerializer,
    ReportCardSerializer, GradeScaleSerializer,
)

logger = logging.getLogger(__name__)


class GradeScaleListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/results/grade-scale/ — Admin sets up grading bands."""
    serializer_class = GradeScaleSerializer
    permission_classes = [IsSchoolAdmin]

    def get_queryset(self):
        return GradeScale.objects.filter(school=self.request.school)

    def perform_create(self, serializer):
        serializer.save(school=self.request.school)


class SetupDefaultGradeScaleView(APIView):
    """
    POST /api/results/grade-scale/setup-default/
    One-click: seeds the standard Nigerian grading scale for a school.
    """
    permission_classes = [IsSchoolAdmin]

    def post(self, request):
        school = request.school
        created_count = 0
        for entry in get_default_grade_scale():
            _, created = GradeScale.objects.get_or_create(
                school=school,
                grade=entry["grade"],
                defaults={
                    "remark": entry["remark"],
                    "min_score": entry["min_score"],
                    "max_score": entry["max_score"],
                }
            )
            if created:
                created_count += 1
        return Response({
            "message": f"Grade scale ready. {created_count} new grades added.",
            "scale": GradeScaleSerializer(
                GradeScale.objects.filter(school=school), many=True
            ).data,
        })


class ResultListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/results/?term=&subject=&enrollment=   → filter results
    POST /api/results/                              → enter single result
    Teachers and admins only.
    """
    serializer_class = ResultSerializer
    permission_classes = [IsAdminOrTeacher]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["term", "subject", "enrollment", "is_published"]

    def get_queryset(self):
        return (
            Result.objects
            .filter(school=self.request.school)
            .select_related(
                "enrollment__student__user",
                "enrollment__class_room",
                "subject", "term__session", "entered_by",
            )
        )


class ResultDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ResultSerializer
    permission_classes = [IsAdminOrTeacher]

    def get_queryset(self):
        return Result.objects.filter(school=self.request.school)

    def perform_update(self, serializer):
        serializer.save(entered_by=self.request.user)


class BulkResultEntryView(APIView):
    """
    POST /api/results/bulk-entry/
    Teacher submits all scores for a subject in one go.
    Body: { subject_id, term_id, entries: [{enrollment_id, ca_score, exam_score}] }
    """
    permission_classes = [IsAdminOrTeacher]

    def post(self, request):
        serializer = BulkResultSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        school = request.school

        try:
            subject = Subject.objects.get(id=data["subject_id"], school=school)
            term = Term.objects.get(id=data["term_id"], school=school)
        except (Subject.DoesNotExist, Term.DoesNotExist) as e:
            return Response({"error": str(e)}, status=400)

        created, updated = 0, 0
        errors = []

        with transaction.atomic():
            for entry in data["entries"]:
                try:
                    enrollment = Enrollment.objects.get(
                        id=entry["enrollment_id"], school=school
                    )
                    result, was_created = Result.objects.update_or_create(
                        school=school,
                        enrollment=enrollment,
                        subject=subject,
                        term=term,
                        defaults={
                            "ca_score": entry.get("ca_score"),
                            "exam_score": entry.get("exam_score"),
                            "entered_by": request.user,
                        }
                    )
                    if was_created:
                        created += 1
                    else:
                        updated += 1
                except Enrollment.DoesNotExist:
                    errors.append(f"Enrollment {entry['enrollment_id']} not found.")

        logger.info(
            f"Bulk result entry by {request.user.email}: "
            f"{created} created, {updated} updated for {subject.name} / {term}"
        )
        return Response({
            "message": f"{created} results created, {updated} updated.",
            "errors": errors,
        })


class ComputePositionsView(APIView):
    """
    POST /api/results/compute-positions/
    Admin triggers position ranking for a class/term after all scores are in.
    Body: { term_id, class_room_id }
    """
    permission_classes = [IsSchoolAdmin]

    def post(self, request):
        term_id = request.data.get("term_id")
        class_room_id = request.data.get("class_room_id")
        school = request.school

        try:
            term = Term.objects.get(id=term_id, school=school)
            class_room = ClassRoom.objects.get(id=class_room_id, school=school)
        except (Term.DoesNotExist, ClassRoom.DoesNotExist) as e:
            return Response({"error": str(e)}, status=400)

        Result.compute_positions(school, term, class_room)
        return Response({"message": f"Positions computed for {class_room.name} — {term}."})


class PublishResultsView(APIView):
    """
    POST /api/results/publish/
    Admin publishes results — students can now view them.
    Body: { term_id, class_room_id }
    """
    permission_classes = [IsSchoolAdmin]

    def post(self, request):
        term_id = request.data.get("term_id")
        class_room_id = request.data.get("class_room_id")
        school = request.school

        try:
            term = Term.objects.get(id=term_id, school=school)
            class_room = ClassRoom.objects.get(id=class_room_id, school=school)
        except (Term.DoesNotExist, ClassRoom.DoesNotExist) as e:
            return Response({"error": str(e)}, status=400)

        Result.publish_term_results(school, term, class_room)
        return Response({"message": f"Results published for {class_room.name} — {term}."})


class ReportCardView(APIView):
    """
    GET /api/results/report-card/?enrollment_id=&term_id=
    Returns a student's full report card for a term.
    Accessible by the student themselves, teachers, and admins.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        enrollment_id = request.query_params.get("enrollment_id")
        term_id = request.query_params.get("term_id")
        school = request.school

        if not enrollment_id or not term_id:
            return Response({"error": "enrollment_id and term_id are required."}, status=400)

        try:
            enrollment = Enrollment.objects.select_related(
                "student__user", "class_room", "term__session"
            ).get(id=enrollment_id, school=school)
            term = Term.objects.select_related("session").get(id=term_id, school=school)
        except (Enrollment.DoesNotExist, Term.DoesNotExist) as e:
            return Response({"error": str(e)}, status=404)

        # Students can only see their own report card
        if request.user.is_student:
            if not hasattr(request.user, "student_profile"):
                return Response({"error": "No student profile found."}, status=403)
            if enrollment.student != request.user.student_profile:
                return Response({"error": "You can only view your own report card."}, status=403)

        results = Result.objects.filter(
            school=school,
            enrollment=enrollment,
            term=term,
            is_published=True,
        ).select_related("subject").order_by("subject__name")

        if request.user.is_admin or request.user.is_teacher:
            results = Result.objects.filter(
                school=school, enrollment=enrollment, term=term,
            ).select_related("subject").order_by("subject__name")

        totals = [r.total for r in results if r.total is not None]
        total_score = sum(totals)
        average = round(total_score / len(totals), 2) if totals else 0

        # Compute overall position (rank by average across the class)
        all_averages = (
            Result.objects
            .filter(school=school, term=term, enrollment__class_room=enrollment.class_room, is_published=True)
            .values("enrollment_id")
            .annotate(avg=models.Avg("total"))
            .order_by("-avg")
        )
        position = None
        total_students = all_averages.count()
        for rank, row in enumerate(all_averages, start=1):
            if str(row["enrollment_id"]) == str(enrollment.id):
                position = rank
                break

        report = {
            "student_name": enrollment.student.full_name,
            "student_id_no": enrollment.student.student_id,
            "class_name": enrollment.class_room.name,
            "term_name": str(term),
            "session_name": term.session.name,
            "results": ResultSerializer(results, many=True).data,
            "total_score": total_score,
            "average": average,
            "overall_position": position,
            "total_students": total_students,
            "next_term_begins": term.next_term_begins,
            "school_name": school.name,
            "school_address": school.address,
        }
        return Response(report)


# Import needed for annotation in ReportCardView
from django.db import models


class ReportCardPDFView(APIView):
    """
    GET /api/results/report-card/pdf/?enrollment_id=&term_id=
    Generates and streams a PDF report card.
    Uses WeasyPrint to render an HTML template to PDF.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.http import HttpResponse
        from django.template.loader import render_to_string

        try:
            from weasyprint import HTML
        except ImportError:
            return Response({"error": "PDF generation not available. Install weasyprint."}, status=500)

        # Reuse the report card data logic
        report_view = ReportCardView()
        report_view.request = request
        response = report_view.get(request)
        if response.status_code != 200:
            return response

        data = response.data
        html_string = render_to_string("results/report_card.html", {"report": data})
        pdf_file = HTML(string=html_string).write_pdf()

        filename = f"report_card_{data['student_id_no']}_{data['term_name']}.pdf".replace(" ", "_")
        http_response = HttpResponse(pdf_file, content_type="application/pdf")
        http_response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return http_response
