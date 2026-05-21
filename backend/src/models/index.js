require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'engineering_mgmt',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    timezone: '+08:00',
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
      underscored: false
    },
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 30000
    },
    dialectOptions: {
      connectTimeout: 60000,
      charset: 'utf8mb4_unicode_ci'
    },
    logging: false
  }
);

// 确保每次连接都使用正确的字符集
sequelize.beforeConnect(async (config) => {
  config.charset = 'utf8mb4';
  config.collate = 'utf8mb4_unicode_ci';
});

// 导入所有模型
const Employee = require('./Employee')(sequelize);
const EmployeeDepartment = require('./EmployeeDepartment')(sequelize);
const Department = require('./Department')(sequelize);
const Company = require('./Company')(sequelize);
const Customer = require('./Customer')(sequelize);
const Project = require('./Project')(sequelize);
const Contract = require('./Contract')(sequelize);
const Order = require('./Order')(sequelize);
const OrderItem = require('./OrderItem')(sequelize);
const Business = require('./Business')(sequelize);
const Finance = require('./Finance')(sequelize);
const Salary = require('./Salary')(sequelize);
const Performance = require('./Performance')(sequelize);
const PaymentRequest = require('./PaymentRequest')(sequelize);
const PaymentRequestBatch = require('./PaymentRequestBatch')(sequelize);
const Receipt = require('./Receipt')(sequelize);
const ReceiptItem = require('./ReceiptItem')(sequelize);
const BankAccount = require('./BankAccount')(sequelize);
const DeptStats = require('./DeptStats')(sequelize);
const CompanyStats = require('./CompanyStats')(sequelize);
const CustomerStats = require('./CustomerStats')(sequelize);
const OrderStatusHistory = require('./OrderStatusHistory')(sequelize);
const ContractStatusHistory = require('./ContractStatusHistory')(sequelize);
const SyncLog = require('./SyncLog')(sequelize);
const SyncTask = require('./SyncTask')(sequelize);
const UserConfig = require('./UserConfig')(sequelize);

// 关联关系
Department.belongsTo(Company, { foreignKey: 'company_id', as: 'companyInfo' });
Company.hasMany(Department, { foreignKey: 'company_id', as: 'departments' });

Employee.belongsTo(Department, { foreignKey: 'dept_id', as: 'deptInfo' });
Department.hasMany(Employee, { foreignKey: 'dept_id', as: 'employees' });

// 员工-部门多对多关联（保留旧的 dept_id 字段用于兼容，新增关联表用于多对多）
EmployeeDepartment.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
EmployeeDepartment.belongsTo(Department, { foreignKey: 'dept_id', as: 'deptInfo' });
Employee.hasMany(EmployeeDepartment, { foreignKey: 'employee_id', as: 'departmentLinks' });
Department.hasMany(EmployeeDepartment, { foreignKey: 'dept_id', as: 'employeeLinks' });

// 多对多关联（使用不同的别名避免冲突）
Employee.belongsToMany(Department, { through: EmployeeDepartment, foreignKey: 'employee_id', otherKey: 'dept_id', as: 'departments' });
Department.belongsToMany(Employee, { through: EmployeeDepartment, foreignKey: 'dept_id', otherKey: 'employee_id', as: 'allEmployees' });

Salary.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
Performance.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
Performance.belongsTo(Department, { foreignKey: 'dept_id', as: 'deptInfo' });
Performance.belongsTo(Company, { foreignKey: 'company_id', as: 'companyInfo' });
Performance.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
Performance.belongsTo(Contract, { foreignKey: 'contract_id', as: 'contract' });

Project.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Project.belongsTo(Department, { foreignKey: 'dept_id', as: 'deptInfo' });
Project.belongsTo(Company, { foreignKey: 'company_id', as: 'companyInfo' });
Project.hasMany(Contract, { foreignKey: 'project_id', as: 'contracts' });
Contract.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Contract.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Contract.belongsTo(Department, { foreignKey: 'dept_id', as: 'deptInfo' });
Contract.belongsTo(Company, { foreignKey: 'company_id', as: 'companyInfo' });

