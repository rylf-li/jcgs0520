const { fail } = require('../utils/helpers');

function checkApprovalPermission(allowedRoles = ['admin', 'manager']) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole) {
      return fail(res, '用户未登录或会话已过期', 401);
    }
    
    if (!allowedRoles.includes(userRole)) {
      return fail(res, `无审批权限，需要以下角色之一: ${allowedRoles.join(', ')}`, 403);
    }
    
    next();
  };
}

function checkOwnershipOrPermission(allowedRoles = ['admin', 'manager']) {
  return async (req, res, next) => {
    const userRole = req.user?.role;
    const userId = req.user?.id;
    
    if (!userRole || !userId) {
      return fail(res, '用户未登录或会话已过期', 401);
    }
    
    if (allowedRoles.includes(userRole)) {
      return next();
    }
    
    const resourceUserId = req.body.salesman_id || req.query.salesman_id || req.params.salesman_id;
    
    if (resourceUserId && parseInt(resourceUserId) === parseInt(userId)) {
      return next();
    }
    
    return fail(res, '无权操作此资源', 403);
  };
}

module.exports = {
  checkApprovalPermission,
  checkOwnershipOrPermission
};
