const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('Department', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(50), allowNull: false, comment: '部门名称' },
  description: { type: DataTypes.TEXT, comment: '描述' },
  manager_id: { type: DataTypes.INTEGER, comment: '负责人ID' },
  manager_name: { type: DataTypes.STRING(50), comment: '负责人姓名' },
  company_id: { type: DataTypes.INTEGER, comment: '公司ID' },
  company_name: { type: DataTypes.STRING(100), comment: '公司名称' },
}, { tableName: 'departments', timestamps: true, underscored: false });
