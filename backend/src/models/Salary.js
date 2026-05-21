const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('Salary', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, comment: '员工ID' },
  employee_name: { type: DataTypes.STRING(100), comment: '员工姓名' },
  date: { type: DataTypes.DATEONLY, comment: '日期' },
  base_salary: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '基本工资' },
  reimbursement: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '报销' },
  deduction: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '扣款' },
  fuel_cost: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '油费' },
  social_security: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '社保' },
  performance: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '绩效' },
  actual_salary: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '实发工资' },
  remark: { type: DataTypes.TEXT, comment: '备注' },
}, { tableName: 'salaries', timestamps: true, underscored: false });
