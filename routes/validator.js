const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

router.get('/', (req, res) => {
  res.render('validator/scan', { title: 'QR Validator' });
});

module.exports = router;
