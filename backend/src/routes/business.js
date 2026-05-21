const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { success, fail, getPagination } = require('../utils/helpers');
const { Business } = require('../models');

// 列表
router.get('/', auth, async (req, res) => {
  try {
    const { page, pageSize, offset, limit } = getPagination(req.query);
    const { count, rows } = await Business.findAndCountAll({ offset, limit, order: [['id', 'DESC']] });
    res.json({ success: true, data: { list: rows, total: count } });
  } catch (err) { fail(res, err.message); }
});

// 全部
router.get('/all', auth, async (req, res) => {
  try {
    const rows = await Business.findAll({ order: [['id', 'DESC']] });
    success(res, rows);
  } catch (err) { fail(res, err.message); }
});

// 全部列表（兼容前端 /all/list 调用）
router.get('/all/list', auth, async (req, res) => {
  try {
    const rows = await Business.findAll({ order: [['id', 'DESC']] });
    success(res, rows);
  } catch (err) { fail(res, err.message); }
});

// 详情
router.get('/:id', auth, async (req, res) => {
  try {
    const row = await Business.findByPk(req.params.id);
    if (!row) return fail(res, '记录不存在');
    success(res, row);
  } catch (err) { fail(res, err.message); }
});

// 新增
router.post('/', auth, async (req, res) => {
  try {
    // 自动用业务类别填充业务名称
    if (!req.body.name && req.body.category) {
      req.body.name = req.body.category;
    }
    const row = await Business.create(req.body);
    success(res, row);
  } catch (err) { fail(res, err.message); }
});

// 更新
router.put('/:id', auth, async (req, res) => {
  try {
    const row = await Business.findByPk(req.params.id);
    if (!row) return fail(res, '记录不存在');
    // 自动用业务类别填充业务名称
    if (!req.body.name && req.body.category) {
      req.body.name = req.body.category;
    }
    await row.update(req.body);
    success(res, row);
  } catch (err) { fail(res, err.message); }
});

// 删除
router.delete('/:id', auth, async (req, res) => {
  try {
    const row = await Business.findByPk(req.params.id);
    if (!row) return fail(res, '记录不存在');
    await row.destroy();
    success(res, null);
  } catch (err) { fail(res, err.message); }
});

module.exports = router;
