const express = require('express');
const router = express.Router();
const registrationService = require('../services/registrationService');
const eventService = require('../services/eventService');
const pollService = require('../services/pollService');

// Validate QR token — returns JSON
router.get('/validate/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const db = require('../config/db');
    const registration = await registrationService.getRegistrationByToken(token);
    const valid = !!registration;
    const event = valid ? await eventService.getEventById(registration.event_id) : null;

    // Log the scan
    await db.from('scan_logs').insert({
      qr_token: token,
      registration_id: registration ? registration.id : null,
      event_id: registration ? registration.event_id : null,
      name: registration ? registration.name : null,
      result: valid ? 'valid' : 'invalid',
      scanned_at: new Date().toISOString(),
    });

    if (!valid) return res.json({ valid: false, message: 'Invalid QR code' });

    res.json({
      valid: true,
      name: registration.name,
      email: registration.email,
      is_paid: registration.is_paid,
      event: event ? event.title : 'Unknown Event',
      event_date: event ? event.event_date : null,
      adults_count: registration.adults_count || 0,
      children_count: registration.children_count || 0,
      is_special_needs: !!registration.is_special_needs,
    });
  } catch (err) {
    res.status(500).json({ valid: false, message: 'Server error' });
  }
});

// Active polls JSON for live refresh
router.get('/events/:id/polls', async (req, res) => {
  try {
    const polls = await pollService.getActivePollsByEvent(req.params.id);
    const result = polls.map(p => ({
      id: p.id,
      question: p.question,
      options: (p.options || []).map(o => ({
        id: o.id,
        option_text: o.option_text,
        vote_count: o.vote_count || 0,
      })),
      total_votes: (p.options || []).reduce((s, o) => s + (o.vote_count || 0), 0),
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Email open tracking pixel
router.get('/email-open/:logId', async (req, res) => {
  try {
    const db = require('../config/db');
    const { data: log } = await db.from('email_log').select('*').eq('id', req.params.logId).single();
    if (log) {
      await db.from('email_log').update({ open_count: (log.open_count || 0) + 1 }).eq('id', req.params.logId);
    }
  } catch (_) { /* best-effort */ }
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store');
  res.send(Buffer.from('R0lGODlhAQABAAAAACH5BAEAAAAALAAAAAABAAEAAAI=', 'base64'));
});

// Keepalive — weekly cron hits this to prevent Supabase from pausing
router.get('/keepalive', async (req, res) => {
  try {
    const db = require('../config/db');
    await db.from('events').select('id').limit(1);
    res.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
