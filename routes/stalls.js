const express = require('express');
const router = express.Router();
const db = require('../config/db');
const stallService = require('../services/stallService');
const stallObservationService = require('../services/stallObservationService');
const eventService = require('../services/eventService');

function requireStallVendor(req, res, next) {
  if (req.session.stallUser) return next();
  res.redirect('/stalls/login');
}

// Login
router.get('/login', (req, res) => {
  if (req.session.stallUser) return res.redirect('/stalls');
  res.render('stalls/login', { title: 'Stall Login' });
});

router.post('/login', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) {
    req.flash('error', 'Email is required.');
    return res.redirect('/stalls/login');
  }
  try {
    // Find stalls assigned to this email in active events
    const { data: stalls } = await db.from('stalls').select('*').eq('assigned_to_email', email);
    if (!stalls || stalls.length === 0) {
      req.flash('error', 'No stall found assigned to this email.');
      return res.redirect('/stalls/login');
    }
    // Check at least one stall belongs to an active event
    const eventIds = [...new Set(stalls.map(s => s.event_id))];
    const { data: activeEvents } = await db.from('events').select('id').eq('is_active', true).in('id', eventIds);
    if (!activeEvents || activeEvents.length === 0) {
      req.flash('error', 'Your stall is not in any active event.');
      return res.redirect('/stalls/login');
    }
    req.session.stallUser = { email, name: stalls[0].assigned_to_name || email };
    res.redirect('/stalls');
  } catch (err) {
    req.flash('error', 'Login error. Please try again.');
    res.redirect('/stalls/login');
  }
});

router.post('/logout', (req, res) => {
  req.session.stallUser = null;
  res.redirect('/stalls/login');
});

// Protected
router.use(requireStallVendor);

router.get('/', async (req, res, next) => {
  try {
    const email = req.session.stallUser.email;
    // Get all stalls assigned to this vendor in active events
    const { data: allStalls } = await db.from('stalls').select('*').eq('assigned_to_email', email);
    const eventIds = [...new Set(allStalls.map(s => s.event_id))];
    const { data: activeEvents } = await db.from('events').select('*').eq('is_active', true).in('id', eventIds);
    const activeEventIds = new Set(activeEvents.map(e => e.id));
    const stalls = allStalls.filter(s => activeEventIds.has(s.event_id));

    // Load observations and event info for each stall
    const stallsWithData = await Promise.all(stalls.map(async (stall) => {
      const observations = await stallObservationService.getObservationsByStall(stall.id);
      const event = activeEvents.find(e => e.id === stall.event_id);
      return { ...stall, observations, event };
    }));

    res.render('stalls/dashboard', { title: 'Stall Dashboard', user: req.session.stallUser, stalls: stallsWithData });
  } catch (err) { next(err); }
});

router.post('/observations', async (req, res, next) => {
  try {
    const { stall_id, event_id, observation_type, notes } = req.body;
    await stallObservationService.createObservation(stall_id, event_id, req.session.stallUser.email, observation_type, notes);
    req.flash('success', 'Observation logged.');
    res.redirect('/stalls');
  } catch (err) { next(err); }
});

module.exports = router;
