import uuid
from django.db import models
from apps.core.models import SchoolOwnedModel


class Announcement(SchoolOwnedModel):
    """
    School-wide or targeted announcements.
    Can target all roles, or specific audiences.
    """

    class Audience(models.TextChoices):
        ALL = "all", "Everyone"
        TEACHERS = "teachers", "Teachers Only"
        STUDENTS = "students", "Students Only"
        ADMIN = "admin", "Admin Only"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    body = models.TextField()
    audience = models.CharField(max_length=20, choices=Audience.choices, default=Audience.ALL)
    is_pinned = models.BooleanField(default=False, help_text="Pinned announcements appear at the top")
    author = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="announcements",
    )
    # Optional: target a specific class
    target_class = models.ForeignKey(
        "academics.ClassRoom",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="announcements",
        help_text="Leave blank to broadcast school-wide",
    )
    published_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-is_pinned", "-published_at"]
        indexes = [models.Index(fields=["school", "audience", "-published_at"])]

    def __str__(self):
        return f"[{self.get_audience_display()}] {self.title}"
