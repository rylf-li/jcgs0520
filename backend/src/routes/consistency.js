const express = require('express');
const router = express.Router();
const consistencyCheck = require('../utils/consistencyCheck');
const auth = require('../middleware/auth');
const { checkConsistencyAccess } = require('../middleware/rbac');

router.use(auth);
router.use(checkConsistencyAccess);

router.get('/check/department', async (req, res) => {
  try {
    const { deptId } = req.query;
    const result = await consistencyCheck.checkDepartmentConsistency(deptId || null);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/check/employee', async (req, res) => {
  try {
    const { employeeId } = req.query;
    const result = await consistencyCheck.checkEmployeeConsistency(employeeId || null);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/check/business', async (req, res) => {
  try {
    const { type = 'all', businessId } = req.query;
    const result = await consistencyCheck.checkBusinessConsistency(type, businessId || null);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/check/all', async (req, res) => {
  try {
    const result = await consistencyCheck.checkAllConsistency();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/fix/preview', async (req, res) => {
  try {
    const { inconsistencies } = req.body;
    
    if (!inconsistencies || inconsistencies.length === 0) {
      return res.json({ success: true, data: { suggestions: [], message: '无需要修复的数据' } });
    }

    const suggestions = consistencyCheck.generateFixSuggestions(inconsistencies);
    res.json({ success: true, data: { suggestions, total: suggestions.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/fix/execute', async (req, res) => {
  try {
    const { fixItems } = req.body;
    
    if (!fixItems || fixItems.length === 0) {
      return res.json({ success: true, data: { message: '无需要修复的项目' } });
    }

    const result = await consistencyCheck.executeFix(fixItems, false);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/auto-fix', async (req, res) => {
  try {
    const { dryRun = true } = req.body;
    const result = await consistencyCheck.autoFixInconsistencies(dryRun);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const result = await consistencyCheck.checkAllConsistency();
    
    const summary = {
      totalChecked: 
        result.summary.departments.checked +
        result.summary.employees.checked +
        result.summary.orders.checked +
        result.summary.contracts.checked +
        result.summary.projects.checked,
      totalInconsistent: result.totalInconsistent,
      byType: result.summary
    };

    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
