function requireAdmin(req, res, next) {
  if (req.session && req.session.adminUser) {
    return next();
  }
  req.flash('error', 'Please log in to access the admin panel.');
  res.redirect('/admin/login');
}

function requireSuperAdmin(req, res, next) {
  if (req.session && req.session.adminUser && req.session.adminUser.role === 'super') {
    return next();
  }
  req.flash('error', 'Super admin access required.');
  res.redirect('/admin');
}

module.exports = { requireAdmin, requireSuperAdmin };
