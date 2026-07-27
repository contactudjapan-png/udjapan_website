const express = require('express');
const router = express.Router();
const db = require('../config/db');
const stallObservationService = require('../services/stallObservationService');
const registrationService = require('../services/registrationService');
const emailService = require('../services/emailService');
const eventService = require('../services/eventService');
const settingsService = require('../services/settingsService');
const instrumentService = require('../services/instrumentService');
const competitionService = require('../services/competitionService');
const helpRequestService = require('../services/helpRequestService');
const volunteerService = require('../services/volunteerService');

function requireValidator(req, res, next) {
  if (req.session.adminUser || req.session.volunteerUser) return next();
  res.redirect('/validate/login');
}

function getVolunteerRedirect(session) {
  if (session.adminUser) return '/validate';
  const roles = session.volunteerUser?.roles || {};
  if (roles.qr) return '/validate';
  if (roles.reg) return '/validate/register';
  if (roles.stall) return '/validate/stalls';
  if (roles.music) return '/validate/instruments';
  if (roles.competition) return '/validate/competitions';
  if (roles.anchor) return '/validate/instruments';
  if (roles.performer) return '/validate/instruments';
  if (roles.controlRoom) return '/validate/control-room';
  return '/validate/no-access';
}

function requireQRAccess(req, res, next) {
  if (req.session.adminUser) return next();
  if (req.session.volunteerUser?.roles?.qr) return next();
  res.redirect(getVolunteerRedirect(req.session));
}

function requireRegistrationAccess(req, res, next) {
  if (req.session.adminUser) return next();
  if (req.session.volunteerUser?.roles?.reg) return next();
  res.redirect(getVolunteerRedirect(req.session));
}

function requireStallAccess(req, res, next) {
  if (req.session.adminUser) return next();
  if (req.session.volunteerUser?.roles?.stall) return next();
  res.redirect(getVolunteerRedirect(req.session));
}

function requireMusicAccess(req, res, next) {
  if (req.session.adminUser) return next();
  const roles = req.session.volunteerUser?.roles || {};
  if (roles.music || roles.anchor || roles.performer) return next();
  res.redirect(getVolunteerRedirect(req.session));
}

function requireControlRoomAccess(req, res, next) {
  if (req.session.adminUser) return next();
  if (req.session.volunteerUser?.roles?.controlRoom) return next();
  res.redirect(getVolunteerRedirect(req.session));
}

function requireCompetitionAccess(req, res, next) {
  if (req.session.adminUser) return next();
  if (req.session.volunteerUser?.roles?.competition) return next();
  res.redirect(getVolunteerRedirect(req.session));
}

// Prevent browser caching so back button always re-checks session
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// ── Login ────────────────────────────────────────────────────────────────────

router.get('/login', (req, res) => {
  if (req.session.adminUser || req.session.volunteerUser) return res.redirect(getVolunteerRedirect(req.session));
  res.render('validator/login', { title: 'স্বেচ্ছাসেবী কর্নার' });
});

