const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('BankAccount', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  company_id: { type: DataTypes.INTEGER, comment: '公司ID' },
  company_name: { type: DataTypes.STRING(100), comment: '公司名称' },
  account_name: { type: DataTypes.STRING(100), comment: '账户名' },
  bank_account: { type: DataTypes.STRING(50), comment: '账号' },
  bank_name: { type: DataTypes.STRING(100), comment: '开户行' },
  account_type: { type: DataTypes.ENUM('公账','私账','其他'), defaultValue: '公账', comment: '账户类型' },
  is_default: { type: DataTypes.TINYINT, defaultValue: 0, comment: '默认账户' },
  initial_capital: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '原始资金' },
  remark: { type: DataTypes.STRING(500), comment: '备注' },
}, { tableName: 'bank_accounts', timestamps: true, underscored: true });
