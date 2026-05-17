import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.core.models import SchoolOwnedModel


class GradeScale(SchoolOwnedModel):
    """
    Configurable grading scale per school.
    Default: Nigerian percentage/letter system.
    Schools can customize boundaries.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    grade = models.CharField(max_length=5, help_text="e.g. A, B+, C")
    remark = models.CharField(max_length=50, help_text="e.g. Excellent, Very Good")
    min_score = models.FloatField()
    max_score = models.FloatField()

    class Meta:
        unique_together = [["school", "grade"]]
        ordering = ["-min_score"]

    def __str__(self):
        return f"{self.grade} ({self.min_score}–{self.max_score})"

    @classmethod
    def get_grade_for_score(cls, school, score):
        """Returns (grade, remark) tuple for a given score."""
        scale = cls.objects.filter(
            school=school,
            min_score__lte=score,
            max_score__gte=score,
        ).first()
        if scale:
            return scale.grade, scale.remark
        return "F", "Fail"


class Result(SchoolOwnedModel):
    """
    One result per student per subject per term.
    CA + Exam → total → auto-graded.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    enrollment = models.ForeignKey(
        "academics.Enrollment",
        on_delete=models.CASCADE,
        related_name="results",
    )
    subject = models.ForeignKey(
        "academics.Subject",
        on_delete=models.CASCADE,
        related_name="results",
    )
    term = models.ForeignKey(
        "academics.Term",
        on_delete=models.CASCADE,
        related_name="results",
    )

    # Score breakdown — customizable per school via settings
    # Default: CA max=40, Exam max=60 (total=100)
    ca_score = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(40)],
        help_text="Continuous Assessment (0–40)",
    )
    exam_score = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(60)],
        help_text="Exam score (0–60)",
    )

    # Auto-computed fields (set on save)
    total = models.FloatField(null=True, blank=True, editable=False)
    grade = models.CharField(max_length=5, blank=True, editable=False)
    remark = models.CharField(max_length=50, blank=True, editable=False)

    # Position is computed across all students in same class+subject+term
    # Stored after bulk computation (see compute_positions())
    position = models.PositiveIntegerField(null=True, blank=True)

    is_published = models.BooleanField(
        default=False,
        help_text="Students can only see published results."
    )
    entered_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="results_entered",
    )

    class Meta:
        unique_together = [["school", "enrollment", "subject", "term"]]
        ordering = ["-total"]
        indexes = [
            models.Index(fields=["school", "term", "enrollment"]),
            models.Index(fields=["school", "term", "subject"]),
        ]

    def __str__(self):
        return f"{self.enrollment.student.full_name} — {self.subject.name} ({self.term})"

    def save(self, *args, **kwargs):
        self._compute_total_and_grade()
        super().save(*args, **kwargs)

    def _compute_total_and_grade(self):
        ca = self.ca_score or 0
        exam = self.exam_score or 0
        if self.ca_score is not None or self.exam_score is not None:
            self.total = round(ca + exam, 2)
            self.grade, self.remark = GradeScale.get_grade_for_score(self.school, self.total)
        else:
            self.total = None
            self.grade = ""
            self.remark = ""

    @classmethod
    def compute_positions(cls, school, term, class_room):
        """
        Computes and saves the position of each student per subject
        for a given class and term. Call this after all scores are entered.
        """
        subjects = class_room.subjects.filter(school=school, is_active=True)
        for subject in subjects:
            results = (
                cls.objects
                .filter(school=school, term=term, subject=subject)
                .filter(enrollment__class_room=class_room)
                .exclude(total=None)
                .order_by("-total")
            )
            for rank, result in enumerate(results, start=1):
                result.position = rank
                result.save(update_fields=["position"])

    @classmethod
    def publish_term_results(cls, school, term, class_room):
        """
        Marks all results for a class/term as published.
        Students can now view them.
        """
        cls.objects.filter(
            school=school,
            term=term,
            enrollment__class_room=class_room,
        ).update(is_published=True)


def get_default_grade_scale():
    """Returns the standard Nigerian grading scale as a list of dicts."""
    return [
        {"grade": "A",  "remark": "Excellent",    "min_score": 70, "max_score": 100},
        {"grade": "B",  "remark": "Very Good",     "min_score": 60, "max_score": 69.99},
        {"grade": "C",  "remark": "Good",          "min_score": 50, "max_score": 59.99},
        {"grade": "D",  "remark": "Pass",          "min_score": 45, "max_score": 49.99},
        {"grade": "E",  "remark": "Below Average", "min_score": 40, "max_score": 44.99},
        {"grade": "F",  "remark": "Fail",          "min_score": 0,  "max_score": 39.99},
    ]
