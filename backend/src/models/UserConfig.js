const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('UserConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '用户ID'
  },
  form_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '表单标识(order-list, contract-list等)'
  },
  column_widths: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: '列宽配置(JSON格式)'
  },
  sort_config: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '排序配置(JSON格式)'
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: '配置版本号'
  }
}, {
  tableName: 'user_configs',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'form_id'],
      name: 'idx_user_form'
    },
    {
      fields: ['user_id'],
      name: 'idx_user_id'
    }
  ]
});
