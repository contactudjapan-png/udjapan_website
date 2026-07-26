function requireAdmin(req, res, next) {
  if (req.session && req.session.adminUser) {
    return next();
  }
  req.flash('error', 'Please log in to access the admin panel.');
  res.redirect('/admin/login');
}

module.exports = { requireAdmin };
