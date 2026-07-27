const db = require('../config/db');

async function getQuestionsByEvent(eventId) {
  const { data, error } = await db.from('feedback_questions').select('*').eq('event_id', eventId).order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

async function createQuestion(eventId, { question, type, sort_order }) {
  const { data, error } = await db.from('feedback_questions').insert({
    event_id: eventId,
    question,
    type: type || 'rating',
    sort_order: parseInt(sort_order) || 0,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteQuestion(id) {
  await db.from('feedback_responses').delete().eq('question_id', id);
  const { error } = await db.from('feedback_questions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

async function submitResponse(eventId, questionId, { rating, text_response, respondent_email }) {
  const { data, error } = await db.from('feedback_responses').insert({
    event_id: eventId,
    question_id: questionId,
    rating: rating ? parseInt(rating) : null,
    text_response: text_response || null,
    respondent_email: respondent_email || null,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function getResponsesByEvent(eventId) {
  const { data, error } = await db.from('feedback_responses').select('*').eq('event_id', eventId);
  if (error) throw new Error(error.message);
  return data;
}

async function getAggregatedResults(eventId) {
  const questions = await getQuestionsByEvent(eventId);
  const responses = await getResponsesByEvent(eventId);

  return questions.map(q => {
    const qResponses = responses.filter(r => r.question_id === q.id);
    if (q.type === 'rating') {
      const ratings = qResponses.filter(r => r.rating != null).map(r => r.rating);
      const avg = ratings.length > 0 ? (ratings.reduce((s, r) => s + r, 0) / ratings.length) : null;
      return { ...q, count: qResponses.length, avgRating: avg ? avg.toFixed(1) : null };
    } else {
      const texts = qResponses.filter(r => r.text_response).map(r => r.text_response);
      return { ...q, count: qResponses.length, texts };
    }
  });
}

module.exports = { getQuestionsByEvent, createQuestion, deleteQuestion, submitResponse, getResponsesByEvent, getAggregatedResults };
