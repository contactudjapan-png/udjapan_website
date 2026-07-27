const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');
const { requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

const eventService = require('../services/eventService');
const registrationService = require('../services/registrationService');
const expenseService = require('../services/expenseService');
const pollService = require('../services/pollService');
const stallService = require('../services/stallService');
const stallObservationService = require('../services/stallObservationService');
const volunteerService = require('../services/volunteerService');
const emailService = require('../services/emailService');
const reportService = require('../services/reportService');
const submissionService = require('../services/submissionService');
const importService = require('../services/importService');
const advertisementService = require('../services/advertisementService');
const announcementService = require('../services/announcementService');
const settingsService = require('../services/settingsService');
const translationService = require('../services/translationService');

// Convert a "YYYY-MM-DDTHH:MM" string entered as Berlin local time to a UTC ISO string
function berlinToUTC(localStr) {
  if (!localStr) return null;
  const asUTC = new Date(localStr + ':00Z');
  const berlinStr = asUTC.toLocaleString('sv', { timeZone: 'Europe/Berlin' }).slice(0, 16);
  const offsetMs = new Date(berlinStr + ':00Z').getTime() - asUTC.getTime();
  return new Date(asUTC.getTime() - offsetMs).toISOString();
}

function convertEventDates(body) {
  if (body.event_date)          body.event_date          = berlinToUTC(body.event_date);
  if (body.early_bird_deadline) body.early_bird_deadline = berlinToUTC(body.early_bird_deadline);
  if (body.mid_deadline)        body.mid_deadline        = berlinToUTC(body.mid_deadline);
  return body;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

router.get('/login', (req, res) => {
  if (req.session.adminUser) return res.redirect('/admin');
  res.render('admin/login', { title: 'Admin Login' });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    req.session.adminUser = { email };
    return res.redirect('/admin');
  }
  req.flash('error', 'Invalid credentials');
  res.redirect('/admin/login');
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/admin/login');
});

// All routes below require auth
router.use(requireAdmin);

// ─── Dashboard ───────────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const stats = await reportService.getDashboardStats();
    const events = await eventService.getAllEvents();
    res.render('admin/dashboard', { title: 'Dashboard', stats, events, useMemoryDb: !!process.env.USE_MEMORY_DB });
  } catch (err) { next(err); }
});

// ─── Events ──────────────────────────────────────────────────────────────────

router.get('/events', async (req, res, next) => {
  try {
    const events = await eventService.getAllEvents();
    res.render('admin/events', { title: 'Events', events });
  } catch (err) { next(err); }
});

router.get('/events/new', (req, res) => {
  res.render('admin/event-form', { title: 'New Event', event: null });
});

router.post('/events/new', async (req, res, next) => {
  try {
    const event = await eventService.createEvent(convertEventDates(req.body));
    req.flash('success', 'Event created successfully.');
    res.redirect(`/admin/events/${event.id}/edit`);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('/admin/events/new');
  }
});

router.get('/events/:id', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    res.render('admin/event-detail', { title: event.title, event });
  } catch (err) { next(err); }
});

router.get('/events/:id/edit', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    res.render('admin/event-form', { title: 'Edit Event', event });
  } catch (err) { next(err); }
});

router.post('/events/:id/edit', upload.single('banner'), async (req, res, next) => {
  try {
    await eventService.updateEvent(req.params.id, convertEventDates(req.body));
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const url = await eventService.uploadFileToBucket('banners', `${req.params.id}/banner${ext}`, req.file.buffer, req.file.mimetype);
      await eventService.updateBannerUrl(req.params.id, url);
    }
    req.flash('success', 'ইভেন্ট তথ্য আপডেট হয়েছে।');
    res.redirect(`/admin/events/${req.params.id}/edit`);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect(`/admin/events/${req.params.id}/edit`);
  }
});

router.post('/events/:id/edit/payment', upload.fields([{ name: 'paypal_qr', maxCount: 1 }, { name: 'popup_image', maxCount: 1 }]), async (req, res, next) => {
  try {
    await eventService.updateEventPayment(req.params.id, convertEventDates(req.body));
    if (req.files && req.files.paypal_qr) {
      const f = req.files.paypal_qr[0];
      const ext = path.extname(f.originalname).toLowerCase();
      const url = await eventService.uploadFileToBucket('paypal-qr', `${req.params.id}/paypal-qr${ext}`, f.buffer, f.mimetype);
      await eventService.updatePaypalQrUrl(req.params.id, url);
    }
    if (req.files && req.files.popup_image) {
      const f = req.files.popup_image[0];
      const ext = path.extname(f.originalname).toLowerCase();
      const url = await eventService.uploadFileToBucket('banners', `${req.params.id}/popup${ext}`, f.buffer, f.mimetype);
      await eventService.updatePopupUrl(req.params.id, url);
    }
    req.flash('success', 'পেমেন্ট তথ্য আপডেট হয়েছে।');
    res.redirect(`/admin/events/${req.params.id}/edit`);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect(`/admin/events/${req.params.id}/edit`);
  }
});

