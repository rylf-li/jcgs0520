const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('Stat', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false, comment: '统计名称' },
  type: { type: DataTypes.STRING(50), comment: '统计类型' },
  value: { type: DataTypes.DECIMAL(15,2), defaultValue: 0, comment: '数值' },
}, { tableName: 'stats', timestamps: true, underscored: false });
