require('dotenv').config({path:require('path').join(__dirname,'../.env')});
console.log('[DEBUG] JWT_SECRET loaded:', process.env.JWT_SECRET ? 'YES' : 'NO');
console.log('[DEBUG] DB_PASSWORD loaded:', process.env.DB_PASSWORD ? 'YES' : 'NO');
const express = require('express');
const cors = require('cors');
const path = require('path');
const models = require('./models');
const { sequelize } = models;
const { startSnapshotScheduler } = require('./utils/statsScheduler');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务 - 上传的文件
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/business', require('./routes/business'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/salary', require('./routes/salary'));
app.use('/api/performance', require('./routes/performance'));
app.use('/api/payment-requests', require('./routes/paymentRequests'));
app.use('/api/payment-request-batches', require('./routes/paymentRequestBatches'));
app.use('/api/receipts', require('./routes/receipts'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/import-export', require('./routes/importExport'));
app.use('/api/bank-accounts', require('./routes/bankAccounts'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/consistency', require('./routes/consistency'));
app.use('/api/user-config', require('./routes/userConfig'));

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || '服务器内部错误' });
});

const PORT = process.env.PORT || 3001;

console.log('[DEBUG] About to authenticate database...');

// 验证连接，手动添加新字段
sequelize.authenticate().then(() => {
  console.log('数据库连接成功');
  
  // 手动添加新字段（如果不存在）
  const queryInterface = sequelize.getQueryInterface();
  
  return Promise.all([
    // Customer 表添加 status 字段
    queryInterface.describeTable('customers').then(cols => {
      if (!cols.status) {
        console.log('添加 customers.status 字段...');
        return queryInterface.addColumn('customers', 'status', {
          type: sequelize.Sequelize.STRING(20),
          defaultValue: '潜在客户',
          comment: '客户状态'
        });
      }
    }).catch(() => {}),
    
    // Department 表添加 manager_id 字段
    queryInterface.describeTable('departments').then(cols => {
      if (!cols.manager_id) {
        console.log('添加 departments.manager_id 字段...');
        return queryInterface.addColumn('departments', 'manager_id', {
          type: sequelize.Sequelize.INTEGER,
          comment: '负责人ID'
        });
      }
    }).catch(() => {}),
    
    // Department 表添加 manager_name 字段
    queryInterface.describeTable('departments').then(cols => {
      if (!cols.manager_name) {
        console.log('添加 departments.manager_name 字段...');
        return queryInterface.addColumn('departments', 'manager_name', {
          type: sequelize.Sequelize.STRING(50),
          comment: '负责人姓名'
        });
      }
    }).catch(() => {}),
    
    // 创建 order_status_histories 表（如果不存在）
    queryInterface.showAllTables().then(tables => {
      const tableNames = tables.map(t => t.tableName || t);
      if (!tableNames.includes('order_status_histories')) {
        console.log('创建 order_status_histories 表...');
        return queryInterface.createTable('order_status_histories', {
          id: { type: sequelize.Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          order_id: { type: sequelize.Sequelize.INTEGER, allowNull: false },
          old_status: { type: sequelize.Sequelize.STRING(20) },
          new_status: { type: sequelize.Sequelize.STRING(20), allowNull: false },
          reason: { type: sequelize.Sequelize.TEXT },
          operator_id: { type: sequelize.Sequelize.INTEGER },
          operator_name: { type: sequelize.Sequelize.STRING(50) },
          created_at: { type: sequelize.Sequelize.DATE, allowNull: false, defaultValue: sequelize.Sequelize.NOW }
        });
      }
    }).catch(() => {}),
    
    // 创建 contract_status_histories 表（如果不存在）
    queryInterface.showAllTables().then(tables => {
      const tableNames = tables.map(t => t.tableName || t);
      if (!tableNames.includes('contract_status_histories')) {
        console.log('创建 contract_status_histories 表...');
        return queryInterface.createTable('contract_status_histories', {
          id: { type: sequelize.Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          contract_id: { type: sequelize.Sequelize.INTEGER, allowNull: false },
          old_status: { type: sequelize.Sequelize.STRING(20) },
          new_status: { type: sequelize.Sequelize.STRING(20), allowNull: false },
          reason: { type: sequelize.Sequelize.TEXT },
          operator_id: { type: sequelize.Sequelize.INTEGER },
          operator_name: { type: sequelize.Sequelize.STRING(50) },
          created_at: { type: sequelize.Sequelize.DATE, allowNull: false, defaultValue: sequelize.Sequelize.NOW }
        });
      }
    }).catch(() => {}),
    
    // 创建 sync_tasks 表
    queryInterface.showAllTables().then(tables => {
      const tableNames = tables.map(t => t.tableName || t);
      if (!tableNames.includes('sync_tasks')) {
        console.log('创建 sync_tasks 表...');
        return queryInterface.createTable('sync_tasks', {
          id: { type: sequelize.Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          task_type: { type: sequelize.Sequelize.STRING(50) },
          sync_type: { type: sequelize.Sequelize.STRING(50) },
          scope: { type: sequelize.Sequelize.STRING(50) },
          target_ids: { type: sequelize.Sequelize.JSON },
          status: { type: sequelize.Sequelize.STRING(20), defaultValue: 'pending' },
          total_count: { type: sequelize.Sequelize.INTEGER, defaultValue: 0 },
          processed_count: { type: sequelize.Sequelize.INTEGER, defaultValue: 0 },
          success_count: { type: sequelize.Sequelize.INTEGER, defaultValue: 0 },
          failed_count: { type: sequelize.Sequelize.INTEGER, defaultValue: 0 },
          start_time: { type: sequelize.Sequelize.DATE },
          end_time: { type: sequelize.Sequelize.DATE },
          operator_id: { type: sequelize.Sequelize.INTEGER },
          remark: { type: sequelize.Sequelize.TEXT },
          created_at: { type: sequelize.Sequelize.DATE, allowNull: false, defaultValue: sequelize.Sequelize.NOW },
          updated_at: { type: sequelize.Sequelize.DATE, allowNull: false, defaultValue: sequelize.Sequelize.NOW }
        });
      }
    }).catch(() => {}),
    
    // 创建 sync_logs 表
    queryInterface.showAllTables().then(tables => {
      const tableNames = tables.map(t => t.tableName || t);
      if (!tableNames.includes('sync_logs')) {
        console.log('创建 sync_logs 表...');
        return queryInterface.createTable('sync_logs', {
          id: { type: sequelize.Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          task_id: { type: sequelize.Sequelize.INTEGER },
          sync_type: { type: sequelize.Sequelize.STRING(50) },
          source_id: { type: sequelize.Sequelize.INTEGER },
          target_type: { type: sequelize.Sequelize.STRING(50) },
          target_id: { type: sequelize.Sequelize.INTEGER },
          changes: { type: sequelize.Sequelize.JSON },
          status: { type: sequelize.Sequelize.STRING(20), defaultValue: 'pending' },
          error_message: { type: sequelize.Sequelize.TEXT },
          operator_id: { type: sequelize.Sequelize.INTEGER },
          created_at: { type: sequelize.Sequelize.DATE, allowNull: false, defaultValue: sequelize.Sequelize.NOW },
          updated_at: { type: sequelize.Sequelize.DATE, allowNull: false, defaultValue: sequelize.Sequelize.NOW }
        });
      }
    }).catch(() => {}),
    
    // 创建 user_configs 表
    queryInterface.showAllTables().then(tables => {
      const tableNames = tables.map(t => t.tableName || t);
      if (!tableNames.includes('user_configs')) {
        console.log('创建 user_configs 表...');
        return queryInterface.createTable('user_configs', {
          id: { type: sequelize.Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          user_id: { type: sequelize.Sequelize.INTEGER, allowNull: false },
          form_id: { type: sequelize.Sequelize.STRING(50), allowNull: false },
          column_widths: { type: sequelize.Sequelize.JSON, defaultValue: {} },
          sort_config: { type: sequelize.Sequelize.JSON, defaultValue: [] },
          version: { type: sequelize.Sequelize.INTEGER, defaultValue: 1 },
          created_at: { type: sequelize.Sequelize.DATE, allowNull: false, defaultValue: sequelize.Sequelize.NOW },
          updated_at: { type: sequelize.Sequelize.DATE, allowNull: false, defaultValue: sequelize.Sequelize.NOW }
        }).then(() => {
          return queryInterface.addIndex('user_configs', ['user_id', 'form_id'], {
            unique: true,
            name: 'idx_user_form'
          });
        });
      }
    }).catch(() => {})
  ]);
}).then(() => {
  console.log('数据库模型检查完成');
  startSnapshotScheduler(models);
  
  const { startSyncScheduler } = require('./utils/syncScheduler');
  startSyncScheduler();
  console.log('[sync-scheduler] Sync scheduler started');
  
  console.log('[DEBUG] About to listen on port', PORT);
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在端口 ${PORT}`);
  });
  server.on('error', (err) => {
    console.error('服务器错误:', err);
  });
  return server;
}).catch(err => {
  console.error('数据库连接失败:', err);
  process.exit(1);
});

// 捕获未处理的异常
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('未处理的 Promise 拒绝:', err);
});

// module.exports = app; // 临时注释诊断崩溃问题
