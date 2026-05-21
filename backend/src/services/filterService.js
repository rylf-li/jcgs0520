const { Op } = require('sequelize');

class FilterService {
  buildOrgFilter(filters = {}, options = {}) {
    const { 
      companyIdField = 'company_id',
      deptIdField = 'dept_id',
      employeeIdField = 'salesman_id'
    } = options;

    const where = {};

    if (filters.companyId) {
      where[companyIdField] = filters.companyId;
    }

    if (filters.deptId) {
      where[deptIdField] = filters.deptId;
    }

    if (filters.employeeId) {
      where[employeeIdField] = filters.employeeId;
    }

    if (filters.companyIds && Array.isArray(filters.companyIds) && filters.companyIds.length > 0) {
      where[companyIdField] = { [Op.in]: filters.companyIds };
    }

    if (filters.deptIds && Array.isArray(filters.deptIds) && filters.deptIds.length > 0) {
      where[deptIdField] = { [Op.in]: filters.deptIds };
    }

    return where;
  }

  buildDateFilter(filters = {}, options = {}) {
    const { 
      dateField = 'date',
      createdAtField = 'created_at',
      updatedAtField = 'updated_at'
    } = options;

    const where = {};

    if (filters.startDate && filters.endDate) {
      where[dateField] = { [Op.between]: [filters.startDate, filters.endDate] };
    } else if (filters.startDate) {
      where[dateField] = { [Op.gte]: filters.startDate };
    } else if (filters.endDate) {
      where[dateField] = { [Op.lte]: filters.endDate };
    }

    if (filters.createdAfter) {
      where[createdAtField] = { ...where[createdAtField], [Op.gte]: filters.createdAfter };
    }

    if (filters.createdBefore) {
      where[createdAtField] = { ...where[createdAtField], [Op.lte]: filters.createdBefore };
    }

    return where;
  }

  buildStatusFilter(filters = {}, options = {}) {
    const { statusField = 'status' } = options;
    const where = {};

    if (filters.status) {
      where[statusField] = filters.status;
    }

    if (filters.statuses && Array.isArray(filters.statuses) && filters.statuses.length > 0) {
      where[statusField] = { [Op.in]: filters.statuses };
    }

    if (filters.excludeStatus && Array.isArray(filters.excludeStatus) && filters.excludeStatus.length > 0) {
      where[statusField] = { ...where[statusField], [Op.notIn]: filters.excludeStatus };
    }

    return where;
  }

  buildSearchFilter(filters = {}, options = {}) {
    const { 
      searchFields = [],
      keywordField = 'keyword'
    } = options;

    if (!filters[keywordField] || searchFields.length === 0) {
      return {};
    }

    const keyword = filters[keywordField];
    const conditions = searchFields.map(field => ({
      [field]: { [Op.like]: `%${keyword}%` }
    }));

    return { [Op.or]: conditions };
  }

  buildAmountFilter(filters = {}, options = {}) {
    const { amountField = 'amount' } = options;
    const where = {};

    if (filters.minAmount !== undefined && filters.maxAmount !== undefined) {
      where[amountField] = { [Op.between]: [filters.minAmount, filters.maxAmount] };
    } else if (filters.minAmount !== undefined) {
      where[amountField] = { [Op.gte]: filters.minAmount };
    } else if (filters.maxAmount !== undefined) {
      where[amountField] = { [Op.lte]: filters.maxAmount };
    }

    return where;
  }

  buildCombinedFilters(filters = {}, options = {}) {
    const whereClauses = [];

    if (filters.companyId || filters.deptId || filters.companyIds || filters.deptIds) {
      whereClauses.push(this.buildOrgFilter(filters, options.org));
    }

    if (filters.startDate || filters.endDate) {
      whereClauses.push(this.buildDateFilter(filters, options.date));
    }

    if (filters.status || filters.statuses) {
      whereClauses.push(this.buildStatusFilter(filters, options.status));
    }

    if (filters.keyword && options.search && options.search.fields) {
      whereClauses.push(this.buildSearchFilter(filters, {
        searchFields: options.search.fields,
        keywordField: 'keyword'
      }));
    }

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      whereClauses.push(this.buildAmountFilter(filters, options.amount));
    }

    return whereClauses.reduce((acc, clause) => ({ ...acc, ...clause }), {});
  }

  buildContractFilters(filters = {}) {
    return this.buildCombinedFilters(filters, {
      org: { companyIdField: 'company_id', deptIdField: 'dept_id' },
      date: { dateField: 'date' },
      status: { statusField: 'status' },
      search: { fields: ['contract_no', 'project_name', 'customer_name'] }
    });
  }

  buildOrderFilters(filters = {}) {
    return this.buildCombinedFilters(filters, {
      org: { companyIdField: 'company_id', deptIdField: 'dept_id', employeeIdField: 'salesman_id' },
      date: { dateField: 'date' },
      status: { statusField: 'status' },
      search: { fields: ['order_no', 'customer_name'] }
    });
  }

  buildFinanceFilters(filters = {}) {
    return this.buildCombinedFilters(filters, {
      org: { companyIdField: 'company_id' },
      date: { dateField: 'date' },
      status: { statusField: 'type' },
      search: { fields: ['remark', 'company_name'] }
    });
  }

  buildProjectFilters(filters = {}) {
    return this.buildCombinedFilters(filters, {
      org: { companyIdField: 'company_id', deptIdField: 'dept_id', employeeIdField: 'salesman_id' },
      date: { dateField: 'date' },
      status: { statusField: 'status' },
      search: { fields: ['project_name', 'customer_name'] }
    });
  }

  sanitizeFilters(filters = {}) {
    const sanitized = {};

    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined || value === '') {
        continue;
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed !== '') {
          sanitized[key] = trimmed;
        }
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

module.exports = new FilterService();
