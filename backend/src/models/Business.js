const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('Business', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), comment: '业务名称(兼容旧字段)' },
  category: { type: DataTypes.STRING(50), comment: '业务类别' },
  project: { type: DataTypes.STRING(200), comment: '业务项目' },
  parameter: { type: DataTypes.STRING(200), comment: '业务参数' },
  unit: { type: DataTypes.STRING(20), comment: '单位' },
  unit_price: { type: DataTypes.DECIMAL(15,4), defaultValue: 0, comment: '单价' },
  settlement_fee: { type: DataTypes.DECIMAL(10,2), defaultValue: 0, comment: '结算费率(%)' },
  performance_fee: { type: DataTypes.DECIMAL(10,2), defaultValue: 0, comment: '绩效率(%)' },
  remark: { type: DataTypes.TEXT, comment: '备注' },
}, { tableName: 'business', timestamps: true, underscored: false });
