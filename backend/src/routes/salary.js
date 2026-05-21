const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { success, fail, getPagination } = require('../utils/helpers');
const { Salary, Employee, Performance, Department, Company } = require('../models');
const { Op } = require('sequelize');

// 列表
router.get('/', auth, async (req, res) => {
  try {
    const { page, pageSize, offset, limit } = getPagination(req.query);
    const { count, rows } = await Salary.findAndCountAll({ offset, limit, order: [['id', 'DESC']] });
    res.json({ success: true, data: { list: rows, total: count } });
  } catch (err) { fail(res, err.message); }
});

// 全部
router.get('/all', auth, async (req, res) => {
  try {
    const rows = await Salary.findAll({ order: [['id', 'DESC']] });
    success(res, rows);
  } catch (err) { fail(res, err.message); }
});

// 详情
router.get('/:id', auth, async (req, res) => {
  try {
    const row = await Salary.findByPk(req.params.id, {
      include: [
        { model: Employee, as: 'employee', attributes: ['id', 'name', 'phone', 'position', 'dept_name', 'company_name'] }
      ]
    });
    if (!row) return fail(res, '记录不存在');
    success(res, row);
  } catch (err) { fail(res, err.message); }
});

// 获取员工当月绩效列表
router.get('/:id/performances', auth, async (req, res) => {
  try {
    const salary = await Salary.findByPk(req.params.id);
    if (!salary) return fail(res, '工资记录不存在');
    
    const performances = await Performance.findAll({
      where: {
        employee_id: salary.employee_id,
        month: salary.month
      },
      order: [['date', 'DESC']],
      attributes: ['id', 'date', 'amount', 'source', 'order_no', 'contract_no', 'status']
    });
    
    const total = performances.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    
    success(res, { list: performances, total });
  } catch (err) { fail(res, err.message); }
});

// 自动汇总绩效到工资
router.post('/:id/auto-performance', auth, async (req, res) => {
  try {
    const salary = await Salary.findByPk(req.params.id);
    if (!salary) return fail(res, '工资记录不存在');
    
    const performances = await Performance.findAll({
      where: {
        employee_id: salary.employee_id,
        month: salary.month
      }
    });
    
    const total = performances.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    
    await salary.update({ performance_amount: total });
    
    success(res, { 
      updated: true, 
      performance_amount: total, 
      count: performances.length 
    }, `已汇总 ${performances.length} 条绩效，总额 ${total.toFixed(2)}`);
  } catch (err) { fail(res, err.message); }
});

// 工资统计
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const { dept_id, company_id, month_start, month_end } = req.query;
    const where = {};
    
    if (dept_id) where.dept_id = dept_id;
    if (company_id) where.company_id = company_id;
    if (month_start && month_end) {
      where.month = { [Op.between]: [month_start, month_end] };
    }
    
    const salaries = await Salary.findAll({ where });
    
    const stats = {
      total_count: salaries.length,
      total_salary: salaries.reduce((sum, s) => sum + (parseFloat(s.base_salary) || 0), 0),
      total_performance: salaries.reduce((sum, s) => sum + (parseFloat(s.performance_amount) || 0), 0),
      total_bonus: salaries.reduce((sum, s) => sum + (parseFloat(s.bonus) || 0), 0),
      total_deduction: salaries.reduce((sum, s) => sum + (parseFloat(s.deduction) || 0), 0),
      total_actual: salaries.reduce((sum, s) => sum + (parseFloat(s.actual_salary) || 0), 0)
    };
    
    success(res, stats);
  } catch (err) { fail(res, err.message); }
});

// 新增
router.post('/', auth, async (req, res) => {
  try {
    const row = await Salary.create(req.body);
    success(res, row);
  } catch (err) { fail(res, err.message); }
});

// 更新
router.put('/:id', auth, async (req, res) => {
  try {
    const row = await Salary.findByPk(req.params.id);
    if (!row) return fail(res, '记录不存在');
    await row.update(req.body);
    success(res, row);
  } catch (err) { fail(res, err.message); }
});

// 删除
router.delete('/:id', auth, async (req, res) => {
  try {
    const row = await Salary.findByPk(req.params.id);
    if (!row) return fail(res, '记录不存在');
    await row.destroy();
    success(res, null);
  } catch (err) { fail(res, err.message); }
});

module.exports = router;
