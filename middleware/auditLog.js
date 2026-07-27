const auditService = require('../services/auditService');

// Map URL patterns to entity info
function parseRequest(req) {
  const path = req.path;
  const method = req.method;

  if (method === 'GET') return null; // only log mutations

  let action = 'update';
  let entityType = 'unknown';
  let entityId = null;

  if (path.includes('/delete')) action = 'delete';
  else if (path.includes('/new') || path.endsWith('/approve') || path.endsWith('/reject') || path.endsWith('/promote')) action = 'create';
  else if (path.includes('/toggle-paid') || path.endsWith('/assign-task') || path.endsWith('/start-session') || path.endsWith('/stop-session')) action = 'update';
  else if (path.includes('/logout')) return null;

  if (path.includes('/registrations')) entityType = 'registration';
  else if (path.includes('/expenses')) entityType = 'expense';
  else if (path.includes('/incomes')) entityType = 'income';
  else if (path.includes('/volunteers')) entityType = 'volunteer';
  else if (path.includes('/submissions')) entityType = 'submission';
  else if (path.includes('/stalls')) entityType = 'stall';
  else if (path.includes('/waitlist')) entityType = 'waitlist';
  else if (path.includes('/refunds')) entityType = 'refund';
  else if (path.includes('/polls')) entityType = 'poll';
  else if (path.includes('/events')) entityType = 'event';
  else if (path.includes('/ads')) entityType = 'advertisement';
  else if (path.includes('/announcements')) entityType = 'announcement';
  else if (path.includes('/settings')) entityType = 'settings';
  else if (path.includes('/bulk-payment')) entityType = 'bulk_payment';

  // Try to extract entity ID from path segments
  const segments = path.split('/').filter(Boolean);
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].match(/^[0-9a-f]{8}-[0-9a-f]{4}-/)) {
      entityId = segments[i];
      break;
    }
  }

  return { action, entityType, entityId };
}

module.exports = function auditLog(req, res, next) {
  const info = parseRequest(req);
  if (!info) return next();

  const originalRedirect = res.redirect.bind(res);
  res.redirect = function(url) {
    const userEmail = req.session && req.session.adminUser ? req.session.adminUser.email : null;
    auditService.log(userEmail, info.action, info.entityType, info.entityId, {
      path: req.path, method: req.method,
    }).catch(() => {});
    return originalRedirect(url);
  };

  next();
};