router.post('/events/:id/delete', async (req, res, next) => {
  try {
    await eventService.deleteEvent(req.params.id);
    req.flash('success', 'Event deleted.');
    res.redirect('/admin/events');
  } catch (err) { next(err); }
});

router.post('/events/:id/banner', upload.single('banner'), async (req, res, next) => {
  try {
    if (!req.file) { req.flash('error', 'No file uploaded.'); return res.redirect(`/admin/events/${req.params.id}/edit`); }
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filePath = `${req.params.id}/banner${ext}`;
    const url = await eventService.uploadFileToBucket('banners', filePath, req.file.buffer, req.file.mimetype);
    await eventService.updateBannerUrl(req.params.id, url);
    req.flash('success', 'Banner uploaded.');
    res.redirect(`/admin/events/${req.params.id}/edit`);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect(`/admin/events/${req.params.id}/edit`);
  }
});

router.post('/events/:id/paypal-qr', upload.single('paypal_qr'), async (req, res, next) => {
  try {
    if (!req.file) { req.flash('error', 'No file uploaded.'); return res.redirect(`/admin/events/${req.params.id}/edit`); }
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filePath = `${req.params.id}/paypal-qr${ext}`;
    const url = await eventService.uploadFileToBucket('paypal-qr', filePath, req.file.buffer, req.file.mimetype);
    await eventService.updatePaypalQrUrl(req.params.id, url);
    req.flash('success', 'PayPal QR uploaded.');
    res.redirect(`/admin/events/${req.params.id}/edit`);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect(`/admin/events/${req.params.id}/edit`);
  }
});

// ─── Registrations ───────────────────────────────────────────────────────────

router.get('/events/:id/registrations', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    const registrations = await registrationService.getRegistrationsByEvent(req.params.id);
    res.render('admin/registrations', { title: `Registrations — ${event.title}`, event, registrations });
  } catch (err) { next(err); }
});

router.get('/events/:id/registrations/new', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    res.render('admin/registration-form', { title: 'Add Registration', event });
  } catch (err) { next(err); }
});

router.post('/events/:id/registrations/new', async (req, res, next) => {
  try {
    const { name, email, payment_reference } = req.body;
    await registrationService.createRegistration(req.params.id, { name, email, payment_reference });
    req.flash('success', 'Registration added.');
    res.redirect(`/admin/events/${req.params.id}/registrations`);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect(`/admin/events/${req.params.id}/registrations/new`);
  }
});

router.post('/registrations/:id/toggle-paid', async (req, res, next) => {
  try {
    const reg = await registrationService.togglePaid(req.params.id);
    req.flash('success', `Payment status set to ${reg.is_paid ? 'Paid' : 'Unpaid'}.`);
    res.redirect(`/admin/events/${reg.event_id}/registrations`);
  } catch (err) { next(err); }
});

router.post('/registrations/:id/delete', async (req, res, next) => {
  try {
    const reg = await registrationService.getRegistrationById(req.params.id);
    await registrationService.deleteRegistration(req.params.id);
    req.flash('success', 'Registration deleted.');
    res.redirect(`/admin/events/${reg.event_id}/registrations`);
  } catch (err) { next(err); }
});

// ─── Expenses ────────────────────────────────────────────────────────────────

router.get('/events/:id/expenses', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    const expenses = await expenseService.getExpensesByEvent(req.params.id);
    const total = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    res.render('admin/expenses', { title: `Expenses — ${event.title}`, event, expenses, total });
  } catch (err) { next(err); }
});

router.get('/events/:id/expenses/new', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    res.render('admin/expense-form', { title: 'Add Expense', event });
  } catch (err) { next(err); }
});

router.post('/events/:id/expenses/new', upload.single('receipt'), async (req, res, next) => {
  try {
    await expenseService.createExpense(req.params.id, req.body, req.file || null);
    req.flash('success', 'Expense added.');
    res.redirect(`/admin/events/${req.params.id}/expenses`);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect(`/admin/events/${req.params.id}/expenses/new`);
  }
});

