import { supabase } from './supabaseClient';

// Helper functions for saving/fetching data to Supabase

export async function fetchSeminars() {
  const { data, error } = await supabase.from('seminars').select('*').order('date', { ascending: true });
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
    questions: seminar.questions || null,
    metadata: seminar.metadata || null,
  };

  const { data, error } = await supabase.from('seminars').insert(payload).select();
  return { data, error };
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
    questions: seminar.questions || null,
    metadata: seminar.metadata || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('seminars').upsert(payload).select();
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
  deleteSeminar,
  saveJoinedParticipant,
  fetchJoinedParticipants,
  saveEvaluation,
  saveAllSeminars,
};