router.post('/login', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) {
    req.session.volunteerUser = null;
    req.flash('error', 'Email is required.');
    return res.redirect('/validate/login');
  }
  try {
    const { data: volunteers } = await db.from('volunteers').select('*').eq('email', email).eq('status', 'approved');
    if (!volunteers || volunteers.length === 0) {
      req.session.volunteerUser = null;
      req.flash('error', 'No approved volunteer found with that email.');
      return res.redirect('/validate/login');
    }
    const eventIds = volunteers.map(v => v.event_id);
    const { data: activeEvents } = await db.from('events').select('id').eq('is_active', true).in('id', eventIds);
    if (!activeEvents || activeEvents.length === 0) {
      req.session.volunteerUser = null;
      req.flash('error', 'You are not assigned to any active event.');
      return res.redirect('/validate/login');
    }
    const activeEventIds = new Set(activeEvents.map(e => e.id));
    const activeVolunteers = volunteers.filter(v => activeEventIds.has(v.event_id));
    const volunteerTasks = activeVolunteers.map(v => (v.assigned_task || '').trim());
    const taskGroups = await settingsService.getAllTaskGroups();
    const hasStall = volunteerTasks.some(t => taskGroups.stall.includes(t));
    const hasReg = volunteerTasks.some(t => taskGroups.reg.includes(t));
    const hasQR = volunteerTasks.some(t => taskGroups.qr.includes(t));
    const hasMusic = volunteerTasks.some(t => taskGroups.music.includes(t));
    const hasCompetition = volunteerTasks.some(t => (taskGroups.competition || []).includes(t));
    const hasAnchor = volunteerTasks.some(t => (taskGroups.anchor || []).includes(t));
    const hasPerformer = volunteerTasks.some(t => (taskGroups.performer || []).includes(t));
    const hasControlRoom = volunteerTasks.some(t => (taskGroups.controlRoom || []).includes(t));
    if (!hasStall && !hasReg && !hasQR && !hasMusic && !hasCompetition && !hasAnchor && !hasPerformer && !hasControlRoom) {
      req.session.volunteerUser = null;
      return res.redirect('/validate/no-access');
    }
    req.session.volunteerUser = {
      email,
      name: activeVolunteers[0].name,
      tasks: volunteerTasks,
      event_ids: activeVolunteers.map(v => v.event_id),
      roles: { stall: hasStall, reg: hasReg, qr: hasQR, music: hasMusic, competition: hasCompetition, anchor: hasAnchor, performer: hasPerformer, controlRoom: hasControlRoom },
    };
    res.redirect(getVolunteerRedirect(req.session));
  } catch (err) {
    req.session.volunteerUser = null;
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
    const { name, email, phone, payment_reference, amount } = req.body;
    if (!name || !phone) {
      req.flash('error', 'নাম এবং ফোন নম্বর আবশ্যক।');
      return res.redirect(`/validate/register/${event.id}`);
    }
    const registration = await registrationService.createRegistration(event.id, {
      name: name.trim(),
      email: (email || '').trim().toLowerCase(),
      phone: phone.trim(),
      payment_reference: (payment_reference || '').trim(),
      amount,
    });
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    if (registration.email) {
      emailService.sendRegistrationConfirmation(registration, event, baseUrl).catch(err => {
        console.error('[Email] Failed:', err.message);
      });
    }
    const emailNote = registration.email ? ' QR কোড ইমেইলে পাঠানো হয়েছে।' : '';
    req.flash('success', `${name.trim()} সফলভাবে নিবন্ধিত হয়েছে।${emailNote}`);
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

// ── Instruments (music/stage volunteers only) ─────────────────────────────────

router.get('/instruments', requireMusicAccess, async (req, res, next) => {
  try {
    const user = req.session.volunteerUser || req.session.adminUser;
    let eventIds = req.session.adminUser
      ? (await db.from('events').select('id').eq('is_active', true)).data?.map(e => e.id) || []
      : req.session.volunteerUser.event_ids;
    const allInstruments = [];
    for (const eid of eventIds) {
      const instruments = await instrumentService.getInstrumentsByEvent(eid);
      const { data: ev } = await db.from('events').select('title').eq('id', eid).single();
      instruments.forEach(i => allInstruments.push({ ...i, event_title: ev?.title || '' }));
    }
    res.render('validator/instruments', { title: 'যন্ত্রপাতি তালিকা', user, instruments: allInstruments, eventIds });
  } catch (err) { next(err); }
});

router.post('/instruments', requireMusicAccess, async (req, res, next) => {
  try {
    const { event_id, name, source, notes } = req.body;
    if (!name || !event_id) {
      req.flash('error', 'যন্ত্রের নাম ও ইভেন্ট আবশ্যক।');
      return res.redirect('/validate/instruments');
    }
    const volunteer_email = req.session.volunteerUser?.email || req.session.adminUser?.email;
    await instrumentService.addInstrument(event_id, { name: name.trim(), source: (source || '').trim(), notes: (notes || '').trim(), volunteer_email });
    req.flash('success', 'যন্ত্র যোগ করা হয়েছে।');
    res.redirect('/validate/instruments');
  } catch (err) { next(err); }
});

router.post('/instruments/:id/delete', requireMusicAccess, async (req, res, next) => {
  try {
    await instrumentService.deleteInstrument(req.params.id);
    req.flash('success', 'যন্ত্র মুছে ফেলা হয়েছে।');
    res.redirect('/validate/instruments');
  } catch (err) { next(err); }
});

// ── Competitions (competition volunteers only) ─────────────────────────────────

router.get('/competitions', requireCompetitionAccess, async (req, res, next) => {
  try {
    const user = req.session.volunteerUser || req.session.adminUser;
    const eventIds = req.session.adminUser
      ? (await db.from('events').select('id').eq('is_active', true)).data?.map(e => e.id) || []
      : req.session.volunteerUser.event_ids;
    const allCompetitions = [];
    for (const eid of eventIds) {
      const comps = await competitionService.getCompetitionsByEvent(eid);
      const { data: ev } = await db.from('events').select('title').eq('id', eid).single();
      comps.forEach(c => allCompetitions.push({ ...c, event_title: ev?.title || '' }));
    }
    res.render('validator/competitions', { title: 'প্রতিযোগিতা', user, competitions: allCompetitions });
  } catch (err) { next(err); }
});

router.post('/competitions/:id/winner', requireCompetitionAccess, async (req, res, next) => {
  try {
    await competitionService.updateCompetition(req.params.id, {
      name: req.body.name,
      winner_name: req.body.winner_name,
      notes: req.body.notes,
    });
    req.flash('success', 'বিজয়ী সংরক্ষিত হয়েছে।');
    res.redirect('/validate/competitions');
  } catch (err) { next(err); }
});

// ── Help Requests ────────────────────────────────────────────────────────────

router.post('/help-request', async (req, res, next) => {
  try {
    const { event_id, reporter_name, priority, message } = req.body;
    if (!message || !event_id) {
      req.flash('error', 'বার্তা এবং ইভেন্ট আবশ্যক।');
      return res.redirect('back');
    }
    await helpRequestService.createHelpRequest(event_id, { reporter_name, priority, message });
    req.flash('success', 'সাহায্যের অনুরোধ পাঠানো হয়েছে।');
    res.redirect('back');
  } catch (err) { next(err); }
});

router.post('/control-room/resolve/:id', requireValidator, async (req, res, next) => {
  try {
    await helpRequestService.resolveHelpRequest(req.params.id);
    req.flash('success', 'অনুরোধটি সমাধান করা হয়েছে।');
    res.redirect('/validate/control-room');
  } catch (err) { next(err); }
});

// ── Control Room ─────────────────────────────────────────────────────────────

router.get('/control-room', requireControlRoomAccess, async (req, res, next) => {
  try {
    const user = req.session.volunteerUser || req.session.adminUser;
    const eventIds = req.session.adminUser
      ? (await db.from('events').select('id').eq('is_active', true)).data?.map(e => e.id) || []
      : req.session.volunteerUser.event_ids;

    const eventId = eventIds[0];
    if (!eventId) {
      req.flash('error', 'কোনো সক্রিয় ইভেন্ট পাওয়া যায়নি।');
      return res.redirect('/validate/login');
    }

    const { data: eventData } = await db.from('events').select('*').eq('id', eventId).single();

    const [totalRegs, paidRegs, helpRequests, volunteers, scanLogs] = await Promise.all([
      registrationService.countByEvent(eventId),
      registrationService.countPaidByEvent(eventId),
      helpRequestService.getHelpRequestsByEvent(eventId),
      volunteerService.getVolunteersByEvent(eventId),
      db.from('scan_logs').select('*').eq('event_id', eventId).then(r => r.data || []).catch(() => []),
    ]);

    const openRequests = helpRequests.filter(h => !h.resolved);
    const resolvedRequests = helpRequests.filter(h => h.resolved);

    res.render('validator/control-room', {
      title: 'কন্ট্রোল রুম',
      user,
      event: eventData,
      stats: { totalRegs, paidRegs, checkedIn: scanLogs.length, openHelp: openRequests.length },
      openRequests,
      resolvedRequests,
      volunteers: volunteers || [],
    });
  } catch (err) { next(err); }
});

module.exports = router;
