const { sequelize } = require('../models');
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs/audit');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function getAuditLogFile() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIR, `audit_${date}.log`);
}

class AuditLogService {
  async log(action, req, details = {}) {
    try {
      const logData = {
        action,
        user_id: req.user?.id || null,
        user_name: req.user?.name || '系统',
        user_role: req.user?.role || null,
        ip: req.ip || req.connection?.remoteAddress || null,
        method: req.method,
        path: req.path,
        timestamp: new Date(),
        ...details
      };

      const logEntry = JSON.stringify(logData);
      console.log('[AUDIT]', logEntry);

      // 持久化到日志文件
      try {
        fs.appendFileSync(getAuditLogFile(), `[${new Date().toISOString()}] ${logEntry}\n`);
      } catch (e) {
        console.error('[AUDIT FILE ERROR]', e.message);
      }

      return logData;
    } catch (error) {
      console.error('[AUDIT ERROR]', error.message);
    }
  }

  async logOrgChange(req, entityType, entityId, changes, previousData = null) {
    return await this.log('org_change', req, {
      entity_type: entityType,
      entity_id: entityId,
      changes,
      previous_data: previousData,
      description: `${entityType}数据变更`
    });
  }

  async logSyncOperation(req, syncType, scope, result) {
    return await this.log('sync_operation', req, {
      sync_type: syncType,
      scope,
      result,
      description: `执行${syncType}同步操作`
    });
  }

  async logFixOperation(req, fixItems, result) {
    return await this.log('fix_operation', req, {
      fix_count: fixItems.length,
      result,
      description: `修复${fixItems.length}条不一致数据`
    });
  }

  async logDataAccess(req, resourceType, resourceId = null) {
    return await this.log('data_access', req, {
      resource_type: resourceType,
      resource_id: resourceId,
      description: `访问${resourceType}数据`
    });
  }
}

const auditLog = new AuditLogService();

const auditMiddleware = (action) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      if (data && data.success) {
        auditLog.log(action, req, {
          response_status: 'success',
          response_data: data
        }).catch(err => console.error('[AUDIT]', err.message));
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

const auditOrgChange = (entityType) => {
  return async (req, res, next) => {
    const entityId = req.params.id;
    
    const originalJson = res.json.bind(res);
    
    res.json = async function(data) {
      if (data && data.success) {
        try {
          await auditLog.logOrgChange(req, entityType, entityId, req.body);
        } catch (err) {
          console.error('[AUDIT]', err.message);
        }
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

const auditSyncOperation = () => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = async function(data) {
      if (data && data.success) {
        try {
          await auditLog.logSyncOperation(
            req, 
            req.body.syncType || 'unknown',
            req.body.scope || 'unknown',
            data.data
          );
        } catch (err) {
          console.error('[AUDIT]', err.message);
        }
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

const auditFixOperation = () => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = async function(data) {
      if (data && data.success) {
        try {
          await auditLog.logFixOperation(
            req,
            req.body.fixItems || [],
            data.data
          );
        } catch (err) {
          console.error('[AUDIT]', err.message);
        }
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

module.exports = {
  auditLog,
  auditMiddleware,
  auditOrgChange,
  auditSyncOperation,
  auditFixOperation
};
