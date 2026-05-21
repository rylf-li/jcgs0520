const { sequelize } = require('../models');
const { Op } = require('sequelize');

class BatchService {
  async batchDelete(model, ids, options = {}) {
    const { 
      validateFn = null,
      beforeDelete = null,
      afterDelete = null,
      userId = null,
      transaction = null
    } = options;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new Error('批量删除ID列表不能为空');
    }

    if (ids.length > 100) {
      throw new Error('批量操作数量不能超过100条');
    }

    const t = transaction || await sequelize.transaction();

    try {
      const records = await model.findAll({
        where: { id: { [Op.in]: ids } },
        transaction: t
      });

      if (records.length === 0) {
        throw new Error('未找到要删除的记录');
      }

      if (validateFn) {
        const validationErrors = [];
        for (const record of records) {
          const error = await validateFn(record);
          if (error) {
            validationErrors.push({ id: record.id, error });
          }
        }
        if (validationErrors.length > 0) {
          throw new Error(`数据校验失败: ${validationErrors.map(e => `ID ${e.id}: ${e.error}`).join('; ')}`);
        }
      }

      if (beforeDelete) {
        await beforeDelete(records, t);
      }

      const deletedCount = await model.destroy({
        where: { id: { [Op.in]: ids } },
        transaction: t
      });

      if (afterDelete) {
        await afterDelete(records, t);
      }

      if (!transaction) {
        await t.commit();
      }

      return {
        success: true,
        deletedCount,
        failedCount: ids.length - deletedCount
      };
    } catch (error) {
      if (!transaction) {
        await t.rollback();
      }
      throw error;
    }
  }

  async batchUpdateStatus(model, ids, targetStatus, options = {}) {
    const {
      statusField = 'status',
      validateFn = null,
      beforeUpdate = null,
      afterUpdate = null,
      userId = null,
      transaction = null
    } = options;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new Error('批量更新ID列表不能为空');
    }

    if (ids.length > 100) {
      throw new Error('批量操作数量不能超过100条');
    }

    const t = transaction || await sequelize.transaction();

    try {
      const records = await model.findAll({
        where: { id: { [Op.in]: ids } },
        transaction: t
      });

      if (records.length === 0) {
        throw new Error('未找到要更新的记录');
      }

      if (validateFn) {
        const validationErrors = [];
        for (const record of records) {
          const error = await validateFn(record, targetStatus);
          if (error) {
            validationErrors.push({ id: record.id, error });
          }
        }
        if (validationErrors.length > 0) {
          throw new Error(`状态校验失败: ${validationErrors.map(e => `ID ${e.id}: ${e.error}`).join('; ')}`);
        }
      }

      if (beforeUpdate) {
        await beforeUpdate(records, targetStatus, t);
      }

      const [updatedCount] = await model.update(
        { [statusField]: targetStatus, updated_at: new Date() },
        { 
          where: { id: { [Op.in]: ids } },
          transaction: t
        }
      );

      if (afterUpdate) {
        await afterUpdate(records, targetStatus, t);
      }

      if (!transaction) {
        await t.commit();
      }

      return {
        success: true,
        updatedCount,
        failedCount: ids.length - updatedCount
      };
    } catch (error) {
      if (!transaction) {
        await t.rollback();
      }
      throw error;
    }
  }

  async batchUpdate(model, ids, updateData, options = {}) {
    const {
      validateFn = null,
      beforeUpdate = null,
      afterUpdate = null,
      userId = null,
      transaction = null
    } = options;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new Error('批量更新ID列表不能为空');
    }

    if (ids.length > 100) {
      throw new Error('批量操作数量不能超过100条');
    }

    const t = transaction || await sequelize.transaction();

    try {
      const records = await model.findAll({
        where: { id: { [Op.in]: ids } },
        transaction: t
      });

      if (records.length === 0) {
        throw new Error('未找到要更新的记录');
      }

      if (validateFn) {
        const validationErrors = [];
        for (const record of records) {
          const error = await validateFn(record, updateData);
          if (error) {
            validationErrors.push({ id: record.id, error });
          }
        }
        if (validationErrors.length > 0) {
          throw new Error(`数据校验失败: ${validationErrors.map(e => `ID ${e.id}: ${e.error}`).join('; ')}`);
        }
      }

      if (beforeUpdate) {
        await beforeUpdate(records, updateData, t);
      }

      const [updatedCount] = await model.update(
        { ...updateData, updated_at: new Date() },
        { 
          where: { id: { [Op.in]: ids } },
          transaction: t
        }
      );

      if (afterUpdate) {
        await afterUpdate(records, updateData, t);
      }

      if (!transaction) {
        await t.commit();
      }

      return {
        success: true,
        updatedCount,
        failedCount: ids.length - updatedCount
      };
    } catch (error) {
      if (!transaction) {
        await t.rollback();
      }
      throw error;
    }
  }

  async logOperation(logData, transaction = null) {
    const { userId, operation, module, recordIds, oldData, newData, remark } = logData;
    
    console.log('[BATCH OPERATION LOG]', JSON.stringify({
      userId,
      operation,
      module,
      recordIds,
      oldData,
      newData,
      remark,
      timestamp: new Date().toISOString()
    }));

    return {
      success: true,
      loggedAt: new Date()
    };
  }

  async batchCreate(model, dataList, options = {}) {
    const {
      validateFn = null,
      beforeCreate = null,
      afterCreate = null,
      userId = null,
      transaction = null
    } = options;

    if (!dataList || !Array.isArray(dataList) || dataList.length === 0) {
      throw new Error('批量创建数据列表不能为空');
    }

    if (dataList.length > 100) {
      throw new Error('批量操作数量不能超过100条');
    }

    const t = transaction || await sequelize.transaction();

    try {
      if (validateFn) {
        const validationErrors = [];
        for (let i = 0; i < dataList.length; i++) {
          const error = await validateFn(dataList[i]);
          if (error) {
            validationErrors.push({ index: i, error });
          }
        }
        if (validationErrors.length > 0) {
          throw new Error(`数据校验失败: ${validationErrors.map(e => `索引 ${e.index}: ${e.error}`).join('; ')}`);
        }
      }

      if (beforeCreate) {
        await beforeCreate(dataList, t);
      }

      const records = await model.bulkCreate(dataList, { transaction: t });

      if (afterCreate) {
        await afterCreate(records, t);
      }

      if (!transaction) {
        await t.commit();
      }

      return {
        success: true,
        createdCount: records.length,
        records
      };
    } catch (error) {
      if (!transaction) {
        await t.rollback();
      }
      throw error;
    }
  }
}

module.exports = new BatchService();
