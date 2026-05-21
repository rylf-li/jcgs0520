const {
  sequelize,
  Employee,
  Department,
  Company,
  Order,
  Contract,
  Project,
  Performance,
  SyncLog,
  SyncTask
} = require('../models');

class OrgSyncService {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async syncDepartmentChange(deptId, changes, taskId = null, operatorId = null) {
    const dept = await Department.findByPk(deptId);
    if (!dept) {
      throw new Error(`部门不存在: ${deptId}`);
    }

    const updateFields = {};
    if (changes.company_id !== undefined) {
      const company = await Company.findByPk(changes.company_id);
      updateFields.company_id = changes.company_id;
      updateFields.company_name = company ? company.name : null;
    }
    if (changes.name !== undefined) {
      updateFields.dept_name = changes.name;
    }

    if (Object.keys(updateFields).length === 0) {
      return { updated: 0, message: '无需同步的字段变更' };
    }

    const employees = await Employee.findAll({ where: { dept_id: deptId } });
    let updatedCount = 0;
    let failedCount = 0;

    for (const emp of employees) {
      try {
        await emp.update(updateFields);
        await this.logSync(
          taskId,
          'department_change',
          deptId,
          'employee',
          emp.id,
          updateFields,
          'success'
        );
        updatedCount++;
      } catch (error) {
        await this.logSync(
          taskId,
          'department_change',
          deptId,
          'employee',
          emp.id,
          updateFields,
          'failed',
          error.message
        );
        failedCount++;
      }
    }

    return {
      updated: updatedCount,
      failed: failedCount,
      total: employees.length
    };
  }

  async syncEmployeeChange(employeeId, changes, taskId = null, operatorId = null) {
    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      throw new Error(`员工不存在: ${employeeId}`);
    }

    const affectedBusiness = await this.getAffectedBusinessData(employeeId);
    
    if (affectedBusiness.orders.length === 0 &&
        affectedBusiness.contracts.length === 0 &&
        affectedBusiness.projects.length === 0) {
      return { message: '无关联业务数据需要同步', affected: 0 };
    }