router.post('/expenses/:id/delete', async (req, res, next) => {
  try {
    const { data: expense } = await db.from('expenses').select('event_id').eq('id', req.params.id).single();
    await expenseService.deleteExpense(req.params.id);
    req.flash('success', 'Expense deleted.');
    res.redirect(expense ? `/admin/events/${expense.event_id}/expenses` : '/admin');
  } catch (err) { next(err); }
});

// ─── Polls ───────────────────────────────────────────────────────────────────

router.get('/events/:id/polls', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    const polls = await pollService.getPollsByEvent(req.params.id);
    res.render('admin/polls', { title: `Polls — ${event.title}`, event, polls });
  } catch (err) { next(err); }
});

router.get('/events/:id/polls/new', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    res.render('admin/poll-form', { title: 'New Poll', event });
  } catch (err) { next(err); }
});

router.post('/events/:id/polls/new', async (req, res, next) => {
  try {
    const { question } = req.body;
    const options = Array.isArray(req.body.options) ? req.body.options : [req.body.options];
    await pollService.createPoll(req.params.id, question, options.filter(Boolean));
    req.flash('success', 'Poll created.');
    res.redirect(`/admin/events/${req.params.id}/polls`);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect(`/admin/events/${req.params.id}/polls/new`);
  }
});

router.post('/polls/:id/toggle', async (req, res, next) => {
  try {
    const poll = await pollService.togglePoll(req.params.id);
    res.redirect(`/admin/events/${poll.event_id}/polls`);
  } catch (err) { next(err); }
});

router.post('/polls/:id/delete', async (req, res, next) => {
  try {
    const poll = await pollService.getPollById(req.params.id);
    await pollService.deletePoll(req.params.id);
    req.flash('success', 'Poll deleted.');
    res.redirect(`/admin/events/${poll.event_id}/polls`);
  } catch (err) { next(err); }
});

// ─── Stalls ──────────────────────────────────────────────────────────────────

router.get('/events/:id/stalls', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    const stalls = await stallService.getStallsByEvent(req.params.id);
    const stallsWithCount = await Promise.all(
      stalls.map(async s => ({
        ...s,
        observations: await stallObservationService.getObservationsByStall(s.id),
      }))
    );
    res.render('admin/stalls', { title: `Stalls — ${event.title}`, event, stalls: stallsWithCount });
  } catch (err) { next(err); }
});

router.get('/events/:id/stalls/new', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    res.render('admin/stall-form', { title: 'New Stall', event, stall: null });
  } catch (err) { next(err); }
});

router.post('/events/:id/stalls/new', async (req, res, next) => {
  try {
    await stallService.createStall(req.params.id, req.body);
    req.flash('success', 'Stall created.');
    res.redirect(`/admin/events/${req.params.id}/stalls`);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect(`/admin/events/${req.params.id}/stalls/new`);
  }
});

router.get('/stalls/:id/edit', async (req, res, next) => {
  try {
    const stall = await stallService.getStallById(req.params.id);
    const event = await eventService.getEventById(stall.event_id);
    res.render('admin/stall-form', { title: 'Edit Stall', event, stall });
  } catch (err) { next(err); }
});

router.post('/stalls/:id/edit', async (req, res, next) => {
  try {
    const stall = await stallService.updateStall(req.params.id, req.body);
    req.flash('success', 'Stall updated.');
    res.redirect(`/admin/events/${stall.event_id}/stalls`);
  } catch (err) { next(err); }
});

router.post('/stalls/:id/delete', async (req, res, next) => {
  try {
    const stall = await stallService.getStallById(req.params.id);
    await stallService.deleteStall(req.params.id);
    req.flash('success', 'Stall deleted.');
    res.redirect(`/admin/events/${stall.event_id}/stalls`);
  } catch (err) { next(err); }
});

// ─── Volunteers ──────────────────────────────────────────────────────────────

router.get('/events/:id/volunteers', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    const volunteers = await volunteerService.getVolunteersByEvent(req.params.id);
    const taskGroups = await settingsService.getAllTaskGroups();
    res.render('admin/volunteers', { title: `Volunteers — ${event.title}`, event, volunteers, taskGroups });
  } catch (err) { next(err); }
});

// ─── Volunteer task type settings ────────────────────────────────────────────

router.get('/settings/volunteer-tasks', async (req, res, next) => {
  try {
    const [stallTaskNames, regTaskNames, qrTaskNames] = await Promise.all([
      settingsService.getStallTaskNames(),
      settingsService.getRegTaskNames(),
      settingsService.getQRTaskNames(),
    ]);
    res.render('admin/volunteer-tasks', { title: 'স্বেচ্ছাসেবী কাজের তালিকা', stallTaskNames, regTaskNames, qrTaskNames });
  } catch (err) { next(err); }
});

