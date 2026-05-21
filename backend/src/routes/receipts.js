const express = require('express');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { success, fail, getPagination, generateNo } = require('../utils/helpers');
const models = require('../models');
const { applySalesScope } = require('../utils/salesScope');

const router = express.Router();
const {
  Receipt,
  ReceiptItem,
  PaymentRequest,
  PaymentRequestBatch,
  Finance,
  Order,
} = models;
const { recalculateReceiptArchiveStatus } = require('../utils/paymentFlow');

router.use(auth);

async function recalculatePaymentRequest(paymentRequestId) {
  const request = await PaymentRequest.findByPk(paymentRequestId);
  if (!request) return null;

  const items = await ReceiptItem.findAll({
    where: { payment_request_id: paymentRequestId },
    attributes: ['allocated_amount'],
    raw: true
  });
  const receivedAmount = items.reduce((sum, item) => sum + Number(item.allocated_amount || 0), 0);

  let status = request.status || '草稿';
  if (receivedAmount <= 0) {
    status = request.batch_id ? '已请款' : '草稿';
  } else if (receivedAmount < Number(request.request_amount || 0)) {
    status = '部分收款';
  } else {
    status = '已收款';
  }

  await request.update({
    received_amount: receivedAmount,
    status
  });

  if (request.order_id) {
    const order = await Order.findByPk(request.order_id);
    if (order) {
      const requests = await PaymentRequest.findAll({
        where: { order_id: order.id },
        attributes: ['request_amount', 'received_amount'],
        raw: true
      });
      const requestedAmount = requests.reduce((sum, item) => sum + Number(item.request_amount || 0), 0);
      const orderReceivedAmount = requests.reduce((sum, item) => sum + Number(item.received_amount || 0), 0);
      let paymentStatus = '未请款';
      if (requestedAmount > 0 && orderReceivedAmount <= 0) paymentStatus = '已请款';
      if (requestedAmount > 0 && orderReceivedAmount > 0 && orderReceivedAmount < requestedAmount) paymentStatus = '部分收款';
      if (requestedAmount > 0 && orderReceivedAmount >= requestedAmount) paymentStatus = '已收款';
      await order.update({
        requested_amount: requestedAmount,
        received_amount: orderReceivedAmount,
        payment_status: paymentStatus,
        finance_generated: requestedAmount > 0 ? 1 : 0,
        finance_booked: orderReceivedAmount > 0 ? 1 : 0
      });

      if (order.contract_id) {
        const { syncContractAmount, syncProjectAmount } = require('../utils/syncAmount');
        const models = require('../models');
        await syncContractAmount(order.contract_id, models);
        const contract = await models.Contract.findByPk(order.contract_id);
        if (contract?.project_id) {
          await syncProjectAmount(contract.project_id, models);
        }
      }
    }
  }

  if (request.batch_id) {
    const batch = await PaymentRequestBatch.findByPk(request.batch_id);
    if (batch) {
      const requests = await PaymentRequest.findAll({
        where: { batch_id: batch.id },
        attributes: ['request_amount', 'received_amount'],
        raw: true
      });
      const requestTotalAmount = requests.reduce((sum, item) => sum + Number(item.request_amount || 0), 0);
      const receivedTotalAmount = requests.reduce((sum, item) => sum + Number(item.received_amount || 0), 0);
      let batchStatus = '草稿';
      if (requestTotalAmount <= 0) batchStatus = '草稿';
      else if (receivedTotalAmount <= 0) batchStatus = '已请款';
      else if (receivedTotalAmount < requestTotalAmount) batchStatus = '部分收款';
      else batchStatus = '已收款';
      await batch.update({
        request_total_amount: requestTotalAmount,
        received_total_amount: receivedTotalAmount,
        discount_amount: Number((requestTotalAmount - receivedTotalAmount).toFixed(2)),
        status: batchStatus
      });
    }
  }

  return request;
}

async function deleteReceiptWithChecks(receipt) {
  const finance = await Finance.findOne({
    where: { source_type: 'receipt', source_id: receipt.id }
  });
  if (finance && Number(finance.booked || 0) === 1) {
    return { success: false, message: '对应财务已入账，不能删除' };
  }

  const items = await ReceiptItem.findAll({
    where: { receipt_id: receipt.id },
    attributes: ['payment_request_id'],
    raw: true
  });
  const requestIds = [...new Set(items.map((item) => item.payment_request_id).filter(Boolean))];

  await ReceiptItem.destroy({ where: { receipt_id: receipt.id } });
  if (finance) await finance.destroy();
  await receipt.destroy();

  for (const requestId of requestIds) {
    await recalculatePaymentRequest(requestId);
  }

  return { success: true, message: '收款记录已删除', requestIds };
}

