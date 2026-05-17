import uuid
from django.db import models
from apps.core.models import SchoolOwnedModel


class Student(SchoolOwnedModel):
    """
    Extended profile for users with role=student.
    Linked 1-to-1 with the User model.
    """

    class Gender(models.TextChoices):
        MALE = "M", "Male"
        FEMALE = "F", "Female"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="student_profile",
    )
    student_id = models.CharField(
        max_length=20,
        help_text="School-assigned ID e.g. GFS/2024/001",
    )
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=1, choices=Gender.choices, blank=True)
    address = models.TextField(blank=True)
    state_of_origin = models.CharField(max_length=50, blank=True)
    blood_group = models.CharField(max_length=5, blank=True)

    # Parent/guardian info — stored on the student record
    # (no separate parent account; parents use PIN-based login instead)
    guardian_name = models.CharField(max_length=200, blank=True)
    guardian_phone = models.CharField(max_length=20, blank=True)
    guardian_email = models.EmailField(blank=True)
    guardian_relationship = models.CharField(max_length=50, blank=True)

    admission_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = [["school", "student_id"]]
        ordering = ["user__last_name", "user__first_name"]
        indexes = [models.Index(fields=["school", "student_id"])]

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.student_id})"

    @property
    def full_name(self):
        return self.user.get_full_name()

    @property
    def current_class(self):
        """Returns the student's active enrollment's class."""
        enrollment = self.enrollments.filter(is_active=True).select_related("class_room").first()
        return enrollment.class_room if enrollment else None
