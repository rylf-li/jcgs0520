const { Employee } = require('../models');

const checkRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userRole = req.user?.role;
      
      if (!userRole) {
        return res.status(401).json({ 
          success: false, 
          message: '未授权访问' 
        });
      }

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          success: false, 
          message: '权限不足，无法访问此资源' 
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: '权限检查失败' 
      });
    }
  };
};

const checkAdmin = checkRole('admin');

const checkManager = checkRole('admin', 'manager');

const checkHr = checkRole('admin', 'manager', 'hr');

const checkSales = checkRole('admin', 'manager', 'sales');

const checkSyncAccess = checkRole('admin', 'manager');

const checkConsistencyAccess = checkRole('admin');

const checkHrReportAccess = checkRole('admin', 'manager', 'hr');

const checkBusinessReportAccess = checkRole('admin', 'manager', 'sales');

const checkManagementReportAccess = checkRole('admin', 'manager');

const checkOwnOrAdmin = (idParam = 'id') => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const targetId = parseInt(req.params[idParam]);

      if (userRole === 'admin' || userId === targetId) {
        return next();
      }

      return res.status(403).json({ 
        success: false, 
        message: '只能访问自己的数据' 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: '权限检查失败' 
      });
    }
  };
};

const checkDepartmentAccess = async (req, res, next) => {
  try {
    const userRole = req.user?.role;
    const userDeptId = req.user?.dept_id;
    const targetDeptId = parseInt(req.params.deptId || req.query.deptId || req.body.dept_id);

    if (userRole === 'admin' || userRole === 'manager') {
      return next();
    }

    if (userDeptId && targetDeptId && userDeptId !== targetDeptId) {
      return res.status(403).json({ 
        success: false, 
        message: '只能访问本部门数据' 
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '权限检查失败' 
    });
  }
};

const filterSensitiveFields = (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    if (data && typeof data === 'object') {
      const userRole = req.user?.role;
      
      if (userRole !== 'admin' && userRole !== 'hr') {
        const filterObject = (obj) => {
          if (!obj || typeof obj !== 'object') return obj;
          
          if (Array.isArray(obj)) {
            return obj.map(filterObject);
          }
          
          const filtered = { ...obj };
          const sensitiveFields = ['password', 'salary', 'base_salary', 'actual_salary', 'bank_account', 'id_card'];
          
          for (const field of sensitiveFields) {
            if (field in filtered) {
              delete filtered[field];
            }
          }
          
          return filtered;
        };

        if (data.data) {
          data.data = filterObject(data.data);
        } else {
          data = filterObject(data);
        }
      }
    }
    
    return originalJson(data);
  };
  
  next();
};

module.exports = {
  checkRole,
  checkAdmin,
  checkManager,
  checkHr,
  checkSales,
  checkSyncAccess,
  checkConsistencyAccess,
  checkHrReportAccess,
  checkBusinessReportAccess,
  checkManagementReportAccess,
  checkOwnOrAdmin,
  checkDepartmentAccess,
  filterSensitiveFields
};
