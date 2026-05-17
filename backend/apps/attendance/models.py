import uuid
from django.db import models
from apps.core.models import SchoolOwnedModel


class Attendance(SchoolOwnedModel):
    """
    One record per student per day.
    Teachers mark attendance for their class each morning.
    """

    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT = "absent", "Absent"
        LATE = "late", "Late"
        EXCUSED = "excused", "Excused"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        "students.Student",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    class_room = models.ForeignKey(
        "academics.ClassRoom",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    term = models.ForeignKey(
        "academics.Term",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    date = models.DateField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PRESENT)
    note = models.CharField(max_length=200, blank=True, help_text="Optional note e.g. reason for absence")
    marked_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="attendance_marked",
    )

    class Meta:
        unique_together = [["school", "student", "date"]]
        ordering = ["-date", "student__user__last_name"]
        indexes = [
            models.Index(fields=["school", "class_room", "date"]),
            models.Index(fields=["school", "student", "term"]),
        ]

    def __str__(self):
        return f"{self.student.full_name} — {self.date} ({self.status})"


class AttendanceSummary(models.Model):
    """
    Pre-computed per-student summary for a term.
    Regenerated whenever attendance is saved.
    Used for fast report generation without scanning all records.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey("core.School", on_delete=models.CASCADE)
    student = models.ForeignKey("students.Student", on_delete=models.CASCADE, related_name="attendance_summaries")
    term = models.ForeignKey("academics.Term", on_delete=models.CASCADE)

    total_days = models.PositiveIntegerField(default=0)
    days_present = models.PositiveIntegerField(default=0)
    days_absent = models.PositiveIntegerField(default=0)
    days_late = models.PositiveIntegerField(default=0)
    days_excused = models.PositiveIntegerField(default=0)
    attendance_percentage = models.FloatField(default=0.0)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [["school", "student", "term"]]

    def __str__(self):
        return f"{self.student.full_name} — {self.term} ({self.attendance_percentage:.1f}%)"

    @classmethod
    def recompute(cls, school, student, term):
        """Call this after saving attendance records to keep summary fresh."""
        records = Attendance.objects.filter(school=school, student=student, term=term)
        total = records.count()
        present = records.filter(status=Attendance.Status.PRESENT).count()
        absent = records.filter(status=Attendance.Status.ABSENT).count()
        late = records.filter(status=Attendance.Status.LATE).count()
        excused = records.filter(status=Attendance.Status.EXCUSED).count()
        pct = round((present / total) * 100, 1) if total > 0 else 0.0

        cls.objects.update_or_create(
            school=school, student=student, term=term,
            defaults={
                "total_days": total,
                "days_present": present,
                "days_absent": absent,
                "days_late": late,
                "days_excused": excused,
                "attendance_percentage": pct,
            }
        )
