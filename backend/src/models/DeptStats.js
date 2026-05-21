const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('DeptStats', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  date: { type: DataTypes.DATEONLY, comment: '统计日期' },
  dept_id: { type: DataTypes.INTEGER, comment: '部门ID' },
  dept_name: { type: DataTypes.STRING(50), comment: '部门名称' },
  company_id: { type: DataTypes.INTEGER, comment: '公司ID' },
  company_name: { type: DataTypes.STRING(100), comment: '公司名称' },
  project_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: '项目数量' },
  contract_amount: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '合同金额' },
  receivable: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '应收金额' },
  requested: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '请款金额' },
  received: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '收款金额' },
  expenditure: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '支出金额' },
  profit: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '利润金额' },
}, { tableName: 'dept_stats', comment: 'DeptStats表' });
