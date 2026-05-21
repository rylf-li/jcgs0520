const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('PaymentRequestBatch', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  batch_no: { type: DataTypes.STRING(50), unique: true, comment: '请款批次号' },
  date: { type: DataTypes.DATEONLY, comment: '请款日期' },
  contract_id: { type: DataTypes.INTEGER, comment: '合同ID' },
  contract_no: { type: DataTypes.STRING(50), comment: '合同编号' },
  project_id: { type: DataTypes.INTEGER, comment: '项目ID' },
  project_name: { type: DataTypes.STRING(200), comment: '项目名称' },
  customer_id: { type: DataTypes.INTEGER, comment: '客户ID' },
  customer_name: { type: DataTypes.STRING(100), comment: '客户名称' },
  company_id: { type: DataTypes.INTEGER, comment: '公司ID' },
  company_name: { type: DataTypes.STRING(100), comment: '公司名称' },
  dept_id: { type: DataTypes.INTEGER, comment: '部门ID' },
  dept_name: { type: DataTypes.STRING(50), comment: '部门名称' },
  salesman_id: { type: DataTypes.INTEGER, comment: '业务员ID' },
  salesman_name: { type: DataTypes.STRING(50), comment: '业务员名称' },
  request_total_amount: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '请款总金额' },
  received_total_amount: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '累计实收金额' },
  discount_amount: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '折扣金额' },
  status: { type: DataTypes.STRING(20), defaultValue: '草稿', comment: '状态' },
  remark: { type: DataTypes.TEXT, comment: '备注' },
}, { tableName: 'payment_request_batches', timestamps: true, underscored: false });