router.post('/settings/volunteer-tasks', async (req, res, next) => {
  try {
    await Promise.all([
      settingsService.setStallTaskNames((req.body.stall_task_names || '').trim()),
      settingsService.setRegTaskNames((req.body.reg_task_names || '').trim()),
      settingsService.setQRTaskNames((req.body.qr_task_names || '').trim()),
    ]);
    req.flash('success', 'কাজের তালিকা সংরক্ষিত হয়েছে।');
    res.redirect('/admin/settings/volunteer-tasks');
  } catch (err) { next(err); }
});

router.get('/settings/stall-obs-types', async (req, res, next) => {
  try {
    const stallObsTypes = await settingsService.getStallObsTypes();
    res.render('admin/stall-obs-types', { title: 'স্টল পর্যবেক্ষণ ধরন', stallObsTypes });
  } catch (err) { next(err); }
});

router.post('/settings/stall-obs-types', async (req, res, next) => {
  try {
    await settingsService.setStallObsTypes((req.body.stall_obs_types || '').trim());
    req.flash('success', 'পর্যবেক্ষণ ধরন সংরক্ষিত হয়েছে।');
    res.redirect('/admin/settings/stall-obs-types');
  } catch (err) { next(err); }
});

router.get('/events/:id/volunteers/new', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    res.render('admin/volunteer-form', { title: `নতুন স্বেচ্ছাসেবী — ${event.title}`, event });
  } catch (err) { next(err); }
});

router.post('/events/:id/volunteers/new', async (req, res, next) => {
  try {
    await volunteerService.createVolunteer(req.params.id, req.body);
    req.flash('success', 'স্বেচ্ছাসেবী যোগ করা হয়েছে।');
    res.redirect(`/admin/events/${req.params.id}/volunteers`);
  } catch (err) { next(err); }
});

router.post('/volunteers/:id/approve', async (req, res, next) => {
  try {
    const vol = await volunteerService.updateVolunteerStatus(req.params.id, 'approved');
    req.flash('success', 'Volunteer approved.');
    res.redirect(`/admin/events/${vol.event_id}/volunteers`);
  } catch (err) { next(err); }
});

router.post('/volunteers/:id/reject', async (req, res, next) => {
  try {
    const vol = await volunteerService.updateVolunteerStatus(req.params.id, 'rejected');
    req.flash('success', 'Volunteer rejected.');
    res.redirect(`/admin/events/${vol.event_id}/volunteers`);
  } catch (err) { next(err); }
});

router.post('/volunteers/:id/pending', async (req, res, next) => {
  try {
    const vol = await volunteerService.updateVolunteerStatus(req.params.id, 'pending');
    req.flash('success', 'Volunteer set to pending.');
    res.redirect(`/admin/events/${vol.event_id}/volunteers`);
  } catch (err) { next(err); }
});

router.post('/volunteers/:id/assign-task', async (req, res, next) => {
  try {
    const vol = await volunteerService.assignTask(req.params.id, req.body.task);
    req.flash('success', 'Task assigned.');
    res.redirect(`/admin/events/${vol.event_id}/volunteers`);
  } catch (err) { next(err); }
});

router.post('/volunteers/:id/delete', async (req, res, next) => {
  try {
    const vol = await volunteerService.getVolunteerById(req.params.id);
    await volunteerService.deleteVolunteer(req.params.id);
    req.flash('success', 'Volunteer removed.');
    res.redirect(`/admin/events/${vol.event_id}/volunteers`);
  } catch (err) { next(err); }
});

// ─── Submissions ─────────────────────────────────────────────────────────────

router.get('/events/:id/submissions', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    const submissions = await submissionService.getSubmissionsByEvent(req.params.id);
    res.render('admin/submissions', { title: `Submissions — ${event.title}`, event, submissions });
  } catch (err) { next(err); }
});

router.post('/submissions/:id/approve', async (req, res, next) => {
  try {
    const submission = await submissionService.getSubmissionById(req.params.id);
    const event = await eventService.getEventById(submission.event_id);
    const registration = await registrationService.createRegistration(submission.event_id, {
      name: submission.name,
      email: submission.email,
      payment_reference: submission.payment_reference,
    });
    await submissionService.deleteSubmission(submission.id);
    // Send confirmation email with QR (non-blocking)
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    emailService.sendRegistrationConfirmation(registration, event, baseUrl).catch(err => {
      console.error('[Email] Failed to send confirmation:', err.message);
    });
    req.flash('success', `${submission.name} approved and added to registrations. QR email sent.`);
    res.redirect(`/admin/events/${submission.event_id}/submissions`);
  } catch (err) { next(err); }
});

