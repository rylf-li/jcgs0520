const { syncContractAmount, syncProjectAmount } = require('./syncAmount');

function normalizeMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

async function resolveOrderSalesEmployee(order, models) {
  const { Employee } = models;
  if (!order) return null;

  if (order.salesman_id) {
    const employee = await Employee.findByPk(order.salesman_id);
    if (employee) return employee;
  }

  if (order.salesman) {
    return Employee.findOne({ where: { name: order.salesman } });
  }

  return null;
}

async function syncOrderPerformance(orderId, models, options = {}) {
  if (!orderId) return { action: 'skip', reason: '订单不存在' };

  const {
    Order,
    Performance,
    Finance,
  } = models;
  const {
    overwrite = true,
    allowDelete = true,
  } = options;

  const order = await Order.findByPk(orderId);
  if (!order) return { action: 'skip', reason: '订单不存在' };

  const existingRows = await Performance.findAll({
    where: { order_id: orderId },
    order: [['id', 'ASC']]
  });
  const primaryRow = existingRows[0] || null;
  const duplicateRows = existingRows.slice(1);

  const employee = await resolveOrderSalesEmployee(order, models);
  const totalAmount = Number(order.total || 0);
  const receivedAmount = Number(order.received_amount || 0);
  const fullPerformanceAmount = Number(order.performance_fee || 0);

  const financeRow = await Finance.findOne({
    where: {
      order_id: orderId,
      type: '收入',
      booked: 1
    },
    order: [['date', 'DESC'], ['id', 'DESC']]
  });
  const performanceDate = financeRow?.date || order.date || new Date().toISOString().slice(0, 10);

  const ratio = totalAmount > 0
    ? Math.min(receivedAmount / totalAmount, 1)
    : (receivedAmount > 0 ? 1 : 0);
  const performanceAmount = normalizeMoney(fullPerformanceAmount * ratio);
  const shouldKeepRow = !!employee && receivedAmount > 0 && fullPerformanceAmount > 0 && ratio > 0;

  if (!shouldKeepRow) {
    if (allowDelete && existingRows.length > 0) {
      await Promise.all(existingRows.map((row) => row.destroy()));
      return { action: 'delete', order_no: order.order_no };
    }
    return {
      action: primaryRow ? 'skip' : 'noop',
      order_no: order.order_no,
      reason: employee ? '订单尚未形成可结算绩效' : '未匹配到业务员员工'
    };
  }

  if (primaryRow && !overwrite) {
    return { action: 'skip', order_no: order.order_no, reason: '绩效记录已存在' };
  }

  const payload = {
    date: performanceDate,
    month: performanceDate ? String(performanceDate).slice(0, 7) : '',
    employee_id: employee.id,
    employee_name: employee.name,
    emp_no: employee.phone || '',
    name: employee.name,
    order_id: order.id,
    order_no: order.order_no || '',
    contract_id: order.contract_id || null,
    contract_no: order.contract_no || '',
    project_id: order.project_id || null,
    project_name: order.project_name || '',
    dept_name: order.dept_name || employee.dept_name || '',
    position: employee.position || '',
    dept_id: order.dept_id || employee.dept_id || null,
    company_id: order.company_id || employee.company_id || null,
    company_name: order.company_name || employee.company_name || '',
    sales_amount: normalizeMoney(totalAmount),
    received_amount: normalizeMoney(receivedAmount),
    performance_rate: Number(ratio.toFixed(4)),
    amount: performanceAmount,
    performance_amount: performanceAmount,
    source: `订单收款绩效:${order.order_no || order.id}`,
    status: ratio >= 1 ? '已完成' : '部分收款',
    remark: `按订单收款比例自动生成，当前比例 ${(ratio * 100).toFixed(2)}%`
  };

  let action = 'create';
  if (primaryRow) {
    await primaryRow.update(payload);
    action = 'update';
  } else {
    await Performance.create(payload);
  }

  if (duplicateRows.length > 0) {
    await Promise.all(duplicateRows.map((row) => row.destroy()));
  }

  return {
    action,
    order_no: order.order_no,
    amount: performanceAmount,
    ratio: Number((ratio * 100).toFixed(2))
  };
}

