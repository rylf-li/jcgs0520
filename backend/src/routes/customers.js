const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { success, fail, getPagination } = require('../utils/helpers');
const { Customer, Project, Contract, Order } = require('../models');
const { Op } = require('sequelize');

// 列表
router.get('/', auth, async (req, res) => {
  try {
    const { page, pageSize, offset, limit } = getPagination(req.query);
    const { count, rows } = await Customer.findAndCountAll({ offset, limit, order: [['id', 'DESC']] });
    res.json({ success: true, data: { list: rows, total: count } });
  } catch (err) { fail(res, err.message); }
});

// 全部
router.get('/all', auth, async (req, res) => {
  try {
    const rows = await Customer.findAll({ order: [['id', 'DESC']] });
    success(res, rows);
  } catch (err) { fail(res, err.message); }
});

// 全部列表（兼容前端 /all/list 调用）
router.get('/all/list', auth, async (req, res) => {
  try {
    const rows = await Customer.findAll({ order: [['id', 'DESC']] });
    success(res, rows);
  } catch (err) { fail(res, err.message); }
});

// 检查客户名称唯一性
router.post('/check-name', auth, async (req, res) => {
  try {
    const { name, excludeId } = req.body;
    const where = { name };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    const existing = await Customer.findOne({ where });
    success(res, !existing);
  } catch (err) { fail(res, err.message); }
});

// 详情
router.get('/:id', auth, async (req, res) => {
  try {
    const row = await Customer.findByPk(req.params.id);
    if (!row) return fail(res, '记录不存在');
    success(res, row);
  } catch (err) { fail(res, err.message); }
});

// 新增
router.post('/', auth, async (req, res) => {
  try {
    const row = await Customer.create(req.body);
    success(res, row);
  } catch (err) { fail(res, err.message); }
});

// 更新
router.put('/:id', auth, async (req, res) => {
  try {
    const row = await Customer.findByPk(req.params.id);
    if (!row) return fail(res, '记录不存在');
    await row.update(req.body);
    success(res, row);
  } catch (err) { fail(res, err.message); }
});

// 删除
router.delete('/:id', auth, async (req, res) => {
  try {
    const row = await Customer.findByPk(req.params.id);
    if (!row) return fail(res, '记录不存在');
    await row.destroy();
    success(res, null);
  } catch (err) { fail(res, err.message); }
});

// 获取客户关联的项目列表
router.get('/:id/projects', auth, async (req, res) => {
  try {
    const { page, pageSize, offset, limit } = getPagination(req.query);
    const { count, rows } = await Project.findAndCountAll({
      where: { customer_id: req.params.id },
      offset, limit,
      order: [['id', 'DESC']],
      attributes: ['id', 'name', 'status', 'amount', 'date', 'salesman']
    });
    res.json({ success: true, data: { list: rows, total: count } });
  } catch (err) { fail(res, err.message); }
});

// 获取客户关联合同列表
router.get('/:id/contracts', auth, async (req, res) => {
  try {
    const { page, pageSize, offset, limit } = getPagination(req.query);
    const { count, rows } = await Contract.findAndCountAll({
      where: { customer_id: req.params.id },
      offset, limit,
      order: [['id', 'DESC']],
      attributes: ['id', 'contract_no', 'name', 'date', 'amount', 'status']
    });
    res.json({ success: true, data: { list: rows, total: count } });
  } catch (err) { fail(res, err.message); }
});

// 获取客户订单统计
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const customerId = req.params.id;
    const projects = await Project.findAll({ where: { customer_id: customerId }, attributes: ['id'] });
    const projectIds = projects.map(p => p.id);
    
    if (projectIds.length === 0) {
      return success(res, {
        order_count: 0,
        total_amount: 0,
        total_requested: 0,
        total_received: 0,
        unreceived_amount: 0
      });
    }
    
    const contracts = await Contract.findAll({ where: { project_id: { [Op.in]: projectIds } }, attributes: ['id'] });
    const contractIds = contracts.map(c => c.id);
    
    if (contractIds.length === 0) {
      return success(res, {
        order_count: 0,
        total_amount: 0,
        total_requested: 0,
        total_received: 0,
        unreceived_amount: 0
      });
    }
    
    const orders = await Order.findAll({
      where: { contract_id: { [Op.in]: contractIds } },
      attributes: ['total', 'requested_amount', 'received_amount']
    });
    
    const stats = {
      order_count: orders.length,
      total_amount: orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0),
      total_requested: orders.reduce((sum, o) => sum + (parseFloat(o.requested_amount) || 0), 0),
      total_received: orders.reduce((sum, o) => sum + (parseFloat(o.received_amount) || 0), 0)
    };
    stats.unreceived_amount = stats.total_requested - stats.total_received;
    
    success(res, stats);
  } catch (err) { fail(res, err.message); }
});

module.exports = router;
