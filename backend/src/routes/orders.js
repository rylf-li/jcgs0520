const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkApprovalPermission } = require('../middleware/checkApprovalPermission');
const { success, fail, getPagination } = require('../utils/helpers');
const { Order, OrderItem, Contract, Employee, PaymentRequest, Receipt, ReceiptItem, Performance, OrderStatusHistory } = require('../models');
const { syncContractAmount, syncProjectAmount } = require('../utils/syncAmount');
const models = require('../models');
const { sequelize } = models;
const { applySalesScope } = require('../utils/salesScope');
const { resolveSalesmanPayload } = require('../utils/salesman');
const { recalculateOrderFinancials } = require('../utils/paymentFlow');
const paginationService = require('../services/paginationService');
const batchService = require('../services/batchService');
const filterService = require('../services/filterService');

/**
 * 订单变更后触发合同和项目的金额同步
 * @param {number} contractId - 合同ID
 */
async function triggerContractSync(contractId) {
  if (!contractId) return;
  try {
    await syncContractAmount(contractId, models);
    const contract = await Contract.findByPk(contractId);
    if (contract && contract.project_id) {
      await syncProjectAmount(contract.project_id, models);
    }
  } catch (err) {
    console.error(`[triggerContractSync] contract ${contractId} error:`, err.message);
  }
}

function normalizeComparableValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number(value.toFixed(2));
  const numberValue = Number(value);
  if (!Number.isNaN(numberValue) && String(value).trim() !== '') {
    return Number(numberValue.toFixed(2));
  }
  return String(value);
}

function diffOrderFields(currentRow, nextData) {
  const trackedFields = [
    { key: 'contract_id', label: '关联合同' },
    { key: 'contract_no', label: '合同编号' },
    { key: 'project_name', label: '项目名称' },
    { key: 'customer_name', label: '客户名称' },
    { key: 'total', label: '订单合计金额' },
    { key: 'settlement_fee', label: '订单结算费' },
    { key: 'performance_fee', label: '订单绩效费' },
    { key: 'salesman_id', label: '业务员ID' },
    { key: 'salesman', label: '业务员' },
    { key: 'status', label: '订单状态' }
  ];

  return trackedFields
    .filter(({ key }) => Object.prototype.hasOwnProperty.call(nextData, key))
    .filter(({ key }) => normalizeComparableValue(currentRow[key]) !== normalizeComparableValue(nextData[key]));
}

async function hasLockedDownstream(orderId, transaction = null) {
  const [paymentCount, receiptCount, perfCount] = await Promise.all([
    PaymentRequest.count({ where: { order_id: orderId }, transaction }),
    ReceiptItem.count({ 
      where: { 
        payment_request_id: { 
          [require('sequelize').Op.in]: require('sequelize').literal(
            `(SELECT id FROM payment_requests WHERE order_id = ${orderId})`
          )
        }
      },
      transaction
    }),
    Performance.count({ where: { order_id: orderId }, transaction })
  ]);
  
  return {
    locked: paymentCount > 0 || receiptCount > 0 || perfCount > 0,
    paymentCount,
    receiptCount,
    perfCount
  };
}

// 列表
router.get('/', auth, async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const { page = 1, pageSize = 20 } = req.query;
    
    const filters = filterService.sanitizeFilters({
      status: req.query.status,
      order_no: req.query.order_no ? { like: req.query.order_no } : null,
      contract_no: req.query.contract_no ? { like: req.query.contract_no } : null,
      project_name: req.query.project_name ? { like: req.query.project_name } : null,
      customer_name: req.query.customer_name ? { like: req.query.customer_name } : null,
      is_dirty: req.query.is_dirty !== undefined && req.query.is_dirty !== '' ? Number(req.query.is_dirty) : null,
      companyId: req.query.companyId,
      deptId: req.query.deptId
    });

    const where = { ...filters };
    if (filters.order_no) {
      where.order_no = { [Op.like]: `%${req.query.order_no}%` };
      delete where.order_no;
    }
    if (filters.contract_no) {
      where.contract_no = { [Op.like]: `%${req.query.contract_no}%` };
      delete where.contract_no;
    }
    if (filters.project_name) {
      where.project_name = { [Op.like]: `%${req.query.project_name}%` };
      delete where.project_name;
    }
    if (filters.customer_name) {
      where.customer_name = { [Op.like]: `%${req.query.customer_name}%` };
      delete where.customer_name;
    }

    const result = await paginationService.paginate(
      Order,
      {
        where: applySalesScope(req, where),
        include: [{ model: OrderItem, as: 'items', required: false }]
      },
      { page, pageSize }
    );

    res.json({ 
      success: true, 
      data: {
        list: result.data,
        total: result.pagination.total,
        pagination: result.pagination
      }
    });
  } catch (err) { 
    fail(res, err.message); 
  }
});

