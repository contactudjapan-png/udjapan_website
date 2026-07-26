const express = require('express');
const router = express.Router();
const registrationService = require('../services/registrationService');
const eventService = require('../services/eventService');

// Validate QR token — returns JSON
router.get('/validate/:token', async (req, res) => {
  try {
    const registration = await registrationService.getRegistrationByToken(req.params.token);
    if (!registration) {
      return res.json({ valid: false, message: 'Invalid QR code' });
    }
    const event = await eventService.getEventById(registration.event_id);
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

module.exports = router;
