# Serializers for request/response validation and transformation

class SeminarSerializer:
    @staticmethod
    def validate_create(data):
        """Validate seminar creation data"""
        if not data.get('title'):
            return None, 'title is required'
        return data, None

    @staticmethod
    def validate_update(data):
        """Validate seminar update data"""
        # Update is optional, so just validate types
        if data.get('duration') and not isinstance(data['duration'], (int, str)):
            return None, 'duration must be a number'
        return data, None


class AttendanceSerializer:
    @staticmethod
    def validate_time_record(data):
        """Validate time in/out data"""
        if not data.get('participant_email'):
            return None, 'participant_email is required'
        return data, None


class ParticipantSerializer:
    @staticmethod
    def validate_join(data):
        """Validate participant join data"""
        if not data.get('participant_email'):
            return None, 'participant_email is required'
        return data, None

    @staticmethod
    def validate_check_in(data):
        """Validate check-in data"""
        if not data.get('participant_email'):
            return None, 'participant_email is required'
        return data, None


class EvaluationSerializer:
    @staticmethod
    def validate_submit(data):
        """Validate evaluation submission"""
        if not data.get('participant_email'):
            return None, 'participant_email is required'
        if data.get('answers') is None:
            return None, 'answers are required'
        return data, None
