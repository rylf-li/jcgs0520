const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('Customer', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false, comment: '客户名称' },
  address: { type: DataTypes.STRING(200), comment: '地址' },
  contact: { type: DataTypes.STRING(50), comment: '联系人' },
  phone: { type: DataTypes.STRING(20), comment: '联系电话' },
  bank_account: { type: DataTypes.STRING(50), comment: '银行账号' },
  bank_name: { type: DataTypes.STRING(100), comment: '开户行' },
  settlement_method: { type: DataTypes.STRING(50), comment: '结算方式' },
  status: { type: DataTypes.STRING(20), defaultValue: '潜在客户', comment: '客户状态(活跃客户/潜在客户)' },
  company_id: { type: DataTypes.INTEGER, comment: '公司ID' },
  company_name: { type: DataTypes.STRING(100), comment: '公司名称' },
}, { tableName: 'customers', timestamps: true, underscored: false });
