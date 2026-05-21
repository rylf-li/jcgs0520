const express = require('express');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { success, fail, getPagination } = require('../utils/helpers');
const { applySalesScope } = require('../utils/salesScope');
const { recalculateOrderFinancials, syncOrderPerformance } = require('../utils/paymentFlow');
const models = require('../models');

const router = express.Router();
const { Performance, Order, Contract, Employee } = models;

router.use(auth);

async function normalizePerformancePayload(payload, req) {
  const nextPayload = { ...payload };
  let employee = null;

  if (req.user.role === 'sales') {
    employee = await Employee.findByPk(req.user.id);
  } else if (nextPayload.employee_id) {
    employee = await Employee.findByPk(Number(nextPayload.employee_id));
  } else if (nextPayload.employee_name || nextPayload.name) {
    employee = await Employee.findOne({
      where: { name: nextPayload.employee_name || nextPayload.name }
    });
  }

  if (employee) {
    nextPayload.employee_id = employee.id;
    nextPayload.employee_name = employee.name;
    nextPayload.name = employee.name;
    nextPayload.emp_no = nextPayload.emp_no || employee.phone || '';
    nextPayload.dept_id = nextPayload.dept_id || employee.dept_id || null;
    nextPayload.dept_name = nextPayload.dept_name || employee.dept_name || '';
    nextPayload.company_id = nextPayload.company_id || employee.company_id || null;
    nextPayload.company_name = nextPayload.company_name || employee.company_name || '';
    nextPayload.position = nextPayload.position || employee.position || '';
  }

  if (nextPayload.date) {
    nextPayload.month = String(nextPayload.date).slice(0, 7);
  }

  const amount = Number(
    nextPayload.amount != null ? nextPayload.amount : nextPayload.performance_amount || 0
  );
  nextPayload.amount = amount;
  nextPayload.performance_amount = amount;

  return nextPayload;
}

async function syncOrdersPerformance(req, orders, overwrite) {
  const details = [];

  for (const order of orders) {
    const result = await syncOrderPerformance(order.id, models, {
      overwrite,
      allowDelete: overwrite
    });
    await recalculateOrderFinancials(order.id, models, { skipPerformanceSync: true });
    details.push(result);
  }

  const created = details.filter((item) => item.action === 'create').length;
  const updated = details.filter((item) => item.action === 'update').length;
  const deleted = details.filter((item) => item.action === 'delete').length;
  const skipped = details.filter((item) => ['skip', 'noop'].includes(item.action)).length;
  const processed = created + updated + deleted;
  const skipReasons = {};

  details
    .filter((item) => ['skip', 'noop'].includes(item.action) && item.reason)
    .forEach((item) => {
      skipReasons[item.reason] = (skipReasons[item.reason] || 0) + 1;
    });

  let message = '未找到符合条件的订单';
  if (processed > 0) {
    message = `已同步 ${processed} 条绩效记录（新建${created}，更新${updated}，删除${deleted}，跳过${skipped}）`;
  } else if (skipped > 0) {
    const reasonSummary = Object.entries(skipReasons)
      .map(([reason, count]) => `${reason}(${count}条)`)
      .join('；');
    message = `未生成新绩效记录，全部跳过（${skipped}条）。原因：${reasonSummary || '无可结算绩效'}`;
  }

  return {
    processed,
    created,
    updated,
    deleted,
    skipped,
    skipReasons,
    details,
    message,
  };
}

