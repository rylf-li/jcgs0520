const { Op } = require('sequelize');

class PaginationService {
  async paginate(model, options = {}, pagination = {}, filters = {}, sort = []) {
    const { page = 1, pageSize = 20 } = pagination;
    
    const validatedPage = Math.max(1, parseInt(page));
    const validatedPageSize = Math.min(100, Math.max(10, parseInt(pageSize)));
    const offset = (validatedPage - 1) * validatedPageSize;

    const whereClause = this.buildWhereClause(filters);
    const orderClause = this.buildOrderClause(sort);

    const queryOptions = {
      ...options,
      where: { ...options.where, ...whereClause },
      order: orderClause.length > 0 ? orderClause : (options.order || [['id', 'DESC']]),
      offset,
      limit: validatedPageSize,
      distinct: true
    };

    const { count, rows } = await model.findAndCountAll(queryOptions);

    return {
      data: rows,
      pagination: {
        page: validatedPage,
        pageSize: validatedPageSize,
        total: count,
        totalPages: Math.ceil(count / validatedPageSize),
        hasNext: validatedPage < Math.ceil(count / validatedPageSize),
        hasPrev: validatedPage > 1
      }
    };
  }

  buildWhereClause(filters = {}) {
    const where = {};

    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined || value === '') {
        continue;
      }

      if (Array.isArray(value)) {
        if (value.length > 0) {
          where[key] = { [Op.in]: value };
        }
      } else if (typeof value === 'object') {
        if (value.op && value.val !== undefined) {
          where[key] = { [Op[value.op]]: value.val };
        } else if (value.start || value.end) {
          const rangeCondition = {};
          if (value.start) rangeCondition[Op.gte] = value.start;
          if (value.end) rangeCondition[Op.lte] = value.end;
          where[key] = rangeCondition;
        } else if (value.like) {
          where[key] = { [Op.like]: `%${value.like}%` };
        }
      } else {
        where[key] = value;
      }
    }

    return where;
  }

  buildOrderClause(sort = []) {
    if (!Array.isArray(sort) || sort.length === 0) {
      return [];
    }

    return sort.map(item => {
      if (typeof item === 'string') {
        return [item, 'ASC'];
      }
      if (Array.isArray(item)) {
        return item;
      }
      if (typeof item === 'object' && item.field) {
        return [item.field, item.order || 'ASC'];
      }
      return null;
    }).filter(Boolean);
  }

  buildDateRangeFilter(field, startDate, endDate) {
    if (!startDate && !endDate) {
      return {};
    }

    const filter = {};
    if (startDate && endDate) {
      filter[field] = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      filter[field] = { [Op.gte]: startDate };
    } else if (endDate) {
      filter[field] = { [Op.lte]: endDate };
    }

    return filter;
  }

  buildSearchFilter(fields, keyword) {
    if (!keyword || !fields || fields.length === 0) {
      return {};
    }

    const conditions = fields.map(field => ({
      [field]: { [Op.like]: `%${keyword}%` }
    }));

    return { [Op.or]: conditions };
  }

  validatePaginationParams(page, pageSize) {
    return {
      page: Math.max(1, parseInt(page) || 1),
      pageSize: Math.min(100, Math.max(10, parseInt(pageSize) || 20))
    };
  }

  getPaginationMeta(total, page, pageSize) {
    const totalPages = Math.ceil(total / pageSize);
    return {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      startItem: (page - 1) * pageSize + 1,
      endItem: Math.min(page * pageSize, total)
    };
  }
}

module.exports = new PaginationService();
