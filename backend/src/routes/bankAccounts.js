const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { BankAccount, Company } = require('../models');
const { success, fail } = require('../utils/helpers');

router.use(auth);

// 获取银行账户列表（支持按公司筛选）
router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.company_id) where.company_id = req.query.company_id;
    if (req.query.account_name) where.account_name = { [Op.like]: `%${req.query.account_name}%` };

    const list = await BankAccount.findAll({
      where,
      include: [{ model: Company, as: 'companyInfo', attributes: ['id', 'name'] }],
      order: [['company_id', 'ASC'], ['id', 'ASC']]
    });
    res.json({ success: true, data: { list, total: list.length } });
  } catch (err) { fail(res, err.message, 500); }
});

// 获取单个银行账户
router.get('/:id', async (req, res) => {
  try {
    const item = await BankAccount.findByPk(req.params.id, {
      include: [{ model: Company, as: 'companyInfo', attributes: ['id', 'name'] }]
    });
    if (!item) return fail(res, '银行账户不存在', 404);
    success(res, item);
  } catch (err) { fail(res, err.message, 500); }
});

// 创建银行账户
router.post('/', async (req, res) => {
  try {
    const { company_id, account_name, bank_account, bank_name, account_type, is_default, initial_capital, remark } = req.body;
    if (!company_id) return fail(res, '所属公司不能为空');
    if (!account_name) return fail(res, '账户名称不能为空');
    if (!bank_account) return fail(res, '银行账号不能为空');

    // 获取公司名称
    const company = await Company.findByPk(company_id);
    if (!company) return fail(res, '公司不存在', 404);

    // 如果设置为默认账户，取消该公司的其他默认账户
    if (is_default) {
      await BankAccount.update({ is_default: false }, { where: { company_id, is_default: true } });
    }

    const item = await BankAccount.create({
      company_id,
      company_name: company.name,
      account_name,
      bank_account,
      bank_name,
      account_type: account_type || '公账',
      is_default: is_default || false,
      initial_capital: initial_capital || 0,
      remark
    });
    success(res, item, '银行账户创建成功');
  } catch (err) { fail(res, err.message, 500); }
});

// 更新银行账户
router.put('/:id', async (req, res) => {
  try {
    const item = await BankAccount.findByPk(req.params.id);
    if (!item) return fail(res, '银行账户不存在', 404);

    const { company_id, is_default } = req.body;

    // 如果修改了公司，更新公司名称
    if (company_id && company_id !== item.company_id) {
      const company = await Company.findByPk(company_id);
      if (!company) return fail(res, '公司不存在', 404);
      req.body.company_name = company.name;
    }

    // 如果设置为默认账户，取消该公司的其他默认账户
    if (is_default && !item.is_default) {
      await BankAccount.update(
        { is_default: false },
        { where: { company_id: item.company_id, is_default: true, id: { [Op.ne]: req.params.id } } }
      );
    }

    await item.update(req.body);
    success(res, null, '更新成功');
  } catch (err) { fail(res, err.message, 500); }
});

// 删除银行账户
router.delete('/:id', async (req, res) => {
  try {
    const item = await BankAccount.findByPk(req.params.id);
    if (!item) return fail(res, '银行账户不存在', 404);

    // 检查是否被合同或财务记录引用
    const { Contract, Finance } = require('../models');
    const contractCount = await Contract.count({ where: { bank_account_id: req.params.id } });
    const financeCount = await Finance.count({ where: { bank_account_id: req.params.id } });

    if (contractCount > 0 || financeCount > 0) {
      return fail(res, '该银行账户正在使用中，无法删除', 400);
    }

    await item.destroy();
    success(res, null, '删除成功');
  } catch (err) { fail(res, err.message, 500); }
});

module.exports = router;
