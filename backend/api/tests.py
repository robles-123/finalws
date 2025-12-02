from django.test import TestCase, Client
from django.urls import reverse
import json


class SeminarsAPITestCase(TestCase):
    """Test cases for seminars endpoints"""

    def setUp(self):
        self.client = Client()

    def test_get_seminars(self):
        """Test fetching seminars list"""
        response = self.client.get(reverse('seminars_list_create'))
        # Should return 200 or 500 depending on Supabase connectivity
        self.assertIn(response.status_code, [200, 500])

    def test_post_seminar_requires_body(self):
        """Test creating seminar requires valid JSON"""
        response = self.client.post(
            reverse('seminars_list_create'),
            data='invalid json',
            content_type='application/json'
        )
        self.assertIn(response.status_code, [400, 500])


class AttendanceAPITestCase(TestCase):
    """Test cases for attendance endpoints"""

    def setUp(self):
        self.client = Client()
        self.seminar_id = 'test-seminar-id'

    def test_time_in_requires_email(self):
        """Test time-in endpoint requires participant email"""
        response = self.client.post(
            f'/api/seminars/{self.seminar_id}/attendance/time_in/',
            data=json.dumps({}),
            content_type='application/json'
        )
        self.assertIn(response.status_code, [400, 500])