Order.belongsTo(Contract, { foreignKey: 'contract_id', as: 'contract' });
Order.belongsTo(Business, { foreignKey: 'business_id', as: 'businessItem' });
Order.belongsTo(Department, { foreignKey: 'dept_id', as: 'deptInfo' });
Order.belongsTo(Company, { foreignKey: 'company_id', as: 'companyInfo' });
Order.belongsTo(Employee, { foreignKey: 'salesman_id', as: 'salesmanInfo' });
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
Order.hasMany(PaymentRequest, { foreignKey: 'order_id', as: 'paymentRequests' });
Order.hasMany(OrderStatusHistory, { foreignKey: 'order_id', as: 'statusHistories' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
OrderStatusHistory.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
OrderStatusHistory.belongsTo(Employee, { foreignKey: 'operator_id', as: 'operator' });

Finance.belongsTo(Contract, { foreignKey: 'contract_id', as: 'contract' });
Finance.belongsTo(Company, { foreignKey: 'company_id', as: 'companyInfo' });
Finance.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
Finance.belongsTo(PaymentRequestBatch, { foreignKey: 'batch_id', as: 'batch' });
Finance.belongsTo(Receipt, { foreignKey: 'receipt_id', as: 'receipt' });

BankAccount.belongsTo(Company, { foreignKey: 'company_id', as: 'companyInfo' });
Company.hasMany(BankAccount, { foreignKey: 'company_id', as: 'bankAccounts' });

Contract.belongsTo(BankAccount, { foreignKey: 'bank_account_id', as: 'bankAccount' });
Finance.belongsTo(BankAccount, { foreignKey: 'bank_account_id', as: 'bankAccount' });
Project.belongsTo(Employee, { foreignKey: 'salesman_id', as: 'salesmanInfo' });
Contract.belongsTo(Employee, { foreignKey: 'salesman_id', as: 'salesmanInfo' });
PaymentRequestBatch.belongsTo(Contract, { foreignKey: 'contract_id', as: 'contract' });
PaymentRequestBatch.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
PaymentRequestBatch.belongsTo(Employee, { foreignKey: 'salesman_id', as: 'salesmanInfo' });
PaymentRequestBatch.hasMany(PaymentRequest, { foreignKey: 'batch_id', as: 'items' });
PaymentRequest.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
PaymentRequest.belongsTo(PaymentRequestBatch, { foreignKey: 'batch_id', as: 'batch' });
PaymentRequest.belongsTo(Contract, { foreignKey: 'contract_id', as: 'contract' });
PaymentRequest.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
PaymentRequest.belongsTo(Employee, { foreignKey: 'salesman_id', as: 'salesmanInfo' });
PaymentRequest.hasMany(ReceiptItem, { foreignKey: 'payment_request_id', as: 'receiptItems' });

Receipt.belongsTo(PaymentRequestBatch, { foreignKey: 'batch_id', as: 'batch' });
Receipt.belongsTo(Contract, { foreignKey: 'contract_id', as: 'contract' });
Receipt.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Receipt.belongsTo(Employee, { foreignKey: 'salesman_id', as: 'salesmanInfo' });
Receipt.belongsTo(BankAccount, { foreignKey: 'bank_account_id', as: 'bankAccount' });
Receipt.hasMany(ReceiptItem, { foreignKey: 'receipt_id', as: 'items' });

ReceiptItem.belongsTo(Receipt, { foreignKey: 'receipt_id', as: 'receipt' });
ReceiptItem.belongsTo(PaymentRequest, { foreignKey: 'payment_request_id', as: 'paymentRequest' });

// 同步任务关联
SyncTask.hasMany(SyncLog, { foreignKey: 'task_id', as: 'logs' });
SyncLog.belongsTo(SyncTask, { foreignKey: 'task_id', as: 'task' });

module.exports = {
  sequelize,
  Employee,
  EmployeeDepartment,
  Department,
  Company,
  Customer,
  Project,
  Contract,
  Order,
  OrderItem,
  Business,
  Finance,
  Salary,
  Performance,
  PaymentRequest,
  PaymentRequestBatch,
  Receipt,
  ReceiptItem,
  BankAccount,
  DeptStats,
  CompanyStats,
  CustomerStats,
  OrderStatusHistory,
  ContractStatusHistory,
  SyncLog,
  SyncTask,
  UserConfig
};
