import { supabase } from './supabaseClient';

// Backend API base URL - use environment variable or fallback to localhost
const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

// Helper function for API calls
async function apiCall(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const json = await response.json();
    
    if (!response.ok) {
      return { data: null, error: json.error || 'API request failed' };
    }
    return { data: json.data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

// ============ Seminars ============

export async function fetchSeminars() {
  return apiCall('/seminars/');
}

export async function createSeminar(seminar) {
  const payload = {
    title: seminar.title,
    duration: seminar.duration ? parseInt(seminar.duration, 10) : null,
    speaker: seminar.speaker || null,
    participants: seminar.participants ? parseInt(seminar.participants, 10) : seminar.capacity || null,
    date: seminar.date || null,
    start_datetime: seminar.start_datetime || null,
    end_datetime: seminar.end_datetime || null,
    start_time: seminar.start_time || null,
    end_time: seminar.end_time || null,
    questions: seminar.questions || null,
    metadata: seminar.metadata || null,
    certificate_template_url: seminar.certificate_template_url || null,
  };
  return apiCall('/seminars/', 'POST', payload);
}

export async function upsertSeminar(seminar) {
  const payload = {
    title: seminar.title,
    duration: seminar.duration ? parseInt(seminar.duration, 10) : null,
    speaker: seminar.speaker || null,
    participants: seminar.participants ? parseInt(seminar.participants, 10) : seminar.capacity || null,
    date: seminar.date || null,
    start_datetime: seminar.start_datetime || null,
    end_datetime: seminar.end_datetime || null,
    start_time: seminar.start_time || null,
    end_time: seminar.end_time || null,
    questions: seminar.questions || null,
    metadata: seminar.metadata || null,
    certificate_template_url: seminar.certificate_template_url || null,
  };
  return apiCall(`/seminars/${seminar.id}/`, 'PUT', payload);
}

export async function deleteSeminar(id) {
  return apiCall(`/seminars/${id}/`, 'DELETE');
}

// ============ Attendance ============

export async function recordTimeIn(seminarId, participant_email) {
  return apiCall(
    `/seminars/${seminarId}/attendance/time_in/`,
    'POST',
    { participant_email }
  );
}

export async function recordTimeOut(seminarId, participant_email) {
  return apiCall(
    `/seminars/${seminarId}/attendance/time_out/`,
    'POST',
    { participant_email }
  );
}

export async function fetchAttendance(seminarId) {
  return apiCall(`/seminars/${seminarId}/attendance/`);
}

// ============ Joined Participants ============

export async function saveJoinedParticipant(seminarId, participant) {
  const payload = {
    participant_email: participant.participant_email,
    participant_name: participant.participant_name || null,
    metadata: participant.metadata || null,
  };
  return apiCall(
    `/seminars/${seminarId}/participants/join/`,
    'POST',
    payload
  );
}

export async function fetchJoinedParticipants(seminarId) {
  return apiCall(`/seminars/${seminarId}/participants/`);
}

export async function checkInParticipant(seminarId, participant_email) {
  return apiCall(
    `/seminars/${seminarId}/participants/check_in/`,
    'POST',
    { participant_email }
  );
}

export async function checkOutParticipant(seminarId, participant_email) {
  return apiCall(
    `/seminars/${seminarId}/participants/check_out/`,
    'POST',
    { participant_email }
  );
}

// ============ Evaluations ============

export async function fetchEvaluations(seminarId, participant_email = null) {
  const endpoint = participant_email 
    ? `/seminars/${seminarId}/evaluations/?participant_email=${participant_email}`
    : `/seminars/${seminarId}/evaluations/`;
  return apiCall(endpoint);
}

export async function hasEvaluated(seminarId, participant_email) {
  try {
    const endpoint = `/seminars/${seminarId}/evaluations/check/?participant_email=${participant_email}`;
    const response = await fetch(`${API_BASE}${endpoint}`);
    const json = await response.json();
    return { evaluated: json.evaluated, error: null };
  } catch (error) {
    return { evaluated: false, error: error.message };
  }
}

export async function saveEvaluation(seminarId, participant_email, answers) {
  return apiCall(
    `/seminars/${seminarId}/evaluations/submit/`,
    'POST',
    { participant_email, answers }
  );
}

// ============ Certificate Upload (Supabase Storage) ============

export async function uploadCertificateTemplate(seminarId, file) {
  // File uploads still use Supabase storage
  const filePath = `certificate_templates/seminar_${seminarId}_${Date.now()}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('certificate-templates')
    .upload(filePath, file, { cacheControl: '3600', upsert: true });

  if (uploadError) return { data: null, error: uploadError };

  const { publicURL, error: urlError } = supabase.storage
    .from('certificate-templates')
    .getPublicUrl(uploadData.path);

  if (urlError) return { data: null, error: urlError };

  return { data: { url: publicURL }, error: null };
}

// ============ Bulk Operations ============

export async function saveAllSeminars(seminars) {
  if (!Array.isArray(seminars)) {
    return { data: null, error: 'seminars must be an array' };
  }
  
  // For bulk operations, create each seminar individually
  const results = await Promise.all(
    seminars.map(s => s.id ? upsertSeminar(s) : createSeminar(s))
  );
  
  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    return { data: null, error: `Failed to save ${errors.length} seminars` };
  }
  
  return { data: results.map(r => r.data).flat(), error: null };
}

export default {
  fetchSeminars,
  createSeminar,
  upsertSeminar,
  recordTimeIn,
  recordTimeOut,
  fetchAttendance,
  deleteSeminar,
  saveJoinedParticipant,
  fetchJoinedParticipants,
  fetchEvaluations,
  hasEvaluated,
  uploadCertificateTemplate,
  saveEvaluation,
  saveAllSeminars,
  checkInParticipant,
  checkOutParticipant,
};