// 全部
router.get('/all', auth, async (req, res) => {
  try {
    const rows = await Order.findAll({ where: applySalesScope(req), order: [['id', 'DESC']] });
    success(res, rows);
  } catch (err) { fail(res, err.message); }
});

// 统计
router.get('/stats', auth, async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.order_no) where.order_no = { [Op.like]: `%${req.query.order_no}%` };
    if (req.query.contract_no) where.contract_no = { [Op.like]: `%${req.query.contract_no}%` };
    if (req.query.project_name) where.project_name = { [Op.like]: `%${req.query.project_name}%` };
    if (req.query.customer_name) where.customer_name = { [Op.like]: `%${req.query.customer_name}%` };

    const total = await Order.count({ where: applySalesScope(req, where) });
    const processing = await Order.count({ where: applySalesScope(req, { ...where, status: '进行中' }) });
    const completed = await Order.count({ where: applySalesScope(req, { ...where, status: '已完成' }) });
    const sumResult = await Order.findAll({
      where: applySalesScope(req, where),
      attributes: [[require('sequelize').fn('COALESCE', require('sequelize').fn('SUM', require('sequelize').col('total')), 0), 'totalAmount']],
      raw: true
    });
    const totalAmount = Number(sumResult[0]?.totalAmount) || 0;
    res.json({ success: true, data: { total, processing, completed, totalAmount } });
  } catch (err) { fail(res, err.message); }
});

// 详情
router.get('/:id', auth, async (req, res) => {
  try {
    const row = await Order.findOne({ where: applySalesScope(req, { id: req.params.id }),
      include: [{ model: OrderItem, as: 'items', required: false }]
    });
    if (!row) return fail(res, '记录不存在');
    success(res, row);
  } catch (err) { fail(res, err.message); }
});

