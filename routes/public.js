const express = require('express');
const router = express.Router();
const eventService = require('../services/eventService');
const registrationService = require('../services/registrationService');
const qrService = require('../services/qrService');
const emailService = require('../services/emailService');
const pollService = require('../services/pollService');
const volunteerService = require('../services/volunteerService');
const submissionService = require('../services/submissionService');
const advertisementService = require('../services/advertisementService');



// Home
router.get('/', async (req, res, next) => {
  try {
    const events = await eventService.getActiveEvents();
    const ads = await advertisementService.getActiveAds();
    // First active event is the "current" featured event
    const currentEvent = events[0] || null;
    const otherEvents = events.slice(1);
    res.render('public/home', { title: 'Udjapon', currentEvent, otherEvents, ads });
  } catch (err) {
    next(err);
  }
});

// Event detail
router.get('/event/:id', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    const registrationCount = await registrationService.countByEvent(event.id);
    res.render('public/event', { title: event.title, event, registrationCount });
  } catch (err) {
    next(err);
  }
});

// Submit payment info (public — does NOT create a registration)
router.post(`/event/:id/register`, async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);

    if (!event.registration_open) {
      req.flash('error', 'Submissions are not open for this event.');
      return res.redirect(`/event/${req.params.id}`);
    }

    const { name, email, payment_reference } = req.body;
    if (!name || !email) {
      req.flash('error', 'Name and email are required.');
      return res.redirect(`/event/${req.params.id}`);
    }

    const submission = await submissionService.createSubmission(req.params.id, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      payment_reference: payment_reference ? payment_reference.trim() : '',
    });

    res.redirect(`/submit/success/${submission.id}`);
  } catch (err) {
    next(err);
  }
});

// Submission success page
router.get('/submit/success/:id', async (req, res, next) => {
  try {
    const submission = await submissionService.getSubmissionById(req.params.id);
    const event = await eventService.getEventById(submission.event_id);
    res.render('public/submit-success', { title: 'Submission Received', submission, event });
  } catch (err) {
    next(err);
  }
});

// Registration success page (after admin approves — QR code shown)
router.get('/register/success/:id', async (req, res, next) => {
  try {
    const registration = await registrationService.getRegistrationById(req.params.id);
    const event = await eventService.getEventById(registration.event_id);
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const qrUrl = `${baseUrl}/api/validate/${registration.qr_token}`;
    const qrDataUrl = await qrService.generateQRDataURL(qrUrl);
    res.render('public/register-success', { title: 'Registration Confirmed', registration, event, qrDataUrl });
  } catch (err) {
    next(err);
  }
});

// Privacy page
router.get('/privacy', (req, res) => {
  res.render('public/privacy', { title: 'Privacy Policy' });
});

// Public polls
router.get('/event/:id/polls', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    const polls = await pollService.getActivePollsByEvent(req.params.id);
    res.render('public/polls', { title: `Polls — ${event.title}`, event, polls });
  } catch (err) {
    next(err);
  }
});

// Cast vote
router.post(`/event/:id/polls/:pollId/vote`, async (req, res, next) => {
  try {
    const { option_id, voter_email } = req.body;
    if (!option_id || !voter_email) {
      req.flash('error', 'Please select an option and enter your email.');
      return res.redirect(`/event/${req.params.id}/polls`);
    }
    await pollService.castVote(req.params.pollId, option_id, voter_email.trim().toLowerCase());
    req.flash('success', 'Your vote has been recorded!');
    res.redirect(`/event/${req.params.id}/polls`);
  } catch (err) {
    req.flash('error', err.message || 'Failed to cast vote.');
    res.redirect(`/event/${req.params.id}/polls`);
  }
});

// Volunteer signup
router.post(`/event/:id/volunteer`, async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email) {
      req.flash('error', 'Name and email are required.');
      return res.redirect(`/event/${req.params.id}`);
    }
    await volunteerService.createVolunteer(req.params.id, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : '',
    });
    req.flash('success', 'Thank you for volunteering! We will contact you soon.');
    res.redirect(`/event/${req.params.id}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
