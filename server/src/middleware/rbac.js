const { ApiError } = require('./errorHandler');

// Usage: router.get('/', auth, rbac('admin', 'hr'), handler)
function rbac(...allowedRoles) {
  const roles = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, `Access denied for role '${req.user.role}'. Required: ${roles.join(' or ')}`));
    }
    return next();
  };
}

module.exports = rbac;