router.post('/submissions/:id/delete', async (req, res, next) => {
  try {
    const submission = await submissionService.getSubmissionById(req.params.id);
    await submissionService.deleteSubmission(req.params.id);
    req.flash('success', 'Submission removed.');
    res.redirect(`/admin/events/${submission.event_id}/submissions`);
  } catch (err) { next(err); }
});

// ─── Emails ──────────────────────────────────────────────────────────────────

router.get('/events/:id/emails', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    res.render('admin/emails', { title: `Send Email — ${event.title}`, event });
  } catch (err) { next(err); }
});

router.post('/events/:id/emails/send', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    const { subject, body } = req.body;
    const registrations = await registrationService.getRegistrationsByEvent(req.params.id);
    const recipients = registrations.map(r => r.email);

    if (recipients.length === 0) {
      req.flash('error', 'No registered attendees to email.');
      return res.redirect(`/admin/events/${req.params.id}/emails`);
    }

    await emailService.sendPromotionEmail(recipients, subject, body, event.title);

    // Log
    await db.from('email_log').insert({ event_id: req.params.id, subject, recipient_count: recipients.length, sent_at: new Date().toISOString() });

    req.flash('success', `Email sent to ${recipients.length} attendees.`);
    res.redirect(`/admin/events/${req.params.id}/emails`);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect(`/admin/events/${req.params.id}/emails`);
  }
});

// ─── Import ──────────────────────────────────────────────────────────────────

router.get('/events/:id/import', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    res.render('admin/import', { title: `Import — ${event.title}`, event });
  } catch (err) { next(err); }
});

router.post('/events/:id/import', upload.single('excel_file'), async (req, res, next) => {
  try {
    if (!req.file) {
      req.flash('error', 'No file uploaded.');
      return res.redirect(`/admin/events/${req.params.id}/import`);
    }
    const result = await importService.importFromExcel(req.params.id, req.file.buffer);
    const msg = `Imported ${result.registrationsImported} registration(s) and ${result.expensesImported} expense(s).`;
    if (result.errors.length > 0) {
      req.flash('error', `${msg} Errors: ${result.errors.slice(0, 5).join('; ')}`);
    } else {
      req.flash('success', msg);
    }
    res.redirect(`/admin/events/${req.params.id}/import`);
  } catch (err) {
    req.flash('error', `Import failed: ${err.message}`);
    res.redirect(`/admin/events/${req.params.id}/import`);
  }
});

// ─── Reports ─────────────────────────────────────────────────────────────────

router.get('/events/:id/reports', async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    const report = await reportService.getEventReport(req.params.id);
    res.render('admin/reports', { title: `Reports — ${event.title}`, event, report });
  } catch (err) { next(err); }
});

router.get('/events/:id/scan-logs', async (req, res, next) => {
  try {
    const db = require('../config/db');
    const event = await eventService.getEventById(req.params.id);
    const { data: logs } = await db.from('scan_logs').select('*').eq('event_id', req.params.id).order('scanned_at', { ascending: false });
    res.render('admin/scan-logs', { title: `স্ক্যান লগ — ${event.title}`, event, logs: logs || [] });
  } catch (err) { next(err); }
});

// ─── Advertisements ───────────────────────────────────────────────────────────

router.get('/ads', async (req, res, next) => {
  try {
    const ads = await advertisementService.getAllAds();
    res.render('admin/ads', { title: 'বিজ্ঞাপন', ads });
  } catch (err) { next(err); }
});

router.get('/ads/new', (req, res) => {
  res.render('admin/ad-form', { title: 'নতুন বিজ্ঞাপন', ad: null });
});

router.post('/ads/new', upload.single('image'), async (req, res, next) => {
  try {
    let image_url = null;
    if (req.file) {
      const { data, error } = await db.storage.from('ads').upload(
        `${Date.now()}-${req.file.originalname}`, req.file.buffer, { contentType: req.file.mimetype }
      );
      if (!error) image_url = `/storage/ads/${data.path}`;
    }
    await advertisementService.createAd({ ...req.body, image_url });
    req.flash('success', 'বিজ্ঞাপন তৈরি হয়েছে।');
    res.redirect('/admin/ads');
  } catch (err) { next(err); }
});

