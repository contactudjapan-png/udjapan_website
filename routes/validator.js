const express = require('express');
const router = express.Router();
const db = require('../config/db');
const stallObservationService = require('../services/stallObservationService');

function requireValidator(req, res, next) {
  if (req.session.adminUser || req.session.volunteerUser) return next();
  res.redirect('/validate/login');
}

function requireStallAccess(req, res, next) {
  if (req.session.adminUser) return next();
  const tasks = (req.session.volunteerUser?.tasks || []).map(t => (t || '').toLowerCase());
  const hasStallTask = tasks.some(t => t.includes('স্টল') || t.includes('stall'));
  if (hasStallTask) return next();
  req.flash('error', 'আপনার স্টল পর্যবেক্ষণের অনুমতি নেই।');
  res.redirect('/validate');
}

// ── Login ────────────────────────────────────────────────────────────────────

router.get('/login', (req, res) => {
  if (req.session.adminUser || req.session.volunteerUser) return res.redirect('/validate');
  res.render('validator/login', { title: 'Volunteer Login' });
});

router.post('/login', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) {
    req.flash('error', 'Email is required.');
    return res.redirect('/validate/login');
  }
  try {
    const { data: volunteers } = await db.from('volunteers').select('*').eq('email', email).eq('status', 'approved');
    if (!volunteers || volunteers.length === 0) {
      req.flash('error', 'No approved volunteer found with that email.');
      return res.redirect('/validate/login');
    }
    const eventIds = volunteers.map(v => v.event_id);
    const { data: activeEvents } = await db.from('events').select('id').eq('is_active', true).in('id', eventIds);
    if (!activeEvents || activeEvents.length === 0) {
      req.flash('error', 'You are not assigned to any active event.');
      return res.redirect('/validate/login');
    }
    const activeEventIds = new Set(activeEvents.map(e => e.id));
    const activeVolunteers = volunteers.filter(v => activeEventIds.has(v.event_id));
    req.session.volunteerUser = {
      email,
      name: activeVolunteers[0].name,
      tasks: activeVolunteers.map(v => v.assigned_task || ''),
      event_ids: activeVolunteers.map(v => v.event_id),
    };
    res.redirect('/validate');
  } catch (err) {
    req.flash('error', 'Login error. Please try again.');
    res.redirect('/validate/login');
  }
});

router.post('/logout', (req, res) => {
  req.session.volunteerUser = null;
  res.redirect('/validate/login');
});

// ── Protected ────────────────────────────────────────────────────────────────

router.use(requireValidator);

router.get('/', (req, res) => {
  const user = req.session.volunteerUser || req.session.adminUser;
  const tasks = req.session.volunteerUser?.tasks || [];
  const hasStallAccess = req.session.adminUser || tasks.some(t => (t || '').toLowerCase().includes('স্টল') || (t || '').toLowerCase().includes('stall'));
  res.render('validator/scan', { title: 'QR Validator', user, hasStallAccess });
});

// ── Stall observations (stall-duty volunteers only) ───────────────────────────

router.get('/stalls', requireStallAccess, async (req, res, next) => {
  try {
    const isAdmin = !!req.session.adminUser;
    let stallData = [];

    if (isAdmin) {
      // Admin sees all stalls across all active events
      const { data: activeEvents } = await db.from('events').select('*').eq('is_active', true);
      for (const event of (activeEvents || [])) {
        const { data: stalls } = await db.from('stalls').select('*').eq('event_id', event.id);
        for (const stall of (stalls || [])) {
          const observations = await stallObservationService.getObservationsByStall(stall.id);
          stallData.push({ ...stall, observations, event });
        }
      }
    } else {
      const eventIds = req.session.volunteerUser.event_ids;
      const { data: events } = await db.from('events').select('*').eq('is_active', true).in('id', eventIds);
      for (const event of (events || [])) {
        const { data: stalls } = await db.from('stalls').select('*').eq('event_id', event.id);
        for (const stall of (stalls || [])) {
          const observations = await stallObservationService.getObservationsByStall(stall.id);
          stallData.push({ ...stall, observations, event });
        }
      }
    }

    const user = req.session.volunteerUser || req.session.adminUser;
    res.render('stalls/dashboard', { title: 'স্টল পর্যবেক্ষণ', user, stalls: stallData });
  } catch (err) { next(err); }
});

router.post('/stalls/observations', requireStallAccess, async (req, res, next) => {
  try {
    const { stall_id, event_id, observation_type, notes } = req.body;
    const { data: event } = await db.from('events').select('is_active').eq('id', event_id).single();
    if (!event || !event.is_active) {
      req.flash('error', 'এই ইভেন্ট আর সক্রিয় নেই।');
      return res.redirect('/validate/stalls');
    }
    const submittedBy = req.session.volunteerUser?.email || req.session.adminUser?.email;
    await stallObservationService.createObservation(stall_id, event_id, submittedBy, observation_type, notes);
    req.flash('success', 'পর্যবেক্ষণ জমা হয়েছে।');
    res.redirect('/validate/stalls');
  } catch (err) { next(err); }
});

module.exports = router;
