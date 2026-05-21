const router = require('express').Router();
const { Op, fn, col, Sequelize } = require('sequelize');
const auth = require('../middleware/auth');
const { checkApprovalPermission } = require('../middleware/checkApprovalPermission');
const { Contract, Project, Customer, Order, Department, Company, Employee, Finance, BankAccount, PaymentRequest, OrderItem, ContractStatusHistory } = require('../models');
const { getPagination, success, fail, paginate, generateNo } = require('../utils/helpers');
const { syncContractAmount, syncProjectAmount } = require('../utils/syncAmount');
const models = require('../models');
const { sequelize } = models;
const { applySalesScope } = require('../utils/salesScope');
const { resolveSalesmanPayload } = require('../utils/salesman');
const paginationService = require('../services/paginationService');
const batchService = require('../services/batchService');
const ExcelJS = require('exceljs');

router.use(auth);

// 批量更新合同状态（必须放在 /:id 路由之前）
router.post('/batch/status', checkApprovalPermission(['admin', 'manager']), async (req, res) => {
  const transaction = await models.sequelize.transaction();
  
  try {
    const result = await sequelize.transaction(async (t) => {
    const { ids, status } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.name || '系统';

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      await transaction.rollback();
      return fail(res, '请选择要更新的合同');
    }

    if (ids.length > 100) {
      await transaction.rollback();
      return fail(res, '单次最多更新100条合同');
    }

    if (!status) {
      await transaction.rollback();
      return fail(res, '请指定目标状态');
    }

    const validStatuses = ['待签订', '进行中', '已完成', '已取消'];
    if (!validStatuses.includes(status)) {
      await transaction.rollback();
      return fail(res, '无效的状态值');
    }

    const contracts = await Contract.findAll({
      where: applySalesScope(req, { id: { [Op.in]: ids } }),
      transaction
    });

    console.log('[batch/status] Found contracts:', contracts.length, 'ids:', ids);

    if (contracts.length === 0) {
      await transaction.rollback();
      return fail(res, '未找到任何合同');
    }

    const statusFlow = {
      '待签订': ['进行中', '已取消'],
      '进行中': ['已完成', '已取消'],
      '已完成': [],
      '已取消': []
    };

    const failedItems = [];
    const toUpdateContracts = [];
    const projectIds = new Set();

    for (const contract of contracts) {
      console.log('[batch/status] Contract:', contract.id, 'current:', contract.status, 'target:', status);
      const allowedTargets = statusFlow[contract.status] || [];
      
      if (!allowedTargets.includes(status)) {
        failedItems.push({
          id: contract.id,
          contract_no: contract.contract_no,
          reason: `状态不能从"${contract.status}"变更到"${status}"`
        });
        continue;
      }

      if (status === '已取消') {
        const orderCount = await Order.count({
          where: { contract_id: contract.id },
          transaction
        });
        
        if (orderCount > 0) {
          failedItems.push({
            id: contract.id,
            contract_no: contract.contract_no,
            reason: `该合同已关联${orderCount}条订单，不能取消`
          });
          continue;
        }
        
        const paymentCount = await PaymentRequest.count({
          where: { contract_id: contract.id },
          transaction
        });
        
        if (paymentCount > 0) {
          failedItems.push({
            id: contract.id,
            contract_no: contract.contract_no,
            reason: `该合同已关联${paymentCount}条请款记录，不能取消`
          });
          continue;
        }
      }

      toUpdateContracts.push(contract);
      if (contract.project_id) projectIds.add(contract.project_id);
    }

    console.log('[batch/status] To update:', toUpdateContracts.length, 'Failed:', failedItems.length);

    let updatedCount = 0;
    for (const contract of toUpdateContracts) {
      const oldStatus = contract.status;
      await contract.update({ status }, { transaction });
      
      await ContractStatusHistory.create({
        contract_id: contract.id,
        old_status: oldStatus,
        new_status: status,
        operator_id: userId,
        operator_name: userName,
        reason: '批量状态变更'
      }, { transaction });
      
      updatedCount++;
    }

    await transaction.commit();

    for (const projectId of projectIds) {
      syncProjectAmount(projectId, models).catch(() => {});
    }

    if (updatedCount === 0 && failedItems.length > 0) {
      return success(res, {
        message: `全部失败，共 ${failedItems.length} 条合同无法变更`,
        updatedCount: 0,
        failedCount: failedItems.length,
        failedItems
      });
    }

    success(res, {
      message: `成功更新 ${updatedCount} 条合同状态${failedItems.length > 0 ? `，${failedItems.length} 条失败` : ''}`,
      updatedCount,
      failedCount: failedItems.length,
      failedItems
    });
  } catch (err) {
    console.error('[batch/status] Error:', err);
    await transaction.rollback();
    fail(res, err.message, 500);
  }
});

router.get('/', async (req, res) => {
  try {
    const { page, pageSize, offset, limit } = getPagination(req.query);
    const where = {};
    if (req.query.name) where.name = { [Op.like]: `%${req.query.name}%` };
    if (req.query.contract_no) where.contract_no = { [Op.like]: `%${req.query.contract_no}%` };
    if (req.query.customer_name) where.customer_name = { [Op.like]: `%${req.query.customer_name}%` };
    if (req.query.status) where.status = req.query.status;
    if (req.query.dept_id) where.dept_id = req.query.dept_id;
    if (req.query.company_id) where.company_id = req.query.company_id;
    if (req.query.project_id) where.project_id = req.query.project_id;
    if (req.query.date_start && req.query.date_end) where.date = { [Op.between]: [req.query.date_start, req.query.date_end] };
    const { count, rows } = await Contract.findAndCountAll({ where: applySalesScope(req, where), offset, limit, order: [['id', 'DESC']] });
    res.json({ success: true, data: { list: rows, total: count } });
  } catch (err) { fail(res, err.message, 500); }
});

router.get('/all/list', async (req, res) => {
  try {
    const where = {};
    if (req.query.project_id) where.project_id = req.query.project_id;
    if (req.query.status) where.status = req.query.status;
    const list = await Contract.findAll({
      where: applySalesScope(req, where),
      attributes: [
        'id', 'contract_no', 'name', 'customer_id', 'customer_name', 'amount', 'status', 'project_id',
        'manager', 'salesman', 'salesman_id', 'dept_id', 'dept_name', 'company_id', 'company_name',
        'bank_account_id', 'bank_account_name'
      ],
      order: [['id', 'DESC']]
    });
    success(res, list);
  } catch (err) { fail(res, err.message, 500); }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await Contract.findOne({ where: applySalesScope(req, { id: req.params.id }) });
    if (!item) return fail(res, '合同不存在', 404);
    
    const { page = 1, pageSize = 20 } = req.query;
    
    const ordersResult = await paginationService.paginate(
      Order,
      { where: { contract_id: req.params.id } },
      { page, pageSize }
    );
    
    const orderSummary = await Order.findOne({
      where: { contract_id: req.params.id },
      attributes: [
        [fn('COUNT', col('id')), 'order_count'],
        [fn('SUM', col('total')), 'total_amount'],
        [fn('SUM', col('settlement_fee')), 'total_settlement'],
        [fn('SUM', col('performance_fee')), 'total_performance']
      ],
      raw: true
    });
    
    success(res, { 
      contract: item, 
      orders: ordersResult.data,
      orderSummary,
      pagination: ordersResult.pagination
    });
  } catch (err) { fail(res, err.message, 500); }
});

