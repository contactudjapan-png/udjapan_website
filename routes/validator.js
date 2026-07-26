const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('validator/scan', { title: 'QR Validator' });
});

module.exports = router;
