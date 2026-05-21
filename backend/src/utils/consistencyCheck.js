const {
  sequelize,
  Employee,
  Department,
  Company,
  Order,
  Contract,
  Project,
  Performance
} = require('../models');

class ConsistencyCheckService {
  constructor() {
    this.inconsistencies = [];
  }

  async checkDepartmentConsistency(deptId = null) {
    const where = deptId ? { id: deptId } : {};
    const departments = await Department.findAll({
      where,
      include: [{ model: Company, as: 'companyInfo' }]
    });

    const inconsistencies = [];

    for (const dept of departments) {
      const issues = [];

      if (dept.company_id && dept.companyInfo) {
        if (dept.company_name !== dept.companyInfo.name) {
          issues.push({
            field: 'company_name',
            current: dept.company_name,
            expected: dept.companyInfo.name,
            message: `公司名称不一致: 当前值为"${dept.company_name}"，应为"${dept.companyInfo.name}"`
          });
        }
      }

      const employees = await Employee.findAll({
        where: { dept_id: dept.id },
        include: [{ model: Department, as: 'deptInfo' }]
      });

      for (const emp of employees) {
        if (emp.dept_name !== dept.name) {
          issues.push({
            field: 'employee.dept_name',
            employeeId: emp.id,
            employeeName: emp.name,
            current: emp.dept_name,
            expected: dept.name,
            message: `员工 ${emp.name} 的部门名称不一致`
          });
        }
        if (emp.company_id !== dept.company_id) {
          issues.push({
            field: 'employee.company_id',
            employeeId: emp.id,
            employeeName: emp.name,
            current: emp.company_id,
            expected: dept.company_id,
            message: `员工 ${emp.name} 的公司ID不一致`
          });
        }
      }

      if (issues.length > 0) {
        inconsistencies.push({
          type: 'department',
          id: dept.id,
          name: dept.name,
          issues
        });
      }
    }

    return {
      checked: departments.length,
      inconsistent: inconsistencies.length,
      inconsistencies
    };
  }

  async checkEmployeeConsistency(employeeId = null) {
    const where = employeeId ? { id: employeeId } : {};
    const employees = await Employee.findAll({
      where,
      include: [
        { model: Department, as: 'deptInfo' }
      ]
    });

    const inconsistencies = [];

    for (const emp of employees) {
      const issues = [];

      if (emp.dept_id) {
        if (!emp.deptInfo) {
          issues.push({
            field: 'dept_id',
            current: emp.dept_id,
            expected: null,
            message: `关联的部门不存在: ${emp.dept_id}`
          });
        } else {
          if (emp.dept_name !== emp.deptInfo.name) {
            issues.push({
              field: 'dept_name',
              current: emp.dept_name,
              expected: emp.deptInfo.name,
              message: `部门名称不一致: 当前为"${emp.dept_name}"，应为"${emp.deptInfo.name}"`
            });
          }

          if (emp.company_id !== emp.deptInfo.company_id) {
            issues.push({
              field: 'company_id',
              current: emp.company_id,
              expected: emp.deptInfo.company_id,
              message: `公司ID不一致: 当前为${emp.company_id}，应为${emp.deptInfo.company_id}`
            });
          }

          if (emp.deptInfo.companyInfo && emp.company_name !== emp.deptInfo.companyInfo.name) {
            issues.push({
              field: 'company_name',
              current: emp.company_name,
              expected: emp.deptInfo.companyInfo.name,
              message: `公司名称不一致: 当前为"${emp.company_name}"，应为"${emp.deptInfo.companyInfo.name}"`
            });
          }
        }
      }

      if (emp.company_id) {
        const company = await Company.findByPk(emp.company_id);
        if (!company) {
          issues.push({
            field: 'company_id',
            current: emp.company_id,
            expected: null,
            message: `关联的公司不存在: ${emp.company_id}`
          });
        } else if (emp.company_name && emp.company_name !== company.name) {
          issues.push({
            field: 'company_name',
            current: emp.company_name,
            expected: company.name,
            message: `公司名称与公司记录不一致`
          });
        }
      }

      if (issues.length > 0) {
        inconsistencies.push({
          type: 'employee',
          id: emp.id,
          name: emp.name,
          dept_id: emp.dept_id,
          company_id: emp.company_id,
          issues
        });
      }
    }

    return {
      checked: employees.length,
      inconsistent: inconsistencies.length,
      inconsistencies
    };
  }