router.get('/', async (req, res) => {
  try {
    const { offset, limit } = getPagination(req.query);
    const where = {};
    if (req.query.receipt_no) where.receipt_no = { [Op.like]: `%${req.query.receipt_no}%` };
    if (req.query.batch_no) where.batch_no = { [Op.like]: `%${req.query.batch_no}%` };
    if (req.query.contract_no) where.contract_no = { [Op.like]: `%${req.query.contract_no}%` };
    if (req.query.customer_name) where.customer_name = { [Op.like]: `%${req.query.customer_name}%` };
    if (req.query.status) where.status = req.query.status;

    const { count, rows } = await Receipt.findAndCountAll({
      where: applySalesScope(req, where, 'salesman_id', 'salesman_name'),
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
    const receipt = await Receipt.findOne({
      where: applySalesScope(req, { id: req.params.id }, 'salesman_id', 'salesman_name')
    });
    if (!receipt) return fail(res, '收款记录不存在', 404);

    const items = await ReceiptItem.findAll({
      where: { receipt_id: receipt.id },
      include: [{ model: PaymentRequest, as: 'paymentRequest', required: false }]
    });
    success(res, { ...receipt.toJSON(), items });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/create-from-requests', async (req, res) => {
  try {
    const { payment_request_ids = [], actual_amount, date, remark, bank_account_id, bank_account_name, account_type } = req.body;
    if (!Array.isArray(payment_request_ids) || payment_request_ids.length === 0) {
      return fail(res, '请选择至少一条请款明细');
    }

    const requests = await PaymentRequest.findAll({
      where: applySalesScope(req, { id: { [Op.in]: payment_request_ids } }, 'salesman_id', 'salesman_name'),
      order: [['id', 'ASC']]
    });
    if (requests.length === 0) return fail(res, '未找到可处理的请款明细');

    const first = requests[0];
    const batchId = first.batch_id || null;
    const invalid = requests.find((item) => (item.batch_id || null) !== batchId);
    if (invalid) return fail(res, '批量收款暂要求请款明细属于同一请款批次');

    const plannedAmount = requests.reduce((sum, item) => sum + Math.max(0, Number(item.request_amount || 0) - Number(item.received_amount || 0)), 0);
    const actualAmount = Number(actual_amount || 0);
    if (actualAmount <= 0) return fail(res, '实际收款金额必须大于0');

    const receipt = await Receipt.create({
      date: date || new Date().toISOString().slice(0, 10),
      batch_id: first.batch_id || null,
      batch_no: first.batch_no || '',
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
      salesman_name: first.salesman_name || '',
      bank_account_id: bank_account_id || null,
      bank_account_name: bank_account_name || null,
      account_type: account_type || '银行',
      planned_amount: plannedAmount,
      actual_amount: actualAmount,
      discount_amount: Number((plannedAmount - actualAmount).toFixed(2)),
      status: '已确认',
      remark: remark || null
    });
    receipt.receipt_no = generateNo('SK', receipt.id);
    await receipt.save();

    let remain = actualAmount;
    for (const request of requests) {
      const requestRemain = Math.max(0, Number(request.request_amount || 0) - Number(request.received_amount || 0));
      if (requestRemain <= 0) continue;
      const allocatedAmount = Number(Math.min(remain, requestRemain).toFixed(2));
      if (allocatedAmount <= 0) break;
      await ReceiptItem.create({
        receipt_id: receipt.id,
        payment_request_id: request.id,
        allocated_amount: allocatedAmount,
        remark: `收款记录 ${receipt.receipt_no}`
      });
      remain = Number((remain - allocatedAmount).toFixed(2));
    }

    for (const request of requests) {
      await recalculatePaymentRequest(request.id);
    }

    success(res, receipt, '收款记录创建成功');
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      where: applySalesScope(req, { id: req.params.id }, 'salesman_id', 'salesman_name')
    });
    if (!receipt) return fail(res, '收款记录不存在', 404);

    const finance = await Finance.findOne({
      where: { source_type: 'receipt', source_id: receipt.id }
    });
    if (finance && Number(finance.booked || 0) === 1) {
      return fail(res, '该收款记录对应的财务已入账，不能直接修改，请先处理财务归档');
    }

    const currentItems = await ReceiptItem.findAll({
      where: { receipt_id: receipt.id },
      include: [{ model: PaymentRequest, as: 'paymentRequest', required: false }],
      order: [['id', 'ASC']]
    });
    if (currentItems.length === 0) {
      return fail(res, '收款记录缺少分配明细，无法修改');
    }

    const nextActualAmount = Number(req.body.actual_amount != null ? req.body.actual_amount : receipt.actual_amount || 0);
    if (nextActualAmount <= 0) return fail(res, '实际收款金额必须大于0');

    const paymentRequests = currentItems
      .map((item) => item.paymentRequest)
      .filter(Boolean);
    const plannedAmount = paymentRequests.reduce((sum, item) => sum + Math.max(0, Number(item.request_amount || 0) - Number(item.received_amount || 0) + Number(currentItems.find((row) => row.payment_request_id === item.id)?.allocated_amount || 0)), 0);

    await receipt.update({
      date: req.body.date || receipt.date,
      actual_amount: nextActualAmount,
      planned_amount: plannedAmount,
      discount_amount: Number((plannedAmount - nextActualAmount).toFixed(2)),
      account_type: req.body.account_type || receipt.account_type,
      bank_account_id: req.body.bank_account_id ?? receipt.bank_account_id,
      bank_account_name: req.body.bank_account_name ?? receipt.bank_account_name,
      remark: req.body.remark ?? receipt.remark
    });

    await ReceiptItem.destroy({ where: { receipt_id: receipt.id } });
    let remain = nextActualAmount;
    for (const request of paymentRequests) {
      const originalAllocated = Number(currentItems.find((row) => row.payment_request_id === request.id)?.allocated_amount || 0);
      const requestRemain = Math.max(0, Number(request.request_amount || 0) - Number(request.received_amount || 0) + originalAllocated);
      if (requestRemain <= 0) continue;
      const allocatedAmount = Number(Math.min(remain, requestRemain).toFixed(2));
      if (allocatedAmount <= 0) break;
      await ReceiptItem.create({
        receipt_id: receipt.id,
        payment_request_id: request.id,
        allocated_amount: allocatedAmount,
        remark: `收款记录 ${receipt.receipt_no}`
      });
      remain = Number((remain - allocatedAmount).toFixed(2));
    }

    for (const request of paymentRequests) {
      await recalculatePaymentRequest(request.id);
    }

    if (finance) {
      await finance.update({
        date: receipt.date,
        amount: receipt.actual_amount,
        account_type: receipt.account_type,
        bank_account_id: receipt.bank_account_id,
        bank_account_name: receipt.bank_account_name,
        description: receipt.remark ? `收款记录:${receipt.receipt_no}；${receipt.remark}` : `收款记录:${receipt.receipt_no}`
      });
      await recalculateReceiptArchiveStatus(receipt.id, models);
    }

    success(res, receipt, '收款记录更新成功');
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/batch/delete', async (req, res) => {
  try {
    const { ids = [] } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return fail(res, '请选择要删除的收款记录');

    const rows = await Receipt.findAll({
      where: applySalesScope(req, { id: { [Op.in]: ids } }, 'salesman_id', 'salesman_name')
    });

    const results = [];
    for (const receipt of rows) {
      const result = await deleteReceiptWithChecks(receipt);
      results.push({
        id: receipt.id,
        receipt_no: receipt.receipt_no,
        success: result.success,
        message: result.message
      });
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
    if (!Array.isArray(ids) || ids.length === 0) return fail(res, '请选择要更新的收款记录');
    if (!['已确认', '待归档', '已归档'].includes(status)) return fail(res, '状态值不正确');

    const rows = await Receipt.findAll({
      where: applySalesScope(req, { id: { [Op.in]: ids } }, 'salesman_id', 'salesman_name')
    });

    await Receipt.update(
      { status },
      { where: { id: { [Op.in]: rows.map((item) => item.id) } } }
    );

    success(res, { total: ids.length, success: rows.length, failed: ids.length - rows.length }, `已更新 ${rows.length} 条状态`);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/:id/generate-finance', async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      where: applySalesScope(req, { id: req.params.id }, 'salesman_id', 'salesman_name')
    });
    if (!receipt) return fail(res, '收款记录不存在', 404);

    let finance = await Finance.findOne({
      where: { source_type: 'receipt', source_id: receipt.id }
    });

    const payload = {
      date: receipt.date,
      contract_id: receipt.contract_id,
      contract_no: receipt.contract_no,
      project_id: receipt.project_id,
      project_name: receipt.project_name,
      company_id: receipt.company_id,
      company_name: receipt.company_name,
      customer_id: receipt.customer_id,
      customer_name: receipt.customer_name,
      category: '项目收款',
      description: `收款记录:${receipt.receipt_no}`,
      type: '收入',
      amount: receipt.actual_amount,
      booked: 0,
      batch_id: receipt.batch_id,
      batch_no: receipt.batch_no,
      receipt_id: receipt.id,
      receipt_no: receipt.receipt_no,
      account_type: receipt.account_type,
      bank_account_id: receipt.bank_account_id,
      bank_account_name: receipt.bank_account_name,
      source_type: 'receipt',
      source_id: receipt.id
    };

    if (finance) {
      await finance.update(payload);
    } else {
      finance = await Finance.create(payload);
      finance.finance_no = generateNo('CW', finance.id);
      await finance.save();
    }

    await recalculateReceiptArchiveStatus(receipt.id, models);
    success(res, finance, '已生成财务归档记录');
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      where: applySalesScope(req, { id: req.params.id }, 'salesman_id', 'salesman_name')
    });
    if (!receipt) return fail(res, '收款记录不存在', 404);

    const result = await deleteReceiptWithChecks(receipt);
    if (!result.success) return fail(res, result.message);

    success(res, null, result.message);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

module.exports = router;