router.post('/auto-from-orders', async (req, res) => {
  try {
    const { order_ids, date_start, date_end, overwrite = true } = req.body;
    const where = {};

    if (order_ids?.length) {
      where.id = { [Op.in]: order_ids };
    } else {
      where.received_amount = { [Op.gt]: 0 };
    }

    if (date_start && date_end) {
      where.date = { [Op.between]: [date_start, date_end] };
    }

    const orders = await Order.findAll({
      where: applySalesScope(req, where),
      order: [['id', 'DESC']]
    });

    const result = await syncOrdersPerformance(req, orders, overwrite);
    success(res, result, result.message);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/auto-from-contracts', async (req, res) => {
  try {
    const { date_start, date_end, overwrite = true } = req.body;
    const contractWhere = {};

    if (date_start && date_end) {
      contractWhere.date = { [Op.between]: [date_start, date_end] };
    }

    const contracts = await Contract.findAll({
      where: applySalesScope(req, contractWhere),
      attributes: ['id'],
      raw: true
    });
    const contractIds = contracts.map((item) => item.id);
    if (contractIds.length === 0) {
      return success(res, { processed: 0, created: 0, updated: 0, deleted: 0, skipped: 0, details: [] }, '未找到符合条件的合同');
    }

    const orders = await Order.findAll({
      where: applySalesScope(req, {
        contract_id: { [Op.in]: contractIds },
        received_amount: { [Op.gt]: 0 }
      }),
      order: [['id', 'DESC']]
    });

    const result = await syncOrdersPerformance(req, orders, overwrite);
    success(res, result, result.message);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/', async (req, res) => {
  try {
    const { offset, limit } = getPagination(req.query);
    const where = {};

    if (req.query.employee_id) where.employee_id = req.query.employee_id;
    if (req.query.dept_id) where.dept_id = req.query.dept_id;
    if (req.query.order_id) where.order_id = req.query.order_id;
    if (req.query.order_no) where.order_no = { [Op.like]: `%${req.query.order_no}%` };
    if (req.query.source) where.source = { [Op.like]: `%${req.query.source}%` };
    if (req.query.date_start && req.query.date_end) {
      where.date = { [Op.between]: [req.query.date_start, req.query.date_end] };
    }

    const { count, rows } = await Performance.findAndCountAll({
      where: applySalesScope(req, where, 'employee_id', 'employee_name'),
      offset,
      limit,
      order: [['date', 'DESC'], ['id', 'DESC']]
    });
    success(res, { list: rows, total: count });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/all', async (req, res) => {
  try {
    const rows = await Performance.findAll({
      where: applySalesScope(req, {}, 'employee_id', 'employee_name'),
      order: [['date', 'DESC'], ['id', 'DESC']]
    });
    success(res, rows);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await Performance.findOne({
      where: applySalesScope(req, { id: req.params.id }, 'employee_id', 'employee_name'),
      include: [
        { model: Employee, as: 'employee', attributes: ['id', 'name', 'phone', 'position', 'dept_name', 'company_name'] },
        { model: Order, as: 'order', attributes: ['id', 'order_no', 'date', 'total', 'customer_name'] },
        { model: Contract, as: 'contract', attributes: ['id', 'contract_no', 'name', 'amount'] }
      ]
    });
    if (!row) return fail(res, '记录不存在', 404);
    success(res, row);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// 更新绩效状态
router.put('/:id/status', async (req, res) => {
  try {
    const row = await Performance.findOne({
      where: applySalesScope(req, { id: req.params.id }, 'employee_id', 'employee_name')
    });
    if (!row) return fail(res, '记录不存在', 404);
    
    const { status } = req.body;
    if (!status) return fail(res, '状态不能为空', 400);
    
    await row.update({ status });
    success(res, row, '状态更新成功');
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// 绩效统计
router.get('/stats/summary', async (req, res) => {
  try {
    const { employee_id, dept_id, month_start, month_end } = req.query;
    const where = {};
    
    if (employee_id) where.employee_id = employee_id;
    if (dept_id) where.dept_id = dept_id;
    if (month_start && month_end) {
      where.month = { [Op.between]: [month_start, month_end] };
    }
    
    const performances = await Performance.findAll({ where });
    
    const stats = {
      total_count: performances.length,
      total_amount: performances.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
      by_status: {}
    };
    
    performances.forEach(p => {
      const status = p.status || '未设置';
      if (!stats.by_status[status]) {
        stats.by_status[status] = { count: 0, amount: 0 };
      }
      stats.by_status[status].count++;
      stats.by_status[status].amount += parseFloat(p.amount) || 0;
    });
    
    success(res, stats);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = await normalizePerformancePayload(req.body, req);
    const row = await Performance.create(payload);
    if (row.order_id) {
      await recalculateOrderFinancials(row.order_id, models, { skipPerformanceSync: true });
    }
    success(res, row, '绩效记录创建成功');
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const row = await Performance.findOne({
      where: applySalesScope(req, { id: req.params.id }, 'employee_id', 'employee_name')
    });
    if (!row) return fail(res, '记录不存在', 404);

    const payload = await normalizePerformancePayload(req.body, req);
    await row.update(payload);
    if (row.order_id) {
      await recalculateOrderFinancials(row.order_id, models, { skipPerformanceSync: true });
    }
    success(res, row, '绩效记录更新成功');
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const row = await Performance.findOne({
      where: applySalesScope(req, { id: req.params.id }, 'employee_id', 'employee_name')
    });
    if (!row) return fail(res, '记录不存在', 404);
    const orderId = row.order_id;
    await row.destroy();
    if (orderId) {
      await recalculateOrderFinancials(orderId, models, { skipPerformanceSync: true });
    }
    success(res, null, '绩效记录删除成功');
  } catch (err) {
    fail(res, err.message, 500);
  }
});

module.exports = router;
