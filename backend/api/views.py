import os
import json
import logging
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

try:
    from supabase import create_client
except Exception:
    create_client = None

logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if create_client and SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
else:
    sb = None


def _error(msg, status=400):
    """Helper to return JSON error responses"""
    return JsonResponse({'error': str(msg)}, status=status)


def _success(data, status=200):
    """Helper to return JSON success responses"""
    return JsonResponse({'data': data}, status=status)


def _ensure_client():
    """Verify Supabase client is configured"""
    if sb is None:
        return False, _error('Supabase service client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.', 500)
    return True, None


def _parse_json_body(request):
    """Parse JSON from request body"""
    try:
        if request.body:
            return json.loads(request.body.decode('utf-8'))
        return {}
    except json.JSONDecodeError as e:
        logger.warning(f"JSON decode error: {str(e)}")
        return None


def _validate_seminar_data(data, is_create=False):
    """Validate seminar data"""
    if is_create and not data.get('title'):
        return None, 'title is required'
    
    try:
        if data.get('duration'):
            int(data['duration'])
        if data.get('participants'):
            int(data['participants'])
        if data.get('capacity'):
            int(data['capacity'])
    except (ValueError, TypeError):
        return None, 'duration, participants, and capacity must be valid integers'
    
    return data, None


# ============ Seminars ============

@csrf_exempt
@require_http_methods(["GET", "POST"])
def seminars_list_create(request):
    """GET: list all seminars | POST: create a new seminar"""
    ok, err = _ensure_client()
    if not ok:
        return err

    if request.method == 'GET':
        try:
            res = sb.table('seminars').select('*').order('date').execute()
            return _success(res.data)
        except Exception as e:
            logger.exception("Error fetching seminars")
            return _error(f"Failed to fetch seminars: {str(e)}", 500)

    if request.method == 'POST':
        body = _parse_json_body(request)
        if body is None:
            return _error('Invalid JSON in request body', 400)

        # Validate input
        body, validation_err = _validate_seminar_data(body, is_create=True)
        if validation_err:
            return _error(validation_err, 400)

        try:
            payload = {
                'title': body.get('title'),
                'duration': int(body['duration']) if body.get('duration') else None,
                'speaker': body.get('speaker'),
                'capacity': int(body['participants']) if body.get('participants') else body.get('capacity'),
                'date': body.get('date'),
                'start_datetime': body.get('start_datetime'),
                'end_datetime': body.get('end_datetime'),
                'start_time': body.get('start_time'),
                'end_time': body.get('end_time'),
                'questions': body.get('questions'),
                'metadata': body.get('metadata'),
                'certificate_template_url': body.get('certificate_template_url'),
            }
            res = sb.table('seminars').insert(payload).select('*').execute()
            return _success(res.data, 201)
        except Exception as e:
            logger.exception("Error creating seminar")
            return _error(f"Failed to create seminar: {str(e)}", 500)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def seminar_detail(request, seminar_id):
    """GET: fetch seminar | PUT: update seminar | DELETE: delete seminar"""
    ok, err = _ensure_client()
    if not ok:
        return err

    if not seminar_id or len(seminar_id) == 0:
        return _error('seminar_id is required', 400)

    try:
        if request.method == 'GET':
            try:
                res = sb.table('seminars').select('*').eq('id', seminar_id).single().execute()
                return _success(res.data)
            except Exception as e:
                if 'no rows' in str(e).lower():
                    return _error(f'Seminar {seminar_id} not found', 404)
                raise

        elif request.method == 'PUT':
            body = _parse_json_body(request)
            if body is None:
                return _error('Invalid JSON in request body', 400)

            payload = {
                'title': body.get('title'),
                'duration': int(body['duration']) if body.get('duration') else None,
                'speaker': body.get('speaker'),
                'capacity': int(body['participants']) if body.get('participants') else body.get('capacity'),
                'date': body.get('date'),
                'start_datetime': body.get('start_datetime'),
                'end_datetime': body.get('end_datetime'),
                'start_time': body.get('start_time'),
                'end_time': body.get('end_time'),
                'questions': body.get('questions'),
                'metadata': body.get('metadata'),
                'certificate_template_url': body.get('certificate_template_url'),
                'updated_at': datetime.utcnow().isoformat() + 'Z',
            }
            res = sb.table('seminars').update(payload).eq('id', seminar_id).select('*').execute()
            return _success(res.data)

        elif request.method == 'DELETE':
            try:
                sb.table('seminars').delete().eq('id', seminar_id).execute()
                return JsonResponse({'message': 'Seminar deleted'}, status=204)
            except Exception as e:
                logger.exception(f"Error deleting seminar {seminar_id}")
                return _error(f"Failed to delete seminar: {str(e)}", 500)

    except Exception as e:
        logger.exception(f"Error in seminar_detail for {seminar_id}")
        return _error(f"Operation failed: {str(e)}", 500)


