const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('Report', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false, comment: '报表名称' },
  type: { type: DataTypes.STRING(50), comment: '报表类型' },
  content: { type: DataTypes.TEXT, comment: '内容' },
  date: { type: DataTypes.DATEONLY, comment: '日期' },
}, { tableName: 'reports', timestamps: true, underscored: false });
