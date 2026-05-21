const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('Employee', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(50), allowNull: false, comment: '姓名' },
  phone: { type: DataTypes.STRING(20), comment: '手机号' },
  password: { type: DataTypes.STRING(100), comment: '密码' },
  monthly_salary: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '月薪工资' },
  social_security_fee: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '社保费' },
  dept_name: { type: DataTypes.STRING(50), comment: '部门名称' },
  dept_id: { type: DataTypes.INTEGER, comment: '部门ID' },
  company_id: { type: DataTypes.INTEGER, comment: '公司ID' },
  company_name: { type: DataTypes.STRING(100), comment: '公司名称' },
  position: { type: DataTypes.STRING(50), comment: '职位' },
  role: { type: DataTypes.ENUM('admin','manager','sales','staff'), allowNull: false, defaultValue: 'staff', comment: '角色' },
  status: { type: DataTypes.TINYINT, defaultValue: 1, comment: '状态' },
}, { tableName: 'employees', timestamps: true, underscored: false });
