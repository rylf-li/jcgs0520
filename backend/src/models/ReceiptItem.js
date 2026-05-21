const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('ReceiptItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  receipt_id: { type: DataTypes.INTEGER, allowNull: false, comment: '收款记录ID' },
  payment_request_id: { type: DataTypes.INTEGER, allowNull: false, comment: '请款明细ID' },
  allocated_amount: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '分配金额' },
  remark: { type: DataTypes.TEXT, comment: '备注' },
}, { tableName: 'receipt_items', timestamps: true, underscored: false });
