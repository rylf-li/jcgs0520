const express = require('express');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { success, fail } = require('../utils/helpers');
const { applySalesScope } = require('../utils/salesScope');
const { generateDailySnapshots } = require('../utils/statsSnapshot');
const models = require('../models');

const router = express.Router();
const { DeptStats, CompanyStats, CustomerStats } = models;

router.use(auth);

function snapshotDate(req) {
  return req.query.date || req.body?.date || new Date().toISOString().slice(0, 10);
}

router.post('/generate-daily', async (req, res) => {
  try {
    const result = await generateDailySnapshots(snapshotDate(req), models);
    success(res, result, '统计快照已生成');
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/status', async (req, res) => {
  try {
    const [lastDept, lastCompany, lastCustomer, deptCount, companyCount, customerCount] = await Promise.all([
      DeptStats.max('date'),
      CompanyStats.max('date'),
      CustomerStats.max('date'),
      DeptStats.count({ where: { date: snapshotDate(req) } }),
      CompanyStats.count({ where: { date: snapshotDate(req) } }),
      CustomerStats.count({ where: { date: snapshotDate(req) } })
    ]);

    success(res, {
      target_date: snapshotDate(req),
      last_dates: {
        departments: lastDept,
        companies: lastCompany,
        customers: lastCustomer
      },
      current_counts: {
        departments: deptCount,
        companies: companyCount,
        customers: customerCount
      }
    });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/departments', async (req, res) => {
  try {
    const where = { date: snapshotDate(req) };
    if (req.query.dept_name) where.dept_name = { [Op.like]: `%${req.query.dept_name}%` };
    if (req.query.company_name) where.company_name = { [Op.like]: `%${req.query.company_name}%` };
    const rows = await DeptStats.findAll({
      where,
      order: [['dept_name', 'ASC']],
      raw: true
    });
    success(res, rows);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/companies', async (req, res) => {
  try {
    const where = { date: snapshotDate(req) };
    if (req.query.company_name) where.company_name = { [Op.like]: `%${req.query.company_name}%` };
    if (req.query.dept_name) where.dept_name = { [Op.like]: `%${req.query.dept_name}%` };
    const rows = await CompanyStats.findAll({
      where,
      order: [['company_name', 'ASC'], ['dept_name', 'ASC']],
      raw: true
    });
    success(res, rows);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/customers', async (req, res) => {
  try {
    const where = { date: snapshotDate(req) };
    if (req.query.customer_name) where.customer_name = { [Op.like]: `%${req.query.customer_name}%` };
    const rows = await CustomerStats.findAll({
      where,
      order: [['customer_name', 'ASC']],
      raw: true
    });
    success(res, rows);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/dirty-orders', async (req, res) => {
  try {
    const { Order, OrderItem } = models;
    const rows = await Order.findAll({
      where: applySalesScope(req, { is_dirty: 1 }),
      include: [{ model: OrderItem, as: 'items', required: false }],
      order: [['updatedAt', 'DESC']]
    });
    success(res, rows);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

module.exports = router;
