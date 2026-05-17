import logging
from decimal import Decimal
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.permissions import IsSchoolAdmin, IsAdminOrTeacher
from apps.academics.models import Term
from apps.students.models import Student
from .models import FeeStructure, Payment
from .serializers import FeeStructureSerializer, PaymentSerializer, StudentFeeStatusSerializer

logger = logging.getLogger(__name__)


class FeeStructureListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/finance/fee-structures/?term=&class_room=
    POST /api/finance/fee-structures/   → Admin sets up fees for a class/term
    """
    serializer_class = FeeStructureSerializer
    permission_classes = [IsSchoolAdmin]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["term", "class_room", "fee_type"]

    def get_queryset(self):
        return FeeStructure.objects.filter(school=self.request.school).select_related("class_room", "term__session")


class FeeStructureDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FeeStructureSerializer
    permission_classes = [IsSchoolAdmin]

    def get_queryset(self):
        return FeeStructure.objects.filter(school=self.request.school)


class PaymentListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/finance/payments/?student=&term=&status=
    POST /api/finance/payments/   → Record a payment (bursar workflow)
    """
    serializer_class = PaymentSerializer
    permission_classes = [IsAdminOrTeacher]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["student", "term", "payment_status", "fee_type", "payment_method"]

    def get_queryset(self):
        return (
            Payment.objects
            .filter(school=self.request.school)
            .select_related("student__user", "term__session", "recorded_by")
            .order_by("-payment_date")
        )

    def perform_create(self, serializer):
        serializer.save(school=self.request.school, recorded_by=self.request.user)
        logger.info(f"Payment recorded by {self.request.user.email}")


class PaymentDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsAdminOrTeacher]

    def get_queryset(self):
        return Payment.objects.filter(school=self.request.school)


class StudentFeeStatusView(APIView):
    """
    GET /api/finance/student-status/?student_id=&term_id=
    Full fee breakdown for one student in one term.
    Shows each fee, what's been paid, and what's outstanding.
    Admin, teacher, and the student themselves can view.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        student_id = request.query_params.get("student_id")
        term_id = request.query_params.get("term_id")
        school = request.school

        if not student_id or not term_id:
            return Response({"error": "student_id and term_id are required."}, status=400)

        try:
            student = Student.objects.get(id=student_id, school=school)
            term = Term.objects.get(id=term_id, school=school)
        except (Student.DoesNotExist, Term.DoesNotExist) as e:
            return Response({"error": str(e)}, status=404)

        # Students can only view their own fees
        if request.user.is_student:
            try:
                if student != request.user.student_profile:
                    return Response({"error": "You can only view your own fee status."}, status=403)
            except Exception:
                return Response({"error": "Student profile not found."}, status=403)

        # Get fee structures for student's class
        enrollment = student.enrollments.filter(term=term, is_active=True).first()
        class_room = enrollment.class_room if enrollment else None

        fee_structures = FeeStructure.objects.filter(school=school, term=term, class_room=class_room)
        payments = Payment.objects.filter(school=school, student=student, term=term, payment_status="confirmed")

        fees_data = []
        total_expected = Decimal("0.00")
        total_paid = Decimal("0.00")

        for fee in fee_structures:
            fee_payments = payments.filter(fee_type=fee.fee_type)
            paid = sum(p.amount_paid for p in fee_payments)
            balance = fee.amount - paid
            total_expected += fee.amount
            total_paid += paid
            fees_data.append({
                "fee_type": fee.fee_type,
                "fee_type_display": fee.get_fee_type_display(),
                "amount_expected": str(fee.amount),
                "amount_paid": str(paid),
                "balance": str(balance),
                "is_cleared": balance <= 0,
                "receipts": [p.receipt_number for p in fee_payments],
            })

        total_balance = total_expected - total_paid

        return Response({
            "student_id": str(student.id),
            "student_name": student.full_name,
            "student_id_no": student.student_id,
            "term_name": str(term),
            "class_name": class_room.name if class_room else None,
            "fees": fees_data,
            "total_expected": str(total_expected),
            "total_paid": str(total_paid),
            "total_balance": str(total_balance),
            "is_cleared": total_balance <= 0,
        })


class ReceiptView(APIView):
    """
    GET /api/finance/receipt/<receipt_number>/
    Returns a payment record by receipt number — used for verification
    and PDF receipt generation.
    """
    permission_classes = [IsAdminOrTeacher]

    def get(self, request, receipt_number):
        try:
            payment = Payment.objects.select_related(
                "student__user", "term__session", "recorded_by"
            ).get(school=request.school, receipt_number=receipt_number)
        except Payment.DoesNotExist:
            return Response({"error": "Receipt not found."}, status=404)
        return Response(PaymentSerializer(payment).data)


class ReceiptPDFView(APIView):
    """
    GET /api/finance/receipt/<receipt_number>/pdf/
    Generates a printable PDF receipt using WeasyPrint.
    """
    permission_classes = [IsAdminOrTeacher]

    def get(self, request, receipt_number):
        from django.http import HttpResponse
        from django.template.loader import render_to_string

        try:
            from weasyprint import HTML
        except ImportError:
            return Response({"error": "PDF generation not available."}, status=500)

        try:
            payment = Payment.objects.select_related(
                "student__user", "term__session", "fee_structure__class_room"
            ).get(school=request.school, receipt_number=receipt_number)
        except Payment.DoesNotExist:
            return Response({"error": "Receipt not found."}, status=404)

        html_string = render_to_string("finance/receipt.html", {
            "payment": payment,
            "school": request.school,
        })
        pdf_file = HTML(string=html_string).write_pdf()
        response = HttpResponse(pdf_file, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="receipt_{receipt_number}.pdf"'
        return response
