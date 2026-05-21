const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('SyncLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  task_id: { type: DataTypes.INTEGER, field: 'task_id', comment: '同步任务ID' },
  sync_type: { type: DataTypes.STRING(50), field: 'sync_type', comment: '同步类型(department/employee/company/business)' },
  source_id: { type: DataTypes.INTEGER, field: 'source_id', comment: '源数据ID' },
  target_type: { type: DataTypes.STRING(50), field: 'target_type', comment: '目标类型(employee/order/contract/project)' },
  target_id: { type: DataTypes.INTEGER, field: 'target_id', comment: '目标数据ID' },
  changes: { type: DataTypes.JSON, field: 'changes', comment: '变更内容(JSON)' },
  status: { type: DataTypes.STRING(20), defaultValue: 'pending', field: 'status', comment: '状态(pending/success/failed)' },
  error_message: { type: DataTypes.TEXT, field: 'error_message', comment: '错误信息' },
  operator_id: { type: DataTypes.INTEGER, field: 'operator_id', comment: '操作人ID' },
}, { 
  tableName: 'sync_logs', 
  timestamps: true, 
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});
