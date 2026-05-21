const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { Finance, Order, Contract, Customer, BankAccount, PaymentRequest } = require('../models');
const { getPagination, success, fail, paginate, generateNo } = require('../utils/helpers');
const { syncContractAmount, syncProjectAmount } = require('../utils/syncAmount');
const models = require('../models');
const { sequelize } = models;
const { buildFinanceSalesScope } = require('../utils/salesScope');
const { syncPaymentFlowFromFinance, recalculateOrderFinancials, recalculateReceiptArchiveStatus } = require('../utils/paymentFlow');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { page, pageSize, offset, limit } = getPagination(req.query);
    const where = {};
    if (req.query.finance_no) where.finance_no = { [Op.like]: `%${req.query.finance_no}%` };
    if (req.query.contract_no) where.contract_no = { [Op.like]: `%${req.query.contract_no}%` };
    if (req.query.project_name) where.project_name = { [Op.like]: `%${req.query.project_name}%` };
    if (req.query.type) where.type = req.query.type;
    if (req.query.category) where.category = { [Op.like]: `%${req.query.category}%` };
    if (req.query.company_id) where.company_id = req.query.company_id;
    if (req.query.dept_id) where.dept_id = req.query.dept_id;
    if (req.query.booked !== undefined && req.query.booked !== '' && req.query.booked !== null) {
      where.booked = parseInt(req.query.booked);
    }
    if (req.query.date_start && req.query.date_end) where.date = { [Op.between]: [req.query.date_start, req.query.date_end] };
    const salesScope = await buildFinanceSalesScope(req, models);
    const finalWhere = salesScope ? { [Op.and]: [where, salesScope] } : where;
    const { count, rows } = await Finance.findAndCountAll({ where: finalWhere, offset, limit, order: [['id', 'DESC']] });
    res.json({ success: true, data: { list: rows, total: count } });
  } catch (err) { fail(res, err.message, 500); }
});

router.get('/:id', async (req, res) => {
  try {
    const salesScope = await buildFinanceSalesScope(req, models);
    const item = await Finance.findOne({ where: salesScope ? { [Op.and]: [{ id: req.params.id }, salesScope] } : { id: req.params.id } });
    if (!item) return fail(res, '财务记录不存在', 404);
    success(res, item);
  } catch (err) { fail(res, err.message, 500); }
});

