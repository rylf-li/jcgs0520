/**
 * 财务同步工具函数
 * 在新增/更新财务记录后，同步更新合同和项目的所有金额字段
 *
 * 数据流向：
 *   订单(Order) + 财务(Finance) → 合同(Contract) → 项目(Project)
 *
 * 合同金额字段来源：
 *   receivable   (应收款)     = 订单合计金额 (SUM orders.total)
 *   requested    (已请款)     = 财务收入总额 (SUM finance WHERE type='收入')
 *   received     (已收款)     = 已入账收入   (SUM finance WHERE booked=1 AND type='收入')
 *   cost         (结算金额)   = 订单结算费   (SUM orders.settlement_fee)
 *   tax          (税费)       = booked收入 × 公司税率 / 100
 *   labor_cost   (劳务费)     = 财务支出-劳务费 (SUM finance WHERE type='支出' AND category='劳务费')
 *   business_fee (业务费)     = 财务支出-业务费 (SUM finance WHERE type='支出' AND category='业务费')
 *   other        (其他费用)   = 财务支出-其他   (SUM finance WHERE type='支出' AND category='其他')
 *   performance  (绩效)       = 订单绩效费   (SUM orders.performance_fee)
 *   profit       (利润)       = received - cost - tax - performance - business_fee - labor_cost - other
 */
const { fn, col, literal } = require('sequelize');

/**
 * 同步合同的所有金额字段
 * 从订单和财务记录汇总，更新合同的 receivable/requested/received/cost/tax/labor_cost/business_fee/other/performance/profit
 * @param {number} contractId - 合同ID
 * @param {object} models - { Contract, Order, Finance, Company }
 */
async function syncContractAmount(contractId, models) {
  if (!contractId) return;
  const { Contract, Order, Finance, Company } = models;
  try {
    const contract = await Contract.findByPk(contractId);
    if (!contract) return;

    // 1. 从订单汇总
    const orders = await Order.findAll({
      where: { contract_id: contractId },
      attributes: ['order_no', 'total', 'settlement_fee', 'performance_fee'],
      raw: true
    });

    const order_total = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const order_settlement = orders.reduce((sum, o) => sum + Number(o.settlement_fee || 0), 0);
    const order_performance = orders.reduce((sum, o) => sum + Number(o.performance_fee || 0), 0);

    // 2. 从财务汇总（通过 contract_id 直接关联，比 description 匹配更准确）
    const financeSummary = await Finance.findAll({
      where: { contract_id: contractId },
      attributes: [
        [fn('SUM', literal("CASE WHEN type='收入' THEN amount ELSE 0 END")), 'income'],
        [fn('SUM', literal("CASE WHEN booked=1 AND type='收入' THEN amount ELSE 0 END")), 'booked_income'],
        [fn('SUM', literal("CASE WHEN type='支出' THEN amount ELSE 0 END")), 'expense'],
        [fn('SUM', literal("CASE WHEN type='支出' AND category='劳务费' THEN amount ELSE 0 END")), 'labor'],
        [fn('SUM', literal("CASE WHEN type='支出' AND category='业务费' THEN amount ELSE 0 END")), 'biz'],
        [fn('SUM', literal("CASE WHEN type='支出' AND category='其他' THEN amount ELSE 0 END")), 'other']
      ],
      raw: true
    });

    const finance_income = Number(financeSummary[0]?.income) || 0;
    const finance_booked_income = Number(financeSummary[0]?.booked_income) || 0;
    const labor_cost = Number(financeSummary[0]?.labor) || 0;
    const business_fee = Number(financeSummary[0]?.biz) || 0;
    const other = Number(financeSummary[0]?.other) || 0;

    // 3. 获取公司税率
    let tax_rate = 0;
    if (contract.company_id) {
      const company = await Company.findByPk(contract.company_id);
      if (company && company.tax_rate) tax_rate = Number(company.tax_rate) || 0;
    }

    // 4. 计算税费和利润
    // received(已收款) 基于 booked=1（已入账），booked_income 同时用于税费计算
    const tax = finance_booked_income * tax_rate / 100;
    const profit = finance_booked_income - order_settlement - tax - order_performance - business_fee - labor_cost - other;

    // 5. 更新合同
    const updateData = {
      receivable: order_total,
      requested: finance_income,
      received: finance_booked_income,
      cost: order_settlement,
      tax,
      labor_cost,
      business_fee,
      other,
      performance: order_performance,
      profit
    };

    await Contract.update(updateData, { where: { id: contractId } });
    console.log(`[syncContractAmount] contract ${contractId} all amounts updated`, updateData);
  } catch (err) {
    console.error(`[syncContractAmount] contract ${contractId} error:`, err.message);
  }
}

/**
 * 同步项目的所有金额字段
 * 从关联合同汇总，更新项目的所有金额字段
 * @param {number} projectId - 项目ID
 * @param {object} models - { Project, Contract }
 */
async function syncProjectAmount(projectId, models) {
  if (!projectId) return;
  const { Project, Contract } = models;
  try {
    // 汇总该项目所有合同的金额字段
    const summary = await Contract.findAll({
      where: { project_id: projectId },
      attributes: [
        [fn('SUM', col('amount')), 'amount'],
        [fn('SUM', col('receivable')), 'receivable'],
        [fn('SUM', col('requested')), 'requested'],
        [fn('SUM', col('received')), 'received'],
        [fn('SUM', col('cost')), 'cost'],
        [fn('SUM', col('tax')), 'tax'],
        [fn('SUM', col('labor_cost')), 'labor_cost'],
        [fn('SUM', col('business_fee')), 'business_fee'],
        [fn('SUM', col('other')), 'other'],
        [fn('SUM', col('performance')), 'performance'],
        [fn('SUM', col('profit')), 'profit']
      ],
      raw: true
    });

    const updateData = {
      amount: parseFloat(summary[0]?.amount || 0),
      receivable: parseFloat(summary[0]?.receivable || 0),
      requested: parseFloat(summary[0]?.requested || 0),
      received: parseFloat(summary[0]?.received || 0),
      cost: parseFloat(summary[0]?.cost || 0),
      tax: parseFloat(summary[0]?.tax || 0),
      labor_cost: parseFloat(summary[0]?.labor_cost || 0),
      business_fee: parseFloat(summary[0]?.business_fee || 0),
      other: parseFloat(summary[0]?.other || 0),
      performance: parseFloat(summary[0]?.performance || 0),
      profit: parseFloat(summary[0]?.profit || 0)
    };

    await Project.update(updateData, { where: { id: projectId } });
    console.log(`[syncProjectAmount] project ${projectId} all amounts updated`, updateData);
  } catch (err) {
    console.error(`[syncProjectAmount] project ${projectId} error:`, err.message);
  }
}

module.exports = { syncContractAmount, syncProjectAmount };
