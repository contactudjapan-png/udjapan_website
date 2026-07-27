const express = require('express');
const router = express.Router();
const registrationService = require('../services/registrationService');
const eventService = require('../services/eventService');

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
    });
  } catch (err) {
    res.status(500).json({ valid: false, message: 'Server error' });
  }
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