router.get('/ads/:id/edit', async (req, res, next) => {
  try {
    const ad = await advertisementService.getAdById(req.params.id);
    res.render('admin/ad-form', { title: 'বিজ্ঞাপন সম্পাদনা', ad });
  } catch (err) { next(err); }
});

router.post('/ads/:id/edit', upload.single('image'), async (req, res, next) => {
  try {
    const existing = await advertisementService.getAdById(req.params.id);
    let image_url = existing.image_url;
    if (req.file) {
      const { data, error } = await db.storage.from('ads').upload(
        `${Date.now()}-${req.file.originalname}`, req.file.buffer, { contentType: req.file.mimetype }
      );
      if (!error) image_url = `/storage/ads/${data.path}`;
    }
    await advertisementService.updateAd(req.params.id, { ...req.body, image_url });
    req.flash('success', 'বিজ্ঞাপন আপডেট হয়েছে।');
    res.redirect('/admin/ads');
  } catch (err) { next(err); }
});

router.post('/ads/:id/delete', async (req, res, next) => {
  try {
    await advertisementService.deleteAd(req.params.id);
    req.flash('success', 'বিজ্ঞাপন মুছে ফেলা হয়েছে।');
    res.redirect('/admin/ads');
  } catch (err) { next(err); }
});

// ─── Announcements ────────────────────────────────────────────────────────────

router.get('/announcements', async (req, res, next) => {
  try {
    const announcements = await announcementService.getAllAnnouncements();
    res.render('admin/announcements', { title: 'ঘোষণা', announcements });
  } catch (err) { next(err); }
});

router.get('/announcements/new', (req, res) => {
  res.render('admin/announcement-form', { title: 'নতুন ঘোষণা', announcement: null });
});

router.post('/announcements/new', async (req, res, next) => {
  try {
    await announcementService.createAnnouncement(req.body);
    req.flash('success', 'ঘোষণা তৈরি হয়েছে।');
    res.redirect('/admin/announcements');
  } catch (err) { next(err); }
});

router.get('/announcements/:id/edit', async (req, res, next) => {
  try {
    const announcement = await announcementService.getAnnouncementById(req.params.id);
    res.render('admin/announcement-form', { title: 'ঘোষণা সম্পাদনা', announcement });
  } catch (err) { next(err); }
});

router.post('/announcements/:id/edit', async (req, res, next) => {
  try {
    await announcementService.updateAnnouncement(req.params.id, req.body);
    req.flash('success', 'ঘোষণা আপডেট হয়েছে।');
    res.redirect('/admin/announcements');
  } catch (err) { next(err); }
});

router.post('/announcements/:id/delete', async (req, res, next) => {
  try {
    await announcementService.deleteAnnouncement(req.params.id);
    req.flash('success', 'ঘোষণা মুছে ফেলা হয়েছে।');
    res.redirect('/admin/announcements');
  } catch (err) { next(err); }
});

// ─── Seed ─────────────────────────────────────────────────────────────────────