  async checkBusinessConsistency(businessType, businessId = null) {
    const inconsistencies = [];
    let checked = 0;

    const checkBusiness = async (Model, type, id = null) => {
      const where = id ? { id } : {};
      where.salesman_id = { [require('sequelize').Op.ne]: null };

      const items = await Model.findAll({
        where,
        include: [
          { model: Employee, as: 'salesmanInfo' }
        ]
      });

      checked = items.length;

      for (const item of items) {
        const issues = [];

        if (item.salesman_id && item.salesmanInfo) {
          if (item.dept_id !== item.salesmanInfo.dept_id) {
            issues.push({
              field: 'dept_id',
              current: item.dept_id,
              expected: item.salesmanInfo.dept_id,
              message: `部门ID与销售人员不一致`
            });
          }

          if (item.dept_name !== item.salesmanInfo.dept_name) {
            issues.push({
              field: 'dept_name',
              current: item.dept_name,
              expected: item.salesmanInfo.dept_name,
              message: `部门名称与销售人员不一致`
            });
          }

          if (item.company_id !== item.salesmanInfo.company_id) {
            issues.push({
              field: 'company_id',
              current: item.company_id,
              expected: item.salesmanInfo.company_id,
              message: `公司ID与销售人员不一致`
            });
          }

          if (item.company_name !== item.salesmanInfo.company_name) {
            issues.push({
              field: 'company_name',
              current: item.company_name,
              expected: item.salesmanInfo.company_name,
              message: `公司名称与销售人员不一致`
            });
          }
        }

        if (issues.length > 0) {
          inconsistencies.push({
            type: type,
            id: item.id,
            name: item.order_no || item.contract_no || item.project_name || `ID:${item.id}`,
            salesman_id: item.salesman_id,
            issues
          });
        }
      }
    };

    if (businessType === 'order' || businessType === 'all') {
      await checkBusiness(Order, 'order', businessId);
    }
    if (businessType === 'contract' || businessType === 'all') {
      await checkBusiness(Contract, 'contract', businessId);
    }
    if (businessType === 'project' || businessType === 'all') {
      await checkBusiness(Project, 'project', businessId);
    }

    return {
      checked,
      inconsistent: inconsistencies.length,
      inconsistencies
    };
  }

  generateFixSuggestions(inconsistencies) {
    const suggestions = [];

    for (const item of inconsistencies) {
      for (const issue of item.issues) {
        suggestions.push({
          type: item.type,
          id: item.id,
          field: issue.field,
          currentValue: issue.current,
          expectedValue: issue.expected,
          fixAction: 'update',
          sql: this.generateFixSQL(item.type, item.id, issue.field, issue.expected),
          description: `将 ${item.type}(${item.id}) 的 ${issue.field} 从 "${issue.current}" 更新为 "${issue.expected}"`
        });
      }
    }

    return suggestions;
  }

  generateFixSQL(type, id, field, value) {
    const tableNameMap = {
      employee: 'employees',
      department: 'departments',
      order: 'orders',
      contract: 'contracts',
      project: 'projects'
    };

    const tableName = tableNameMap[type] || type;
    const valueStr = value === null ? 'NULL' : `'${value}'`;
    
    return `UPDATE ${tableName} SET ${field} = ${valueStr} WHERE id = ${id};`;
  }

  async executeFix(fixItems, preview = true) {
    const results = [];

    if (preview) {
      for (const item of fixItems) {
        results.push({
          ...item,
          status: 'preview',
          message: '预览模式，未执行修改'
        });
      }
      return { preview: true, results };
    }

    for (const item of fixItems) {
      try {
        const ModelMap = {
          employee: Employee,
          department: Department,
          order: Order,
          contract: Contract,
          project: Project
        };

        const Model = ModelMap[item.type];
        if (!Model) {
          throw new Error(`不支持的类型: ${item.type}`);
        }

        const record = await Model.findByPk(item.id);
        if (!record) {
          throw new Error(`记录不存在: ${item.type}#${item.id}`);
        }

        await record.update({ [item.field]: item.expectedValue });

        results.push({
          ...item,
          status: 'success',
          message: '修复成功'
        });
      } catch (error) {
        results.push({
          ...item,
          status: 'failed',
          message: error.message
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    return {
      preview: false,
      total: fixItems.length,
      success: successCount,
      failed: failedCount,
      results
    };
  }

  async checkAllConsistency() {
    const [deptResult, empResult, orderResult, contractResult, projectResult] = await Promise.all([
      this.checkDepartmentConsistency(),
      this.checkEmployeeConsistency(),
      this.checkBusinessConsistency('order'),
      this.checkBusinessConsistency('contract'),
      this.checkBusinessConsistency('project')
    ]);

    const allInconsistencies = [
      ...deptResult.inconsistencies,
      ...empResult.inconsistencies,
      ...orderResult.inconsistencies,
      ...contractResult.inconsistencies,
      ...projectResult.inconsistencies
    ];

    return {
      summary: {
        departments: { checked: deptResult.checked, inconsistent: deptResult.inconsistent },
        employees: { checked: empResult.checked, inconsistent: empResult.inconsistent },
        orders: { checked: orderResult.checked, inconsistent: orderResult.inconsistent },
        contracts: { checked: contractResult.checked, inconsistent: contractResult.inconsistent },
        projects: { checked: projectResult.checked, inconsistent: projectResult.inconsistent }
      },
      totalInconsistent: allInconsistencies.length,
      inconsistencies: allInconsistencies
    };
  }

  async autoFixInconsistencies(dryRun = true) {
    const checkResult = await this.checkAllConsistency();
    const suggestions = this.generateFixSuggestions(checkResult.inconsistencies);
    
    if (suggestions.length === 0) {
      return {
        message: '数据一致，无需修复',
        checked: checkResult.summary,
        fixes: 0
      };
    }

    const fixResult = await this.executeFix(suggestions, dryRun);

    return {
      checked: checkResult.summary,
      fixes: suggestions.length,
      dryRun,
      result: fixResult
    };
  }
}

module.exports = new ConsistencyCheckService();
