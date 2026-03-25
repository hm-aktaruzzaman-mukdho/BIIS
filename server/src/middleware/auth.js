function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Please log in to continue' });
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Please log in to continue' });
    }
    if (req.session.user.role !== role) {
      return res.status(403).json({ error: 'You do not have permission to access this resource' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
