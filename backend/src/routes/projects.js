const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { success, fail, getPagination } = require('../utils/helpers');
const { Project, Contract, Employee } = require('../models');
const { syncProjectAmount } = require('../utils/syncAmount');
const models = require('../models');
const { applySalesScope } = require('../utils/salesScope');
const { resolveSalesmanPayload } = require('../utils/salesman');

// 列表
router.get('/', auth, async (req, res) => {
  try {
    const { page, pageSize, offset, limit } = getPagination(req.query);
    const where = {};
    if (req.query.name) where.name = { [Op.like]: `%${req.query.name}%` };
    if (req.query.project_no) where.project_no = { [Op.like]: `%${req.query.project_no}%` };
    const { count, rows } = await Project.findAndCountAll({
      where: applySalesScope(req, where),
      offset,
      limit,
      order: [['id', 'DESC']]
    });
    res.json({ success: true, data: { list: rows, total: count } });
  } catch (err) { fail(res, err.message); }
});

// 全部
router.get('/all', auth, async (req, res) => {
  try {
    const rows = await Project.findAll({ where: applySalesScope(req), order: [['id', 'DESC']] });
    success(res, rows);
  } catch (err) { fail(res, err.message); }
});

// 项目金额汇总（从关联合同自动汇总）
router.get('/summary/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ where: applySalesScope(req, { id: req.params.id }) });
    if (!project) return fail(res, '项目不存在', 404);

    // 汇总该项目所有合同的金额
    const summary = await Contract.findAll({
      where: { project_id: req.params.id },
      attributes: [
        [models.sequelize.fn('SUM', models.sequelize.col('amount')), 'amount'],
        [models.sequelize.fn('SUM', models.sequelize.col('receivable')), 'receivable'],
        [models.sequelize.fn('SUM', models.sequelize.col('requested')), 'requested'],
        [models.sequelize.fn('SUM', models.sequelize.col('received')), 'received'],
        [models.sequelize.fn('SUM', models.sequelize.col('cost')), 'cost'],
        [models.sequelize.fn('SUM', models.sequelize.col('tax')), 'tax'],
        [models.sequelize.fn('SUM', models.sequelize.col('labor_cost')), 'labor_cost'],
        [models.sequelize.fn('SUM', models.sequelize.col('business_fee')), 'business_fee'],
        [models.sequelize.fn('SUM', models.sequelize.col('other')), 'other'],
        [models.sequelize.fn('SUM', models.sequelize.col('performance')), 'performance'],
        [models.sequelize.fn('SUM', models.sequelize.col('profit')), 'profit']
      ],
      raw: true
    });

    const data = {
      amount: parseFloat(summary[0]?.amount || 0),
      receivable: parseFloat(summary[0]?.receivable || 0),
      requested: parseFloat(summary[0]?.requested || 0),
      received: parseFloat(summary[0]?.received || 0),
      cost: parseFloat(summary[0]?.cost || 0),
      tax: parseFloat(summary[0]?.tax || 0),
      labor_cost: parseFloat(summary[0]?.labor_cost || 0),
      business_fee: parseFloat(summary[0]?.business_fee || 0),
      other: parseFloat(summary[0]?.other || 0),
      performance: parseFloat(summary[0]?.performance || 0),
      profit: parseFloat(summary[0]?.profit || 0)
    };

    success(res, data);
  } catch (err) { fail(res, err.message, 500); }
});

// 详情（包含关联合同）
router.get('/:id', auth, async (req, res) => {
  try {
    const row = await Project.findOne({ where: applySalesScope(req, { id: req.params.id }) });
    if (!row) return fail(res, '记录不存在');

    // 查询关联合同
    const contracts = await Contract.findAll({
      where: { project_id: req.params.id },
      order: [['id', 'DESC']]
    });

    success(res, { project: row, contracts });
  } catch (err) { fail(res, err.message); }
});

// 新增
router.post('/', auth, async (req, res) => {
  try {
    const payload = await resolveSalesmanPayload(req.body, Employee);
    if (req.user.role === 'sales') {
      payload.salesman_id = req.user.id;
      payload.salesman = req.user.name;
    }
    const row = await Project.create(payload);
    success(res, row);
  } catch (err) { fail(res, err.message); }
});

// 更新
router.put('/:id', auth, async (req, res) => {
  try {
    const row = await Project.findOne({ where: applySalesScope(req, { id: req.params.id }) });
    if (!row) return fail(res, '记录不存在');
    const payload = await resolveSalesmanPayload(req.body, Employee);
    if (req.user.role === 'sales') {
      payload.salesman_id = req.user.id;
      payload.salesman = req.user.name;
    }
    await row.update(payload);
    success(res, row);
  } catch (err) { fail(res, err.message); }
});

// 删除
router.delete('/:id', auth, async (req, res) => {
  try {
    const row = await Project.findOne({ where: applySalesScope(req, { id: req.params.id }) });
    if (!row) return fail(res, '记录不存在');

    // 检查是否有关联合同
    const contractCount = await Contract.count({ where: { project_id: req.params.id } });
    if (contractCount > 0) {
      return fail(res, `该项目下有 ${contractCount} 份合同，请先删除合同`, 400);
    }

    await row.destroy();
    success(res, null);
  } catch (err) { fail(res, err.message); }
});

module.exports = router;