// 新增
router.post('/', auth, async (req, res) => {
  try {
    const result = await sequelize.transaction(async (t) => {
    let { items, ...orderData } = req.body;
    orderData = await resolveSalesmanPayload(orderData, Employee);
    if (req.user.role === 'sales') {
      orderData.salesman_id = req.user.id;
      orderData.salesman = req.user.name;
    }
    
    // 自动生成订单编号
    if (!orderData.order_no) {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const count = await Order.count({
        where: {
          order_no: { [require('sequelize').Op.like]: `ORD${dateStr}%` }
        }
      });
      orderData.order_no = `ORD${dateStr}${String(count + 1).padStart(3, '0')}`;
    }
    
    const row = await Order.create(orderData);

    // 创建订单明细
    if (items && Array.isArray(items) && items.length > 0) {
      const itemRows = items.map(item => ({ ...item, order_id: row.id }));
      await OrderItem.bulkCreate(itemRows);
    }

    // 重新查询包含明细的订单
    const result = await Order.findByPk(row.id, {
      include: [{ model: OrderItem, as: 'items', required: false }]
    });

    // 订单创建后同步合同+项目金额
    if (row.contract_id) {
      triggerContractSync(row.contract_id).catch(() => {});
    }

    success(res, result);
  } catch (err) { fail(res, err.message); }
});

// 更新
router.put('/:id', auth, async (req, res) => {
  try {
    const result = await sequelize.transaction(async (t) => {
    const row = await Order.findOne({ where: applySalesScope(req, { id: req.params.id }) });
    if (!row) return fail(res, '记录不存在');

    const oldContractId = row.contract_id;
    let { items, ...orderData } = req.body;
    orderData = await resolveSalesmanPayload(orderData, Employee);
    if (req.user.role === 'sales') {
      orderData.salesman_id = req.user.id;
      orderData.salesman = req.user.name;
    }

    const changedFields = diffOrderFields(row, orderData);
    const downstreamCheck = await hasLockedDownstream(row.id);
    const changedLabels = changedFields.map((item) => item.label);
    const contractChanged = changedFields.some((item) => item.key === 'contract_id' || item.key === 'contract_no');

    if (downstreamCheck.locked && contractChanged) {
      return fail(res, '该订单已产生请款/收款/绩效数据，不能再直接更换合同，请先处理下游数据后再修改');
    }

    if (downstreamCheck.locked && changedLabels.length > 0) {
      orderData.is_dirty = 1;
      orderData.dirty_reason = `订单已存在下游数据(请款${downstreamCheck.paymentCount}条/收款${downstreamCheck.receiptCount}条/绩效${downstreamCheck.perfCount}条)，以下字段发生变更：${changedLabels.join('、')}。请核对是否需要人工复核。`;
    } else if (!downstreamCheck.locked) {
      orderData.is_dirty = 0;
      orderData.dirty_reason = null;
    }

    await row.update(orderData);

    // 处理订单明细更新：先删除旧明细，再批量创建新明细
    if (items && Array.isArray(items)) {
      await OrderItem.destroy({ where: { order_id: row.id } });
      if (items.length > 0) {
        const itemRows = items.map(item => ({ ...item, order_id: row.id, id: undefined }));
        await OrderItem.bulkCreate(itemRows);
      }
    }

    // 重新查询包含明细的订单
    const result = await Order.findByPk(row.id, {
      include: [{ model: OrderItem, as: 'items', required: false }]
    });

    // 订单更新后同步合同+项目金额
    const newContractId = row.contract_id;
    if (oldContractId !== newContractId) {
      // 合同变更，需要同步新旧两个合同
      if (oldContractId) triggerContractSync(oldContractId).catch(() => {});
      if (newContractId) triggerContractSync(newContractId).catch(() => {});
    } else if (newContractId) {
      triggerContractSync(newContractId).catch(() => {});
    }

    await recalculateOrderFinancials(row.id, models).catch(() => {});

    success(res, result);
  } catch (err) { fail(res, err.message); }
});

// 删除
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await sequelize.transaction(async (t) => {
    const row = await Order.findOne({ where: applySalesScope(req, { id: req.params.id }) });
    if (!row) return fail(res, '记录不存在');

    const downstreamCheck = await hasLockedDownstream(row.id);
    if (downstreamCheck.locked) {
      return fail(res, `该订单已存在下游数据(请款${downstreamCheck.paymentCount}条/收款${downstreamCheck.receiptCount}条/绩效${downstreamCheck.perfCount}条)，不能直接删除，请先处理下游记录`);
    }

    const contractId = row.contract_id;
    await row.destroy();

    // 订单删除后同步合同+项目金额
    if (contractId) {
      triggerContractSync(contractId).catch(() => {});
    }

    success(res, null);
  } catch (err) { fail(res, err.message); }
});

router.post('/:id/resolve-dirty', auth, checkApprovalPermission(['admin', 'manager']), async (req, res) => {
  try {
    const result = await sequelize.transaction(async (t) => {
    const row = await Order.findOne({ where: applySalesScope(req, { id: req.params.id }) });
    if (!row) return fail(res, '记录不存在');

    await recalculateOrderFinancials(row.id, models).catch(() => {});
    await row.reload();
    await row.update({
      is_dirty: 0,
      dirty_reason: null,
      last_recalc_at: new Date(),
      reviewed_by: req.user?.id || null,
      reviewed_by_name: req.user?.name || '系统',
      reviewed_at: new Date()
    });

    success(res, row, '订单差异状态已清除');
  } catch (err) {
    fail(res, err.message);
  }
});

// 获取订单明细列表
router.get('/:id/items', auth, async (req, res) => {
  try {
    const items = await OrderItem.findAll({
      where: { order_id: req.params.id },
      order: [['id', 'ASC']]
    });
    success(res, items);
  } catch (err) { fail(res, err.message); }
});

// 获取订单请款记录
router.get('/:id/payment-requests', auth, async (req, res) => {
  try {
    const requests = await PaymentRequest.findAll({
      where: { order_id: req.params.id },
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'batch_id', 'request_amount', 'createdAt', 'status']
    });
    success(res, requests);
  } catch (err) { fail(res, err.message); }
});

// 获取订单收款记录
router.get('/:id/receipts', auth, async (req, res) => {
  try {
    const paymentRequests = await PaymentRequest.findAll({
      where: { order_id: req.params.id },
      attributes: ['id']
    });
    const prIds = paymentRequests.map(pr => pr.id);
    
    if (prIds.length === 0) {
      return success(res, []);
    }
    
    const receiptItems = await ReceiptItem.findAll({
      where: { payment_request_id: { [require('sequelize').Op.in]: prIds } },
      include: [{ model: Receipt, as: 'receipt', attributes: ['id', 'date', 'actual_amount', 'bank_account_name'] }]
    });
    
    const receipts = receiptItems.map(ri => ({
      id: ri.receipt?.id,
      receipt_date: ri.receipt?.date,
      amount: ri.amount,
      bank_account_name: ri.receipt?.bank_account_name
    }));
    
    success(res, receipts);
  } catch (err) { fail(res, err.message); }
});

// 获取订单绩效分配
router.get('/:id/performance', auth, async (req, res) => {
  try {
    const performances = await Performance.findAll({
      where: { order_id: req.params.id },
      order: [['id', 'ASC']],
      attributes: ['id', 'employee_id', 'employee_name', 'performance_rate', 'amount']
    });
    
    const totalRatio = performances.reduce((sum, p) => sum + (parseFloat(p.performance_rate) || 0), 0);
    
    success(res, {
      list: performances,
      total_ratio: totalRatio,
      ratio_valid: Math.abs(totalRatio - 100) < 0.01
    });
  } catch (err) { fail(res, err.message); }
});

// 获取订单状态变更历史
router.get('/:id/status-history', auth, async (req, res) => {
  try {
    const history = await OrderStatusHistory.findAll({
      where: { order_id: req.params.id },
      order: [['created_at', 'DESC']],
      attributes: ['id', 'old_status', 'new_status', 'reason', 'operator_name', 'created_at']
    });
    success(res, history);
  } catch (err) { fail(res, err.message); }
});

// 获取订单财务汇总
router.get('/:id/financial-summary', auth, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return fail(res, '订单不存在');
    
    const total = parseFloat(order.total) || 0;
    const requested = parseFloat(order.requested_amount) || 0;
    const received = parseFloat(order.received_amount) || 0;
    const unreceived = requested - received;
    
    const requestProgress = total > 0 ? Math.round((requested / total) * 100) : 0;
    const receiveProgress = requested > 0 ? Math.round((received / requested) * 100) : 0;
    
    success(res, {
      total_amount: total,
      requested_amount: requested,
      received_amount: received,
      unreceived_amount: unreceived,
      request_progress: requestProgress,
      receive_progress: receiveProgress
    });
  } catch (err) { fail(res, err.message); }
});

// 批量更新订单状态
router.post('/batch/status', auth, checkApprovalPermission(['admin', 'manager']), async (req, res) => {
  const { Sequelize } = require('sequelize');
  const transaction = await models.sequelize.transaction();
  
  try {
    const result = await sequelize.transaction(async (t) => {
    const { ids, status } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.name || '系统';

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      await transaction.rollback();
      return fail(res, '请选择要更新的订单');
    }

    if (!status) {
      await transaction.rollback();
      return fail(res, '请指定目标状态');
    }

    const validStatuses = ['待审核', '已审核', '进行中', '已完成', '已取消'];
    if (!validStatuses.includes(status)) {
      await transaction.rollback();
      return fail(res, '无效的状态值');
    }

    const orders = await Order.findAll({
      where: { id: { [Sequelize.Op.in]: ids } },
      transaction
    });

    const statusFlow = {
      '待审核': ['已审核', '已取消'],
      '已审核': ['进行中', '已取消'],
      '进行中': ['已完成', '已取消'],
      '已完成': [],
      '已取消': []
    };

    const failedItems = [];
    const toUpdateOrders = [];
    const contractIds = new Set();

    for (const order of orders) {
      const allowedTargets = statusFlow[order.status] || [];
      
      if (!allowedTargets.includes(status)) {
        failedItems.push({
          id: order.id,
          order_no: order.order_no,
          reason: `状态不能从"${order.status}"变更到"${status}"`
        });
        continue;
      }

      if (status === '已取消') {
        const paymentCount = await PaymentRequest.count({
          where: { order_id: order.id },
          transaction
        });
        
        if (paymentCount > 0) {
          failedItems.push({
            id: order.id,
            order_no: order.order_no,
            reason: `该订单已关联${paymentCount}条请款记录，不能取消`
          });
          continue;
        }
      }

      toUpdateOrders.push(order);
      if (order.contract_id) contractIds.add(order.contract_id);
    }

    let updatedCount = 0;
    for (const order of toUpdateOrders) {
      const oldStatus = order.status;
      await order.update({ status }, { transaction });
      
      await OrderStatusHistory.create({
        order_id: order.id,
        old_status: oldStatus,
        new_status: status,
        operator_id: userId,
        operator_name: userName,
        reason: '批量状态变更'
      }, { transaction });
      
      updatedCount++;
    }

    await transaction.commit();

    for (const contractId of contractIds) {
      triggerContractSync(contractId);
    }

    success(res, {
      message: `成功更新 ${updatedCount} 条订单状态${failedItems.length > 0 ? `，${failedItems.length} 条失败` : ''}`,
      updatedCount,
      failedCount: failedItems.length,
      failedItems
    });
  } catch (err) {
    await transaction.rollback();
    fail(res, err.message);
  }
});

// 更新订单编号
router.put('/:id/order-no', auth, async (req, res) => {
  try {
    const result = await sequelize.transaction(async (t) => {
    const { id } = req.params;
    const { order_no } = req.body;

    if (!order_no || !order_no.trim()) {
      return fail(res, '订单编号不能为空');
    }

    const trimmedNo = order_no.trim();
    if (!/^[\w\-]+$/.test(trimmedNo)) {
      return fail(res, '订单编号只能包含字母、数字、连字符');
    }

    if (trimmedNo.length > 50) {
      return fail(res, '订单编号长度不能超过50个字符');
    }

    const existing = await Order.findOne({
      where: { order_no: trimmedNo }
    });

    if (existing && existing.id !== parseInt(id)) {
      return fail(res, '订单编号已存在');
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return fail(res, '订单不存在');
    }

    const oldNo = order.order_no;
    await order.update({ order_no: trimmedNo });

    success(res, {
      message: '订单编号更新成功',
      old_no: oldNo,
      new_no: trimmedNo
    });
  } catch (err) {
    fail(res, err.message);
  }
});

// 批量删除订单
router.post('/batch/delete', auth, async (req, res) => {
  const { Sequelize } = require('sequelize');
  const transaction = await models.sequelize.transaction();
  
  try {
    const result = await sequelize.transaction(async (t) => {
    const { ids } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.name || '系统';

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      await transaction.rollback();
      return fail(res, '请选择要删除的订单');
    }

    if (ids.length > 100) {
      await transaction.rollback();
      return fail(res, '单次最多删除100条订单');
    }

    const orders = await Order.findAll({
      where: { id: { [Sequelize.Op.in]: ids } },
      transaction
    });

    if (orders.length === 0) {
      await transaction.rollback();
      return fail(res, '未找到任何订单');
    }

    const failedItems = [];
    const toDeleteIds = [];
    const contractIds = new Set();

    for (const order of orders) {
      const paymentCount = await PaymentRequest.count({
        where: { order_id: order.id },
        transaction
      });

      if (paymentCount > 0) {
        failedItems.push({
          id: order.id,
          order_no: order.order_no,
          reason: `该订单已关联${paymentCount}条请款记录，无法删除`
        });
      } else {
        toDeleteIds.push(order.id);
        if (order.contract_id) contractIds.add(order.contract_id);
      }
    }

    if (toDeleteIds.length > 0) {
      await OrderItem.destroy({
        where: { order_id: { [Sequelize.Op.in]: toDeleteIds } },
        transaction
      });

      await Order.destroy({
        where: { id: { [Sequelize.Op.in]: toDeleteIds } },
        transaction
      });

      for (const id of toDeleteIds) {
        const order = orders.find(o => o.id === id);
        await OrderStatusHistory.create({
          order_id: id,
          old_status: order.status,
          new_status: '已删除',
          operator_id: userId,
          operator_name: userName,
          reason: '批量删除订单'
        }, { transaction });
      }
    }

    await transaction.commit();

    for (const contractId of contractIds) {
      triggerContractSync(contractId);
    }

    success(res, {
      message: `成功删除 ${toDeleteIds.length} 条订单${failedItems.length > 0 ? `，${failedItems.length} 条因关联请款无法删除` : ''}`,
      successCount: toDeleteIds.length,
      failedCount: failedItems.length,
      failedItems
    });
  } catch (err) {
    await transaction.rollback();
    fail(res, err.message);
  }
});

module.exports = router;