# ============ Attendance (Time In/Out) ============

@csrf_exempt
@require_http_methods(["POST"])
def seminar_time_in(request, seminar_id):
    """Record participant time-in for a seminar"""
    ok, err = _ensure_client()
    if not ok:
        return err

    body = _parse_json_body(request)
    if body is None:
        return _error('Invalid JSON in request body', 400)

    participant_email = body.get('participant_email')
    if not participant_email:
        return _error('participant_email is required', 400)

    try:
        # Check if attendance record exists
        try:
            sel = sb.table('attendance').select('*').eq('seminar_id', seminar_id).eq('participant_email', participant_email).maybe_single().execute()
            existing = sel.data
        except Exception as e:
            logger.warning(f"Attendance table check failed: {str(e)}")
            existing = None

        now_iso = datetime.utcnow().isoformat() + 'Z'

        if not existing:
            # Create new attendance record
            try:
                ins = sb.table('attendance').insert({
                    'seminar_id': seminar_id,
                    'participant_email': participant_email,
                    'time_in': now_iso
                }).select('*').execute()
                return _success(ins.data, 201)
            except Exception as e:
                logger.exception(f"Failed to insert attendance record: {str(e)}")
                return _error(f"Failed to record time-in: {str(e)}", 500)
        else:
            # Update existing record if time_in not set
            if not existing.get('time_in'):
                upd = sb.table('attendance').update({'time_in': now_iso}).eq('id', existing.get('id')).select('*').execute()
                return _success(upd.data)
            return _success(existing)

    except Exception as e:
        logger.exception(f"Error recording time_in for {participant_email}")
        return _error(f"Failed to record time-in: {str(e)}", 500)


@csrf_exempt
@require_http_methods(["POST"])
def seminar_time_out(request, seminar_id):
    """Record participant time-out for a seminar"""
    ok, err = _ensure_client()
    if not ok:
        return err

    body = _parse_json_body(request)
    if body is None:
        return _error('Invalid JSON in request body', 400)

    participant_email = body.get('participant_email')
    if not participant_email:
        return _error('participant_email is required', 400)

    try:
        # Check if attendance record exists
        try:
            sel = sb.table('attendance').select('*').eq('seminar_id', seminar_id).eq('participant_email', participant_email).maybe_single().execute()
            existing = sel.data
        except Exception as e:
            logger.warning(f"Attendance table check failed: {str(e)}")
            existing = None

        now_iso = datetime.utcnow().isoformat() + 'Z'

        if not existing:
            # Create new attendance record with time_out
            try:
                ins = sb.table('attendance').insert({
                    'seminar_id': seminar_id,
                    'participant_email': participant_email,
                    'time_out': now_iso
                }).select('*').execute()
                return _success(ins.data, 201)
            except Exception as e:
                logger.exception(f"Failed to insert attendance record: {str(e)}")
                return _error(f"Failed to record time-out: {str(e)}", 500)
        else:
            # Update existing record if time_out not set
            if not existing.get('time_out'):
                upd = sb.table('attendance').update({'time_out': now_iso}).eq('id', existing.get('id')).select('*').execute()
                return _success(upd.data)
            return _success(existing)

    except Exception as e:
        logger.exception(f"Error recording time_out for {participant_email}")
        return _error(f"Failed to record time-out: {str(e)}", 500)


@csrf_exempt
@require_http_methods(["GET"])
def seminar_attendance_list(request, seminar_id):
    """Get all attendance records for a seminar"""
    ok, err = _ensure_client()
    if not ok:
        return err

    try:
        res = sb.table('attendance').select('*').eq('seminar_id', seminar_id).order('created_at').execute()
        return _success(res.data)
    except Exception as e:
        logger.exception(f"Error fetching attendance for seminar {seminar_id}")
        return _error(f"Failed to fetch attendance: {str(e)}", 500)


