const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { success, fail, getPagination } = require('../utils/helpers');
const { Department, Employee, Project, Order, Performance, Contract } = require('../models');
const { Op } = require('sequelize');

// 列表
router.get('/', auth, async (req, res) => {
  try {
    const { page, pageSize, offset, limit } = getPagination(req.query);
    const { count, rows } = await Department.findAndCountAll({ offset, limit, order: [['id', 'DESC']] });
    res.json({ success: true, data: { list: rows, total: count } });
  } catch (err) { fail(res, err.message); }
});

// 全部
router.get('/all', auth, async (req, res) => {
  try {
    const rows = await Department.findAll({ order: [['id', 'DESC']] });
    success(res, rows);
  } catch (err) { fail(res, err.message); }
});

// 全部列表（兼容前端 /all/list 调用）
router.get('/all/list', auth, async (req, res) => {
  try {
    const rows = await Department.findAll({ order: [['id', 'DESC']] });
    success(res, rows);
  } catch (err) { fail(res, err.message); }
});

// 详情
router.get('/:id', auth, async (req, res) => {
  try {
    const row = await Department.findByPk(req.params.id);
    if (!row) return fail(res, '记录不存在');
    success(res, row);
  } catch (err) { fail(res, err.message); }
});

// 新增
router.post('/', auth, async (req, res) => {
  try {
    const row = await Department.create(req.body);
    success(res, row);
  } catch (err) { fail(res, err.message); }
});

// 更新
router.put('/:id', auth, async (req, res) => {
  try {
    const row = await Department.findByPk(req.params.id);
    if (!row) return fail(res, '记录不存在');
    
    const payload = { ...req.body };
    
    // 如果更新了 company_id，同步更新 company_name
    if (payload.company_id !== undefined) {
      if (payload.company_id) {
        const company = await require('../models').Company.findByPk(payload.company_id);
        if (company) {
          payload.company_name = company.name;
        }
      } else {
        payload.company_name = null;
      }
    }
    
    await row.update(payload);
    
    // 重新查询返回完整数据
    const updated = await Department.findByPk(row.id);
    success(res, updated);
  } catch (err) { fail(res, err.message); }
});

// 删除
router.delete('/:id', auth, async (req, res) => {
  try {
    const row = await Department.findByPk(req.params.id);
    if (!row) return fail(res, '记录不存在');
    await row.destroy();
    success(res, null);
  } catch (err) { fail(res, err.message); }
});

// 获取部门员工列表
router.get('/:id/employees', auth, async (req, res) => {
  try {
    const { page, pageSize, offset, limit } = getPagination(req.query);
    const dept = await Department.findByPk(req.params.id);
    if (!dept) return fail(res, '部门不存在');
    
    const { count, rows } = await Employee.findAndCountAll({
      where: { dept_id: req.params.id },
      offset, limit,
      order: [['id', 'DESC']],
      attributes: ['id', 'name', 'position', 'status']
    });
    
    const employeesWithFlag = rows.map(emp => ({
      ...emp.toJSON(),
      is_manager: dept.manager_id === emp.id
    }));
    
    res.json({ success: true, data: { list: employeesWithFlag, total: count } });
  } catch (err) { fail(res, err.message); }
});

// 获取部门参与的项目列表
router.get('/:id/projects', auth, async (req, res) => {
  try {
    const { page, pageSize, offset, limit } = getPagination(req.query);
    const { count, rows } = await Project.findAndCountAll({
      where: { dept_id: req.params.id },
      offset, limit,
      order: [['id', 'DESC']],
      attributes: ['id', 'name', 'status', 'salesman', 'date']
    });
    res.json({ success: true, data: { list: rows, total: count } });
  } catch (err) { fail(res, err.message); }
});

// 获取部门业绩统计和员工业绩排行
router.get('/:id/performance', auth, async (req, res) => {
  try {
    const deptId = req.params.id;
    
    const contracts = await Contract.findAll({ where: { dept_id: deptId }, attributes: ['id'] });
    const contractIds = contracts.map(c => c.id);
    
    let orderStats = { total_amount: 0, total_requested: 0, total_received: 0 };
    if (contractIds.length > 0) {
      const orders = await Order.findAll({
        where: { contract_id: { [Op.in]: contractIds } },
        attributes: ['total', 'requested_amount', 'received_amount']
      });
      orderStats = {
        total_amount: orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0),
        total_requested: orders.reduce((sum, o) => sum + (parseFloat(o.requested_amount) || 0), 0),
        total_received: orders.reduce((sum, o) => sum + (parseFloat(o.received_amount) || 0), 0)
      };
    }
    
    const performances = await Performance.findAll({
      where: { dept_id: deptId },
      attributes: ['employee_id', 'employee_name', 'amount'],
      order: [['amount', 'DESC']]
    });
    
    const employeeRankings = [];
    const employeeMap = new Map();
    for (const p of performances) {
      if (!employeeMap.has(p.employee_id)) {
        employeeMap.set(p.employee_id, {
          employee_id: p.employee_id,
          employee_name: p.employee_name,
          total_performance: 0
        });
      }
      employeeMap.get(p.employee_id).total_performance += parseFloat(p.amount) || 0;
    }
    
    for (const [, value] of employeeMap) {
      employeeRankings.push(value);
    }
    employeeRankings.sort((a, b) => b.total_performance - a.total_performance);
    
    const totalPerformance = employeeRankings.reduce((sum, e) => sum + e.total_performance, 0);
    
    success(res, {
      order_total: orderStats.total_amount,
      received_total: orderStats.total_received,
      performance_total: totalPerformance,
      employee_rankings: employeeRankings.slice(0, 10)
    });
  } catch (err) { fail(res, err.message); }
});

module.exports = router;
