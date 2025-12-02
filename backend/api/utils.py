# Utility functions for the API
import os
from supabase import create_client

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')


def get_supabase_client():
    """Get or create Supabase client instance"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError('Missing Supabase credentials in environment')
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def sanitize_response(data):
    """Sanitize response data before sending to client"""
    if isinstance(data, dict):
        # Remove sensitive fields if any
        return {k: v for k, v in data.items() if not k.startswith('_')}
    elif isinstance(data, list):
        return [sanitize_response(item) for item in data]
    return data


def paginate(queryset, page=1, page_size=20):
    """Simple pagination helper"""
    start = (page - 1) * page_size
    end = start + page_size
    return queryset[start:end]