# ============ Joined Participants ============

@csrf_exempt
@require_http_methods(["POST"])
def save_joined_participant(request, seminar_id):
    """Register a participant for a seminar"""
    ok, err = _ensure_client()
    if not ok:
        return err

    body = _parse_json_body(request)
    if body is None:
        return _error('Invalid JSON in request body', 400)

    participant_email = body.get('participant_email')
    if not participant_email:
        return _error('participant_email is required', 400)

    try:
        payload = {
            'seminar_id': seminar_id,
            'participant_email': participant_email,
            'participant_name': body.get('participant_name'),
            'metadata': body.get('metadata'),
        }
        res = sb.table('joined_participants').insert(payload).select('*').execute()
        return _success(res.data, 201)
    except Exception as e:
        logger.exception(f"Error saving joined participant for seminar {seminar_id}")
        return _error(f"Failed to save participant: {str(e)}", 500)


@csrf_exempt
@require_http_methods(["GET"])
def joined_participants_list(request, seminar_id):
    """Get all participants who joined a seminar"""
    ok, err = _ensure_client()
    if not ok:
        return err

    try:
        res = sb.table('joined_participants').select('*').eq('seminar_id', seminar_id).order('joined_at').execute()
        return _success(res.data)
    except Exception as e:
        logger.exception(f"Error fetching joined participants for seminar {seminar_id}")
        return _error(f"Failed to fetch participants: {str(e)}", 500)


@csrf_exempt
@require_http_methods(["POST"])
def check_in_participant(request, seminar_id):
    """Mark participant as checked in"""
    ok, err = _ensure_client()
    if not ok:
        return err

    body = _parse_json_body(request)
    if body is None:
        return _error('Invalid JSON in request body', 400)

    participant_email = body.get('participant_email')
    if not participant_email:
        return _error('participant_email is required', 400)

    try:
        payload = {
            'present': True,
            'check_in': datetime.utcnow().isoformat() + 'Z'
        }
        res = sb.table('joined_participants').update(payload).eq('seminar_id', seminar_id).eq('participant_email', participant_email).select('*').execute()
        if not res.data:
            return _error('Participant not found for this seminar', 404)
        return _success(res.data)
    except Exception as e:
        logger.exception(f"Error checking in participant {participant_email}")
        return _error(f"Failed to check in participant: {str(e)}", 500)


@csrf_exempt
@require_http_methods(["POST"])
def check_out_participant(request, seminar_id):
    """Mark participant as checked out"""
    ok, err = _ensure_client()
    if not ok:
        return err

    body = _parse_json_body(request)
    if body is None:
        return _error('Invalid JSON in request body', 400)

    participant_email = body.get('participant_email')
    if not participant_email:
        return _error('participant_email is required', 400)

    try:
        payload = {
            'present': False,
            'check_out': datetime.utcnow().isoformat() + 'Z'
        }
        res = sb.table('joined_participants').update(payload).eq('seminar_id', seminar_id).eq('participant_email', participant_email).select('*').execute()
        if not res.data:
            return _error('Participant not found for this seminar', 404)
        return _success(res.data)
    except Exception as e:
        logger.exception(f"Error checking out participant {participant_email}")
        return _error(f"Failed to check out participant: {str(e)}", 500)


# ============ Evaluations ============

@csrf_exempt
@require_http_methods(["POST"])
def save_evaluation(request, seminar_id):
    """Save evaluation responses for a participant"""
    ok, err = _ensure_client()
    if not ok:
        return err

    body = _parse_json_body(request)
    if body is None:
        return _error('Invalid JSON in request body', 400)

    participant_email = body.get('participant_email')
    answers = body.get('answers')

    if not participant_email:
        return _error('participant_email is required', 400)
    if answers is None:
        return _error('answers are required', 400)

    try:
        payload = {
            'seminar_id': seminar_id,
            'participant_email': participant_email,
            'answers': answers,
        }
        res = sb.table('evaluations').insert(payload).select('*').execute()
        return _success(res.data, 201)
    except Exception as e:
        logger.exception(f"Error saving evaluation for {participant_email}")
        return _error(f"Failed to save evaluation: {str(e)}", 500)


