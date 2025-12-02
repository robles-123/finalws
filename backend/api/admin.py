# Django admin configuration (future use)
from django.contrib import admin
from .models import ApiLog


@admin.register(ApiLog)
class ApiLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'endpoint', 'method', 'status_code')
    list_filter = ('method', 'status_code', 'timestamp')
    search_fields = ('endpoint',)
    readonly_fields = ('timestamp',)
