const { UserConfig } = require('../models');
const { sequelize } = require('../models');

class ConfigService {
  defaultConfigs = {
    'order-list': {
      columnWidths: {
        order_no: 150,
        contract_no: 150,
        customer_name: 150,
        amount: 120,
        status: 100,
        created_at: 150
      },
      sortConfig: [
        { field: 'created_at', order: 'DESC', priority: 1 }
      ]
    },
    'contract-list': {
      columnWidths: {
        contract_no: 150,
        project_name: 200,
        customer_name: 150,
        amount: 120,
        status: 100,
        created_at: 150
      },
      sortConfig: [
        { field: 'created_at', order: 'DESC', priority: 1 }
      ]
    },
    'payment-request-list': {
      columnWidths: {
        request_no: 150,
        amount: 120,
        status: 100,
        created_at: 150
      },
      sortConfig: [
        { field: 'created_at', order: 'DESC', priority: 1 }
      ]
    },
    'finance-list': {
      columnWidths: {
        date: 150,
        type: 100,
        amount: 120,
        company_name: 150,
        remark: 200
      },
      sortConfig: [
        { field: 'date', order: 'DESC', priority: 1 }
      ]
    }
  };

  async getUserConfig(userId, formId) {
    try {
      let config = await UserConfig.findOne({
        where: { user_id: userId, form_id: formId }
      });

      if (!config) {
        config = await this.createDefaultConfig(userId, formId);
      }

      return {
        success: true,
        config: {
          columnWidths: config.column_widths || {},
          sortConfig: config.sort_config || [],
          version: config.version
        }
      };
    } catch (error) {
      console.error('获取用户配置失败:', error);
      return {
        success: false,
        config: this.getDefaultConfig(formId)
      };
    }
  }

  async saveUserConfig(userId, formId, config) {
    const { columnWidths, sortConfig } = config;

    try {
      let userConfig = await UserConfig.findOne({
        where: { user_id: userId, form_id: formId }
      });

      if (userConfig) {
        await userConfig.update({
          column_widths: columnWidths,
          sort_config: sortConfig,
          version: userConfig.version + 1,
          updated_at: new Date()
        });
      } else {
        userConfig = await UserConfig.create({
          user_id: userId,
          form_id: formId,
          column_widths: columnWidths,
          sort_config: sortConfig,
          version: 1
        });
      }

      return {
        success: true,
        config: {
          columnWidths: userConfig.column_widths,
          sortConfig: userConfig.sort_config,
          version: userConfig.version
        }
      };
    } catch (error) {
      console.error('保存用户配置失败:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async resetToDefault(userId, formId) {
    try {
      const defaultConfig = this.getDefaultConfig(formId);
      
      await UserConfig.destroy({
        where: { user_id: userId, form_id: formId }
      });

      const newConfig = await UserConfig.create({
        user_id: userId,
        form_id: formId,
        column_widths: defaultConfig.columnWidths,
        sort_config: defaultConfig.sortConfig,
        version: 1
      });

      return {
        success: true,
        config: {
          columnWidths: newConfig.column_widths,
          sortConfig: newConfig.sort_config,
          version: newConfig.version
        }
      };
    } catch (error) {
      console.error('重置用户配置失败:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  getDefaultConfig(formId) {
    return this.defaultConfigs[formId] || {
      columnWidths: {},
      sortConfig: []
    };
  }

  async createDefaultConfig(userId, formId) {
    const defaultConfig = this.getDefaultConfig(formId);
    
    return await UserConfig.create({
      user_id: userId,
      form_id: formId,
      column_widths: defaultConfig.columnWidths,
      sort_config: defaultConfig.sortConfig,
      version: 1
    });
  }

  async batchGetConfigs(userId, formIds) {
    const configs = {};
    
    for (const formId of formIds) {
      const result = await this.getUserConfig(userId, formId);
      configs[formId] = result.config;
    }

    return {
      success: true,
      configs
    };
  }

  validateColumnWidths(columnWidths) {
    if (!columnWidths || typeof columnWidths !== 'object') {
      return false;
    }

    for (const [field, width] of Object.entries(columnWidths)) {
      if (typeof width !== 'number' || width < 50 || width > 500) {
        return false;
      }
    }

    return true;
  }

  validateSortConfig(sortConfig) {
    if (!sortConfig || !Array.isArray(sortConfig)) {
      return false;
    }

    for (const item of sortConfig) {
      if (!item.field || !['ASC', 'DESC'].includes(item.order)) {
        return false;
      }
    }

    return true;
  }
}

module.exports = new ConfigService();
