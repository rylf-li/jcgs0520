const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('EmployeeDepartment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, comment: '员工ID' },
  dept_id: { type: DataTypes.INTEGER, comment: '部门ID' },
}, { tableName: 'employee_departments', timestamps: false });
