import { supabase } from './supabaseClient';

// Helper functions for saving/fetching data to Supabase

export async function fetchSeminars() {
  const { data, error } = await supabase
  .from('seminars')
  .select('*')
  .order('date', { ascending: true });
  return { data, error };
}

export async function createSeminar(seminar) {
  // seminar: { title, duration, speaker, capacity, date, questions }
  const payload = {
    title: seminar.title,
    duration: seminar.duration ? parseInt(seminar.duration, 10) : null,
    speaker: seminar.speaker || null,
    capacity: seminar.participants ? parseInt(seminar.participants, 10) : seminar.capacity || null,
    date: seminar.date || null,
    start_datetime: seminar.start_datetime || null,
    end_datetime: seminar.end_datetime || null,
    start_time: seminar.start_time || null,
    end_time: seminar.end_time || null,
    questions: seminar.questions || null,
    metadata: seminar.metadata || null,
    certificate_template_url: seminar.certificate_template_url || null,
  };

  const { data, error } = await supabase.from('seminars').insert(payload).select();
  return { data, error };
}

export function addSeminarStatus(seminars) {
  const now = new Date();

  return seminars.map(seminar => {
    const start = new Date(seminar.start_time);
    const end = new Date(seminar.end_time);

    let status = "Upcoming";
    if (now >= start && now <= end) status = "Ongoing";
    if (now > end) status = "Finished";

    return { ...seminar, status };
  });
}


export async function upsertSeminar(seminar) {
  // requires seminar.id if updating
  const payload = {
    id: seminar.id,
    title: seminar.title,
    duration: seminar.duration ? parseInt(seminar.duration, 10) : null,
    speaker: seminar.speaker || null,
    capacity: seminar.participants ? parseInt(seminar.participants, 10) : seminar.capacity || null,
    date: seminar.date || null,
    start_datetime: seminar.start_datetime || null,
    end_datetime: seminar.end_datetime || null,
    questions: seminar.questions || null,
    metadata: seminar.metadata || null,
    certificate_template_url: seminar.certificate_template_url || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('seminars').upsert(payload).select();
  return { data, error };
}

export async function recordTimeIn(seminarId, participant_email) {
  // upsert: if record doesn't exist create with time_in; if exists and time_out null, keep time_in
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('attendance')
    .upsert({ seminar_id: seminarId, participant_email, time_in: now }, { onConflict: ['seminar_id', 'participant_email'] })
    .select();
  return { data, error };
}

export async function recordTimeOut(seminarId, participant_email) {
  const now = new Date().toISOString();
  // update time_out for the existing attendance row
  const { data, error } = await supabase
    .from('attendance')
    .update({ time_out: now })
    .eq('seminar_id', seminarId)
    .eq('participant_email', participant_email)
    .select();
  return { data, error };
}

export async function fetchAttendance(seminarId) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('seminar_id', seminarId)
    .order('created_at', { ascending: true });
  return { data, error };
}

export async function deleteSeminar(id) {
  const { data, error } = await supabase.from('seminars').delete().eq('id', id);
  return { data, error };
}

export async function saveJoinedParticipant(seminarId, participant) {
  // participant: { participant_email, participant_name, metadata }
  const payload = {
    seminar_id: seminarId,
    participant_email: participant.participant_email || null,
    participant_name: participant.participant_name || null,
    metadata: participant.metadata || null,
  };

  try {
    const res = await supabase.from('joined_participants').insert(payload).select();
    console.log('saveJoinedParticipant result:', res);
    return res;
  } catch (err) {
    console.error('saveJoinedParticipant unexpected error:', err);
    return { data: null, error: err };
  }
}

export async function fetchJoinedParticipants(seminarId) {
  const { data, error } = await supabase.from('joined_participants').select('*').eq('seminar_id', seminarId).order('joined_at', { ascending: true });
  return { data, error };
}

export async function fetchEvaluations(seminarId, participant_email) {
  try {
    const query = supabase.from('evaluations').select('*').eq('seminar_id', seminarId);
    if (participant_email) query.eq('participant_email', participant_email);
    const res = await query;
    console.log('fetchEvaluations result:', res);
    return res;
  } catch (err) {
    console.error('fetchEvaluations unexpected error:', err);
    return { data: null, error: err };
  }
}

export async function hasEvaluated(seminarId, participant_email) {
  const { data, error } = await supabase
    .from('evaluations')
    .select('id')
    .eq('seminar_id', seminarId)
    .eq('participant_email', participant_email)
    .single();
  if (error && error.code === 'PGRST116') { // no rows
    return { evaluated: false, error: null };
  }
  return { evaluated: !!data, error };
}

export async function uploadCertificateTemplate(seminarId, file) {
  // file is a File object from input[type=file]
  const filePath = `certificate_templates/seminar_${seminarId}_${Date.now()}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('certificate-templates')
    .upload(filePath, file, { cacheControl: '3600', upsert: true });

  if (uploadError) return { data: null, error: uploadError };

  const { publicURL, error: urlError } = supabase.storage
    .from('certificate-templates')
    .getPublicUrl(uploadData.path);

  if (urlError) return { data: null, error: urlError };

  // update seminar record with template URL
  const { data, error } = await supabase
    .from('seminars')
    .update({ certificate_template_url: publicURL })
    .eq('id', seminarId)
    .select();

  return { data, error };
}

export async function saveEvaluation(seminarId, participant_email, answers) {
  const payload = {
    seminar_id: seminarId,
    participant_email,
    answers,
  };
  try {
    const res = await supabase.from('evaluations').insert(payload).select();
    console.log('saveEvaluation result:', res);
    return res;
  } catch (err) {
    console.error('saveEvaluation unexpected error:', err);
    return { data: null, error: err };
  }
}

export async function checkInParticipant(seminarId, participant_email) {
  try {
    const payload = { present: true, check_in: new Date().toISOString() };
    const res = await supabase
      .from('joined_participants')
      .update(payload)
      .eq('seminar_id', seminarId)
      .eq('participant_email', participant_email)
      .select();
    console.log('checkInParticipant result:', res);
    return res;
  } catch (err) {
    console.error('checkInParticipant unexpected error:', err);
    return { data: null, error: err };
  }
}

export async function checkOutParticipant(seminarId, participant_email) {
  try {
    const payload = { present: false, check_out: new Date().toISOString() };
    const res = await supabase
      .from('joined_participants')
      .update(payload)
      .eq('seminar_id', seminarId)
      .eq('participant_email', participant_email)
      .select();
    console.log('checkOutParticipant result:', res);
    return res;
  } catch (err) {
    console.error('checkOutParticipant unexpected error:', err);
    return { data: null, error: err };
  }
}

export async function saveAllSeminars(seminars) {
  // Bulk upsert of seminars array. Each seminar may include id for update.
  if (!Array.isArray(seminars)) return { data: null, error: new Error('seminars must be an array') };

  const payload = seminars.map(s => ({
    id: s.id,
    title: s.title,
    duration: s.duration ? parseInt(s.duration, 10) : null,
    speaker: s.speaker || null,
    capacity: s.participants ? parseInt(s.participants, 10) : s.capacity || null,
    date: s.date || null,
    questions: s.questions || null,
    metadata: s.metadata || null,
  }));

  const { data, error } = await supabase.from('seminars').upsert(payload).select();
  return { data, error };
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
