import uuid
from django.db import models
from apps.core.models import SchoolOwnedModel


class FeeStructure(SchoolOwnedModel):
    """
    Defines how much a class owes per term per fee type.
    Admin sets this at the start of each term.
    e.g. SS1 → School Fees → ₦45,000 → First Term 2024/2025
    """

    class FeeType(models.TextChoices):
        SCHOOL_FEES = "school_fees", "School Fees"
        DEVELOPMENT = "development", "Development Levy"
        EXAM_FEE = "exam_fee", "Exam Fee"
        UNIFORM = "uniform", "Uniform"
        BOOKS = "books", "Books"
        TRANSPORT = "transport", "Transport"
        OTHER = "other", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_room = models.ForeignKey(
        "academics.ClassRoom",
        on_delete=models.CASCADE,
        related_name="fee_structures",
    )
    term = models.ForeignKey(
        "academics.Term",
        on_delete=models.CASCADE,
        related_name="fee_structures",
    )
    fee_type = models.CharField(max_length=20, choices=FeeType.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=200, blank=True)
    is_mandatory = models.BooleanField(default=True)

    class Meta:
        unique_together = [["school", "class_room", "term", "fee_type"]]
        ordering = ["class_room__name", "fee_type"]

    def __str__(self):
        return f"{self.class_room.name} — {self.get_fee_type_display()} ({self.term}): ₦{self.amount:,.2f}"


class Payment(SchoolOwnedModel):
    """
    A payment made by or for a student.
    Each payment records the fee type, amount, and generates a unique receipt.
    """

    class PaymentMethod(models.TextChoices):
        CASH = "cash", "Cash"
        BANK_TRANSFER = "bank_transfer", "Bank Transfer"
        ONLINE = "online", "Online (Paystack)"
        POS = "pos", "POS"
        CHEQUE = "cheque", "Cheque"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        "students.Student",
        on_delete=models.CASCADE,
        related_name="payments",
    )
    fee_structure = models.ForeignKey(
        FeeStructure,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="payments",
    )
    term = models.ForeignKey(
        "academics.Term",
        on_delete=models.CASCADE,
        related_name="payments",
    )

    fee_type = models.CharField(
        max_length=20,
        choices=FeeStructure.FeeType.choices,
        help_text="Copied from fee structure for quick reference",
    )
    amount_expected = models.DecimalField(max_digits=12, decimal_places=2, help_text="Total fee owed")
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, help_text="Amount paid in this transaction")
    balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Remaining balance after this payment",
    )

    receipt_number = models.CharField(max_length=30, unique=True, editable=False)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    payment_status = models.CharField(max_length=15, choices=PaymentStatus.choices, default=PaymentStatus.CONFIRMED)
    payment_date = models.DateField()

    # For online payments (Paystack)
    transaction_reference = models.CharField(max_length=100, blank=True)

    note = models.CharField(max_length=300, blank=True)
    recorded_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="payments_recorded",
    )

    class Meta:
        ordering = ["-payment_date", "-created_at"]
        indexes = [
            models.Index(fields=["school", "student", "term"]),
            models.Index(fields=["receipt_number"]),
        ]

    def __str__(self):
        return f"Receipt #{self.receipt_number} — {self.student.full_name} — ₦{self.amount_paid:,.2f}"

    def save(self, *args, **kwargs):
        if not self.receipt_number:
            self.receipt_number = self._generate_receipt_number()
        self.balance = self.amount_expected - self.amount_paid
        super().save(*args, **kwargs)

    def _generate_receipt_number(self):
        import random
        from datetime import date
        prefix = self.school.subdomain.upper()[:4]
        today = date.today().strftime("%Y%m")
        suffix = str(random.randint(1000, 9999))
        candidate = f"{prefix}-{today}-{suffix}"
        # Ensure uniqueness
        while Payment.objects.filter(receipt_number=candidate).exists():
            suffix = str(random.randint(1000, 9999))
            candidate = f"{prefix}-{today}-{suffix}"
        return candidate

    @property
    def is_fully_paid(self):
        return self.balance <= 0
