const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { PaymentRequest, Finance, BankAccount, Contract, Employee } = require('../models');
const { success, fail, getPagination, generateNo } = require('../utils/helpers');
const { applySalesScope } = require('../utils/salesScope');
const { resolveSalesmanPayload } = require('../utils/salesman');
const { recalculateOrderFinancials } = require('../utils/paymentFlow');
const models = require('../models');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { offset, limit } = getPagination(req.query);
    const where = {};
    if (req.query.request_no) where.request_no = { [Op.like]: `%${req.query.request_no}%` };
    if (req.query.batch_no) where.batch_no = { [Op.like]: `%${req.query.batch_no}%` };
    if (req.query.order_no) where.order_no = { [Op.like]: `%${req.query.order_no}%` };
    if (req.query.contract_no) where.contract_no = { [Op.like]: `%${req.query.contract_no}%` };
    if (req.query.project_name) where.project_name = { [Op.like]: `%${req.query.project_name}%` };
    if (req.query.customer_name) where.customer_name = { [Op.like]: `%${req.query.customer_name}%` };
    if (req.query.status) where.status = req.query.status;
    if (req.query.salesman_id) where.salesman_id = req.query.salesman_id;
    if (req.query.date_start && req.query.date_end) {
      where.date = { [Op.between]: [req.query.date_start, req.query.date_end] };
    }

    const { count, rows } = await PaymentRequest.findAndCountAll({
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

router.get('/all/list', async (req, res) => {
  try {
    const where = {};
    if (req.query.order_id) where.order_id = req.query.order_id;
    if (req.query.batch_id) where.batch_id = req.query.batch_id;
    if (req.query.status) where.status = req.query.status;
    const rows = await PaymentRequest.findAll({ where: applySalesScope(req, where, 'salesman_id', 'salesman_name'), order: [['id', 'DESC']] });
    success(res, rows);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await PaymentRequest.findOne({ where: applySalesScope(req, { id: req.params.id }, 'salesman_id', 'salesman_name') });
    if (!row) return fail(res, '请款单不存在', 404);
    success(res, row);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/', async (req, res) => {
  try {
    let payload = { ...req.body };
    payload = await resolveSalesmanPayload(payload, Employee, { salesmanNameField: 'salesman_name' });
    if (req.user.role === 'sales') {
      payload.salesman_id = req.user.id;
      payload.salesman_name = req.user.name;
    }
    if (!payload.order_id && !payload.order_no) return fail(res, '订单信息不能为空');
    const row = await PaymentRequest.create(payload);
    if (!row.request_no) {
      row.request_no = generateNo('QK', row.id);
      await row.save();
    }
    if (row.order_id) await recalculateOrderFinancials(row.order_id, models);
    success(res, row, '请款单创建成功');
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const row = await PaymentRequest.findOne({ where: applySalesScope(req, { id: req.params.id }, 'salesman_id', 'salesman_name') });
    if (!row) return fail(res, '请款单不存在', 404);
    let payload = { ...req.body };
    payload = await resolveSalesmanPayload(payload, Employee, { salesmanNameField: 'salesman_name' });
    if (req.user.role === 'sales') {
      payload.salesman_id = req.user.id;
      payload.salesman_name = req.user.name;
    }
    await row.update(payload);
    if (row.order_id) await recalculateOrderFinancials(row.order_id, models);
    success(res, row, '请款单更新成功');
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const row = await PaymentRequest.findOne({ where: applySalesScope(req, { id: req.params.id }, 'salesman_id', 'salesman_name') });
    if (!row) return fail(res, '请款单不存在', 404);
    const orderId = row.order_id;
    await row.destroy();
    if (orderId) await recalculateOrderFinancials(orderId, models);
    success(res, null, '请款单删除成功');
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/:id/generate-finance', async (req, res) => {
  try {
    const row = await PaymentRequest.findOne({ where: applySalesScope(req, { id: req.params.id }, 'salesman_id', 'salesman_name') });
    if (!row) return fail(res, '请款单不存在', 404);

    let companyBankAccount = '';
    let bankAccountId = null;
    let bankAccountName = null;
    if (row.contract_id) {
      const contract = await Contract.findByPk(row.contract_id);
      if (contract) {
        bankAccountId = contract.bank_account_id || null;
        bankAccountName = contract.bank_account_name || null;
        companyBankAccount = contract.bank_account || '';
      }
    }
    if (!companyBankAccount && bankAccountId) {
      const bank = await BankAccount.findByPk(bankAccountId);
      if (bank) companyBankAccount = bank.bank_account || '';
    }

    let finance = await Finance.findOne({
      where: { source_type: 'payment_request', source_id: row.id }
    });

    const payload = {
      date: row.date,
      contract_id: row.contract_id,
      contract_no: row.contract_no,
      order_id: row.order_id,
      order_no: row.order_no,
      project_id: row.project_id,
      project_name: row.project_name,
      category: '项目收款',
      description: `请款单:${row.request_no || row.id}`,
      type: '收入',
      amount: row.request_amount,
      company_id: row.company_id,
      company_name: row.company_name,
      customer_id: row.customer_id,
      customer_name: row.customer_name,
      booked: 0,
      source_type: 'payment_request',
      source_id: row.id,
      bank_account_id: bankAccountId,
      bank_account_name: bankAccountName,
      company_bank_account: companyBankAccount
    };

    if (finance) {
      await finance.update(payload);
    } else {
      finance = await Finance.create(payload);
      if (!finance.finance_no) {
        finance.finance_no = generateNo('CW', finance.id);
        await finance.save();
      }
    }

    await recalculateOrderFinancials(row.order_id, models);
    success(res, finance, '已生成财务请款数据');
  } catch (err) {
    fail(res, err.message, 500);
  }
});

module.exports = router;
