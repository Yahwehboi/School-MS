from rest_framework import serializers


class SchoolFilteredPrimaryKeyField(serializers.PrimaryKeyRelatedField):
    """
    A relational field that automatically scopes its queryset to the
    current request's school. Use this instead of bare PrimaryKeyRelatedField
    to prevent cross-school data leakage.

    Usage:
        class_room = SchoolFilteredPrimaryKeyField(queryset=Class.objects)
    """
    def get_queryset(self):
        request = self.context.get("request")
        qs = super().get_queryset()
        if request and request.school:
            qs = qs.filter(school=request.school)
        return qs