@csrf_exempt
@require_http_methods(["GET"])
def fetch_evaluations(request, seminar_id):
    """Fetch evaluations for a seminar, optionally filtered by participant email"""
    ok, err = _ensure_client()
    if not ok:
        return err

    participant_email = request.GET.get('participant_email')

    try:
        query = sb.table('evaluations').select('*').eq('seminar_id', seminar_id)
        if participant_email:
            query = query.eq('participant_email', participant_email)
        res = query.execute()
        return _success(res.data)
    except Exception as e:
        logger.exception(f"Error fetching evaluations for seminar {seminar_id}")
        return _error(f"Failed to fetch evaluations: {str(e)}", 500)


@csrf_exempt
@require_http_methods(["GET"])
def has_evaluated(request, seminar_id):
    """Check if a participant has already evaluated"""
    ok, err = _ensure_client()
    if not ok:
        return err

    participant_email = request.GET.get('participant_email')
    if not participant_email:
        return _error('participant_email query parameter is required', 400)

    try:
        res = sb.table('evaluations').select('id').eq('seminar_id', seminar_id).eq('participant_email', participant_email).single().execute()
        evaluated = bool(res.data)
        return JsonResponse({'evaluated': evaluated})
    except Exception as e:
        # No rows found is expected, not an error
        error_str = str(e).lower()
        if 'no rows' in error_str or 'single' in error_str:
            return JsonResponse({'evaluated': False})
        logger.exception(f"Error checking evaluation for {participant_email}")
        return _error(f"Failed to check evaluation status: {str(e)}", 500)


# ============ Seminars ============

@csrf_exempt
@require_http_methods(["GET", "POST"])
def seminars_list_create(request):
    """GET: list all seminars | POST: create a new seminar"""
    ok, err = _ensure_client()
    if not ok:
        return err

    if request.method == 'GET':
        try:
            res = sb.table('seminars').select('*').order('date').execute()
            return _success(res.data)
        except Exception as e:
            logger.exception("Error fetching seminars")
            return _error(f"Failed to fetch seminars: {str(e)}", 500)

    if request.method == 'POST':
        body = _parse_json_body(request)
        if body is None:
            return _error('Invalid JSON in request body', 400)

        try:
            payload = {
                'title': body.get('title'),
                'duration': int(body['duration']) if body.get('duration') else None,
                'speaker': body.get('speaker'),
                'capacity': int(body['participants']) if body.get('participants') else body.get('capacity'),
                'date': body.get('date'),
                'start_datetime': body.get('start_datetime'),
                'end_datetime': body.get('end_datetime'),
                'start_time': body.get('start_time'),
                'end_time': body.get('end_time'),
                'questions': body.get('questions'),
                'metadata': body.get('metadata'),
                'certificate_template_url': body.get('certificate_template_url'),
            }
            res = sb.table('seminars').insert(payload).select('*').execute()
            return _success(res.data, 201)
        except Exception as e:
            logger.exception("Error creating seminar")
            return _error(f"Failed to create seminar: {str(e)}", 500)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def seminar_detail(request, seminar_id):
    """GET: fetch seminar | PUT: update seminar | DELETE: delete seminar"""
    ok, err = _ensure_client()
    if not ok:
        return err

    try:
        if request.method == 'GET':
            res = sb.table('seminars').select('*').eq('id', seminar_id).single().execute()
            return _success(res.data)

        elif request.method == 'PUT':
            body = _parse_json_body(request)
            if body is None:
                return _error('Invalid JSON in request body', 400)

            payload = {
                'title': body.get('title'),
                'duration': int(body['duration']) if body.get('duration') else None,
                'speaker': body.get('speaker'),
                'capacity': int(body['participants']) if body.get('participants') else body.get('capacity'),
                'date': body.get('date'),
                'start_datetime': body.get('start_datetime'),
                'end_datetime': body.get('end_datetime'),
                'start_time': body.get('start_time'),
                'end_time': body.get('end_time'),
                'questions': body.get('questions'),
                'metadata': body.get('metadata'),
                'certificate_template_url': body.get('certificate_template_url'),
                'updated_at': datetime.utcnow().isoformat() + 'Z',
            }
            res = sb.table('seminars').update(payload).eq('id', seminar_id).select('*').execute()
            return _success(res.data)

        elif request.method == 'DELETE':
            sb.table('seminars').delete().eq('id', seminar_id).execute()
            return JsonResponse({'message': 'Seminar deleted'}, status=204)

    except Exception as e:
        logger.exception(f"Error in seminar_detail for {seminar_id}")
        return _error(f"Operation failed: {str(e)}", 500)


