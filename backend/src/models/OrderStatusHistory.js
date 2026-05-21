const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('OrderStatusHistory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false, comment: '订单ID' },
  old_status: { type: DataTypes.STRING(20), comment: '原状态' },
  new_status: { type: DataTypes.STRING(20), allowNull: false, comment: '新状态' },
  reason: { type: DataTypes.TEXT, comment: '变更原因' },
  operator_id: { type: DataTypes.INTEGER, comment: '操作人ID' },
  operator_name: { type: DataTypes.STRING(50), comment: '操作人姓名' },
}, { tableName: 'order_status_histories', timestamps: true, underscored: false, createdAt: 'created_at', updatedAt: false });
