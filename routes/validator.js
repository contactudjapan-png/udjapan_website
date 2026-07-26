const express = require('express');
const router = express.Router();
const db = require('../config/db');

function requireValidator(req, res, next) {
  if (req.session.adminUser || req.session.volunteerUser) return next();
  res.redirect('/validate/login');
}

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
    const { data } = await db.from('volunteers').select('*').eq('email', email).eq('status', 'approved');
    if (!data || data.length === 0) {
      req.flash('error', 'No approved volunteer found with that email.');
      return res.redirect('/validate/login');
    }
    req.session.volunteerUser = { email, name: data[0].name };
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

router.use(requireValidator);

router.get('/', (req, res) => {
  const user = req.session.volunteerUser || req.session.adminUser;
  res.render('validator/scan', { title: 'QR Validator', user });
});

module.exports = router;
