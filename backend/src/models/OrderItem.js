const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('OrderItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, comment: '订单ID' },
  business_id: { type: DataTypes.INTEGER, comment: '业务ID' },
  business_category: { type: DataTypes.STRING(50), comment: '业务类别' },
  business_project: { type: DataTypes.STRING(100), comment: '业务项目' },
  parameter: { type: DataTypes.STRING(100), comment: '业务参数' },
  quantity: { type: DataTypes.DECIMAL(15,4), defaultValue: 1, comment: '数量' },
  unit_price: { type: DataTypes.DECIMAL(15,4), defaultValue: 0, comment: '单价' },
  total: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '总价' },
  settlement_fee: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '结算费' },
  performance_fee: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '绩效费' },
}, { tableName: 'order_items', timestamps: true, underscored: false });