router.post('/seed', async (req, res, next) => {
  try {
    const names = ['রাহেলা বেগম','মো. আরিফ হোসেন','সুমাইয়া আক্তার','তানভীর আহমেদ','নাজমা খানম','শফিকুল ইসলাম','রুমানা পারভীন','মাহমুদুল হাসান','ফারজানা ইসলাম','আব্দুল্লাহ আল মামুন','তাহমিনা বেগম','রিয়াজ উদ্দিন','নুসরাত জাহান','মশিউর রহমান','শিরীন আক্তার','জাহিদুল হক','মাহফুজা খানম','সাইফুল আলম','রোকেয়া বেগম','ইমরান হোসেন','ডালিয়া রহমান','নাজমুল হুদা','সাবিনা ইয়াসমিন','মিজানুর রহমান','আফসানা মিমি','কামরুজ্জামান','নাদিয়া ইসলাম','হাসিবুর রহমান','মোসাম্মত লাইলা','আনিসুজ্জামান','প্রিয়া দত্ত','সুজন দাস','করিমা বেগম','শহিদুল ইসলাম','লিপি আক্তার','ইসমাইল হোসেন','নুরুন্নাহার','বেলাল হোসেন','তামান্না তাসনিম','রফিকুল ইসলাম'];
    const domains = ['gmail.com','yahoo.com','hotmail.com','outlook.com','bangla.net'];
    const expDescs = ['ভেন্যু ভাড়া','সাউন্ড সিস্টেম','ডেকোরেশন','খাবার ও পানীয়','মুদ্রণ সামগ্রী','পরিবহন','ফটোগ্রাফি','ভিডিওগ্রাফি','স্টেজ ব্যবস্থাপনা','বিদ্যুৎ ও জেনারেটর','নিরাপত্তা','পরিষ্কার সেবা','ফুল ও সজ্জা','আলোকসজ্জা','মিডিয়া কভারেজ','স্মৃতিচিহ্ন','অতিথি আপ্যায়ন','ব্যানার ও সাইনেজ','টেকনিক্যাল সাপোর্ট','রেজিস্ট্রেশন ডেস্ক'];
    const stallNames = ['বাংলাদেশ হস্তশিল্প','জাপানি মিষ্টি','ঐতিহ্যবাহী পোশাক','স্থানীয় রন্ধনশিল্প','বইমেলা','গহনা ও জুয়েলারি','চিত্রকলা প্রদর্শনী','ফটো বুথ','স্বাস্থ্য কর্নার','শিশু খেলাঘর','সংগীত যন্ত্র','মসলা ও আচার','কুটিরশিল্প','মৃৎশিল্প','নকশিকাঁথা','রিকশা চিত্র','ঘরোয়া উদ্ভিদ','ডিজিটাল আর্ট','ফুডকোর্ট','পানীয় স্টল'];
    const volNames = ['সাজিয়া ইসলাম','তাওহীদুল ইসলাম','মারিয়া আক্তার','আরমান হোসেন','জান্নাতুল ফেরদৌস','রিফাত হাসান','সামিয়া রহমান','নাফিস আহমেদ','তানজিলা খানম','শাহেদ আলী','মিথিলা দাস','ওমর ফারুক','আয়েশা সিদ্দিকা','রাকিব হাসান','লুবনা আক্তার'];
    const tasks = ['রেজিস্ট্রেশন ডেস্ক','মঞ্চ ব্যবস্থাপনা','স্বাগত দল','নির্দেশনা সহায়তা','ফটোগ্রাফি সহায়তা','খাদ্য বিতরণ','পার্কিং ব্যবস্থাপনা','তথ্য কেন্দ্র','শিশু যত্ন','প্রাথমিক চিকিৎসা','মিডিয়া টিম','স্টল তদারকি','পরিষ্কার দল','নিরাপত্তা সহায়তা','কারিগরি সহায়তা'];
    const statuses = ['pending','approved','approved','approved','rejected'];

    const eventDefs = [
      { title: 'বাংলা নববর্ষ উৎসব ২০২৪', description: 'বাংলাদেশ সম্প্রদায়ের সবচেয়ে বড় বার্ষিক উৎসব। সংগীত, নৃত্য, খাবার এবং ঐতিহ্যবাহী পোশাকে সমৃদ্ধ এই আয়োজনে সকলকে স্বাগতম।', event_date: '2024-04-14T10:00:00', location: 'টোকিও বাংলাদেশ সেন্টার, জাপান', daysBack: 300 },
      { title: 'ঈদুল আযহা পুনর্মিলন ২০২৪', description: 'পবিত্র ঈদুল আযহা উপলক্ষে প্রবাসী বাংলাদেশিদের মিলনমেলা। একসাথে নামাজ, খাবার এবং আনন্দ ভাগ করে নেওয়ার সুযোগ।', event_date: '2024-06-17T09:00:00', location: 'ওসাকা কমিউনিটি হল, জাপান', daysBack: 200 },
      { title: 'জাপান-বাংলাদেশ সাংস্কৃতিক মেলা ২০২৫', description: 'দুই দেশের সংস্কৃতির মেলবন্ধনে আয়োজিত বিশেষ সাংস্কৃতিক অনুষ্ঠান। বাংলাদেশি ও জাপানি শিল্পীদের পরিবেশনায় এক অসাধারণ সন্ধ্যা।', event_date: '2025-09-20T14:00:00', location: 'শিনজুকু কালচারাল সেন্টার, টোকিও', daysBack: 60 },
    ];

    const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
    const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };

    for (const def of eventDefs) {
      // Create event
      const ev = await eventService.createEvent({
        ...def,
        is_active: true,
        registration_open: true,
        max_capacity: 250,
        price_early_bird: 15,
        early_bird_deadline: new Date(new Date(def.event_date).getTime() - 30 * 86400000).toISOString(),
        price_mid: 25,
        mid_deadline: new Date(new Date(def.event_date).getTime() - 7 * 86400000).toISOString(),
        price_onspot: 35,
      });

      // 200 registrations spread over past ~def.daysBack days
      for (let i = 0; i < 200; i++) {
        const name = names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : '');
        const emailUser = name.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 10) + i;
        const email = `${emailUser}@${rand(domains)}`;
        const dayOffset = randInt(1, def.daysBack);
        const created = daysAgo(dayOffset);
        const isPaid = Math.random() > 0.25;
        await db.from('registrations').insert({
          event_id: ev.id,
          name,
          email,
          payment_reference: `PP-${crypto.randomUUID().slice(0,8).toUpperCase()}`,
          is_paid: isPaid,
          qr_token: crypto.randomUUID(),
          created_at: created,
        });
      }

      // 50 expenses spread over past ~def.daysBack days
      for (let i = 0; i < 50; i++) {
        const dayOffset = randInt(1, def.daysBack);
        await db.from('expenses').insert({
          event_id: ev.id,
          description: expDescs[i % expDescs.length],
          amount: randFloat(50, 800),
          receipt_url: null,
          created_at: daysAgo(dayOffset),
        });
      }

      // 20 stalls
      for (let i = 0; i < 20; i++) {
        const hasVendor = Math.random() > 0.3;
        const vendorIdx = randInt(0, names.length - 1);
        await db.from('stalls').insert({
          event_id: ev.id,
          stall_name: stallNames[i % stallNames.length],
          description: `${stallNames[i % stallNames.length]} বিভাগের স্টল`,
          location_info: `এলাকা ${String.fromCharCode(65 + Math.floor(i / 5))}, বুথ ${(i % 5) + 1}`,
          assigned_to_name: hasVendor ? rand(names) : null,
          assigned_to_email: hasVendor ? `vendor${i}@${rand(domains)}` : null,
          assigned_to_phone: hasVendor ? `+81${randInt(70,90)}${randInt(1000,9999)}${randInt(1000,9999)}` : null,
          is_occupied: hasVendor,
          created_at: daysAgo(randInt(10, def.daysBack)),
        });
      }

      // 15 volunteers
      for (let i = 0; i < 15; i++) {
        const status = statuses[i % statuses.length];
        await db.from('volunteers').insert({
          event_id: ev.id,
          name: volNames[i],
          email: `vol${i}_${ev.id.slice(0,4)}@${rand(domains)}`,
          phone: `+81${randInt(70,90)}${randInt(1000,9999)}${randInt(1000,9999)}`,
          assigned_task: status === 'approved' ? tasks[i % tasks.length] : null,
          status,
          created_at: daysAgo(randInt(5, 60)),
        });
      }
    }

    req.flash('success', '৩টি ইভেন্টে ডেটা পপুলেট হয়েছে — প্রতিটিতে ২০০ নিবন্ধন, ৫০ খরচ, ২০ স্টল, ১৫ স্বেচ্ছাসেবী।');
    res.redirect('/admin');
  } catch (err) {
    req.flash('error', `Seed failed: ${err.message}`);
    res.redirect('/admin');
  }
});

