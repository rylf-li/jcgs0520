const express = require('express');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { success, fail, getPagination } = require('../utils/helpers');
const { applySalesScope, buildFinanceSalesScope, isSalesUser } = require('../utils/salesScope');
const models = require('../models');

const router = express.Router();
const {
  Report,
  Project,
  Contract,
  Finance,
  Company,
  BankAccount,
  Salary,
  Performance,
  Employee,
  DeptStats,
  CompanyStats,
} = models;

router.use(auth);

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function dateString(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function getMonthBoundary(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start: dateString(start), end: dateString(end) };
}

function getQuarterRange(year, quarter) {
  const startMonth = (Number(quarter) - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  return {
    startDate: getMonthBoundary(year, startMonth).start,
    endDate: getMonthBoundary(year, endMonth).end
  };
}

function getYearRange(year) {
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`
  };
}

function buildDateWhere(startDate, endDate) {
  if (!startDate || !endDate) return {};
  return { date: { [Op.between]: [startDate, endDate] } };
}

async function getScopedFinanceList(req, extraWhere = {}) {
  const financeScope = await buildFinanceSalesScope(req, models);
  const finalWhere = financeScope
    ? { [Op.and]: [extraWhere, financeScope] }
    : extraWhere;

  return Finance.findAll({
    where: finalWhere,
    order: [['date', 'DESC'], ['id', 'DESC']],
    raw: true
  });
}

function buildCompanyStatsFromFinances(finances) {
  const statMap = new Map();
  for (const item of finances) {
    const key = `${item.company_name || '未分配公司'}__${item.type || '未知'}`;
    if (!statMap.has(key)) {
      statMap.set(key, {
        company_name: item.company_name || '未分配公司',
        type: item.type || '未知',
        total: 0
      });
    }
    statMap.get(key).total += Number(item.amount || 0);
  }
  return Array.from(statMap.values()).map((item) => ({
    ...item,
    total: toMoney(item.total)
  }));
}

function buildCompanyStatsFromSnapshots(rows) {
  const statMap = new Map();
  for (const item of rows) {
    const companyName = item.company_name || '未分配公司';
    if (!statMap.has(companyName)) {
      statMap.set(companyName, {
        company_name: companyName,
        total_contract_amount: 0,
        total_requested: 0,
        total_received: 0,
        total_expenditure: 0,
        total_profit: 0,
        project_count: 0
      });
    }
    const stat = statMap.get(companyName);
    stat.total_contract_amount += Number(item.contract_amount || 0);
    stat.total_requested += Number(item.requested || 0);
    stat.total_received += Number(item.received || 0);
    stat.total_expenditure += Number(item.expenditure || 0);
    stat.total_profit += Number(item.profit || 0);
    stat.project_count += Number(item.project_count || 0);
  }

  return Array.from(statMap.values()).flatMap((item) => ([
    { company_name: item.company_name, type: '收入', total: toMoney(item.total_received) },
    { company_name: item.company_name, type: '支出', total: toMoney(item.total_expenditure) }
  ]));
}

function buildDeptStatsFromSnapshots(rows) {
  const statMap = new Map();
  for (const item of rows) {
    const key = `${item.dept_name || '未分配部门'}__${item.company_name || '未分配公司'}`;
    if (!statMap.has(key)) {
      statMap.set(key, {
        dept_name: item.dept_name || '未分配部门',
        company_name: item.company_name || '未分配公司',
        total_amount: 0,
        total_requested: 0,
        total_received: 0,
        total_expenditure: 0,
        total_profit: 0,
        project_count: 0
      });
    }
    const stat = statMap.get(key);
    stat.total_amount += Number(item.contract_amount || 0);
    stat.total_requested += Number(item.requested || 0);
    stat.total_received += Number(item.received || 0);
    stat.total_expenditure += Number(item.expenditure || 0);
    stat.total_profit += Number(item.profit || 0);
    stat.project_count += Number(item.project_count || 0);
  }

  return Array.from(statMap.values()).map((item) => ({
    ...item,
    total_amount: toMoney(item.total_amount),
    total_requested: toMoney(item.total_requested),
    total_received: toMoney(item.total_received),
    total_expenditure: toMoney(item.total_expenditure),
    total_profit: toMoney(item.total_profit)
  }));
}

async function buildDeptStats(req, startDate, endDate) {
  const contractWhere = applySalesScope(req, buildDateWhere(startDate, endDate));
  const contracts = await Contract.findAll({
    where: contractWhere,
    order: [['dept_name', 'ASC']],
    raw: true
  });

  if (!contracts.length) return [];

  const contractIds = contracts.map((item) => item.id).filter(Boolean);
  const deptMap = new Map();

  for (const item of contracts) {
    const key = `${item.dept_name || '未分配部门'}__${item.company_name || '未分配公司'}`;
    if (!deptMap.has(key)) {
      deptMap.set(key, {
        dept_name: item.dept_name || '未分配部门',
        company_name: item.company_name || '未分配公司',
        project_count: 0,
        total_amount: 0,
        total_receivable: 0,
        total_requested: 0,
        total_received: 0,
        total_expenditure: 0,
        total_profit: 0
      });
    }
    const stat = deptMap.get(key);
    stat.project_count += 1;
    stat.total_amount += Number(item.amount || 0);
    stat.total_receivable += Number(item.receivable || 0);
    stat.total_requested += Number(item.requested || 0);
    stat.total_received += Number(item.received || 0);
    stat.total_profit += Number(item.profit || 0);
  }

  const financeWhere = {
    ...buildDateWhere(startDate, endDate),
    type: '支出',
    contract_id: { [Op.in]: contractIds }
  };
  const financeList = await getScopedFinanceList(req, financeWhere);
  for (const item of financeList) {
    const key = `${item.dept_name || '未分配部门'}__${item.company_name || '未分配公司'}`;
    if (!deptMap.has(key)) {
      deptMap.set(key, {
        dept_name: item.dept_name || '未分配部门',
        company_name: item.company_name || '未分配公司',
        project_count: 0,
        total_amount: 0,
        total_receivable: 0,
        total_requested: 0,
        total_received: 0,
        total_expenditure: 0,
        total_profit: 0
      });
    }
    deptMap.get(key).total_expenditure += Number(item.amount || 0);
  }

  return Array.from(deptMap.values()).map((item) => ({
    ...item,
    total_amount: toMoney(item.total_amount),
    total_receivable: toMoney(item.total_receivable),
    total_requested: toMoney(item.total_requested),
    total_received: toMoney(item.total_received),
    total_expenditure: toMoney(item.total_expenditure),
    total_profit: toMoney(item.total_profit)
  }));
}

async function buildPeriodReport(req, startDate, endDate) {
  const financeList = await getScopedFinanceList(req, buildDateWhere(startDate, endDate));
  let companyStats = buildCompanyStatsFromFinances(financeList);
  let deptStats = await buildDeptStats(req, startDate, endDate);
  let statsSource = 'live';

  if (!isSalesUser(req)) {
    const [snapshotCompanies, snapshotDepts] = await Promise.all([
      CompanyStats.findAll({
        where: buildDateWhere(startDate, endDate),
        raw: true
      }),
      DeptStats.findAll({
        where: buildDateWhere(startDate, endDate),
        raw: true
      })
    ]);

    if (snapshotCompanies.length > 0) {
      companyStats = buildCompanyStatsFromSnapshots(snapshotCompanies);
      statsSource = 'snapshot';
    }
    if (snapshotDepts.length > 0) {
      deptStats = buildDeptStatsFromSnapshots(snapshotDepts);
      statsSource = 'snapshot';
    }
  }

  return {
    startDate,
    endDate,
    financeList,
    companyStats,
    deptStats,
    statsSource
  };
}

router.get('/dashboard', async (req, res) => {
  try {
    const [projects, contracts] = await Promise.all([
      Project.findAll({ where: applySalesScope(req, {}), raw: true }),
      Contract.findAll({ where: applySalesScope(req, {}), raw: true })
    ]);

    const projectStats = {
      total: projects.length,
      ongoing: projects.filter((item) => item.status === '进行中').length,
      completed: projects.filter((item) => item.status === '已完成').length,
      cancelled: projects.filter((item) => item.status === '已取消').length,
      total_receivable: toMoney(projects.reduce((sum, item) => sum + Number(item.receivable || 0), 0)),
      total_received: toMoney(projects.reduce((sum, item) => sum + Number(item.received || 0), 0)),
      pending_receivable: toMoney(projects.reduce((sum, item) => sum + Math.max(0, Number(item.receivable || 0) - Number(item.received || 0)), 0))
    };

    const contractStats = {
      total: contracts.length,
      ongoing: contracts.filter((item) => item.status === '进行中').length,
      completed: contracts.filter((item) => item.status === '已完成').length,
      pending_sign: contracts.filter((item) => item.status === '待签订').length,
      cancelled: contracts.filter((item) => item.status === '已取消').length,
      total_receivable: toMoney(contracts.reduce((sum, item) => sum + Number(item.receivable || 0), 0)),
      total_received: toMoney(contracts.reduce((sum, item) => sum + Number(item.received || 0), 0)),
      pending_receivable: toMoney(contracts.reduce((sum, item) => sum + Math.max(0, Number(item.receivable || 0) - Number(item.received || 0)), 0))
    };

    success(res, { projectStats, contractStats });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/daily', async (req, res) => {
  try {
    const date = req.query.date || dateString(new Date());
    success(res, await buildPeriodReport(req, date, date));
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/quarterly', async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const quarter = Number(req.query.quarter) || 1;
    const { startDate, endDate } = getQuarterRange(year, quarter);
    success(res, await buildPeriodReport(req, startDate, endDate));
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/annual', async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const { startDate, endDate } = getYearRange(year);
    success(res, await buildPeriodReport(req, startDate, endDate));
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/company', async (req, res) => {
  try {
    const projectWhere = {};
    const contractWhere = {};
    const financeWhere = {};
    if (req.query.company_name) {
      projectWhere.company_name = { [Op.like]: `%${req.query.company_name}%` };
      contractWhere.company_name = { [Op.like]: `%${req.query.company_name}%` };
      financeWhere.company_name = { [Op.like]: `%${req.query.company_name}%` };
    }
    if (req.query.date_start && req.query.date_end) {
      Object.assign(projectWhere, buildDateWhere(req.query.date_start, req.query.date_end));
      Object.assign(contractWhere, buildDateWhere(req.query.date_start, req.query.date_end));
      Object.assign(financeWhere, buildDateWhere(req.query.date_start, req.query.date_end));
    }

    const [projects, contracts, finances, companies, bankAccounts] = await Promise.all([
      Project.findAll({ where: applySalesScope(req, projectWhere), raw: true }),
      Contract.findAll({ where: applySalesScope(req, contractWhere), raw: true }),
      getScopedFinanceList(req, financeWhere),
      Company.findAll({ order: [['id', 'ASC']], raw: true }),
      BankAccount.findAll({ raw: true })
    ]);

    const visibleCompanyIds = new Set([
      ...projects.map((item) => item.company_id).filter(Boolean),
      ...contracts.map((item) => item.company_id).filter(Boolean),
      ...finances.map((item) => item.company_id).filter(Boolean),
      ...companies.map((item) => item.id)
    ]);

    const results = [];
    for (const company of companies.filter((item) => visibleCompanyIds.has(item.id))) {
      const companyProjects = projects.filter((item) => item.company_id === company.id);
      const companyContracts = contracts.filter((item) => item.company_id === company.id);
      const companyFinances = finances.filter((item) => item.company_id === company.id);
      const companyBankAccounts = bankAccounts.filter((item) => item.company_id === company.id);

      const totalInitialCapital = companyBankAccounts.reduce((sum, item) => sum + Number(item.initial_capital || 0), 0);
      const totalIncome = companyFinances
        .filter((item) => item.type === '收入')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const totalExpenditure = companyFinances
        .filter((item) => item.type === '支出')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const totalBookedIncome = companyFinances
        .filter((item) => item.type === '收入' && Number(item.booked || 0) === 1)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const totalBookedExpenditure = companyFinances
        .filter((item) => item.type === '支出' && Number(item.booked || 0) === 1)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      results.push({
        company_id: company.id,
        company_name: company.name,
        project_count: companyProjects.length,
        total_contract_amount: toMoney(companyContracts.reduce((sum, item) => sum + Number(item.amount || 0), 0)),
        total_initial_capital: toMoney(totalInitialCapital),
        total_income: toMoney(totalIncome),
        total_booked_income: toMoney(totalBookedIncome),
        total_expenditure: toMoney(totalExpenditure),
        total_booked_expenditure: toMoney(totalBookedExpenditure),
        total_profit: toMoney(totalInitialCapital + totalBookedIncome - totalBookedExpenditure),
        total_requested: toMoney(companyContracts.reduce((sum, item) => sum + Number(item.requested || 0), 0)),
        total_received: toMoney(companyContracts.reduce((sum, item) => sum + Number(item.received || 0), 0))
      });
    }

    success(res, results);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/department', async (req, res) => {
  try {
    const where = {};
    if (req.query.dept_name) where.dept_name = { [Op.like]: `%${req.query.dept_name}%` };
    if (req.query.company_name) where.company_name = { [Op.like]: `%${req.query.company_name}%` };
    if (req.query.date_start && req.query.date_end) {
      Object.assign(where, buildDateWhere(req.query.date_start, req.query.date_end));
    }

    const contracts = await Contract.findAll({
      where: applySalesScope(req, where),
      order: [['dept_name', 'ASC']],
      raw: true
    });
    const contractIds = contracts.map((item) => item.id).filter(Boolean);
    const financeWhere = contractIds.length
      ? { type: '支出', contract_id: { [Op.in]: contractIds }, ...buildDateWhere(req.query.date_start, req.query.date_end) }
      : { id: -1 };
    const finances = await getScopedFinanceList(req, financeWhere);

    const statMap = new Map();
    for (const item of contracts) {
      const key = `${item.dept_name || '未分配部门'}__${item.company_name || '未分配公司'}`;
      if (!statMap.has(key)) {
        statMap.set(key, {
          dept_name: item.dept_name || '未分配部门',
          company_name: item.company_name || '未分配公司',
          project_count: 0,
          total_amount: 0,
          total_receivable: 0,
          total_requested: 0,
          total_received: 0,
          total_expenditure: 0,
          total_profit: 0
        });
      }
      const stat = statMap.get(key);
      stat.project_count += 1;
      stat.total_amount += Number(item.amount || 0);
      stat.total_receivable += Number(item.receivable || 0);
      stat.total_requested += Number(item.requested || 0);
      stat.total_received += Number(item.received || 0);
      stat.total_profit += Number(item.profit || 0);
    }

    for (const item of finances) {
      const key = `${item.dept_name || '未分配部门'}__${item.company_name || '未分配公司'}`;
      if (!statMap.has(key)) continue;
      statMap.get(key).total_expenditure += Number(item.amount || 0);
    }

    const results = Array.from(statMap.values()).map((item) => ({
      ...item,
      total_amount: toMoney(item.total_amount),
      total_receivable: toMoney(item.total_receivable),
      total_requested: toMoney(item.total_requested),
      total_received: toMoney(item.total_received),
      total_expenditure: toMoney(item.total_expenditure),
      total_profit: toMoney(item.total_profit)
    }));

    success(res, results);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/employee', async (req, res) => {
  try {
    const dateWhere = buildDateWhere(req.query.date_start, req.query.date_end);
    const salaryWhere = { ...dateWhere };
    const performanceWhere = { ...dateWhere };

    if (req.query.employee_id) {
      salaryWhere.employee_id = req.query.employee_id;
      performanceWhere.employee_id = req.query.employee_id;
    }
    if (req.user.role === 'sales') {
      salaryWhere.employee_id = req.user.id;
      performanceWhere.employee_id = req.user.id;
    }

    const [employees, salaries, performances] = await Promise.all([
      Employee.findAll({
        where: req.user.role === 'sales' ? { id: req.user.id } : {},
        raw: true
      }),
      Salary.findAll({ where: salaryWhere, raw: true }),
      Performance.findAll({
        where: req.user.role === 'sales'
          ? applySalesScope(req, performanceWhere, 'employee_id', 'employee_name')
          : performanceWhere,
        raw: true
      })
    ]);

    const employeeMap = new Map(employees.map((item) => [item.id, item]));
    const statMap = new Map();

    for (const item of salaries) {
      if (!statMap.has(item.employee_id)) {
        const employee = employeeMap.get(item.employee_id) || {};
        statMap.set(item.employee_id, {
          employee_id: item.employee_id,
          employee_name: item.employee_name || employee.name || '',
          employee,
          months: 0,
          total_salary: 0,
          total_performance: 0,
          total_actual: 0
        });
      }
      const stat = statMap.get(item.employee_id);
      stat.months += 1;
      stat.total_salary += Number(item.base_salary || 0);
      stat.total_actual += Number(item.actual_salary || 0);
    }

    for (const item of performances) {
      const employeeId = item.employee_id || 0;
      if (!statMap.has(employeeId)) {
        const employee = employeeMap.get(employeeId) || {};
        statMap.set(employeeId, {
          employee_id: employeeId,
          employee_name: item.employee_name || employee.name || '',
          employee,
          months: 0,
          total_salary: 0,
          total_performance: 0,
          total_actual: 0
        });
      }
      statMap.get(employeeId).total_performance += Number(item.amount || item.performance_amount || 0);
    }

    success(res, {
      salaryStats: Array.from(statMap.values()).map((item) => ({
        ...item,
        total_salary: toMoney(item.total_salary),
        total_performance: toMoney(item.total_performance),
        total_actual: toMoney(item.total_actual)
      }))
    });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/project', async (req, res) => {
  try {
    const { page, pageSize, offset, limit } = getPagination(req.query);
    const where = {};
    if (req.query.project_no) where.project_no = { [Op.like]: `%${req.query.project_no}%` };
    if (req.query.name) where.name = { [Op.like]: `%${req.query.name}%` };
    if (req.query.customer_name) where.customer_name = { [Op.like]: `%${req.query.customer_name}%` };
    if (req.query.status) where.status = req.query.status;
    if (req.query.date_start && req.query.date_end) {
      Object.assign(where, buildDateWhere(req.query.date_start, req.query.date_end));
    }
    const { count, rows } = await Project.findAndCountAll({
      where: applySalesScope(req, where),
      offset,
      limit,
      order: [['id', 'DESC']]
    });
    success(res, { list: rows, total: count, page, pageSize });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/contract', async (req, res) => {
  try {
    const { page, pageSize, offset, limit } = getPagination(req.query);
    const where = {};
    if (req.query.contract_no) where.contract_no = { [Op.like]: `%${req.query.contract_no}%` };
    if (req.query.name) where.name = { [Op.like]: `%${req.query.name}%` };
    if (req.query.customer_name) where.customer_name = { [Op.like]: `%${req.query.customer_name}%` };
    if (req.query.status) where.status = req.query.status;
    if (req.query.date_start && req.query.date_end) {
      Object.assign(where, buildDateWhere(req.query.date_start, req.query.date_end));
    }
    const { count, rows } = await Contract.findAndCountAll({
      where: applySalesScope(req, where),
      offset,
      limit,
      order: [['id', 'DESC']]
    });
    success(res, { list: rows, total: count, page, pageSize });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/', async (req, res) => {
  try {
    const { offset, limit } = getPagination(req.query);
    const { count, rows } = await Report.findAndCountAll({
      offset,
      limit,
      order: [['id', 'DESC']]
    });
    success(res, { list: rows, total: count });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/all', async (req, res) => {
  try {
    const rows = await Report.findAll({ order: [['id', 'DESC']] });
    success(res, rows);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await Report.findByPk(req.params.id);
    if (!row) return fail(res, '记录不存在');
    success(res, row);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/', async (req, res) => {
  try {
    const row = await Report.create(req.body);
    success(res, row);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const row = await Report.findByPk(req.params.id);
    if (!row) return fail(res, '记录不存在');
    await row.update(req.body);
    success(res, row);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const row = await Report.findByPk(req.params.id);
    if (!row) return fail(res, '记录不存在');
    await row.destroy();
    success(res, null);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

const reportHelper = require('../utils/reportHelper');
const { checkHrReportAccess, checkBusinessReportAccess, checkManagementReportAccess } = require('../middleware/rbac');

router.get('/hr/dept-distribution', checkHrReportAccess, async (req, res) => {
  try {
    const filters = {
      companyId: req.query.companyId || null,
      deptIds: req.query.deptIds ? req.query.deptIds.split(',').map(Number) : null
    };
    const result = await reportHelper.getDeptEmployeeDistribution(filters);
    success(res, result);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/hr/company-composition', checkHrReportAccess, async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return fail(res, '缺少公司ID参数', 400);
    const result = await reportHelper.getCompanyEmployeeComposition(companyId);
    success(res, result);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/hr/org-tree', checkHrReportAccess, async (req, res) => {
  try {
    const { companyId } = req.query;
    const result = await reportHelper.getOrgTree(companyId || null);
    success(res, result);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/business/dept-performance', checkBusinessReportAccess, async (req, res) => {
  try {
    const filters = {
      companyId: req.query.companyId || null,
      deptIds: req.query.deptIds ? req.query.deptIds.split(',').map(Number) : null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null
    };
    const result = await reportHelper.getDeptPerformance(filters);
    success(res, result);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/business/employee-performance', checkBusinessReportAccess, async (req, res) => {
  try {
    const { employeeId } = req.query;
    if (!employeeId) return fail(res, '缺少员工ID参数', 400);
    const result = await reportHelper.getEmployeePerformance(employeeId, {
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null
    });
    success(res, result);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/business/project-statistics', checkBusinessReportAccess, async (req, res) => {
  try {
    const filters = {
      companyId: req.query.companyId || null,
      deptId: req.query.deptId || null,
      employeeId: req.query.employeeId || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null
    };
    const result = await reportHelper.getProjectStatistics(filters);
    success(res, result);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/management/company-analysis', checkManagementReportAccess, async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return fail(res, '缺少公司ID参数', 400);
    const result = await reportHelper.getCompanyAnalysis(companyId, {
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null
    });
    success(res, result);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/management/dept-efficiency', checkManagementReportAccess, async (req, res) => {
  try {
    const { deptId } = req.query;
    if (!deptId) return fail(res, '缺少部门ID参数', 400);
    const result = await reportHelper.getDeptOperationEfficiency(deptId, {
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null
    });
    success(res, result);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/management/cross-dept-collaboration', checkManagementReportAccess, async (req, res) => {
  try {
    const { deptId } = req.query;
    if (!deptId) return fail(res, '缺少部门ID参数', 400);
    const result = await reportHelper.getCrossDeptCollaboration(deptId, {
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null
    });
    success(res, result);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

module.exports = router;
