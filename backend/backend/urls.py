from django.urls import path, include
from django.http import JsonResponse


def root_view(request):
    """Root endpoint - API status"""
    return JsonResponse({
        'message': 'VPAA Seminar Management API',
        'version': '1.0',
        'status': 'running',
        'endpoints': {
            'seminars': '/api/seminars/',
            'attendance': '/api/seminars/<id>/attendance/',
            'participants': '/api/seminars/<id>/participants/',
            'evaluations': '/api/seminars/<id>/evaluations/',
        }
    })


urlpatterns = [
    path('', root_view, name='root'),
    path('api/', include('api.urls')),
]