router.post('/', async (req, res) => {
  try {
    const result = await sequelize.transaction(async (t) => {
    const payload = { ...req.body };
    if (payload.source_type === 'payment_request' && payload.source_id) {
      const request = await PaymentRequest.findByPk(payload.source_id);
      if (request) {
        payload.order_id = request.order_id;
        payload.order_no = request.order_no;
        payload.contract_id = request.contract_id;
        payload.contract_no = request.contract_no;
        payload.project_id = request.project_id;
        payload.project_name = request.project_name;
        payload.customer_id = request.customer_id;
        payload.customer_name = request.customer_name;
        payload.company_id = request.company_id;
        payload.company_name = request.company_name;
      }
    }
    const item = await Finance.create(payload);
    if (!item.finance_no) {
      item.finance_no = generateNo('CW', item.id);
      await item.save();
    }
    await syncPaymentFlowFromFinance(item.id, models);
    if (item.source_type === 'receipt' && item.source_id) {
      await recalculateReceiptArchiveStatus(item.source_id, models);
    }
    success(res, item, '财务记录创建成功');
  } catch (err) { fail(res, err.message, 500); }
});

router.put('/:id', async (req, res) => {
  try {
    const result = await sequelize.transaction(async (t) => {
    const salesScope = await buildFinanceSalesScope(req, models);
    const item = await Finance.findOne({ where: salesScope ? { [Op.and]: [{ id: req.params.id }, salesScope] } : { id: req.params.id } });
    if (!item) return fail(res, '财务记录不存在', 404);
    const oldBooked = item.booked;
    await item.update(req.body);

    if (req.body.booked !== undefined && req.body.booked !== oldBooked) {
      let orderNos = [];
      if (item.description) {
        if (item.description.startsWith('批量订单:')) {
          orderNos = item.description.replace('批量订单:', '').split(',').map(s => s.trim()).filter(Boolean);
        } else if (item.description.startsWith('订单:')) {
          orderNos = [item.description.replace('订单:', '').trim()];
        }
      }
      if (orderNos.length > 0) {
        const booked = parseInt(req.body.booked);
        await Order.update({ finance_booked: booked }, { where: { order_no: { [Op.in]: orderNos } } });
      }
    }

    await syncPaymentFlowFromFinance(item.id, models);
    if (item.source_type === 'receipt' && item.source_id) {
      await recalculateReceiptArchiveStatus(item.source_id, models);
    }
    success(res, null, '更新成功');
    if (item.contract_no) {
      const c = await Contract.findOne({ where: { contract_no: item.contract_no } });
      if (c) {
        syncContractAmount(c.id, models).catch(() => {});
        if (c.project_id) syncProjectAmount(c.project_id, models).catch(() => {});
      }
    }
  } catch (err) { fail(res, err.message, 500); }
});

// 从订单批量生成财务记录（同一合同号只生成一条财务记录）
router.post('/auto-from-orders', async (req, res) => {
  try {
    const result = await sequelize.transaction(async (t) => {
    const { order_ids, date_start, date_end } = req.body;
    const where = {};
    if (order_ids && order_ids.length > 0) {
      where.id = { [Op.in]: order_ids };
    } else {
      where.status = '已完成';
    }
    if (date_start && date_end) where.date = { [Op.between]: [date_start, date_end] };

    const orders = await Order.findAll({ where });
    const results = [];

    // 按合同号分组合并，同合同的多条订单合并成一条财务记录
    const grouped = {};
    for (const order of orders) {
      const key = order.contract_no || '__no_contract__';
      if (!grouped[key]) {
        grouped[key] = {
          contract_no: order.contract_no || '',
          project_name: order.project_name || '',
          company_id: order.company_id,
          company_name: order.company_name || '',
          totalAmount: 0,
          orderNos: [],
          date: order.date
        };
      }
      grouped[key].totalAmount += Number(order.total) || 0;
      grouped[key].orderNos.push(order.order_no);
      if (order.date < grouped[key].date) grouped[key].date = order.date;
    }

    for (const [key, group] of Object.entries(grouped)) {
      // 同一合同号只生成一条财务记录（按 contract_no 查重，不再按具体订单组合查重）
      const existing = await Finance.findOne({ where: { contract_no: group.contract_no || '' } });
      const sourceStr = `批量订单:${group.orderNos.join(',')}`;

      // 从合同读取客户信息
      let contract_id = null, customer_name = null;
      let bank_account_id = null, bank_account_name = null;
      if (group.contract_no) {
        const contract = await Contract.findOne({ where: { contract_no: group.contract_no } });
        if (contract) {
          contract_id = contract.id;
          customer_name = contract.customer_name || null;
          bank_account_id = contract.bank_account_id || null;
          bank_account_name = contract.bank_account_name || null;
        }
      }

      const finData = {
        date: group.date,
        contract_id,
        contract_no: group.contract_no,
        project_name: group.project_name,
        category: group.contract_no ? '工程收入' : '工程收入(无合同)',
        type: '收入',
        amount: group.totalAmount,
        company_id: group.company_id,
        company_name: group.company_name,
        customer_name,
        booked: 0,
        bank_account_id,
        bank_account_name,
        description: sourceStr
      };

      if (existing) {
        await existing.update(finData);
        // 直接生成财务编号
        existing.finance_no = generateNo('CW', existing.id);
        await existing.save();
        results.push({ action: 'update', contract_no: group.contract_no || '(无合同)', company: group.company_name, amount: group.totalAmount, count: group.orderNos.length, finance_no: existing.finance_no });
      } else {
        const created = await Finance.create(finData);
        // 直接生成财务编号
        created.finance_no = generateNo('CW', created.id);
        await created.save();
        results.push({ action: 'create', contract_no: group.contract_no || '(无合同)', company: group.company_name, amount: group.totalAmount, count: group.orderNos.length, finance_no: created.finance_no });
      }
    }

    // 更新订单的财务已生成标识
    if (order_ids && order_ids.length > 0) {
      await Order.update({ finance_generated: 1 }, { where: { id: { [Op.in]: order_ids } } });
    }

    success(res, { processed: results.length, details: results }, `已生成 ${results.length} 条财务记录（来自 ${orders.length} 个订单）`);
  } catch (err) { fail(res, err.message, 500); }
});

// 从合同批量生成财务记录
router.post('/auto-from-contracts', async (req, res) => {
  try {
    const result = await sequelize.transaction(async (t) => {
    const { date_start, date_end } = req.body;
    let where = {};
    if (date_start && date_end) where.date = { [Op.between]: [date_start, date_end] };

    const contracts = await Contract.findAll({ where });
    const results = [];

    for (const contract of contracts) {
      // 按 contract_no 查重，同一合同号只有一条
      const existing = await Finance.findOne({ where: { contract_no: contract.contract_no || '' } });
      const sourceStr = `合同:${contract.contract_no}`;

      let customer_name = contract.customer_name || null;
      if (contract.customer_id) {
        const customer = await Customer.findByPk(contract.customer_id);
        if (customer) {
          customer_name = customer.name;
        }
      }

      const finData = {
        date: contract.date,
        contract_id: contract.id,
        contract_no: contract.contract_no || '',
        project_name: contract.name || '',
        category: '合同收入',
        type: '收入',
        amount: Number(contract.amount) || 0,
        company_id: contract.company_id,
        company_name: contract.company_name,
        customer_name,
        booked: 0,
        bank_account_id: contract.bank_account_id || null,
        bank_account_name: contract.bank_account_name || null,
        description: sourceStr
      };

      if (existing) {
        await existing.update(finData);
        // 已有记录但没有财务编号时也需要生成
        if (!existing.finance_no) { existing.finance_no = generateNo('CW', existing.id); await existing.save(); }
        results.push({ action: 'update', contract_no: contract.contract_no, company: contract.company_name, amount: finData.amount });
      } else {
        const created = await Finance.create(finData);
        if (!created.finance_no) { created.finance_no = generateNo('CW', created.id); await created.save(); }
        results.push({ action: 'create', contract_no: contract.contract_no, company: contract.company_name, amount: finData.amount });
      }
    }

    success(res, { processed: results.length, details: results }, `已生成 ${results.length} 条财务记录（来自 ${contracts.length} 个合同）`);
  } catch (err) { fail(res, err.message, 500); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await sequelize.transaction(async (t) => {
    const salesScope = await buildFinanceSalesScope(req, models);
    const item = await Finance.findOne({ where: salesScope ? { [Op.and]: [{ id: req.params.id }, salesScope] } : { id: req.params.id } });
    if (!item) return fail(res, '财务记录不存在', 404);
    const financeId = item.id;
    const orderId = item.order_id;
    const contractId = item.contract_id;
    const projectId = item.project_id;
    await item.destroy();
    if (orderId) {
      await recalculateOrderFinancials(orderId, models).catch(() => {});
    } else {
      await syncPaymentFlowFromFinance(financeId, models).catch(() => {});
    }
    if (item.source_type === 'receipt' && item.source_id) {
      await recalculateReceiptArchiveStatus(item.source_id, models).catch(() => {});
    }
    if (contractId) {
      syncContractAmount(contractId, models).catch(() => {});
      if (projectId) syncProjectAmount(projectId, models).catch(() => {});
    }
    success(res, null, '删除成功');
  } catch (err) { fail(res, err.message, 500); }
});

module.exports = router;
