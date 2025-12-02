# Models placeholder for future Django ORM usage
# Currently, this project uses Supabase directly via the Python client
# These models can be used later if migrating to Django ORM

from django.db import models


class ApiLog(models.Model):
    """Optional: log API requests for debugging"""
    timestamp = models.DateTimeField(auto_now_add=True)
    endpoint = models.CharField(max_length=255)
    method = models.CharField(max_length=10)
    status_code = models.IntegerField()
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-timestamp']
