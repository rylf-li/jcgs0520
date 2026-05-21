function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function normalizeDate(date) {
  if (!date) return new Date().toISOString().slice(0, 10);
  return new Date(date).toISOString().slice(0, 10);
}

async function generateDailySnapshots(date, models) {
  const snapshotDate = normalizeDate(date);
  const {
    DeptStats,
    CompanyStats,
    CustomerStats,
    Department,
    Company,
    Customer,
    Employee,
    Project,
    Contract,
    Finance
  } = models;

  const [departments, companies, customers, employees, projects, contracts, finances] = await Promise.all([
    Department.findAll({ raw: true }),
    Company.findAll({ raw: true }),
    Customer.findAll({ raw: true }),
    Employee.findAll({ raw: true }),
    Project.findAll({ raw: true }),
    Contract.findAll({ raw: true }),
    Finance.findAll({ raw: true })
  ]);

  const expenseByDept = new Map();
  const expenseByCompanyDept = new Map();
  for (const finance of finances.filter((item) => item.type === '支出')) {
    const deptKey = finance.dept_id || 0;
    expenseByDept.set(deptKey, (expenseByDept.get(deptKey) || 0) + Number(finance.amount || 0));

    const companyDeptKey = `${finance.company_id || 0}__${finance.dept_id || 0}`;
    expenseByCompanyDept.set(companyDeptKey, (expenseByCompanyDept.get(companyDeptKey) || 0) + Number(finance.amount || 0));
  }

  await Promise.all([
    DeptStats.destroy({ where: { date: snapshotDate } }),
    CompanyStats.destroy({ where: { date: snapshotDate } }),
    CustomerStats.destroy({ where: { date: snapshotDate } })
  ]);

  const deptRows = departments.map((dept) => {
    const deptProjects = projects.filter((item) => (item.dept_id || 0) === dept.id);
    const deptContracts = contracts.filter((item) => (item.dept_id || 0) === dept.id);
    const deptEmployees = employees.filter((item) => (item.dept_id || 0) === dept.id);

    return {
      date: snapshotDate,
      dept_id: dept.id,
      dept_name: dept.name,
      company_id: dept.company_id || null,
      company_name: dept.company_name || '',
      project_count: deptProjects.length,
      contract_amount: toMoney(deptContracts.reduce((sum, item) => sum + Number(item.amount || 0), 0)),
      receivable: toMoney(deptProjects.reduce((sum, item) => sum + Number(item.receivable || 0), 0)),
      requested: toMoney(deptProjects.reduce((sum, item) => sum + Number(item.requested || 0), 0)),
      received: toMoney(deptProjects.reduce((sum, item) => sum + Number(item.received || 0), 0)),
      expenditure: toMoney(expenseByDept.get(dept.id) || 0),
      profit: toMoney(deptProjects.reduce((sum, item) => sum + Number(item.profit || 0), 0))
    };
  });

  const companyDeptRows = [];
  for (const company of companies) {
    const companyProjects = projects.filter((item) => (item.company_id || 0) === company.id);
    const companyContracts = contracts.filter((item) => (item.company_id || 0) === company.id);
    const companyEmployees = employees.filter((item) => (item.company_id || 0) === company.id);
    const companyDepartments = departments.filter((item) => (item.company_id || 0) === company.id);

    if (companyDepartments.length === 0) {
      companyDeptRows.push({
        date: snapshotDate,
        company_id: company.id,
        company_name: company.name,
        dept_id: null,
        dept_name: '',
        project_count: companyProjects.length,
        contract_amount: toMoney(companyContracts.reduce((sum, item) => sum + Number(item.amount || 0), 0)),
        receivable: toMoney(companyProjects.reduce((sum, item) => sum + Number(item.receivable || 0), 0)),
        requested: toMoney(companyProjects.reduce((sum, item) => sum + Number(item.requested || 0), 0)),
        received: toMoney(companyProjects.reduce((sum, item) => sum + Number(item.received || 0), 0)),
        expenditure: toMoney(expenseByCompanyDept.get(`${company.id}__0`) || 0),
        profit: toMoney(companyProjects.reduce((sum, item) => sum + Number(item.profit || 0), 0))
      });
      continue;
    }

    for (const dept of companyDepartments) {
      const deptProjects = companyProjects.filter((item) => (item.dept_id || 0) === dept.id);
      const deptContracts = companyContracts.filter((item) => (item.dept_id || 0) === dept.id);
      const deptEmployees = companyEmployees.filter((item) => (item.dept_id || 0) === dept.id);

      companyDeptRows.push({
        date: snapshotDate,
        company_id: company.id,
        company_name: company.name,
        dept_id: dept.id,
        dept_name: dept.name,
        project_count: deptProjects.length,
        contract_amount: toMoney(deptContracts.reduce((sum, item) => sum + Number(item.amount || 0), 0)),
        receivable: toMoney(deptProjects.reduce((sum, item) => sum + Number(item.receivable || 0), 0)),
        requested: toMoney(deptProjects.reduce((sum, item) => sum + Number(item.requested || 0), 0)),
        received: toMoney(deptProjects.reduce((sum, item) => sum + Number(item.received || 0), 0)),
        expenditure: toMoney(expenseByCompanyDept.get(`${company.id}__${dept.id}`) || 0),
        profit: toMoney(deptProjects.reduce((sum, item) => sum + Number(item.profit || 0), 0))
      });
    }
  }

  const customerRows = customers.map((customer) => {
    const customerContracts = contracts.filter((item) => (item.customer_id || 0) === customer.id);
    return {
      date: snapshotDate,
      customer_id: customer.id,
      customer_name: customer.name,
      contract_count: customerContracts.length,
      contract_amount: toMoney(customerContracts.reduce((sum, item) => sum + Number(item.amount || 0), 0)),
      receivable: toMoney(customerContracts.reduce((sum, item) => sum + Number(item.receivable || 0), 0)),
      requested: toMoney(customerContracts.reduce((sum, item) => sum + Number(item.requested || 0), 0)),
      received: toMoney(customerContracts.reduce((sum, item) => sum + Number(item.received || 0), 0))
    };
  });

  if (deptRows.length) await DeptStats.bulkCreate(deptRows);
  if (companyDeptRows.length) await CompanyStats.bulkCreate(companyDeptRows);
  if (customerRows.length) await CustomerStats.bulkCreate(customerRows);

  return {
    date: snapshotDate,
    dept_count: deptRows.length,
    company_count: companyDeptRows.length,
    customer_count: customerRows.length
  };
}

module.exports = {
  generateDailySnapshots
};