    return {
      employee: employee,
      affectedBusiness: affectedBusiness,
      suggestion: '员工部门变更后，关联的业务数据可能需要同步更新。请确认是否执行同步。'
    };
  }

  async getAffectedBusinessData(employeeId) {
    const [orders, contracts, projects, performances] = await Promise.all([
      Order.findAll({
        where: { salesman_id: employeeId },
        attributes: ['id', 'order_no', 'dept_id', 'dept_name', 'company_id', 'company_name']
      }),
      Contract.findAll({
        where: { salesman_id: employeeId },
        attributes: ['id', 'contract_no', 'dept_id', 'dept_name', 'company_id', 'company_name']
      }),
      Project.findAll({
        where: { salesman_id: employeeId },
        attributes: ['id', 'project_name', 'dept_id', 'dept_name', 'company_id', 'company_name']
      }),
      Performance.findAll({
        where: { employee_id: employeeId },
        attributes: ['id', 'dept_id', 'dept_name', 'company_id', 'company_name']
      })
    ]);

    return { orders, contracts, projects, performances };
  }

  async syncCompanyChange(companyId, changes, taskId = null, operatorId = null) {
    const company = await Company.findByPk(companyId);
    if (!company) {
      throw new Error(`公司不存在: ${companyId}`);
    }

    const newName = changes.name;
    if (!newName) {
      return { updated: 0, message: '公司名称未变更' };
    }

    let deptUpdated = 0;
    let empUpdated = 0;
    let failedCount = 0;

    const departments = await Department.findAll({ where: { company_id: companyId } });
    for (const dept of departments) {
      try {
        await dept.update({ company_name: newName });
        deptUpdated++;
      } catch (error) {
        failedCount++;
      }
    }

    const employees = await Employee.findAll({ where: { company_id: companyId } });
    for (const emp of employees) {
      try {
        await emp.update({ company_name: newName });
        await this.logSync(taskId, 'company_change', companyId, 'employee', emp.id, { company_name: newName }, 'success');
        empUpdated++;
      } catch (error) {
        await this.logSync(taskId, 'company_change', companyId, 'employee', emp.id, { company_name: newName }, 'failed', error.message);
        failedCount++;
      }
    }

    return {
      departmentsUpdated: deptUpdated,
      employeesUpdated: empUpdated,
      failed: failedCount
    };
  }

  async fillOrgFields(salesmanId) {
    const employee = await Employee.findByPk(salesmanId, {
      include: [{ model: Department, as: 'deptInfo' }]
    });

    if (!employee) {
      throw new Error(`员工不存在: ${salesmanId}`);
    }

    return {
      salesman_id: salesmanId,
      salesman_name: employee.name,
      dept_id: employee.dept_id,
      dept_name: employee.deptInfo ? employee.deptInfo.name : employee.dept_name,
      company_id: employee.company_id,
      company_name: employee.company_name
    };
  }

  async executeBatchSync(options, operatorId = null) {
    const {
      syncType = 'all',
      scope = 'all',
      targetIds = [],
      batchSize = 100
    } = options;

    const task = await SyncTask.create({
      task_type: 'batch_sync',
      sync_type: syncType,
      scope: scope,
      target_ids: targetIds,
      status: 'running',
      total_count: 0,
      processed_count: 0,
      success_count: 0,
      failed_count: 0,
      start_time: new Date(),
      operator_id: operatorId
    });

    try {
      let items = [];
      
      if (syncType === 'employee' || syncType === 'all') {
        const empWhere = this.buildWhereClause(scope, targetIds);
        const employees = await Employee.findAll({
          where: empWhere,
          attributes: ['id'],
          raw: true
        });
        items = items.concat(employees.map(e => ({ type: 'employee', id: e.id })));
      }

      if (syncType === 'department' || syncType === 'all') {
        const deptWhere = this.buildWhereClause(scope, targetIds, 'department');
        const departments = await Department.findAll({
          where: deptWhere,
          attributes: ['id'],
          raw: true
        });
        items = items.concat(departments.map(d => ({ type: 'department', id: d.id })));
      }

      await task.update({ total_count: items.length });

      let processed = 0;
      let success = 0;
      let failed = 0;

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        
        for (const item of batch) {
          try {
            if (item.type === 'employee') {
              const emp = await Employee.findByPk(item.id, {
                include: [{ model: Department, as: 'deptInfo' }]
              });
              if (emp && emp.deptInfo) {
                await emp.update({
                  dept_name: emp.deptInfo.name,
                  company_id: emp.deptInfo.company_id,
                  company_name: emp.deptInfo.company_name
                });
              }
            } else if (item.type === 'department') {
              const dept = await Department.findByPk(item.id, {
                include: [{ model: Company, as: 'companyInfo' }]
              });
              if (dept && dept.companyInfo) {
                await dept.update({ company_name: dept.companyInfo.name });
              }
            }
            success++;
            await this.logSync(task.id, syncType, item.id, item.type, item.id, {}, 'success');
          } catch (error) {
            failed++;
            await this.logSync(task.id, syncType, item.id, item.type, item.id, {}, 'failed', error.message);
          }
          processed++;
        }

        await task.update({
          processed_count: processed,
          success_count: success,
          failed_count: failed
        });
      }

      await task.update({
        status: 'completed',
        end_time: new Date()
      });

      return {
        taskId: task.id,
        total: items.length,
        processed,
        success,
        failed
      };
    } catch (error) {
      await task.update({
        status: 'failed',
        end_time: new Date()
      });
      throw error;
    }
  }

  buildWhereClause(scope, targetIds, type = 'employee') {
    const where = {};
    
    if (scope === 'company' && targetIds.length > 0) {
      where.company_id = targetIds[0];
    } else if (scope === 'department' && targetIds.length > 0) {
      if (type === 'employee') {
        where.dept_id = targetIds;
      } else {
        where.id = targetIds;
      }
    }

    return where;
  }

  async executeIncrementalSync(operatorId = null) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const updatedEmployees = await Employee.findAll({
      where: {
        updated_at: { [require('sequelize').Op.gte]: oneHourAgo }
      },
      attributes: ['id', 'dept_id', 'updated_at'],
      include: [{ model: Department, as: 'deptInfo' }]
    });

    const updatedDepartments = await Department.findAll({
      where: {
        updated_at: { [require('sequelize').Op.gte]: oneHourAgo }
      },
      attributes: ['id', 'company_id', 'updated_at'],
      include: [{ model: Company, as: 'companyInfo' }]
    });

    let syncedCount = 0;

    for (const emp of updatedEmployees) {
      if (emp.deptInfo) {
        const needsSync = emp.dept_name !== emp.deptInfo.name ||
                          emp.company_id !== emp.deptInfo.company_id;
        
        if (needsSync) {
          await emp.update({
            dept_name: emp.deptInfo.name,
            company_id: emp.deptInfo.company_id,
            company_name: emp.deptInfo.company_name
          });
          syncedCount++;
        }
      }
    }

    for (const dept of updatedDepartments) {
      if (dept.companyInfo && dept.company_name !== dept.companyInfo.name) {
        await dept.update({ company_name: dept.companyInfo.name });
        syncedCount++;
      }
    }

    return {
      employeesChecked: updatedEmployees.length,
      departmentsChecked: updatedDepartments.length,
      syncedCount
    };
  }

  async logSync(taskId, syncType, sourceId, targetType, targetId, changes, status, errorMessage = null) {
    if (!taskId) return;

    try {
      await SyncLog.create({
        task_id: taskId,
        sync_type: syncType,
        source_id: sourceId,
        target_type: targetType,
        target_id: targetId,
        changes: changes,
        status: status,
        error_message: errorMessage
      });
    } catch (error) {
      console.error('记录同步日志失败:', error.message);
    }
  }

  async syncWithRetry(syncFn, maxRetries = this.maxRetries) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await syncFn();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  async syncBusinessData(employeeId, taskId = null) {
    const employee = await Employee.findByPk(employeeId, {
      include: [{ model: Department, as: 'deptInfo' }]
    });

    if (!employee) {
      throw new Error(`员工不存在: ${employeeId}`);
    }

    const updateFields = {
      dept_id: employee.dept_id,
      dept_name: employee.deptInfo ? employee.deptInfo.name : employee.dept_name,
      company_id: employee.company_id,
      company_name: employee.company_name
    };

    let ordersUpdated = 0;
    let contractsUpdated = 0;
    let projectsUpdated = 0;

    const orders = await Order.update(updateFields, {
      where: { salesman_id: employeeId },
      returning: true
    });
    ordersUpdated = orders[0];

    const contracts = await Contract.update(updateFields, {
      where: { salesman_id: employeeId },
      returning: true
    });
    contractsUpdated = contracts[0];

    const projects = await Project.update(updateFields, {
      where: { salesman_id: employeeId },
      returning: true
    });
    projectsUpdated = projects[0];

    await this.logSync(
      taskId,
      'employee_business_sync',
      employeeId,
      'business_data',
      null,
      updateFields,
      'success'
    );

    return {
      ordersUpdated,
      contractsUpdated,
      projectsUpdated,
      total: ordersUpdated + contractsUpdated + projectsUpdated
    };
  }
}

module.exports = new OrgSyncService();
