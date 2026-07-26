const db = require('../config/db');

async function getPollsByEvent(eventId) {
  const { data, error } = await db.from('polls').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  for (const poll of data) {
    const { data: options } = await db.from('poll_options').select('*').eq('poll_id', poll.id).order('id', { ascending: true });
    poll.options = options || [];
  }
  return data;
}

async function getActivePollsByEvent(eventId) {
  const { data, error } = await db.from('polls').select('*').eq('event_id', eventId).eq('is_active', true).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  for (const poll of data) {
    const { data: options } = await db.from('poll_options').select('*').eq('poll_id', poll.id).order('id', { ascending: true });
    poll.options = options || [];
  }
  return data;
}

async function getPollById(id) {
  const { data, error } = await db.from('polls').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  const { data: options } = await db.from('poll_options').select('*').eq('poll_id', id).order('id', { ascending: true });
  data.options = options || [];
  return data;
}

async function createPoll(eventId, question, options) {
  const { data: poll, error } = await db.from('polls').insert({
    event_id: eventId,
    question,
    is_active: true,
  }).select().single();
  if (error) throw new Error(error.message);

  for (const optText of options) {
    if (optText.trim()) {
      await db.from('poll_options').insert({
        poll_id: poll.id,
        option_text: optText.trim(),
        vote_count: 0,
      });
    }
  }
  return poll;
}

async function togglePoll(id) {
  const poll = await getPollById(id);
  const { data, error } = await db.from('polls').update({ is_active: !poll.is_active }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function deletePoll(id) {
  await db.from('poll_options').delete().eq('poll_id', id);
  await db.from('poll_votes').delete().eq('poll_id', id);
  const { error } = await db.from('polls').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

async function castVote(pollId, optionId, voterEmail) {
  // Check for duplicate vote
  const { data: existing } = await db.from('poll_votes').select('*').eq('poll_id', pollId).eq('voter_email', voterEmail).single();
  if (existing) throw new Error('You have already voted in this poll.');

  await db.from('poll_votes').insert({ poll_id: pollId, poll_option_id: optionId, voter_email: voterEmail });

  // Increment vote count
  const { data: opt } = await db.from('poll_options').select('*').eq('id', optionId).single();
  if (opt) {
    await db.from('poll_options').update({ vote_count: (opt.vote_count || 0) + 1 }).eq('id', optionId);
  }
}

module.exports = { getPollsByEvent, getActivePollsByEvent, getPollById, createPoll, togglePoll, deletePoll, castVote };
