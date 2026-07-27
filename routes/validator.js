const express = require('express');
const router = express.Router();
const db = require('../config/db');
const stallObservationService = require('../services/stallObservationService');
const registrationService = require('../services/registrationService');
const emailService = require('../services/emailService');
const eventService = require('../services/eventService');
const settingsService = require('../services/settingsService');

function requireValidator(req, res, next) {
  if (req.session.adminUser || req.session.volunteerUser) return next();
  res.redirect('/validate/login');
}

function getVolunteerRedirect(session) {
  if (session.adminUser) return '/validate';
  const tasks = (session.volunteerUser?.tasks || []).map(t => (t || '').toLowerCase());
  const hasStall = tasks.some(t => t.includes('স্টল') || t.includes('stall'));
  const hasReg = tasks.some(t => t.includes('রেজিস্ট্রেশন') || t.includes('registration'));
  const hasQR = tasks.some(t => t.includes('qr') || t.includes('যাচাই') || t.includes('validation') || t.includes('scanner'));
  if (hasQR) return '/validate';
  if (hasStall) return '/validate/stalls';
  if (hasReg) return '/validate/register';
  return '/validate/no-access';
}

function requireQRAccess(req, res, next) {
  if (req.session.adminUser) return next();
  const tasks = (req.session.volunteerUser?.tasks || []).map(t => (t || '').toLowerCase());
  if (tasks.some(t => t.includes('qr') || t.includes('যাচাই') || t.includes('validation') || t.includes('scanner'))) return next();
  res.redirect(getVolunteerRedirect(req.session));
}

function requireRegistrationAccess(req, res, next) {
  if (req.session.adminUser) return next();
  const tasks = (req.session.volunteerUser?.tasks || []).map(t => (t || '').toLowerCase());
  if (tasks.some(t => t.includes('রেজিস্ট্রেশন') || t.includes('registration'))) return next();
  res.redirect(getVolunteerRedirect(req.session));
}

function requireStallAccess(req, res, next) {
  if (req.session.adminUser) return next();
  const tasks = (req.session.volunteerUser?.tasks || []).map(t => (t || '').toLowerCase());
  if (tasks.some(t => t.includes('স্টল') || t.includes('stall'))) return next();
  res.redirect(getVolunteerRedirect(req.session));
}

// ── Login ────────────────────────────────────────────────────────────────────

router.get('/login', (req, res) => {
  if (req.session.adminUser || req.session.volunteerUser) return res.redirect(getVolunteerRedirect(req.session));
  res.render('validator/login', { title: 'স্বেচ্ছাসেবী কর্নার' });
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
    const tasks = activeVolunteers.map(v => (v.assigned_task || '').toLowerCase());
    const hasStall = tasks.some(t => t.includes('স্টল') || t.includes('stall'));
    const hasReg = tasks.some(t => t.includes('রেজিস্ট্রেশন') || t.includes('registration'));
    const hasQR = tasks.some(t => t.includes('qr') || t.includes('যাচাই') || t.includes('validation') || t.includes('scanner'));
    const hasAnyTask = tasks.some(t => t.trim() !== '');
    if (!hasAnyTask) {
      req.flash('error', 'আপনাকে এখনো কোনো কাজ নির্ধারণ করা হয়নি। অ্যাডমিনের সাথে যোগাযোগ করুন।');
      return res.redirect('/validate/login');
    }
    req.session.volunteerUser = {
      email,
      name: activeVolunteers[0].name,
      tasks: activeVolunteers.map(v => v.assigned_task || ''),
      event_ids: activeVolunteers.map(v => v.event_id),
    };
    if (hasStall && !hasReg && !hasQR) return res.redirect('/validate/stalls');
    if (hasReg && !hasStall && !hasQR) return res.redirect('/validate/register');
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

router.get('/no-access', (req, res) => {
  res.render('validator/no-access', { title: 'প্রবেশাধিকার নেই' });
});

// ── Protected ────────────────────────────────────────────────────────────────

router.use(requireValidator);

router.get('/', requireQRAccess, (req, res) => {
  const user = req.session.volunteerUser || req.session.adminUser;
  res.render('validator/scan', { title: 'QR যাচাইকারী', user });
});

// ── On-site registration (registration-desk volunteers only) ──────────────────

router.get('/register', requireRegistrationAccess, async (req, res, next) => {
  try {
    let events;
    if (req.session.adminUser) {
      const { data } = await db.from('events').select('*').eq('is_active', true).eq('registration_open', true);
      events = data || [];
    } else {
      const eventIds = req.session.volunteerUser.event_ids;
      const { data } = await db.from('events').select('*').eq('is_active', true).eq('registration_open', true).in('id', eventIds);
      events = data || [];
    }
    if (events.length === 1) return res.redirect(`/validate/register/${events[0].id}`);
    const user = req.session.volunteerUser || req.session.adminUser;
    res.render('validator/register', { title: 'নিবন্ধন', user, events, event: null });
  } catch (err) { next(err); }
});

router.get('/register/:eventId', requireRegistrationAccess, async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.eventId);
    if (!event || !event.is_active) {
      req.flash('error', 'ইভেন্টটি পাওয়া যায়নি।');
      return res.redirect('/validate/register');
    }
    if (!req.session.adminUser) {
      if (!req.session.volunteerUser.event_ids.includes(event.id)) {
        req.flash('error', 'আপনি এই ইভেন্টে নিযুক্ত নন।');
        return res.redirect('/validate');
      }
    }
    const user = req.session.volunteerUser || req.session.adminUser;
    res.render('validator/register', { title: 'নিবন্ধন', user, events: [], event });
  } catch (err) { next(err); }
});

router.post('/register/:eventId', requireRegistrationAccess, async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.eventId);
    if (!event || !event.is_active) {
      req.flash('error', 'ইভেন্টটি সক্রিয় নেই।');
      return res.redirect('/validate/register');
    }
    const { name, email, payment_reference } = req.body;
    if (!name || !email) {
      req.flash('error', 'নাম এবং ইমেইল আবশ্যক।');
      return res.redirect(`/validate/register/${event.id}`);
    }
    const registration = await registrationService.createRegistration(event.id, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      payment_reference: (payment_reference || '').trim(),
    });
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    emailService.sendRegistrationConfirmation(registration, event, baseUrl).catch(err => {
      console.error('[Email] Failed:', err.message);
    });
    req.flash('success', `${name.trim()} সফলভাবে নিবন্ধিত হয়েছে। QR কোড ইমেইলে পাঠানো হয়েছে।`);
    res.redirect(`/validate/register/${event.id}`);
  } catch (err) { next(err); }
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
    const stallObsTypes = await settingsService.getStallObsTypes();
    res.render('stalls/dashboard', { title: 'স্টল পর্যবেক্ষণ', user, stalls: stallData, stallObsTypes });
  } catch (err) { next(err); }
});

router.post('/stalls/observations', requireStallAccess, async (req, res, next) => {
  try {
    const { stall_id, event_id, observation_type, notes, rating } = req.body;
    const { data: event } = await db.from('events').select('is_active').eq('id', event_id).single();
    if (!event || !event.is_active) {
      req.flash('error', 'এই ইভেন্ট আর সক্রিয় নেই।');
      return res.redirect('/validate/stalls');
    }
    const submittedBy = req.session.volunteerUser?.email || req.session.adminUser?.email;
    await stallObservationService.createObservation(stall_id, event_id, submittedBy, observation_type, notes, rating);
    req.flash('success', 'পর্যবেক্ষণ জমা হয়েছে।');
    res.redirect('/validate/stalls');
  } catch (err) { next(err); }
});

module.exports = router;
