const {
  sequelize,
  Employee,
  Department,
  Company,
  Order,
  Contract,
  Project,
  Performance,
  EmployeeDepartment
} = require('../models');
const { Op } = require('sequelize');

class ReportHelperService {
  async getDeptEmployeeDistribution(filters = {}) {
    const { companyId, deptIds } = filters;
    
    const where = {};
    if (companyId) {
      where.company_id = companyId;
    }

    const departments = await Department.findAll({
      where,
      include: [
        {
          model: Employee,
          as: 'employees',
          attributes: ['id', 'name', 'status']
        },
        { model: Company, as: 'companyInfo', attributes: ['id', 'name'] }
      ],
      order: [['name', 'ASC']]
    });

    const distribution = departments.map(dept => ({
      dept_id: dept.id,
      dept_name: dept.name,
      company_id: dept.company_id,
      company_name: dept.companyInfo ? dept.companyInfo.name : dept.company_name,
      total_count: dept.employees ? dept.employees.length : 0,
      active_count: dept.employees ? dept.employees.filter(e => e.status === 'active' || e.status === '在职').length : 0,
      inactive_count: dept.employees ? dept.employees.filter(e => e.status !== 'active' && e.status !== '在职').length : 0
    }));

    const total = distribution.reduce((sum, d) => sum + d.total_count, 0);
    const active = distribution.reduce((sum, d) => sum + d.active_count, 0);

    return {
      departments: distribution,
      summary: {
        total_departments: distribution.length,
        total_employees: total,
        active_employees: active,
        inactive_employees: total - active,
        avg_per_dept: distribution.length > 0 ? (total / distribution.length).toFixed(1) : 0
      }
    };
  }

  async getCompanyEmployeeComposition(companyId) {
    const company = await Company.findByPk(companyId, {
      include: [
        {
          model: Department,
          as: 'departments',
          include: [{ model: Employee, as: 'employees', attributes: ['id'] }]
        }
      ]
    });

    if (!company) {
      throw new Error(`公司不存在: ${companyId}`);
    }

    const departments = company.departments || [];
    const composition = departments.map(dept => ({
      dept_id: dept.id,
      dept_name: dept.name,
      count: dept.employees ? dept.employees.length : 0
    }));

    const total = composition.reduce((sum, d) => sum + d.count, 0);

    composition.forEach(d => {
      d.percentage = total > 0 ? ((d.count / total) * 100).toFixed(2) : 0;
    });

    return {
      company_id: company.id,
      company_name: company.name,
      composition,
      total_employees: total,
      total_departments: departments.length
    };
  }

  async getOrgTree(companyId = null) {
    const companyWhere = companyId ? { id: companyId } : {};
    
    const companies = await Company.findAll({
      where: companyWhere,
      include: [
        {
          model: Department,
          as: 'departments',
          include: [
            {
              model: Employee,
              as: 'employees',
              attributes: ['id', 'name', 'status', 'position']
            }
          ]
        }
      ],
      order: [['name', 'ASC']]
    });

    const tree = companies.map(company => ({
      id: `company_${company.id}`,
      label: company.name,
      type: 'company',
      data: {
        id: company.id,
        name: company.name
      },
      children: (company.departments || []).map(dept => ({
        id: `dept_${dept.id}`,
        label: dept.name,
        type: 'department',
        data: {
          id: dept.id,
          name: dept.name,
          company_id: company.id
        },
        children: (dept.employees || []).map(emp => ({
          id: `employee_${emp.id}`,
          label: emp.name,
          type: 'employee',
          data: {
            id: emp.id,
            name: emp.name,
            position: emp.position,
            status: emp.status
          }
        }))
      }))
    }));

    return tree;
  }

