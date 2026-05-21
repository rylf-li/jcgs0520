const express = require('express');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { success, fail, getPagination, generateNo } = require('../utils/helpers');
const { applySalesScope } = require('../utils/salesScope');
const models = require('../models');

const router = express.Router();
const {
  PaymentRequestBatch,
  PaymentRequest,
  Order,
  ReceiptItem,
  Receipt,
  Finance,
} = models;
router.use(auth);

async function recalculateBatch(batchId) {
  const batch = await PaymentRequestBatch.findByPk(batchId);
  if (!batch) return null;

  const requests = await PaymentRequest.findAll({
    where: { batch_id: batchId },
    raw: true
  });

  const requestTotalAmount = requests.reduce((sum, item) => sum + Number(item.request_amount || 0), 0);
  const receivedTotalAmount = requests.reduce((sum, item) => sum + Number(item.received_amount || 0), 0);

  let status = batch.status || '草稿';
  if (requestTotalAmount <= 0) {
    status = '草稿';
  } else if (receivedTotalAmount <= 0) {
    status = '已请款';
  } else if (receivedTotalAmount < requestTotalAmount) {
    status = '部分收款';
  } else {
    status = '已收款';
  }

  await batch.update({
    request_total_amount: requestTotalAmount,
    received_total_amount: receivedTotalAmount,
    discount_amount: Number((requestTotalAmount - receivedTotalAmount).toFixed(2)),
    status
  });

  return batch;
}

async function deleteBatchWithChecks(batch) {
  const requests = await PaymentRequest.findAll({
    where: { batch_id: batch.id },
    attributes: ['id', 'order_id', 'request_no'],
    raw: true
  });
  if (requests.length === 0) {
    await batch.destroy();
    return { success: true, message: '请款批次已删除', orderIds: [] };
  }

  const requestIds = requests.map((item) => item.id);
  const receiptItemCount = await ReceiptItem.count({
    where: { payment_request_id: { [Op.in]: requestIds } }
  });
  if (receiptItemCount > 0) {
    return { success: false, message: '已产生收款记录，不能直接删除' };
  }

  const financeCount = await Finance.count({
    where: {
      source_type: 'payment_request',
      source_id: { [Op.in]: requestIds }
    }
  });
  if (financeCount > 0) {
    return { success: false, message: '已产生财务记录，不能直接删除' };
  }

  const orderIds = [...new Set(requests.map((item) => item.order_id).filter(Boolean))];
  await PaymentRequest.destroy({ where: { batch_id: batch.id } });
  await batch.destroy();
  return { success: true, message: '请款批次已撤回', orderIds };
}

async function recalculateOrderPaymentSummary(orderId) {
  if (!orderId) return null;
  const order = await Order.findByPk(orderId);
  if (!order) return null;

  const requests = await PaymentRequest.findAll({
    where: { order_id: orderId },
    attributes: ['request_amount', 'received_amount'],
    raw: true
  });
  const requestedAmount = requests.reduce((sum, item) => sum + Number(item.request_amount || 0), 0);
  const receivedAmount = requests.reduce((sum, item) => sum + Number(item.received_amount || 0), 0);
  let paymentStatus = '未请款';
  if (requestedAmount > 0 && receivedAmount <= 0) paymentStatus = '已请款';
  if (requestedAmount > 0 && receivedAmount > 0 && receivedAmount < requestedAmount) paymentStatus = '部分收款';
  if (requestedAmount > 0 && receivedAmount >= requestedAmount) paymentStatus = '已收款';

  await order.update({
    requested_amount: Number(requestedAmount.toFixed(2)),
    received_amount: Number(receivedAmount.toFixed(2)),
    payment_status: paymentStatus,
    finance_generated: requestedAmount > 0 ? 1 : 0,
    finance_booked: receivedAmount > 0 ? 1 : 0
  });

  if (order.contract_id) {
    const { syncContractAmount, syncProjectAmount } = require('../utils/syncAmount');
    await syncContractAmount(order.contract_id, models);
    const contract = await models.Contract.findByPk(order.contract_id);
    if (contract?.project_id) {
      await syncProjectAmount(contract.project_id, models);
    }
  }

  return order;
}