async function recalculatePaymentRequestStatus(paymentRequestId, models) {
  const { PaymentRequest, Finance } = models;
  const request = await PaymentRequest.findByPk(paymentRequestId);
  if (!request) return null;

  const finances = await Finance.findAll({
    where: {
      source_type: 'payment_request',
      source_id: paymentRequestId,
      type: '收入',
      booked: 1
    },
    attributes: ['amount'],
    raw: true
  });

  const receivedAmount = finances.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const requestAmount = Number(request.request_amount || 0);
  let status = request.status || '草稿';

  if (requestAmount <= 0) {
    status = '草稿';
  } else if (receivedAmount <= 0) {
    status = '已请款';
  } else if (receivedAmount < requestAmount) {
    status = '部分收款';
  } else {
    status = '已收款';
  }

  await request.update({
    received_amount: receivedAmount,
    status
  });

  return request;
}

async function recalculateReceiptArchiveStatus(receiptId, models) {
  if (!receiptId) return null;
  const { Receipt, Finance } = models;
  const receipt = await Receipt.findByPk(receiptId);
  if (!receipt) return null;

  const finance = await Finance.findOne({
    where: { source_type: 'receipt', source_id: receipt.id },
    order: [['id', 'DESC']]
  });

  let status = '已确认';
  if (finance) {
    status = Number(finance.booked || 0) === 1 ? '已归档' : '待归档';
  }

  await receipt.update({ status });
  return receipt;
}

async function recalculateOrderFinancials(orderId, models, options = {}) {
  if (!orderId) return null;
  const { Order, PaymentRequest, Performance, Contract } = models;
  const order = await Order.findByPk(orderId);
  if (!order) return null;
  const { skipPerformanceSync = false } = options;

  const requests = await PaymentRequest.findAll({
    where: { order_id: orderId },
    attributes: ['id'],
    raw: true
  });

  for (const request of requests) {
    await recalculatePaymentRequestStatus(request.id, models);
  }

  if (!skipPerformanceSync) {
    await syncOrderPerformance(orderId, models, { overwrite: true, allowDelete: true });
  }

  const refreshedRequests = await PaymentRequest.findAll({
    where: { order_id: orderId },
    attributes: ['request_amount', 'received_amount'],
    raw: true
  });
  const performanceRows = await Performance.findAll({
    where: { order_id: orderId },
    attributes: ['performance_amount'],
    raw: true
  });

  const requestedAmount = refreshedRequests.reduce((sum, item) => sum + Number(item.request_amount || 0), 0);
  const receivedAmount = refreshedRequests.reduce((sum, item) => sum + Number(item.received_amount || 0), 0);
  const performanceAmount = performanceRows.reduce((sum, item) => sum + Number(item.performance_amount || 0), 0);

  let paymentStatus = '未请款';
  if (requestedAmount > 0 && receivedAmount <= 0) paymentStatus = '已请款';
  if (requestedAmount > 0 && receivedAmount > 0 && receivedAmount < requestedAmount) paymentStatus = '部分收款';
  if (requestedAmount > 0 && receivedAmount >= requestedAmount) paymentStatus = '已收款';

  await order.update({
    requested_amount: requestedAmount,
    received_amount: receivedAmount,
    performance_amount: performanceAmount,
    payment_status: paymentStatus,
    finance_generated: requestedAmount > 0 ? 1 : 0,
    finance_booked: receivedAmount > 0 ? 1 : 0,
    perf_generated: performanceAmount > 0 ? 1 : 0,
    calc_version: Number(order.calc_version || 1) + 1,
    last_recalc_at: new Date()
  });

  if (order.contract_id) {
    await syncContractAmount(order.contract_id, models);
    const contract = await Contract.findByPk(order.contract_id);
    if (contract?.project_id) {
      await syncProjectAmount(contract.project_id, models);
    }
  }

  return order;
}

async function syncPaymentFlowFromFinance(financeId, models) {
  const { Finance } = models;
  const finance = await Finance.findByPk(financeId);
  if (!finance) return;

  if (finance.source_type === 'payment_request' && finance.source_id) {
    await recalculatePaymentRequestStatus(finance.source_id, models);
  }
  if (finance.order_id) {
    await recalculateOrderFinancials(finance.order_id, models);
  }
}

module.exports = {
  recalculateOrderFinancials,
  recalculatePaymentRequestStatus,
  recalculateReceiptArchiveStatus,
  syncOrderPerformance,
  syncPaymentFlowFromFinance,
};