router.post('/', async (req, res) => {
  try {
    const result = await sequelize.transaction(async (t) => {
    if (!req.body.name) return fail(res, '合同名称不能为空');

    // 处理项目关联
    if (req.body.project_id) {
      const project = await Project.findByPk(req.body.project_id);
      if (project) {
        req.body.customer_id = req.body.customer_id || project.customer_id;
        req.body.customer_name = req.body.customer_name || project.customer_name;
        req.body.project_name = project.name;
      }
    }

    // 处理部门关联
    if (req.body.dept_id) {
      const dept = await Department.findByPk(req.body.dept_id);
      if (dept) req.body.dept_name = dept.name;
    }

    // 处理公司关联
    if (req.body.company_id) {
      const company = await Company.findByPk(req.body.company_id);
      if (company) req.body.company_name = company.name;
    }

    // 处理银行账户关联
    if (req.body.bank_account_id) {
      const bankAccount = await BankAccount.findByPk(req.body.bank_account_id);
      if (bankAccount) req.body.bank_account_name = bankAccount.account_name;
    }

    let payload = await resolveSalesmanPayload(req.body, Employee);
    if (req.user.role === 'sales') {
      payload.salesman_id = req.user.id;
      payload.salesman = req.user.name;
    }
    const item = await Contract.create(payload);
    if (!item.contract_no) {
      item.contract_no = generateNo('HT', item.id);
      await item.save();
    }

    // 创建合同后同步项目金额
    if (item.project_id) {
      syncProjectAmount(item.project_id, models).catch(() => {});
    }

    success(res, item, '合同创建成功');
  } catch (err) { fail(res, err.message, 500); }
});

router.put('/:id', async (req, res) => {
  try {
    const result = await sequelize.transaction(async (t) => {
    const item = await Contract.findOne({ where: applySalesScope(req, { id: req.params.id }) });
    if (!item) return fail(res, '合同不存在', 404);
    let payload = await resolveSalesmanPayload(req.body, Employee);
    if (req.user.role === 'sales') {
      payload.salesman_id = req.user.id;
      payload.salesman = req.user.name;
    }

    // 处理项目关联变更
    if (payload.project_id && payload.project_id !== item.project_id) {
      const project = await Project.findByPk(payload.project_id);
      if (project) payload.project_name = project.name;
    }

    // 处理部门关联
    if (payload.dept_id && payload.dept_id !== item.dept_id) {
      const dept = await Department.findByPk(payload.dept_id);
      if (dept) payload.dept_name = dept.name;
    }

    // 处理公司关联
    if (payload.company_id && payload.company_id !== item.company_id) {
      const company = await Company.findByPk(payload.company_id);
      if (company) payload.company_name = company.name;
    }

    // 处理银行账户关联
    if (payload.bank_account_id && payload.bank_account_id !== item.bank_account_id) {
      const bankAccount = await BankAccount.findByPk(payload.bank_account_id);
      if (bankAccount) payload.bank_account_name = bankAccount.account_name;
    }

    // 记录旧的项目ID，用于检测项目变更
    const oldProjectId = item.project_id;

    await item.update(payload);

    // 如果项目关联变更，需要同步新旧两个项目的金额
    const newProjectId = item.project_id;
    if (oldProjectId !== newProjectId) {
      if (oldProjectId) syncProjectAmount(oldProjectId, models).catch(() => {});
      if (newProjectId) syncProjectAmount(newProjectId, models).catch(() => {});
    } else if (newProjectId) {
      // 项目未变更，同步当前项目金额
      syncProjectAmount(newProjectId, models).catch(() => {});
    }

    success(res, null, '更新成功');
  } catch (err) { fail(res, err.message, 500); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await sequelize.transaction(async (t) => {
    const item = await Contract.findOne({ where: applySalesScope(req, { id: req.params.id }) });
    if (!item) return fail(res, '合同不存在', 404);
    
    // 检查是否有关联订单
    const orderCount = await Order.count({ where: { contract_id: req.params.id } });
    if (orderCount > 0) {
      return fail(res, `该合同下有 ${orderCount} 个订单，请先删除订单`, 400);
    }

    // 记录项目ID，删除后同步项目金额
    const projectId = item.project_id;

    await item.destroy();

    // 删除合同后同步项目金额
    if (projectId) {
      syncProjectAmount(projectId, models).catch(() => {});
    }

    success(res, null, '删除成功');
  } catch (err) { fail(res, err.message, 500); }
});

// 合同金额汇总（从订单、财务自动汇总，只读查询）
router.get('/summary/:id', async (req, res) => {
  try {
    const contract = await Contract.findOne({ where: applySalesScope(req, { id: req.params.id }) });
    if (!contract) return fail(res, '合同不存在', 404);
    
    // 获取公司税率
    let tax_rate = 0;
    if (contract.company_id) {
      const company = await Company.findByPk(contract.company_id);
      if (company && company.tax_rate) tax_rate = Number(company.tax_rate) || 0;
    }
    
    // 获取合同下的所有订单
    const orders = await Order.findAll({
      where: { contract_id: contract.id },
      attributes: ['id', 'order_no', 'total', 'settlement_fee', 'performance_fee'],
      raw: true
    });
    
    // 从订单汇总
    const order_total = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const order_settlement = orders.reduce((sum, o) => sum + Number(o.settlement_fee || 0), 0);
    const order_performance = orders.reduce((sum, o) => sum + Number(o.performance_fee || 0), 0);
    
    // 从财务汇总（通过 contract_id 直接关联，更准确）
    const financeSummary = await Finance.findAll({
      where: { contract_id: contract.id },
      attributes: [
        [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN type='收入' THEN amount ELSE 0 END")), 'income'],
        [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN booked=1 AND type='收入' THEN amount ELSE 0 END")), 'booked'],
        [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN type='支出' THEN amount ELSE 0 END")), 'expense'],
        [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN type='支出' AND category='劳务费' THEN amount ELSE 0 END")), 'labor'],
        [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN type='支出' AND category='业务费' THEN amount ELSE 0 END")), 'biz'],
        [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN type='支出' AND category='其他' THEN amount ELSE 0 END")), 'other']
      ],
      raw: true
    });

    const finance_income = Number(financeSummary[0]?.income) || 0;
    const finance_booked = Number(financeSummary[0]?.booked) || 0;
    const labor_cost = Number(financeSummary[0]?.labor) || 0;
    const business_fee = Number(financeSummary[0]?.biz) || 0;
    const other = Number(financeSummary[0]?.other) || 0;
    
    // 税费 = 已收款 × 税率
    const tax = finance_booked * tax_rate / 100;
    // 利润 = 已收款 - 结算金额 - 税费 - 绩效 - 业务费 - 劳务费 - 其他
    const profit = finance_booked - order_settlement - tax - order_performance - business_fee - labor_cost - other;
    
    success(res, {
      receivable: order_total,
      requested: finance_income,
      received: finance_booked,
      cost: order_settlement,
      tax,
      labor_cost,
      business_fee,
      other,
      performance: order_performance,
      profit
    });
  } catch (err) { fail(res, err.message, 500); }
});

// 合同金额刷新（同步计算并写入数据库，一步完成）
router.post('/refresh/:id', async (req, res) => {
  try {
    const result = await sequelize.transaction(async (t) => {
    const contract = await Contract.findOne({ where: applySalesScope(req, { id: req.params.id }) });
    if (!contract) return fail(res, '合同不存在', 404);

    await syncContractAmount(contract.id, models);

    const updated = await Contract.findByPk(req.params.id);
    
    if (updated.project_id) {
      syncProjectAmount(updated.project_id, models).catch(() => {});
    }

    success(res, updated, '刷新成功');
  } catch (err) { fail(res, err.message, 500); }
});

router.post('/:id/payment-requests/batch-delete', async (req, res) => {
  try {
    const result = await sequelize.transaction(async (t) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return fail(res, '请选择要删除的请款记录', 400);
    }
    if (ids.length > 100) {
      return fail(res, '单次最多删除100条记录', 400);
    }

    const contract = await Contract.findOne({ where: applySalesScope(req, { id: req.params.id }) });
    if (!contract) return fail(res, '合同不存在', 404);

    const result = await batchService.batchDelete(PaymentRequest, ids, {
      where: { contract_id: req.params.id },
      statusField: 'status',
      allowedStatuses: ['草稿', '待审核'],
      validate: async (item) => {
        if (item.contract_id !== parseInt(req.params.id)) {
          return '请款记录不属于当前合同';
        }
        return null;
      }
    });

    await syncContractAmount(req.params.id, models);
    
    success(res, result, `成功删除 ${result.successCount} 条记录`);
  } catch (err) { fail(res, err.message, 500); }
});

router.put('/:id/number', async (req, res) => {
  try {
    const result = await sequelize.transaction(async (t) => {
    const { contract_no } = req.body;
    if (!contract_no || contract_no.trim() === '') {
      return fail(res, '合同编号不能为空', 400);
    }
    
    const trimmedNo = contract_no.trim();
    if (trimmedNo.length > 50) {
      return fail(res, '合同编号长度不能超过50个字符', 400);
    }
    
    if (!/^[A-Za-z0-9\-]+$/.test(trimmedNo)) {
      return fail(res, '合同编号只能包含字母、数字和连字符', 400);
    }

    const contract = await Contract.findOne({ where: applySalesScope(req, { id: req.params.id }) });
    if (!contract) return fail(res, '合同不存在', 404);

    const existing = await Contract.findOne({ 
      where: { contract_no: trimmedNo, id: { [Op.ne]: req.params.id } } 
    });
    if (existing) {
      return fail(res, '合同编号已存在', 400);
    }

    const orderCount = await Order.count({ where: { contract_id: req.params.id } });
    if (orderCount > 0) {
      return fail(res, '该合同已关联订单，不允许修改编号', 400);
    }

    const oldNo = contract.contract_no;
    await contract.update({ contract_no: trimmedNo });
    
    success(res, { old_no: oldNo, new_no: trimmedNo }, '合同编号更新成功');
  } catch (err) { fail(res, err.message, 500); }
});

// 导出合同订单列表
router.get('/:id/orders/export', async (req, res) => {
  try {
    const contract = await Contract.findOne({ where: applySalesScope(req, { id: req.params.id }) });
    if (!contract) return fail(res, '合同不存在', 404);

    const orders = await Order.findAll({
      where: { contract_id: req.params.id },
      include: [{
        model: OrderItem,
        as: 'items',
        required: false
      }],
      order: [['id', 'DESC']]
    });

    const paymentRequests = await PaymentRequest.findAll({
      where: { contract_id: req.params.id },
      attributes: ['order_id', 'request_amount', 'status'],
      raw: true
    });

    const paymentMap = new Map();
    for (const pr of paymentRequests) {
      if (!paymentMap.has(pr.order_id)) {
        paymentMap.set(pr.order_id, { total: 0, status: '未请款' });
      }
      const data = paymentMap.get(pr.order_id);
      data.total += Number(pr.request_amount || 0);
      if (pr.status !== '草稿') data.status = '已请款';
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('订单列表');

    worksheet.columns = [
      { header: '订单编号', key: 'order_no', width: 18 },
      { header: '日期', key: 'date', width: 12 },
      { header: '项目名称', key: 'project_name', width: 25 },
      { header: '客户名称', key: 'customer_name', width: 18 },
      { header: '业务类别', key: 'business_category', width: 12 },
      { header: '数量', key: 'quantity', width: 8 },
      { header: '订单金额', key: 'total', width: 14 },
      { header: '报告编号', key: 'report_no', width: 16 },
      { header: '报告日期', key: 'report_date', width: 12 },
      { header: '负责人', key: 'manager', width: 10 },
      { header: '订单状态', key: 'status', width: 10 },
      { header: '请款状态', key: 'payment_status', width: 10 },
      { header: '已请款金额', key: 'requested_amount', width: 14 },
      { header: '未请款金额', key: 'unrequested_amount', width: 14 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    let totalAmount = 0;
    let totalRequested = 0;

    for (const order of orders) {
      const paymentData = paymentMap.get(order.id) || { total: 0, status: '未请款' };
      const orderTotal = Number(order.total || 0);
      const requested = paymentData.total;
      
      totalAmount += orderTotal;
      totalRequested += requested;

      worksheet.addRow({
        order_no: order.order_no,
        date: order.date || '',
        project_name: order.project_name || '',
        customer_name: order.customer_name || '',
        business_category: order.business_category || '',
        quantity: order.quantity || 0,
        total: orderTotal.toFixed(2),
        report_no: order.report_no || '',
        report_date: order.report_date || '',
        manager: order.manager || '',
        status: order.status || '',
        payment_status: paymentData.status,
        requested_amount: requested.toFixed(2),
        unrequested_amount: (orderTotal - requested).toFixed(2)
      });
    }

    worksheet.addRow([]);
    const summaryRow = worksheet.addRow([
      `订单总数: ${orders.length}`,
      '',
      '',
      '',
      '',
      '',
      `订单总金额: ${totalAmount.toFixed(2)}`,
      '',
      '',
      '',
      '',
      '',
      `已请款总金额: ${totalRequested.toFixed(2)}`,
      `未请款总金额: ${(totalAmount - totalRequested).toFixed(2)}`
    ]);
    summaryRow.font = { bold: true };

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `${contract.contract_no || 'contract'}_订单列表_${dateStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { 
    console.error('[export orders]', err);
    fail(res, err.message, 500); 
  }
});

module.exports = router;