router.get('/', async (req, res) => {
  try {
    const { offset, limit } = getPagination(req.query);
    const where = {};
    if (req.query.batch_no) where.batch_no = { [Op.like]: `%${req.query.batch_no}%` };
    if (req.query.contract_no) where.contract_no = { [Op.like]: `%${req.query.contract_no}%` };
    if (req.query.project_name) where.project_name = { [Op.like]: `%${req.query.project_name}%` };
    if (req.query.customer_name) where.customer_name = { [Op.like]: `%${req.query.customer_name}%` };
    if (req.query.status) where.status = req.query.status;

    const finalWhere = applySalesScope(req, where, 'salesman_id', 'salesman_name');
    const { count, rows } = await PaymentRequestBatch.findAndCountAll({
      where: finalWhere,
      offset,
      limit,
      order: [['id', 'DESC']]
    });
    success(res, { list: rows, total: count });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const batch = await PaymentRequestBatch.findOne({
      where: applySalesScope(req, { id: req.params.id }, 'salesman_id', 'salesman_name')
    });
    if (!batch) return fail(res, '请款批次不存在', 404);

    const items = await PaymentRequest.findAll({
      where: { batch_id: batch.id },
      order: [['sort_no', 'ASC'], ['id', 'ASC']]
    });
    success(res, { ...batch.toJSON(), items });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/create-from-orders', async (req, res) => {
  try {
    const { order_ids = [], date, remark } = req.body;
    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return fail(res, '请选择至少一条订单');
    }

    const orders = await Order.findAll({
      where: applySalesScope(req, { id: { [Op.in]: order_ids } }),
      order: [['id', 'ASC']]
    });
    if (orders.length === 0) return fail(res, '未找到可处理的订单');

    const first = orders[0];
    const contractNo = first.contract_no || '';
    const companyId = first.company_id || null;
    const customerName = first.customer_name || '';

    const invalidOrder = orders.find((item) => (item.contract_no || '') !== contractNo || (item.company_id || null) !== companyId || (item.customer_name || '') !== customerName);
    if (invalidOrder) {
      return fail(res, '批量请款暂要求订单属于同一合同、同一公司、同一客户');
    }

    const ineligible = orders.find((item) => Number(item.total || 0) <= Number(item.requested_amount || 0));
    if (ineligible) {
      return fail(res, `订单 ${ineligible.order_no} 已无可请款金额`);
    }

    const batch = await PaymentRequestBatch.create({
      date: date || first.date,
      contract_id: first.contract_id || null,
      contract_no: first.contract_no || '',
      project_id: first.project_id || null,
      project_name: first.project_name || '',
      customer_id: first.customer_id || null,
      customer_name: first.customer_name || '',
      company_id: first.company_id || null,
      company_name: first.company_name || '',
      dept_id: first.dept_id || null,
      dept_name: first.dept_name || '',
      salesman_id: first.salesman_id || null,
      salesman_name: first.salesman || '',
      status: '草稿',
      remark: remark || null
    });
    batch.batch_no = generateNo('QKP', batch.id);
    await batch.save();

    let sortNo = 1;
    for (const order of orders) {
      const remainAmount = Number((Number(order.total || 0) - Number(order.requested_amount || 0)).toFixed(2));
      const request = await PaymentRequest.create({
        batch_id: batch.id,
        batch_no: batch.batch_no,
        date: batch.date,
        order_id: order.id,
        order_no: order.order_no,
        contract_id: order.contract_id || null,
        contract_no: order.contract_no || '',
        project_id: order.project_id || null,
        project_name: order.project_name || '',
        customer_id: order.customer_id || null,
        customer_name: order.customer_name || '',
        company_id: order.company_id || null,
        company_name: order.company_name || '',
        dept_id: order.dept_id || null,
        dept_name: order.dept_name || '',
        salesman_id: order.salesman_id || null,
        salesman_name: order.salesman || '',
        request_amount: remainAmount,
        snapshot_total: Number(order.total || 0),
        snapshot_settlement_fee: Number(order.settlement_fee || 0),
        snapshot_performance_fee: Number(order.performance_fee || 0),
        sort_no: sortNo++,
        status: '已请款',
        remark: `批量请款批次 ${batch.batch_no}`
      });
      request.request_no = generateNo('QK', request.id);
      await request.save();

      await order.update({
        requested_amount: Number(order.requested_amount || 0) + remainAmount,
        payment_status: '已请款',
        finance_generated: 1
      });
    }

    // 同步订单金额到合同/项目
    for (const order of orders) {
      await recalculateOrderPaymentSummary(order.id).catch(() => {});
    }

    await recalculateBatch(batch.id);
    const result = await PaymentRequestBatch.findByPk(batch.id);
    success(res, result, '请款批次创建成功');
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/batch/delete', async (req, res) => {
  try {
    const { ids = [] } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return fail(res, '请选择要删除的请款批次');

    const rows = await PaymentRequestBatch.findAll({
      where: applySalesScope(req, { id: { [Op.in]: ids } }, 'salesman_id', 'salesman_name')
    });

    const results = [];
    const orderIdsToRecalc = new Set();
    for (const batch of rows) {
      const result = await deleteBatchWithChecks(batch);
      results.push({
        id: batch.id,
        batch_no: batch.batch_no,
        success: result.success,
        message: result.message
      });
      if (result.success) {
        (result.orderIds || []).forEach((id) => orderIdsToRecalc.add(id));
      }
    }

    for (const orderId of orderIdsToRecalc) {
      await recalculateOrderPaymentSummary(orderId).catch(() => {});
    }

    const ok = results.filter((item) => item.success).length;
    success(res, { total: ids.length, success: ok, failed: ids.length - ok, results }, `成功处理 ${ok} 条`);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.put('/batch/status', async (req, res) => {
  try {
    const { ids = [], status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return fail(res, '请选择要更新的请款批次');
    if (!['草稿', '已请款', '部分收款', '已收款', '已完成'].includes(status)) {
      return fail(res, '状态值不正确');
    }

    const rows = await PaymentRequestBatch.findAll({
      where: applySalesScope(req, { id: { [Op.in]: ids } }, 'salesman_id', 'salesman_name')
    });

    await PaymentRequestBatch.update(
      { status },
      { where: { id: { [Op.in]: rows.map((item) => item.id) } } }
    );

    success(res, { total: ids.length, success: rows.length, failed: ids.length - rows.length }, `已更新 ${rows.length} 条状态`);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const batch = await PaymentRequestBatch.findOne({
      where: applySalesScope(req, { id: req.params.id }, 'salesman_id', 'salesman_name')
    });
    if (!batch) return fail(res, '请款批次不存在', 404);

    const nextBatchNo = req.body.batch_no != null ? String(req.body.batch_no).trim() : batch.batch_no;
    if (!nextBatchNo) return fail(res, '请款批次号不能为空');

    if (nextBatchNo !== batch.batch_no) {
      const duplicate = await PaymentRequestBatch.findOne({
        where: { batch_no: nextBatchNo, id: { [Op.ne]: batch.id } }
      });
      if (duplicate) return fail(res, '请款批次号已存在');
    }

    const oldBatchNo = batch.batch_no;
    const payload = {
      batch_no: nextBatchNo,
      date: req.body.date || batch.date,
      remark: req.body.remark ?? batch.remark
    };

    if (req.body.status) payload.status = req.body.status;
    await batch.update(payload);

    const requestUpdate = {};
    if (nextBatchNo !== oldBatchNo) requestUpdate.batch_no = nextBatchNo;
    if (req.body.date) requestUpdate.date = req.body.date;
    if (Object.keys(requestUpdate).length > 0) {
      await PaymentRequest.update(requestUpdate, { where: { batch_id: batch.id } });
    }

    if (nextBatchNo !== oldBatchNo) {
      await Receipt.update({ batch_no: nextBatchNo }, { where: { batch_id: batch.id } });
      await Finance.update({ batch_no: nextBatchNo }, { where: { batch_id: batch.id } });
    }

    await recalculateBatch(batch.id);
    const result = await PaymentRequestBatch.findByPk(batch.id);
    success(res, result, '请款批次更新成功');
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const batch = await PaymentRequestBatch.findOne({
      where: applySalesScope(req, { id: req.params.id }, 'salesman_id', 'salesman_name')
    });
    if (!batch) return fail(res, '请款批次不存在', 404);

    const result = await deleteBatchWithChecks(batch);
    if (!result.success) return fail(res, `该请款批次${result.message}，请先处理关联数据`);

    for (const orderId of result.orderIds || []) {
      await recalculateOrderPaymentSummary(orderId).catch(() => {});
    }

    success(res, null, `请款批次 ${batch.batch_no} 已撤回`);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

module.exports = router;