  async getDeptPerformance(filters = {}) {
    const { companyId, deptIds, startDate, endDate } = filters;
    
    const deptWhere = {};
    if (companyId) {
      deptWhere.company_id = companyId;
    }
    if (deptIds && deptIds.length > 0) {
      deptWhere.id = { [Op.in]: deptIds };
    }

    const dateWhere = {};
    if (startDate && endDate) {
      dateWhere.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      dateWhere.date = { [Op.gte]: startDate };
    } else if (endDate) {
      dateWhere.date = { [Op.lte]: endDate };
    }

    const departments = await Department.findAll({
      where: deptWhere,
      include: [{ model: Company, as: 'companyInfo', attributes: ['name'] }]
    });

    const results = [];

    for (const dept of departments) {
      const [orderStats, contractStats, projectStats] = await Promise.all([
        Order.findOne({
          where: { dept_id: dept.id, ...dateWhere },
          attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            [sequelize.fn('SUM', sequelize.col('total')), 'total_amount']
          ],
          raw: true
        }),
        Contract.findOne({
          where: { dept_id: dept.id, ...dateWhere },
          attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
          ],
          raw: true
        }),
        Project.findOne({
          where: { dept_id: dept.id, ...dateWhere },
          attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
          ],
          raw: true
        })
      ]);

      results.push({
        dept_id: dept.id,
        dept_name: dept.name,
        company_name: dept.companyInfo ? dept.companyInfo.name : dept.company_name,
        orders: {
          count: parseInt(orderStats.count) || 0,
          amount: parseFloat(orderStats.total_amount) || 0
        },
        contracts: {
          count: parseInt(contractStats.count) || 0,
          amount: parseFloat(contractStats.total_amount) || 0
        },
        projects: {
          count: parseInt(projectStats.count) || 0,
          amount: parseFloat(projectStats.total_amount) || 0
        },
        total_performance: (parseFloat(orderStats.total_amount) || 0) + (parseFloat(contractStats.total_amount) || 0)
      });
    }

    results.sort((a, b) => b.total_performance - a.total_performance);

    return {
      departments: results,
      dateRange: { startDate, endDate },
      summary: {
        total_orders: results.reduce((sum, r) => sum + r.orders.count, 0),
        total_contracts: results.reduce((sum, r) => sum + r.contracts.count, 0),
        total_projects: results.reduce((sum, r) => sum + r.projects.count, 0),
        total_performance: results.reduce((sum, r) => sum + r.total_performance, 0)
      }
    };
  }

  async getEmployeePerformance(employeeId, dateRange = {}) {
    const { startDate, endDate } = dateRange;
    
    const employee = await Employee.findByPk(employeeId, {
      include: [
        { model: Department, as: 'deptInfo', attributes: ['name'] }
      ]
    });

    if (!employee) {
      throw new Error(`员工不存在: ${employeeId}`);
    }

    const dateWhere = {};
    if (startDate && endDate) {
      dateWhere.date = { [Op.between]: [startDate, endDate] };
    }

    const [orders, contracts, projects, performances] = await Promise.all([
      Order.findAll({
        where: { salesman_id: employeeId, ...dateWhere },
        attributes: ['id', 'order_no', 'total', 'date', 'status']
      }),
      Contract.findAll({
        where: { salesman_id: employeeId, ...dateWhere },
        attributes: ['id', 'contract_no', 'amount', 'date', 'status']
      }),
      Project.findAll({
        where: { salesman_id: employeeId, ...dateWhere },
        attributes: ['id', 'project_name', 'amount', 'status']
      }),
      Performance.findAll({
        where: { employee_id: employeeId, ...dateWhere },
        attributes: ['id', 'amount', 'month', 'status']
      })
    ]);

    const totalOrderAmount = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    const totalContractAmount = contracts.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    const totalPerformanceAmount = performances.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    return {
      employee: {
        id: employee.id,
        name: employee.name,
        dept_name: employee.deptInfo ? employee.deptInfo.name : employee.dept_name,
        position: employee.position
      },
      orders: {
        count: orders.length,
        total_amount: totalOrderAmount,
        items: orders
      },
      contracts: {
        count: contracts.length,
        total_amount: totalContractAmount,
        items: contracts
      },
      projects: {
        count: projects.length,
        items: projects
      },
      performances: {
        count: performances.length,
        total_amount: totalPerformanceAmount,
        items: performances
      },
      summary: {
        total_business_amount: totalOrderAmount + totalContractAmount,
        total_performance_amount: totalPerformanceAmount
      }
    };
  }

  async getProjectStatistics(filters = {}) {
    const { companyId, deptId, employeeId, startDate, endDate } = filters;
    
    const where = {};
    if (companyId) where.company_id = companyId;
    if (deptId) where.dept_id = deptId;
    if (employeeId) where.salesman_id = employeeId;
    if (startDate && endDate) {
      where.created_at = { [Op.between]: [startDate, endDate] };
    }

    const projects = await Project.findAll({
      where,
      include: [
        { model: Company, as: 'companyInfo', attributes: ['name'] },
        { model: Department, as: 'deptInfo', attributes: ['name'] },
        { model: Employee, as: 'salesmanInfo', attributes: ['name'] }
      ]
    });

    const byCompany = {};
    const byDept = {};
    const byEmployee = {};

    for (const project of projects) {
      const compName = project.companyInfo ? project.companyInfo.name : project.company_name || '未知';
      const deptName = project.deptInfo ? project.deptInfo.name : project.dept_name || '未知';
      const empName = project.salesmanInfo ? project.salesmanInfo.name : '未知';

      if (!byCompany[compName]) {
        byCompany[compName] = { count: 0, amount: 0 };
      }
      byCompany[compName].count++;
      byCompany[compName].amount += parseFloat(project.amount) || 0;

      if (!byDept[deptName]) {
        byDept[deptName] = { count: 0, amount: 0, company: compName };
      }
      byDept[deptName].count++;
      byDept[deptName].amount += parseFloat(project.amount) || 0;

      if (!byEmployee[empName]) {
        byEmployee[empName] = { count: 0, amount: 0, dept: deptName };
      }
      byEmployee[empName].count++;
      byEmployee[empName].amount += parseFloat(project.amount) || 0;
    }

    return {
      total: projects.length,
      totalAmount: projects.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
      byCompany,
      byDept,
      byEmployee,
      projects
    };
  }

  async getCompanyAnalysis(companyId, dateRange = {}) {
    const { startDate, endDate } = dateRange;
    
    const company = await Company.findByPk(companyId);
    if (!company) {
      throw new Error(`公司不存在: ${companyId}`);
    }

    const dateWhere = {};
    if (startDate && endDate) {
      dateWhere.date = { [Op.between]: [startDate, endDate] };
    }

    const [departments, orders, contracts, employees] = await Promise.all([
      Department.count({ where: { company_id: companyId } }),
      Order.findAll({
        where: { company_id: companyId, ...dateWhere },
        attributes: ['id', 'total', 'status']
      }),
      Contract.findAll({
        where: { company_id: companyId, ...dateWhere },
        attributes: ['id', 'amount', 'status']
      }),
      Employee.count({ where: { company_id: companyId } })
    ]);

    const totalOrderAmount = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    const totalContractAmount = contracts.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

    return {
      company: {
        id: company.id,
        name: company.name
      },
      overview: {
        departments,
        employees,
        orders: orders.length,
        contracts: contracts.length
      },
      financial: {
        order_amount: totalOrderAmount,
        contract_amount: totalContractAmount,
        total_revenue: totalOrderAmount + totalContractAmount,
        avg_per_employee: employees > 0 ? ((totalOrderAmount + totalContractAmount) / employees).toFixed(2) : 0
      }
    };
  }

  async getDeptOperationEfficiency(deptId, dateRange = {}) {
    const { startDate, endDate } = dateRange;
    
    const dept = await Department.findByPk(deptId, {
      include: [{ model: Company, as: 'companyInfo', attributes: ['name'] }]
    });
    
    if (!dept) {
      throw new Error(`部门不存在: ${deptId}`);
    }

    const dateWhere = {};
    if (startDate && endDate) {
      dateWhere.date = { [Op.between]: [startDate, endDate] };
    }

    const [employees, orders, contracts] = await Promise.all([
      Employee.count({ where: { dept_id: deptId } }),
      Order.findAll({
        where: { dept_id: deptId, ...dateWhere },
        attributes: ['id', 'total']
      }),
      Contract.findAll({
        where: { dept_id: deptId, ...dateWhere },
        attributes: ['id', 'amount']
      })
    ]);

    const totalOrderAmount = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    const totalContractAmount = contracts.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    const totalRevenue = totalOrderAmount + totalContractAmount;

    return {
      department: {
        id: dept.id,
        name: dept.name,
        company_name: dept.companyInfo ? dept.companyInfo.name : dept.company_name
      },
      statistics: {
        employees,
        orders: orders.length,
        contracts: contracts.length,
        total_revenue: totalRevenue
      },
      efficiency: {
        revenue_per_employee: employees > 0 ? (totalRevenue / employees).toFixed(2) : 0,
        orders_per_employee: employees > 0 ? (orders.length / employees).toFixed(1) : 0,
        contracts_per_employee: employees > 0 ? (contracts.length / employees).toFixed(1) : 0
      }
    };
  }

  async getCrossDeptCollaboration(deptId, dateRange = {}) {
    const { startDate, endDate } = dateRange;
    
    const dept = await Department.findByPk(deptId);
    if (!dept) {
      throw new Error(`部门不存在: ${deptId}`);
    }

    const dateWhere = {};
    if (startDate && endDate) {
      dateWhere.date = { [Op.between]: [startDate, endDate] };
    }

    const employeesInDept = await Employee.findAll({
      where: { dept_id: deptId },
      attributes: ['id', 'name']
    });

    const employeeIds = employeesInDept.map(e => e.id);

    const employeeDepartments = await EmployeeDepartment.findAll({
      where: { employee_id: { [Op.in]: employeeIds } },
      include: [
        { model: Employee, as: 'employee', attributes: ['id', 'name'] },
        { model: Department, as: 'deptInfo', attributes: ['id', 'name'] }
      ]
    });

    const crossDeptEmployees = [];
    for (const ed of employeeDepartments) {
      if (ed.dept_id !== deptId) {
        crossDeptEmployees.push({
          employee_id: ed.employee_id,
          employee_name: ed.employee ? ed.employee.name : '未知',
          other_dept_id: ed.dept_id,
          other_dept_name: ed.deptInfo ? ed.deptInfo.name : '未知'
        });
      }
    }

    const collaborations = {};
    for (const cde of crossDeptEmployees) {
      const key = cde.other_dept_name;
      if (!collaborations[key]) {
        collaborations[key] = { dept_name: key, employees: [], count: 0 };
      }
      collaborations[key].employees.push(cde.employee_name);
      collaborations[key].count++;
    }

    return {
      department: {
        id: dept.id,
        name: dept.name
      },
      cross_dept_employees: crossDeptEmployees,
      collaborations: Object.values(collaborations),
      summary: {
        total_cross_dept: crossDeptEmployees.length,
        collaborating_depts: Object.keys(collaborations).length
      }
    };
  }
}

module.exports = new ReportHelperService();
