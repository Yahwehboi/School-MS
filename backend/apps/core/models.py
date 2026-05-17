import uuid
from django.db import models


class School(models.Model):
    """
    The root tenant model. Every other model links back to this.
    One school = one isolated dataset.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    subdomain = models.SlugField(max_length=100, unique=True, help_text="e.g. 'greenfield' → greenfield.schoolms.app")
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    logo = models.ImageField(upload_to="school_logos/", blank=True, null=True)
    website = models.URLField(blank=True)

    # Customization — stored as JSON for flexibility
    settings = models.JSONField(default=dict, blank=True, help_text="School-specific config (colors, report card layout, etc.)")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class TimeStampedModel(models.Model):
    """
    Abstract base for all models that need audit timestamps.
    Inherit from this instead of models.Model.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SchoolOwnedModel(TimeStampedModel):
    """
    Abstract base for all models that belong to a school.
    Adds school FK + a scoped manager automatically.
    """
    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_set",
    )

    class Meta:
        abstract = True
