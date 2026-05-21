const express = require('express');
const router = express.Router();
const orgSync = require('../utils/orgSync');
const { SyncTask, SyncLog, Employee, Department, Company } = require('../models');
const auth = require('../middleware/auth');
const { checkSyncAccess, checkAdmin } = require('../middleware/rbac');
const { auditSyncOperation } = require('../middleware/audit');

router.use(auth);
router.use(checkSyncAccess);

router.post('/employee/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { changes, syncBusiness = false } = req.body;
    const operatorId = req.user?.id || null;

    if (syncBusiness) {
      const result = await orgSync.syncBusinessData(id, null, operatorId);
      res.json({ success: true, data: result });
    } else {
      const result = await orgSync.syncEmployeeChange(id, changes || {}, null, operatorId);
      res.json({ success: true, data: result });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/department/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { changes } = req.body;
    const operatorId = req.user?.id || null;

    const result = await orgSync.syncDepartmentChange(id, changes || {}, null, operatorId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/company/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { changes } = req.body;
    const operatorId = req.user?.id || null;

    const result = await orgSync.syncCompanyChange(id, changes || {}, null, operatorId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/batch', auditSyncOperation(), async (req, res) => {
  try {
    const options = req.body;
    const operatorId = req.user?.id || null;

    const result = await orgSync.executeBatchSync(options, operatorId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, syncType } = req.query;
    const offset = (page - 1) * pageSize;
    
    const where = {};
    if (status) where.status = status;
    if (syncType) where.sync_type = syncType;

    const { count, rows } = await SyncTask.findAndCountAll({
      where,
      offset,
      limit: parseInt(pageSize),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        tasks: rows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const task = await SyncTask.findByPk(id, {
      include: [
        {
          model: SyncLog,
          as: 'logs',
          limit: 100,
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!task) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/tasks/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    
    const task = await SyncTask.findByPk(id);
    if (!task) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }

    if (task.status !== 'running') {
      return res.status(400).json({ success: false, message: '任务不在运行状态' });
    }

    await task.update({ status: 'cancelled', end_time: new Date() });
    
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const { page = 1, pageSize = 50, taskId, status, syncType } = req.query;
    const offset = (page - 1) * pageSize;
    
    const where = {};
    if (taskId) where.task_id = taskId;
    if (status) where.status = status;
    if (syncType) where.sync_type = syncType;

    const { count, rows } = await SyncLog.findAndCountAll({
      where,
      offset,
      limit: parseInt(pageSize),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        logs: rows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/incremental', async (req, res) => {
  try {
    const operatorId = req.user?.id || null;
    const result = await orgSync.executeIncrementalSync(operatorId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/affected-business/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const result = await orgSync.getAffectedBusinessData(employeeId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/sync-business/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const result = await orgSync.syncBusinessData(employeeId, null);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [totalTasks, runningTasks, completedTasks, failedTasks] = await Promise.all([
      SyncTask.count(),
      SyncTask.count({ where: { status: 'running' } }),
      SyncTask.count({ where: { status: 'completed' } }),
      SyncTask.count({ where: { status: 'failed' } })
    ]);

    const recentTasks = await SyncTask.findAll({
      limit: 5,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        total: totalTasks,
        running: runningTasks,
        completed: completedTasks,
        failed: failedTasks,
        recentTasks
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