# ============ Attendance (Time In/Out) ============

@csrf_exempt
@require_http_methods(["POST"])
def seminar_time_in(request, seminar_id):
    """Record participant time-in for a seminar"""
    ok, err = _ensure_client()
    if not ok:
        return err

    body = _parse_json_body(request)
    if body is None:
        return _error('Invalid JSON in request body', 400)

    participant_email = body.get('participant_email')
    if not participant_email:
        return _error('participant_email is required', 400)

    try:
        # Check if attendance record exists
        sel = sb.table('attendance').select('*').eq('seminar_id', seminar_id).eq('participant_email', participant_email).maybe_single().execute()
        existing = sel.data

        now_iso = datetime.utcnow().isoformat() + 'Z'

        if not existing:
            # Create new attendance record
            ins = sb.table('attendance').insert({
                'seminar_id': seminar_id,
                'participant_email': participant_email,
                'time_in': now_iso
            }).select('*').execute()
            return _success(ins.data, 201)
        else:
            # Update existing record if time_in not set
            if not existing.get('time_in'):
                upd = sb.table('attendance').update({'time_in': now_iso}).eq('id', existing.get('id')).select('*').execute()
                return _success(upd.data)
            return _success(existing)

    except Exception as e:
        logger.exception(f"Error recording time_in for {participant_email}")
        return _error(f"Failed to record time-in: {str(e)}", 500)


@csrf_exempt
@require_http_methods(["POST"])
def seminar_time_out(request, seminar_id):
    """Record participant time-out for a seminar"""
    ok, err = _ensure_client()
    if not ok:
        return err

    body = _parse_json_body(request)
    if body is None:
        return _error('Invalid JSON in request body', 400)

    participant_email = body.get('participant_email')
    if not participant_email:
        return _error('participant_email is required', 400)

    try:
        # Check if attendance record exists
        sel = sb.table('attendance').select('*').eq('seminar_id', seminar_id).eq('participant_email', participant_email).maybe_single().execute()
        existing = sel.data

        now_iso = datetime.utcnow().isoformat() + 'Z'

        if not existing:
            # Create new attendance record with time_out
            ins = sb.table('attendance').insert({
                'seminar_id': seminar_id,
                'participant_email': participant_email,
                'time_out': now_iso
            }).select('*').execute()
            return _success(ins.data, 201)
        else:
            # Update existing record if time_out not set
            if not existing.get('time_out'):
                upd = sb.table('attendance').update({'time_out': now_iso}).eq('id', existing.get('id')).select('*').execute()
                return _success(upd.data)
            return _success(existing)

    except Exception as e:
        logger.exception(f"Error recording time_out for {participant_email}")
        return _error(f"Failed to record time-out: {str(e)}", 500)


@csrf_exempt
@require_http_methods(["GET"])
def seminar_attendance_list(request, seminar_id):
    """Get all attendance records for a seminar"""
    ok, err = _ensure_client()
    if not ok:
        return err

    try:
        res = sb.table('attendance').select('*').eq('seminar_id', seminar_id).order('created_at').execute()
        return _success(res.data)
    except Exception as e:
        logger.exception(f"Error fetching attendance for seminar {seminar_id}")
        return _error(f"Failed to fetch attendance: {str(e)}", 500)


# ============ Joined Participants ============

@csrf_exempt
@require_http_methods(["POST"])
def save_joined_participant(request, seminar_id):
    """Register a participant for a seminar"""
    ok, err = _ensure_client()
    if not ok:
        return err

    body = _parse_json_body(request)
    if body is None:
        return _error('Invalid JSON in request body', 400)

    try:
        payload = {
            'seminar_id': seminar_id,
            'participant_email': body.get('participant_email'),
            'participant_name': body.get('participant_name'),
            'metadata': body.get('metadata'),
        }
        res = sb.table('joined_participants').insert(payload).select('*').execute()
        return _success(res.data, 201)
    except Exception as e:
        logger.exception(f"Error saving joined participant for seminar {seminar_id}")
        return _error(f"Failed to save participant: {str(e)}", 500)