// ─── Translations ────────────────────────────────────────────────────────────

router.get('/translations', async (req, res, next) => {
  try {
    translationService.invalidateCache();
    const all = await translationService.loadAll();
    const { SEEDS, SUPPORTED_LOCALES } = translationService;
    // Build a unified key list: seeds + any extra keys in DB
    const keySet = new Set(SEEDS.map(s => s.key));
    for (const locale of SUPPORTED_LOCALES) {
      if (all[locale]) Object.keys(all[locale]).forEach(k => keySet.add(k));
    }
    const keys = Array.from(keySet).sort();
    res.render('admin/translations', { title: 'Translations', keys, all, SUPPORTED_LOCALES });
  } catch (err) { next(err); }
});

router.post('/translations', async (req, res, next) => {
  try {
    // Form fields named: t[key][locale]
    const t = req.body.t || {};
    const rows = [];
    for (const [key, locales] of Object.entries(t)) {
      for (const [locale, value] of Object.entries(locales)) {
        if (value !== undefined && value !== null) {
          rows.push({ key, locale, value: value.toString() });
        }
      }
    }
    await translationService.bulkUpsert(rows);
    translationService.invalidateCache();
    req.flash('success', 'অনুবাদ সংরক্ষিত হয়েছে।');
    res.redirect('/admin/translations');
  } catch (err) { next(err); }
});

router.post('/translations/add-key', async (req, res, next) => {
  try {
    const { key, value } = req.body;
    if (key && value) {
      await translationService.upsertTranslation(key.trim(), 'bn', value.trim());
      translationService.invalidateCache();
    }
    req.flash('success', 'নতুন কী যোগ হয়েছে।');
    res.redirect('/admin/translations');
  } catch (err) { next(err); }
});

module.exports = router;
