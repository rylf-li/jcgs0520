const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('Company', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false, comment: '公司名称' },
  tax_rate: { type: DataTypes.DECIMAL(5,2), defaultValue: 0, comment: '税率' },
  address: { type: DataTypes.STRING(200), comment: '地址' },
  tax_number: { type: DataTypes.STRING(50), comment: '税号' },
}, { tableName: 'companies', timestamps: true, underscored: false });