@csrf_exempt
@require_http_methods(["GET"])
def joined_participants_list(request, seminar_id):
    """Get all participants who joined a seminar"""
    ok, err = _ensure_client()
    if not ok:
        return err

    try:
        res = sb.table('joined_participants').select('*').eq('seminar_id', seminar_id).order('joined_at').execute()
        return _success(res.data)
    except Exception as e:
        logger.exception(f"Error fetching joined participants for seminar {seminar_id}")
        return _error(f"Failed to fetch participants: {str(e)}", 500)


@csrf_exempt
@require_http_methods(["POST"])
def check_in_participant(request, seminar_id):
    """Mark participant as checked in"""
    ok, err = _ensure_client()
    if not ok:
        return err

    body = _parse_json_body(request)
    if body is None:
        return _error('Invalid JSON in request body', 400)

    participant_email = body.get('participant_email')
    if not participant_email:
        return _error('participant_email is required', 400)

    try:
        payload = {
            'present': True,
            'check_in': datetime.utcnow().isoformat() + 'Z'
        }
        res = sb.table('joined_participants').update(payload).eq('seminar_id', seminar_id).eq('participant_email', participant_email).select('*').execute()
        return _success(res.data)
    except Exception as e:
        logger.exception(f"Error checking in participant {participant_email}")
        return _error(f"Failed to check in participant: {str(e)}", 500)


@csrf_exempt
@require_http_methods(["POST"])
def check_out_participant(request, seminar_id):
    """Mark participant as checked out"""
    ok, err = _ensure_client()
    if not ok:
        return err

    body = _parse_json_body(request)
    if body is None:
        return _error('Invalid JSON in request body', 400)

    participant_email = body.get('participant_email')
    if not participant_email:
        return _error('participant_email is required', 400)

    try:
        payload = {
            'present': False,
            'check_out': datetime.utcnow().isoformat() + 'Z'
        }
        res = sb.table('joined_participants').update(payload).eq('seminar_id', seminar_id).eq('participant_email', participant_email).select('*').execute()
        return _success(res.data)
    except Exception as e:
        logger.exception(f"Error checking out participant {participant_email}")
        return _error(f"Failed to check out participant: {str(e)}", 500)


# ============ Evaluations ============

@csrf_exempt
@require_http_methods(["POST"])
def save_evaluation(request, seminar_id):
    """Save evaluation responses for a participant"""
    ok, err = _ensure_client()
    if not ok:
        return err

    body = _parse_json_body(request)
    if body is None:
        return _error('Invalid JSON in request body', 400)

    participant_email = body.get('participant_email')
    answers = body.get('answers')

    if not participant_email or answers is None:
        return _error('participant_email and answers are required', 400)

    try:
        payload = {
            'seminar_id': seminar_id,
            'participant_email': participant_email,
            'answers': answers,
        }
        res = sb.table('evaluations').insert(payload).select('*').execute()
        return _success(res.data, 201)
    except Exception as e:
        logger.exception(f"Error saving evaluation for {participant_email}")
        return _error(f"Failed to save evaluation: {str(e)}", 500)


@csrf_exempt
@require_http_methods(["GET"])
def fetch_evaluations(request, seminar_id):
    """Fetch evaluations for a seminar, optionally filtered by participant email"""
    ok, err = _ensure_client()
    if not ok:
        return err

    participant_email = request.GET.get('participant_email')

    try:
        query = sb.table('evaluations').select('*').eq('seminar_id', seminar_id)
        if participant_email:
            query = query.eq('participant_email', participant_email)
        res = query.execute()
        return _success(res.data)
    except Exception as e:
        logger.exception(f"Error fetching evaluations for seminar {seminar_id}")
        return _error(f"Failed to fetch evaluations: {str(e)}", 500)


@csrf_exempt
@require_http_methods(["GET"])
def has_evaluated(request, seminar_id):
    """Check if a participant has already evaluated"""
    ok, err = _ensure_client()
    if not ok:
        return err

    participant_email = request.GET.get('participant_email')
    if not participant_email:
        return _error('participant_email query parameter is required', 400)

    try:
        res = sb.table('evaluations').select('id').eq('seminar_id', seminar_id).eq('participant_email', participant_email).single().execute()
        evaluated = bool(res.data)
        return JsonResponse({'evaluated': evaluated})
    except Exception as e:
        # No rows found is expected, not an error
        if 'single() call returned no rows' in str(e).lower():
            return JsonResponse({'evaluated': False})
        logger.exception(f"Error checking evaluation for {participant_email}")
        return _error(f"Failed to check evaluation status: {str(e)}", 500)
