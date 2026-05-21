const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('SyncTask', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  task_type: { type: DataTypes.STRING(50), field: 'task_type', comment: '任务类型(single/batch/incremental)' },
  sync_type: { type: DataTypes.STRING(50), field: 'sync_type', comment: '同步类型(department/employee/company/business)' },
  scope: { type: DataTypes.STRING(50), field: 'scope', comment: '同步范围(all/company/department/time_range)' },
  target_ids: { type: DataTypes.JSON, field: 'target_ids', comment: '目标ID列表(JSON)' },
  status: { type: DataTypes.STRING(20), defaultValue: 'pending', field: 'status', comment: '状态(pending/running/completed/failed/cancelled)' },
  total_count: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_count', comment: '总数' },
  processed_count: { type: DataTypes.INTEGER, defaultValue: 0, field: 'processed_count', comment: '已处理数' },
  success_count: { type: DataTypes.INTEGER, defaultValue: 0, field: 'success_count', comment: '成功数' },
  failed_count: { type: DataTypes.INTEGER, defaultValue: 0, field: 'failed_count', comment: '失败数' },
  start_time: { type: DataTypes.DATE, field: 'start_time', comment: '开始时间' },
  end_time: { type: DataTypes.DATE, field: 'end_time', comment: '结束时间' },
  operator_id: { type: DataTypes.INTEGER, field: 'operator_id', comment: '操作人ID' },
  remark: { type: DataTypes.TEXT, field: 'remark', comment: '备注' },
}, { 
  tableName: 'sync_tasks', 
  timestamps: true, 
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});
