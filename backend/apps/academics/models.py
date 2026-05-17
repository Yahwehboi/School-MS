import uuid
from django.db import models
from apps.core.models import SchoolOwnedModel


class AcademicSession(SchoolOwnedModel):
    """
    A school year e.g. '2024/2025'.
    Everything (terms, results, fees) belongs to a session.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=20, help_text="e.g. 2024/2025")
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)

    class Meta:
        unique_together = [["school", "name"]]
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.name} ({'current' if self.is_current else 'past'})"

    def save(self, *args, **kwargs):
        # Ensure only one session is marked current per school
        if self.is_current:
            AcademicSession.objects.filter(school=self.school, is_current=True).update(is_current=False)
        super().save(*args, **kwargs)


class Term(SchoolOwnedModel):
    """
    A term within a session (First, Second, Third).
    Results and attendance are scoped to a term.
    """

    class TermName(models.TextChoices):
        FIRST = "first", "First Term"
        SECOND = "second", "Second Term"
        THIRD = "third", "Third Term"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(AcademicSession, on_delete=models.CASCADE, related_name="terms")
    name = models.CharField(max_length=10, choices=TermName.choices)
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)
    next_term_begins = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = [["school", "session", "name"]]
        ordering = ["-session__start_date", "name"]

    def __str__(self):
        return f"{self.get_name_display()} — {self.session.name}"

    def save(self, *args, **kwargs):
        if self.is_current:
            Term.objects.filter(school=self.school, is_current=True).update(is_current=False)
        super().save(*args, **kwargs)


class ClassRoom(SchoolOwnedModel):
    """
    A class e.g. 'JSS1A', 'SS2 Science'.
    Teachers are assigned as form teachers.
    """

    class Level(models.TextChoices):
        JSS1 = "JSS1", "JSS 1"
        JSS2 = "JSS2", "JSS 2"
        JSS3 = "JSS3", "JSS 3"
        SS1 = "SS1", "SS 1"
        SS2 = "SS2", "SS 2"
        SS3 = "SS3", "SS 3"
        # Primary levels — optional
        PRIM1 = "P1", "Primary 1"
        PRIM2 = "P2", "Primary 2"
        PRIM3 = "P3", "Primary 3"
        PRIM4 = "P4", "Primary 4"
        PRIM5 = "P5", "Primary 5"
        PRIM6 = "P6", "Primary 6"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, help_text="Full name e.g. JSS1A")
    level = models.CharField(max_length=10, choices=Level.choices)
    arm = models.CharField(max_length=5, blank=True, help_text="e.g. A, B, Science, Art")
    form_teacher = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="form_classes",
        limit_choices_to={"role": "teacher"},
    )
    capacity = models.PositiveIntegerField(default=40)

    class Meta:
        unique_together = [["school", "name"]]
        ordering = ["level", "arm"]

    def __str__(self):
        return self.name


class Subject(SchoolOwnedModel):
    """
    A subject offered in a class e.g. 'Mathematics' in JSS1A.
    One teacher is assigned per subject-class combination.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10, blank=True, help_text="e.g. MATH, ENG, PHY")
    class_room = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, related_name="subjects")
    teacher = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="subjects_taught",
        limit_choices_to={"role": "teacher"},
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = [["school", "class_room", "name"]]
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} — {self.class_room.name}"


class Enrollment(SchoolOwnedModel):
    """
    Links a student to a class for a specific term.
    One row per student per term. Active enrollment = current class.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        "students.Student",
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    class_room = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, related_name="enrollments")
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name="enrollments")
    is_active = models.BooleanField(default=True)
    enrolled_at = models.DateField(auto_now_add=True)

    class Meta:
        # One enrollment per student per term
        unique_together = [["school", "student", "term"]]
        ordering = ["-term__session__start_date", "student__user__last_name"]

    def __str__(self):
        return f"{self.student.full_name} → {self.class_room.name} ({self.term})"
