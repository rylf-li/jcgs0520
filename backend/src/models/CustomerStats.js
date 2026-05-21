const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('CustomerStats', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  date: { type: DataTypes.DATEONLY, comment: '统计日期' },
  customer_id: { type: DataTypes.INTEGER, comment: '客户ID' },
  customer_name: { type: DataTypes.STRING(100), comment: '客户名称' },
  contract_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: '合同数' },
  contract_amount: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '合同金额' },
  receivable: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '应收金额' },
  requested: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '请款金额' },
  received: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '收款金额' },
}, { tableName: 'customer_stats', comment: 'CustomerStats表' });
