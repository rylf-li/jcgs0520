/**
 * 数据导入导出模块
 * 支持员工、客户、公司、部门、业务、项目、合同、订单、财务、绩效、工资等管理模块
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { success, fail, generateNo } = require('../utils/helpers');
const XLSX = require('xlsx');
const { sequelize } = require('../models');
const {
  Customer, Company, Department, Employee, Business,
  Project, Contract, Order, Finance, Performance, Salary, BankAccount, OrderItem,
  PaymentRequestBatch, PaymentRequest, Receipt, ReceiptItem
} = require('../models');

// ==================== 配置区 ====================

// 模型映射
// uniqueKey: 用于导入去重判断的字段；compositeUnique: 复合唯一键（多字段联合去重）
const MODELS = {
  employees: { model: Employee, name: '员工', uniqueKey: 'phone' },
  customers: { model: Customer, name: '客户', uniqueKey: 'name' },
  companies: { model: Company, name: '公司', uniqueKey: 'name' },
  departments: { model: Department, name: '部门', uniqueKey: 'name' },
  business: { model: Business, name: '业务', uniqueKey: null },
  projects: { model: Project, name: '项目', uniqueKey: 'project_no' },
  contracts: { model: Contract, name: '合同', uniqueKey: 'contract_no' },
  orders: { model: Order, name: '订单', uniqueKey: 'order_no' },
  payment_request_batches: { model: PaymentRequestBatch, name: '请款批次', uniqueKey: 'batch_no' },
  payment_requests: { model: PaymentRequest, name: '请款明细', uniqueKey: 'request_no' },
  receipts: { model: Receipt, name: '收款记录', uniqueKey: 'receipt_no' },
  finances: { model: Finance, name: '财务', uniqueKey: 'finance_no' },
  performances: { model: Performance, name: '绩效', uniqueKey: null, compositeUnique: ['month', 'employee_id', 'contract_no'] },
  salaries: { model: Salary, name: '工资', uniqueKey: null, compositeUnique: ['employee_id', 'date'] },
  bank_accounts: { model: BankAccount, name: '银行账户', uniqueKey: null, compositeUnique: ['company_id', 'account_name', 'bank_account'] }
};

// 字段配置
const FIELD_CONFIGS = {
  employees: [
    { field: 'name', label: '姓名', required: true },
    { field: 'phone', label: '手机号' },
    { field: 'dept_name', label: '部门名称', lookup: 'departments', lookupBy: 'name', setField: 'dept_id' },
    { field: 'password', label: '密码' },
    { field: 'role', label: '角色', default: 'staff' }
  ],
  customers: [
    { field: 'name', label: '客户名称', required: true },
    { field: 'address', label: '客户地址' },
    { field: 'contact', label: '联系人' },
    { field: 'phone', label: '联系电话', type: 'string' },
    { field: 'bank_account', label: '银行账号' },
    { field: 'bank_name', label: '开户行' }
  ],
  companies: [
    { field: 'name', label: '公司名称', required: true },
    { field: 'tax_rate', label: '税率(%)', type: 'number' },
    { field: 'address', label: '地址' },
    { field: 'tax_number', label: '税务号' }
  ],
  departments: [
    { field: 'name', label: '部门名称', required: true },
    { field: 'description', label: '描述' },
    { field: 'company_name', label: '所属公司', lookup: 'companies', lookupBy: 'name', setField: 'company_id' }
  ],
  business: [
    { field: 'name', label: '业务名称', required: true },
    { field: 'category', label: '业务类别' },
    { field: 'project', label: '业务项目' },
    { field: 'parameter', label: '业务参数' },
    { field: 'unit', label: '业务单位' },
    { field: 'unit_price', label: '业务单价', type: 'number' },
    { field: 'settlement_fee', label: '结算费率(%)', type: 'number' },
    { field: 'performance_fee', label: '绩效率(%)', type: 'number' },
    { field: 'remark', label: '备注' }
  ],
  projects: [
    { field: 'name', label: '项目名称', required: true },
    { field: 'project_no', label: '项目编号', type: 'string' },
    { field: 'customer_name', label: '客户名称', lookup: 'customers', lookupBy: 'name', setField: 'customer_id', type: 'string' },
    { field: 'dept_name', label: '部门名称', lookup: 'departments', lookupBy: 'name', setField: 'dept_id', type: 'string' },
    { field: 'company_name', label: '公司名称', lookup: 'companies', lookupBy: 'name', setField: 'company_id', type: 'string' },
    { field: 'salesman', label: '业务员', type: 'string' },
    { field: 'manager', label: '负责人', type: 'string' },
    { field: 'amount', label: '项目金额', type: 'number' },
    { field: 'date', label: '项目日期', type: 'date' },
    { field: 'remark', label: '备注', type: 'string' },
    { field: 'status', label: '状态', default: 1, map: { '未启动': 0, '进行中': 1, '已完成': 2, '已取消': 3 } }
  ],
  contracts: [
    { field: 'contract_no', label: '合同编号', required: true },
    { field: 'name', label: '合同名称', required: true },
    { field: 'date', label: '合同日期', type: 'date' },
    { field: 'customer_name', label: '客户名称', lookup: 'customers', lookupBy: 'name', setField: 'customer_id' },
    { field: 'service_content', label: '服务内容' },
    { field: 'amount', label: '合同金额', type: 'number' },
    { field: 'receivable', label: '应收金额', type: 'number' },
    { field: 'manager', label: '负责人' },
    { field: 'salesman', label: '业务员' },
    { field: 'dept_name', label: '部门名称', lookup: 'departments', lookupBy: 'name', setField: 'dept_id' },
    { field: 'company_name', label: '公司名称', lookup: 'companies', lookupBy: 'name', setField: 'company_id' },
    { field: 'bank_account_name', label: '银行账户', lookup: 'bank_accounts', lookupBy: 'account_name', setField: 'bank_account_id' },
    { field: 'status', label: '状态', default: '进行中', map: { '待签订': '待签订', '进行中': '进行中', '已完成': '已完成', '已取消': '已取消' } }
  ],
  orders: [
    { field: 'order_no', label: '订单编号', type: 'string' },
    { field: 'date', label: '订单日期', type: 'datestring' },
    { field: 'contract_no', label: '合同编号', lookup: 'contracts', lookupBy: 'contract_no', setField: 'contract_id', type: 'string' },
    { field: 'project_name', label: '项目名称', type: 'string' },
    { field: 'customer_name', label: '客户名称', type: 'string' },
    { field: 'business_category', label: '业务类别', type: 'string' },
    { field: 'business_parameter', label: '业务参数', type: 'string' },
    { field: 'business_unit', label: '业务单位', type: 'string' },
    { field: 'business_project', label: '业务项目', type: 'string' },
    { field: 'quantity', label: '数量', type: 'string', default: '1' },
    { field: 'unit_price', label: '单价', type: 'string', default: '0' },
    { field: 'total', label: '总价', type: 'string', default: '0' },
    { field: 'report_date', label: '报告日期', type: 'datestring' },
    { field: 'report_no', label: '报告编号', type: 'string' },
    { field: 'settlement_fee', label: '结算费', type: 'string', default: '0' },
    { field: 'performance_fee', label: '绩效费', type: 'string', default: '0' },
    { field: 'manager', label: '负责人', type: 'string' },
    { field: 'salesman', label: '业务员', type: 'string' },
    { field: 'dept_name', label: '部门名称', type: 'string' },
    { field: 'company_name', label: '公司名称', type: 'string' },
    { field: 'status', label: '状态', type: 'string', default: '进行中' },
    { field: 'perf_generated', label: '绩效已生成', type: 'string', default: '0' },
    { field: 'finance_generated', label: '财务已生成', type: 'string', default: '0' },
    { field: 'remark', label: '备注', type: 'string' }
  ],
  payment_request_batches: [
    { field: 'batch_no', label: '请款批次号', type: 'string' },
    { field: 'date', label: '请款日期', type: 'date' },
    { field: 'contract_no', label: '合同编号', lookup: 'contracts', lookupBy: 'contract_no', setField: 'contract_id', type: 'string' },
    { field: 'project_name', label: '项目名称', type: 'string' },
    { field: 'customer_name', label: '客户名称', type: 'string' },
    { field: 'company_name', label: '公司名称', lookup: 'companies', lookupBy: 'name', setField: 'company_id', type: 'string' },
    { field: 'dept_name', label: '部门名称', lookup: 'departments', lookupBy: 'name', setField: 'dept_id', type: 'string' },
    { field: 'salesman_name', label: '业务员', lookup: 'employees', lookupBy: 'name', setField: 'salesman_id', type: 'string' },
    { field: 'request_total_amount', label: '请款合计', type: 'number', default: 0 },
    { field: 'received_total_amount', label: '收款合计', type: 'number', default: 0 },
    { field: 'discount_amount', label: '差额', type: 'number', default: 0 },
    { field: 'status', label: '状态', type: 'string', default: '已请款' },
    { field: 'remark', label: '备注', type: 'string' }
  ],
  payment_requests: [
    { field: 'request_no', label: '请款单号', type: 'string' },
    { field: 'batch_no', label: '请款批次号', lookup: 'payment_request_batches', lookupBy: 'batch_no', setField: 'batch_id', type: 'string' },
    { field: 'date', label: '请款日期', type: 'date' },
    { field: 'order_no', label: '订单编号', lookup: 'orders', lookupBy: 'order_no', setField: 'order_id', type: 'string' },
    { field: 'contract_no', label: '合同编号', lookup: 'contracts', lookupBy: 'contract_no', setField: 'contract_id', type: 'string' },
    { field: 'project_name', label: '项目名称', type: 'string' },
    { field: 'customer_name', label: '客户名称', type: 'string' },
    { field: 'company_name', label: '公司名称', lookup: 'companies', lookupBy: 'name', setField: 'company_id', type: 'string' },
    { field: 'dept_name', label: '部门名称', lookup: 'departments', lookupBy: 'name', setField: 'dept_id', type: 'string' },
    { field: 'salesman_name', label: '业务员', lookup: 'employees', lookupBy: 'name', setField: 'salesman_id', type: 'string' },
    { field: 'request_amount', label: '请款金额', type: 'number', required: true },
    { field: 'received_amount', label: '已收金额', type: 'number', default: 0 },
    { field: 'status', label: '状态', type: 'string', default: '已请款' },
    { field: 'remark', label: '备注', type: 'string' }
  ],
  receipts: [
    { field: 'receipt_no', label: '收款编号', type: 'string', required: true },
    { field: 'date', label: '收款日期', type: 'date', required: true },
    { field: 'batch_no', label: '请款批次号', lookup: 'payment_request_batches', lookupBy: 'batch_no', setField: 'batch_id', type: 'string' },
    { field: 'payment_request_no', label: '请款单号', type: 'string', required: true },
    { field: 'contract_no', label: '合同编号', lookup: 'contracts', lookupBy: 'contract_no', setField: 'contract_id', type: 'string' },
    { field: 'project_name', label: '项目名称', type: 'string' },
    { field: 'customer_name', label: '客户名称', type: 'string' },
    { field: 'company_name', label: '公司名称', lookup: 'companies', lookupBy: 'name', setField: 'company_id', type: 'string' },
    { field: 'dept_name', label: '部门名称', lookup: 'departments', lookupBy: 'name', setField: 'dept_id', type: 'string' },
    { field: 'salesman_name', label: '业务员', lookup: 'employees', lookupBy: 'name', setField: 'salesman_id', type: 'string' },
    { field: 'planned_amount', label: '应收金额', type: 'number', default: 0 },
    { field: 'actual_amount', label: '实收金额', type: 'number', required: true },
    { field: 'allocated_amount', label: '分配金额', type: 'number' },
    { field: 'account_type', label: '账户类型', type: 'string', default: '银行' },
    { field: 'bank_account_name', label: '银行账户', lookup: 'bank_accounts', lookupBy: 'account_name', setField: 'bank_account_id', type: 'string' },
    { field: 'status', label: '状态', type: 'string', default: '已确认' },
    { field: 'remark', label: '备注', type: 'string' }
  ],
  finances: [
    { field: 'finance_no', label: '财务编号', type: 'string' },
    { field: 'date', label: '财务日期', type: 'date' },
    { field: 'contract_no', label: '合同编号', lookup: 'contracts', lookupBy: 'contract_no', setField: 'contract_id', type: 'string' },
    { field: 'project_name', label: '项目名称', type: 'string' },
    { field: 'category', label: '款项类别', type: 'string' },
    { field: 'description', label: '内容描述', type: 'string' },
    { field: 'type', label: '收支', type: 'string', default: '收入', map: { '收入': '收入', '支出': '支出' } },
    { field: 'amount', label: '金额', type: 'number' },
    { field: 'company_name', label: '公司名称', lookup: 'companies', lookupBy: 'name', setField: 'company_id', type: 'string' },
    { field: 'customer_name', label: '客户名称', type: 'string' },
    { field: 'booked', label: '是否入账', type: 'string', default: '0', map: { '是': 1, '否': 0, '1': 1, '0': 0 } },
    { field: 'invoice_no', label: '发票号', type: 'string' },
    { field: 'bank_account_name', label: '银行账户', lookup: 'bank_accounts', lookupBy: 'account_name', setField: 'bank_account_id', type: 'string' }
  ],
  performances: [
    { field: 'month', label: '月份', type: 'string' },
    { field: 'employee_name', label: '员工姓名', required: true, lookup: 'employees', lookupBy: 'name', setField: 'employee_id', type: 'string' },
    { field: 'contract_no', label: '合同编号', lookup: 'contracts', lookupBy: 'contract_no', setField: 'contract_id', type: 'string' },
    { field: 'order_no', label: '订单编号', lookup: 'orders', lookupBy: 'order_no', setField: 'order_id', type: 'string' },
    { field: 'dept_name', label: '部门', type: 'string' },
    { field: 'company_name', label: '公司名称', lookup: 'companies', lookupBy: 'name', setField: 'company_id', type: 'string' },
    { field: 'sales_amount', label: '销售金额', type: 'number' },
    { field: 'performance_amount', label: '绩效金额', type: 'number' },
    { field: 'remark', label: '备注', type: 'string' }
  ],
  salaries: [
    { field: 'employee_name', label: '员工姓名', required: true, lookup: 'employees', lookupBy: 'name', setField: 'employee_id', type: 'string' },
    { field: 'date', label: '日期', type: 'date' },
    { field: 'base_salary', label: '基本工资', type: 'number' },
    { field: 'reimbursement', label: '报销', type: 'number' },
    { field: 'deduction', label: '扣款', type: 'number' },
    { field: 'fuel_cost', label: '油费', type: 'number' },
    { field: 'social_security', label: '社保', type: 'number' },
    { field: 'performance', label: '绩效', type: 'number' },
    { field: 'actual_salary', label: '实发工资', type: 'number' },
    { field: 'remark', label: '备注', type: 'string' }
  ],
  bank_accounts: [
    { field: 'company_name', label: '所属公司', required: true, lookup: 'companies', lookupBy: 'name', setField: 'company_id' },
    { field: 'account_name', label: '账户名称', required: true },
    { field: 'bank_account', label: '银行账号', required: true },
    { field: 'bank_name', label: '开户行名称' },
    { field: 'account_type', label: '账户类型', default: '公账' },
    { field: 'is_default', label: '是否默认', type: 'boolean', default: false, map: { '是': true, '否': false } },
    { field: 'initial_capital', label: '原始资金', type: 'number' },
    { field: 'remark', label: '备注' }
  ]
};

// ==================== 工具函数 ====================

// 简单的日志记录
function logToFile(message) {
  const fs = require('fs');
  const path = require('path');
  const logPath = path.join(__dirname, '../../logs/import.log');
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(logPath, logLine);
  } catch (e) {
    console.log('[IMPORT LOG]', message);
  }
}

// 缓存
const cache = {};

// 获取缓存数据
async function getCache(modelKey) {
  if (cache[modelKey]) return cache[modelKey];
  const config = MODELS[modelKey];
  if (!config) return null;
  // 查询所有字段，避免不同模型字段不一致导致的错误
  cache[modelKey] = await config.model.findAll();
  return cache[modelKey];
}

// 清除缓存
function clearCache() {
  Object.keys(cache).forEach(key => delete cache[key]);
}

// 根据名称查找ID
async function lookupId(modelKey, field, value) {
  const data = await getCache(modelKey);
  if (!data) return null;
  const item = data.find(d => d[field] === value || d.name === value);
  return item ? item.id : null;
}

// 转换值（所有类型统一输出字符串，避免数据库排序规则冲突）
function convertValue(value, config) {
  if (value === undefined || value === null || value === '') {
    return config.default !== undefined ? config.default : null;
  }
  
  // 日期转字符串类型：Excel 数字序列号 → YYYY-MM-DD 字符串
  if (config.type === 'datestring') {
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    // 已经是字符串的日期（如 "2024-01-15"），直接返回
    return String(value);
  }
  
  // 字符串类型：确保所有值都转为字符串，避免 collation 冲突
  if (config.type === 'string') {
    return String(value);
  }
  
  // 兼容旧的 number 类型（其他模块仍可能使用）
  if (config.type === 'number') {
    return parseFloat(value) || 0;
  }
  
  // 兼容旧的 date 类型（其他模块仍可能使用）
  if (config.type === 'date') {
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    return String(value);
  }
  
  // 映射转换
  if (config.map && config.map[value] !== undefined) {
    return config.map[value];
  }
  
  return value;
}

async function recalculateImportedBatch(batchId) {
  if (!batchId) return null;
  const batch = await PaymentRequestBatch.findByPk(batchId);
  if (!batch) return null;

  const requests = await PaymentRequest.findAll({
    where: { batch_id: batchId },
    attributes: ['request_amount', 'received_amount'],
    raw: true
  });
  const requestTotal = requests.reduce((sum, item) => sum + Number(item.request_amount || 0), 0);
  const receivedTotal = requests.reduce((sum, item) => sum + Number(item.received_amount || 0), 0);
  let status = '草稿';
  if (requestTotal > 0 && receivedTotal <= 0) status = '已请款';
  if (requestTotal > 0 && receivedTotal > 0 && receivedTotal < requestTotal) status = '部分收款';
  if (requestTotal > 0 && receivedTotal >= requestTotal) status = '已收款';

  await batch.update({
    request_total_amount: Number(requestTotal.toFixed(2)),
    received_total_amount: Number(receivedTotal.toFixed(2)),
    discount_amount: Number((requestTotal - receivedTotal).toFixed(2)),
    status
  });
  return batch;
}

async function recalculateImportedPaymentRequest(paymentRequestId) {
  if (!paymentRequestId) return null;
  const request = await PaymentRequest.findByPk(paymentRequestId);
  if (!request) return null;

  const items = await ReceiptItem.findAll({
    where: { payment_request_id: paymentRequestId },
    attributes: ['allocated_amount'],
    raw: true
  });
  const receivedAmount = items.reduce((sum, item) => sum + Number(item.allocated_amount || 0), 0);
  const requestAmount = Number(request.request_amount || 0);
  let status = '已请款';
  if (requestAmount <= 0) status = '草稿';
  else if (receivedAmount > 0 && receivedAmount < requestAmount) status = '部分收款';
  else if (receivedAmount >= requestAmount) status = '已收款';

  await request.update({
    received_amount: Number(receivedAmount.toFixed(2)),
    status
  });
  return request;
}

async function recalculateImportedOrder(orderId) {
  if (!orderId) return null;
  const order = await Order.findByPk(orderId);
  if (!order) return null;

  const requests = await PaymentRequest.findAll({
    where: { order_id: orderId },
    attributes: ['request_amount', 'received_amount'],
    raw: true
  });
  const requestedAmount = requests.reduce((sum, item) => sum + Number(item.request_amount || 0), 0);
  const receivedAmount = requests.reduce((sum, item) => sum + Number(item.received_amount || 0), 0);
  let paymentStatus = '未请款';
  if (requestedAmount > 0 && receivedAmount <= 0) paymentStatus = '已请款';
  if (requestedAmount > 0 && receivedAmount > 0 && receivedAmount < requestedAmount) paymentStatus = '部分收款';
  if (requestedAmount > 0 && receivedAmount >= requestedAmount) paymentStatus = '已收款';

  await order.update({
    requested_amount: Number(requestedAmount.toFixed(2)),
    received_amount: Number(receivedAmount.toFixed(2)),
    payment_status: paymentStatus,
    finance_generated: requestedAmount > 0 ? 1 : 0,
    finance_booked: receivedAmount > 0 ? 1 : 0
  });
  return order;
}

// ==================== API 路由 ====================

// 获取模块列表
router.get('/models', auth, (req, res) => {
  const models = Object.entries(MODELS).map(([key, config]) => ({
    key,
    name: config.name,
    fields: FIELD_CONFIGS[key]?.length || 0
  }));
  success(res, models);
});

// 下载模板
router.get('/template/:model', auth, async (req, res) => {
  try {
    const { model } = req.params;
    const modelConfig = MODELS[model];
    const fieldConfig = FIELD_CONFIGS[model];
    
    if (!modelConfig || !fieldConfig) {
      return fail(res, `不支持的模块: ${model}`, 400);
    }

    // 构建表头
    const headers = fieldConfig.map(f => f.required ? `★${f.label}` : f.label);
    const rows = [headers];

    // 创建工作表
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = headers.map(() => ({ wch: 15 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, modelConfig.name);

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(modelConfig.name + '导入模板')}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// 导出数据
router.get('/export/:model', auth, async (req, res) => {
  try {
    const { model } = req.params;
    const modelConfig = MODELS[model];
    const fieldConfig = FIELD_CONFIGS[model];
    
    if (!modelConfig || !fieldConfig) {
      return fail(res, `不支持的模块: ${model}`, 400);
    }

    const Model = modelConfig.model;
    
    // 查询数据
    const data = await Model.findAll({ order: [['id', 'DESC']] });
    
    if (data.length === 0) {
      return fail(res, '没有可导出的数据', 400);
    }

    // 构建表头和数据行
    const headers = fieldConfig.map(f => f.label);
    const rows = [headers];
    
    data.forEach(item => {
      const row = fieldConfig.map(f => {
        const value = item[f.field];
        if (value === null || value === undefined) return '';
        if (value instanceof Date) return value.toISOString().split('T')[0];
        return value;
      });
      rows.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = headers.map(() => ({ wch: 15 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, modelConfig.name);

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(modelConfig.name + '数据导出')}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// 导入数据
router.post('/import/:model', auth, async (req, res) => {
  try {
    const { model } = req.params;
    const modelConfig = MODELS[model];
    const fieldConfig = FIELD_CONFIGS[model];
    
    if (!modelConfig || !fieldConfig) {
      return fail(res, `不支持的模块: ${model}`, 400);
    }

    // 清除缓存，确保数据最新
    clearCache();

    // 解析文件
    const Busboy = require('busboy');
    const buffer = await new Promise((resolve, reject) => {
      const bb = Busboy({ headers: req.headers });
      const chunks = [];
      bb.on('file', (name, stream) => {
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
      bb.on('error', reject);
      req.pipe(bb);
    });

    if (!buffer || buffer.length === 0) {
      return fail(res, '请选择要导入的文件', 400);
    }

    // 解析Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (rows.length < 2) {
      return fail(res, '文件内容为空', 400);
    }

    // 解析表头
    const headers = rows[0];
    const colIndex = {};
    fieldConfig.forEach(f => {
      const idx = headers.findIndex(h => h === f.label || h === `★${f.label}` || h === f.field);
      if (idx !== -1) colIndex[f.field] = idx;
    });

    // 检查必填字段
    const missing = fieldConfig.filter(f => f.required && colIndex[f.field] === undefined);
    if (missing.length > 0) {
      return fail(res, `缺少必填字段: ${missing.map(f => f.label).join(', ')}`, 400);
    }

    // 处理数据行
    const Model = modelConfig.model;
    const errors = [];
    let created = 0, updated = 0;
    let toCreate = [], toUpdate = [], orderMap = {};

    // 获取关键字段（用于错误提示中显示数据内容）
    const keyFields = fieldConfig.filter(f => f.required || f.field === 'name' || f.field === 'phone' || f.field === 'contract_no' || f.field === 'order_no' || f.field === 'employee_name' || f.field === 'month').slice(0, 3);

    // 预加载已有数据（O(1) 去重，不再逐行 DB 查询）
    const existingOrders = await Order.findAll({ attributes: ["id", "order_no", "date", "contract_id", "contract_no", "project_id", "project_name", "customer_id", "customer_name", "company_id", "company_name", "dept_id", "dept_name", "salesman_id", "salesman", "total", "settlement_fee", "performance_fee"] });
    existingOrders.forEach(o => { if (o.order_no) orderMap[o.order_no] = o; });
    const contractMap = {};
    const existingContracts = await Contract.findAll({ attributes: ["id", "contract_no", "company_id", "company_name", "dept_id", "dept_name", "customer_id", "customer_name", "project_id", "bank_account_id", "bank_account_name", "bank_name", "bank_account"] });
    existingContracts.forEach(co => { if (co.contract_no) contractMap[co.contract_no] = co; });
    const batchMap = {};
    if (['payment_requests', 'receipts'].includes(model)) {
      const existingBatches = await PaymentRequestBatch.findAll();
      existingBatches.forEach(b => { if (b.batch_no) batchMap[b.batch_no] = b; });
    }
    const paymentRequestMap = {};
    if (model === 'receipts') {
      const existingRequests = await PaymentRequest.findAll();
      existingRequests.forEach(p => { if (p.request_no) paymentRequestMap[p.request_no] = p; });
    }

    // 预加载项目数据（用于财务导入时自动填充项目名称）
    const projectMap = {};
    if (model === 'finances') {
      const existingProjects = await Project.findAll({ attributes: ["id", "name"] });
      existingProjects.forEach(p => { projectMap[p.id] = p; });
    }

    // 预加载银行账户数据（用于财务导入时自动填充收款行）
    const bankAccountDetailMap = {};
    if (model === 'finances') {
      const existingBankAccounts = await BankAccount.findAll();
      existingBankAccounts.forEach(ba => { bankAccountDetailMap[ba.id] = ba; });
    }

    // 预加载已有财务记录（按 contract_no 索引，用于同步检测）
    const financeMap = {};
    if (model === 'finances') {
      const existingFinances = await Finance.findAll();
      existingFinances.forEach(f => {
        // 按 finance_no 索引
        if (f.finance_no) financeMap[f.finance_no] = f;
        // 按 contract_no 索引（同合同号可能有多条，用数组）
        const cKey = f.contract_no || '__no_contract__';
        if (!financeMap[cKey]) financeMap[cKey] = [];
        financeMap[cKey].push(f);
      });
    }

    // 预加载已有绩效记录（按复合键索引，用于去重）
    const perfMap = {};
    if (model === 'performances') {
      const existingPerfs = await Performance.findAll();
      existingPerfs.forEach(p => {
        const key = `${p.month || ''}_${p.employee_id || 0}_${p.contract_no || ''}`;
        perfMap[key] = p;
      });
    }

    // 预加载已有工资记录（按复合键索引，用于去重）
    const salaryMap = {};
    if (model === 'salaries') {
      const existingSalaries = await Salary.findAll();
      existingSalaries.forEach(s => {
        const key = `${s.employee_id || 0}_${s.date || ''}`;
        salaryMap[key] = s;
      });
    }

    // 预加载已有银行账户记录（按复合键索引，用于去重）
    const bankAcctMap = {};
    if (model === 'bank_accounts') {
      const existingBankAccts = await BankAccount.findAll();
      existingBankAccts.forEach(b => {
        const key = `${b.company_id || 0}_${b.account_name || ''}_${b.bank_account || ''}`;
        bankAcctMap[key] = b;
      });
    }

    // 阶段一：解析所有行，收集待写入记录
    const receiptImportLinks = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row.some(cell => cell)) continue; // 跳过空行

      // 提取关键字段值用于错误提示
      const rowInfo = keyFields.map(f => {
        const idx = colIndex[f.field];
        return idx !== undefined ? row[idx] : null;
      }).filter(v => v).join('、') || `第${i + 1}行`;

      try {
        const record = {};
        const errorDetails = []; // 收集该行的所有错误

        // 处理每个字段
        for (const f of fieldConfig) {
          const idx = colIndex[f.field];
          if (idx === undefined) {
            if (f.default !== undefined) record[f.field] = f.default;
            continue;
          }

          let value = convertValue(row[idx], f);

          // 检查必填字段
          if (f.required && (value === null || value === undefined || value === '')) {
            errorDetails.push({ field: f.label, value: row[idx], reason: '必填字段不能为空' });
            continue;
          }

          // 处理外键查找
          if (f.lookup && value) {
            const id = await lookupId(f.lookup, f.lookupBy, value);
            if (id) {
              record[f.setField] = id;
              record[f.field] = value;  // 同时保存原字段值（如 customer_name）
            } else {
              const lookupModelName = MODELS[f.lookup]?.name || f.lookup;
              if (f.required) {
                errorDetails.push({ field: f.label, value, reason: `${lookupModelName}不存在` });
              } else {
                // 非必填的外键，设为null，但仍保存原字段值
                record[f.setField] = null;
                record[f.field] = value;
              }
            }
          } else if (!f.setField) {
            record[f.field] = value;
          }
        }

        // 如果有字段级错误，抛出带详细信息
        if (errorDetails.length > 0) {
          const detail = errorDetails.map(e => `"${e.field}"填"${e.value || '(空)'}"，${e.reason}`).join('；');
          throw new Error(detail);
        }

        // 特殊处理：员工默认密码
        if (model === 'employees' && record.phone && !record.password) {
          record.password = String(record.phone).slice(-6);
        }

        // 特殊处理：订单总价自动计算
        if (model === 'orders') {
          const quantity = parseFloat(record.quantity) || 0;
          const unitPrice = parseFloat(record.unit_price) || 0;
          record.total = String(quantity * unitPrice);
        }

        // 特殊处理：绩效导入时自动填充关联数据
        // 从合同/订单关联自动填充部门、公司、员工信息
        if (model === 'performances') {
          // 如果有合同编号，从合同自动填充部门、公司信息
          if (record.contract_no && contractMap[record.contract_no]) {
            const contract = contractMap[record.contract_no];
            if (!record.contract_id) record.contract_id = contract.id;
            if (!record.dept_id && contract.dept_id) record.dept_id = contract.dept_id;
            if (!record.dept_name && contract.dept_name) record.dept_name = contract.dept_name;
            if (!record.company_id && contract.company_id) record.company_id = contract.company_id;
            if (!record.company_name && contract.company_name) record.company_name = contract.company_name;
          }
          // 如果有员工ID，从员工自动填充部门、公司、岗位信息
          if (record.employee_id) {
            const empCache = await getCache('employees');
            const emp = empCache?.find(e => e.id === record.employee_id);
            if (emp) {
              if (!record.dept_id && emp.dept_id) record.dept_id = emp.dept_id;
              if (!record.dept_name && emp.dept_name) record.dept_name = emp.dept_name;
              if (!record.company_id && emp.company_id) record.company_id = emp.company_id;
              if (!record.company_name && emp.company_name) record.company_name = emp.company_name;
              if (!record.name) record.name = emp.name;
              if (!record.position) record.position = emp.position;
              if (!record.emp_no) record.emp_no = emp.phone; // 用手机号作为工号
            }
          }
        }

        // 特殊处理：财务导入时根据合同编号自动填充关联字段
        if (model === 'finances' && record.contract_no && contractMap[record.contract_no]) {
          const contract = contractMap[record.contract_no];
          if (!record.contract_id) record.contract_id = contract.id;

          // 项目名称：从合同关联项目获取
          if (!record.project_name && contract.project_id && projectMap[contract.project_id]) {
            record.project_name = projectMap[contract.project_id].name;
          }

          // 客户名称：从合同获取
          if (!record.customer_name && contract.customer_name) {
            record.customer_name = contract.customer_name;
          }

          // 公司名称：从合同获取
          if (!record.company_name && contract.company_name) {
            record.company_name = contract.company_name;
          }
          if (!record.company_id && contract.company_id) {
            record.company_id = contract.company_id;
          }

          // 银行账户：从合同获取
          if (!record.bank_account_name && contract.bank_account_name) {
            record.bank_account_name = contract.bank_account_name;
          }
          if (!record.bank_account_id && contract.bank_account_id) {
            record.bank_account_id = contract.bank_account_id;
          }
        }

        // 特殊处理：工资导入时自动填充员工姓名
        if (model === 'salaries' && record.employee_id && !record.employee_name) {
          const empCache = await getCache('employees');
          const emp = empCache?.find(e => e.id === record.employee_id);
          if (emp) record.employee_name = emp.name;
        }

        if (model === 'payment_request_batches' && record.contract_no && contractMap[record.contract_no]) {
          const contract = contractMap[record.contract_no];
          record.contract_id = record.contract_id || contract.id;
          record.company_id = record.company_id || contract.company_id || null;
          record.company_name = record.company_name || contract.company_name || '';
          record.dept_id = record.dept_id || contract.dept_id || null;
          record.dept_name = record.dept_name || contract.dept_name || '';
          record.customer_id = record.customer_id || contract.customer_id || null;
          record.customer_name = record.customer_name || contract.customer_name || '';
        }

        if (model === 'payment_requests') {
          const order = record.order_no ? orderMap[record.order_no] : null;
          const batch = record.batch_no ? batchMap[record.batch_no] : null;
          if (batch) {
            record.batch_id = record.batch_id || batch.id;
            record.date = record.date || batch.date;
          }
          if (order) {
            record.order_id = record.order_id || order.id;
            record.contract_id = record.contract_id || order.contract_id || null;
            record.contract_no = record.contract_no || order.contract_no || '';
            record.project_id = record.project_id || order.project_id || null;
            record.project_name = record.project_name || order.project_name || '';
            record.customer_id = record.customer_id || order.customer_id || null;
            record.customer_name = record.customer_name || order.customer_name || '';
            record.company_id = record.company_id || order.company_id || null;
            record.company_name = record.company_name || order.company_name || '';
            record.dept_id = record.dept_id || order.dept_id || null;
            record.dept_name = record.dept_name || order.dept_name || '';
            record.salesman_id = record.salesman_id || order.salesman_id || null;
            record.salesman_name = record.salesman_name || order.salesman || '';
            record.snapshot_total = record.snapshot_total || Number(order.total || 0);
            record.snapshot_settlement_fee = record.snapshot_settlement_fee || Number(order.settlement_fee || 0);
            record.snapshot_performance_fee = record.snapshot_performance_fee || Number(order.performance_fee || 0);
          }
          record.status = record.status || '已请款';
        }

        let receiptLink = null;
        if (model === 'receipts') {
          const paymentRequestNo = record.payment_request_no || '';
          const allocatedAmount = Number(record.allocated_amount || record.actual_amount || 0);
          delete record.payment_request_no;
          delete record.allocated_amount;

          const request = paymentRequestNo ? paymentRequestMap[paymentRequestNo] : null;
          const batch = record.batch_no ? batchMap[record.batch_no] : null;
          if (batch) record.batch_id = record.batch_id || batch.id;
          if (request) {
            record.batch_id = record.batch_id || request.batch_id || null;
            record.batch_no = record.batch_no || request.batch_no || '';
            record.contract_id = record.contract_id || request.contract_id || null;
            record.contract_no = record.contract_no || request.contract_no || '';
            record.project_id = record.project_id || request.project_id || null;
            record.project_name = record.project_name || request.project_name || '';
            record.customer_id = record.customer_id || request.customer_id || null;
            record.customer_name = record.customer_name || request.customer_name || '';
            record.company_id = record.company_id || request.company_id || null;
            record.company_name = record.company_name || request.company_name || '';
            record.dept_id = record.dept_id || request.dept_id || null;
            record.dept_name = record.dept_name || request.dept_name || '';
            record.salesman_id = record.salesman_id || request.salesman_id || null;
            record.salesman_name = record.salesman_name || request.salesman_name || '';
            record.planned_amount = record.planned_amount || request.request_amount || 0;
            receiptLink = {
              receipt_no: record.receipt_no,
              payment_request_no: paymentRequestNo,
              payment_request_id: request.id,
              allocated_amount: allocatedAmount
            };
          } else if (paymentRequestNo) {
            throw new Error(`请款单号"${paymentRequestNo}"不存在`);
          }
          record.discount_amount = Number((Number(record.planned_amount || 0) - Number(record.actual_amount || 0)).toFixed(2));
        }

        // 检查唯一键（支持 uniqueKey、compositeUnique、name 三级回退）
        let existing = null;
        
        // 订单特殊处理：从合同编号获取合同ID
        if (modelConfig.name === '订单' && record.contract_no && contractMap[record.contract_no]) {
          record.contract_id = contractMap[record.contract_no].id;
        }
        
        // 订单用 orderMap O(1) 查找（无 DB 查询）
        if (modelConfig.name === '订单' && record.order_no) {
          existing = orderMap[record.order_no] || null;
        } else if (modelConfig.uniqueKey && record[modelConfig.uniqueKey]) {
          // 单字段唯一键查找
          // 财务模块优先用 finance_no 在预加载缓存中查找
          if (model === 'finances' && financeMap[record.finance_no]) {
            existing = financeMap[record.finance_no];
          } else {
            existing = await Model.findOne({ where: { [modelConfig.uniqueKey]: record[modelConfig.uniqueKey] } });
          }
        } else if (modelConfig.compositeUnique && modelConfig.compositeUnique.length > 0) {
          // 复合唯一键查找（使用预加载缓存或数据库查询）
          const compositeValues = modelConfig.compositeUnique.map(k => record[k]);
          // 所有复合键字段都必须有值
          if (compositeValues.every(v => v !== null && v !== undefined && v !== '')) {
            const compositeWhere = {};
            modelConfig.compositeUnique.forEach((k, idx) => {
              compositeWhere[k] = compositeValues[idx];
            });
            // 绩效用预加载缓存
            if (model === 'performances') {
              const key = `${record.month || ''}_${record.employee_id || 0}_${record.contract_no || ''}`;
              existing = perfMap[key] || null;
            } else if (model === 'salaries') {
              const key = `${record.employee_id || 0}_${record.date || ''}`;
              existing = salaryMap[key] || null;
            } else if (model === 'bank_accounts') {
              const key = `${record.company_id || 0}_${record.account_name || ''}_${record.bank_account || ''}`;
              existing = bankAcctMap[key] || null;
            } else {
              existing = await Model.findOne({ where: compositeWhere });
            }
          }
        } else if (record.name) {
          existing = await Model.findOne({ where: { name: record.name } });
        }

        if (existing) {
          toUpdate.push({ instance: existing, record });
        } else {
          toCreate.push({ record });
        }
        if (receiptLink) receiptImportLinks.push(receiptLink);
      } catch (err) {
        // 格式化错误信息：数据内容 + 具体原因
        let errorMsg = err.message;
        
        // 处理常见的数据库错误
        if (errorMsg.includes('Cannot add or update a child row')) {
          errorMsg = '关联数据不存在，请检查部门、公司等关联字段';
        } else if (errorMsg.includes('Data truncated')) {
          errorMsg = '数据格式不正确，请检查数字、日期等字段';
        } else if (errorMsg.includes('cannot be null')) {
          errorMsg = '必填字段不能为空';
        } else if (errorMsg.includes('Duplicate entry')) {
          const match = errorMsg.match(/Duplicate entry '([^']+)'/);
          if (match) {
            errorMsg = `数据"${match[1]}"已存在`;
          }
        }
        
        // 保存完整行数据（用于生成失败数据Excel）
        const failedRowData = {};
        fieldConfig.forEach(f => {
          const idx = colIndex[f.field];
          if (idx !== undefined) {
            failedRowData[f.label] = row[idx];
          }
        });
        
        errors.push({ 
          row: i + 1, 
          data: rowInfo, 
          error: errorMsg,
          rowData: failedRowData // 完整行数据
        });
      }
    }

    // 构建错误信息数组（更详细的格式）
    // 阶段二：分批写入 DB（避免大数据量超时和字符集问题）
    const BATCH_SIZE = 500;
    let createdCount = 0, updatedCount = 0;
    const isOrder = modelConfig.name === '订单';
    const isFinance = modelConfig.name === '财务';
    const isContract = modelConfig.name === '合同';
    const isPerformance = modelConfig.name === '绩效';
    const isPaymentRequestBatch = model === 'payment_request_batches';
    const isPaymentRequest = model === 'payment_requests';
    const isReceipt = model === 'receipts';

    // 收集需要同步更新的关联合同ID（去重）
    const contractIdsToSync = new Set();

    // 分批创建
    if (toCreate.length > 0) {
      const allRecords = toCreate.map(item => item.record);
      for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
        const batch = allRecords.slice(i, i + BATCH_SIZE);
        const t = await sequelize.transaction();
        try {
          // 每批创建前确保连接字符集正确
          await sequelize.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci", { transaction: t });
          const bulkOptions = isOrder ? {
            transaction: t,
            updateOnDuplicate: ["order_no","date","contract_id","contract_no","project_id","project_name","customer_name","business_category","business_parameter","business_unit","business_project","quantity","unit_price","total","report_date","report_no","report_signed","settlement_fee","performance_fee","manager","salesman","dept_id","dept_name","company_id","company_name","status","remark","perf_generated","finance_generated","finance_booked"]
          } : { transaction: t };
          const created = await Model.bulkCreate(batch, bulkOptions);

          // 订单自动生成编号，并创建业务明细
          if (isOrder) {
            const orderItems = []; // 收集要创建的 OrderItem
            for (const item of created) {
              if (!item.order_no) {
                item.order_no = generateNo('DD', item.id);
                await item.save({ transaction: t });
              }
              // 为每个订单创建业务明细记录
              if (item.business_category || item.business_project) {
                orderItems.push({
                  order_id: item.id,
                  business_category: item.business_category,
                  business_project: item.business_project,
                  parameter: item.business_parameter,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  total: item.total,
                  settlement_fee: item.settlement_fee,
                  performance_fee: item.performance_fee
                });
              }
            }
            // 批量创建 OrderItem
            if (orderItems.length > 0) {
              await OrderItem.bulkCreate(orderItems, { transaction: t });
            }
          }

          // 财务自动生成编号
          if (isFinance) {
            for (const item of created) {
              if (!item.finance_no) {
                item.finance_no = generateNo('CW', item.id);
                await item.save({ transaction: t });
              }
              // 收集关联合同ID用于后续同步
              if (item.contract_id) contractIdsToSync.add(item.contract_id);
            }
          }

          if (isPaymentRequestBatch) {
            for (const item of created) {
              if (!item.batch_no) {
                item.batch_no = generateNo('QKP', item.id);
                await item.save({ transaction: t });
              }
            }
          }

          if (isPaymentRequest) {
            for (const item of created) {
              if (!item.request_no) {
                item.request_no = generateNo('QK', item.id);
                await item.save({ transaction: t });
              }
            }
          }

          await t.commit();
          createdCount += created.length;
        } catch (err) {
          await t.rollback();
          logToFile(`[IMPORT] Phase2 CREATE batch FAIL (offset=${i}): ${err.message}`);
          throw err;
        }
      }
    }

    // 分批更新
    if (toUpdate.length > 0) {
      for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const batch = toUpdate.slice(i, i + BATCH_SIZE);
        const t = await sequelize.transaction();
        try {
          // 每批更新前确保连接字符集正确，防止连接池复用导致 latin1_swedish_ci 回退
          await sequelize.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci", { transaction: t });
          
          for (const { instance, record } of batch) {
            await instance.update(record, { transaction: t });
            
            // 订单同步更新业务明细
            if (isOrder && instance.id) {
              // 删除旧业务明细
              await OrderItem.destroy({ where: { order_id: instance.id }, transaction: t });
              // 创建新业务明细
              if (record.business_category || record.business_project) {
                await OrderItem.create({
                  order_id: instance.id,
                  business_category: record.business_category,
                  business_project: record.business_project,
                  parameter: record.business_parameter,
                  quantity: record.quantity,
                  unit_price: record.unit_price,
                  total: record.total,
                  settlement_fee: record.settlement_fee,
                  performance_fee: record.performance_fee
                }, { transaction: t });
              }
            }

            // 财务更新时收集关联合同ID
            if (isFinance && instance.contract_id) {
              contractIdsToSync.add(instance.contract_id);
            }
          }
          await t.commit();
          updatedCount += batch.length;
        } catch (err) {
          await t.rollback();
          logToFile(`[IMPORT] Phase2 UPDATE batch FAIL (offset=${i}): ${err.message}`);
          throw err;
        }
      }
    }

    // ==================== 阶段三：关联数据自动同步更新 ====================
    // 当导入财务/订单/合同时，自动检测并同步更新相关联的记录数据

    if (isFinance && contractIdsToSync.size > 0) {
      // 财务导入后 → 同步更新关联合同的已收款金额
      const { syncContractAmount, syncProjectAmount } = require('../utils/syncAmount');
      for (const contractId of contractIdsToSync) {
        try {
          await syncContractAmount(contractId, { Contract, Finance });
          // 进一步同步项目金额
          const contract = await Contract.findByPk(contractId);
          if (contract && contract.project_id) {
            await syncProjectAmount(contract.project_id, { Project, Contract });
          }
        } catch (syncErr) {
          logToFile(`[IMPORT] SYNC contract ${contractId} FAIL: ${syncErr.message}`);
        }
      }
      logToFile(`[IMPORT] SYNC: updated ${contractIdsToSync.size} contracts from finance import`);

      // 财务导入后 → 联动更新关联订单的 finance_booked 标识
      try {
        const bookedFinances = toCreate.filter(item => item.record?.booked === 1).concat(
          toUpdate.filter(item => item.instance?.booked === 1)
        );

        // 从 description 解析订单号，更新订单标识
        const updateOrderFlags = async (financeItems, flagField) => {
          const allOrderNos = new Set();
          for (const item of financeItems) {
            const desc = item.record?.description || item.instance?.description || '';
            let orderNos = [];
            if (desc.startsWith('批量订单:')) {
              orderNos = desc.replace('批量订单:', '').split(',').map(s => s.trim()).filter(Boolean);
            } else if (desc.startsWith('订单:')) {
              orderNos = [desc.replace('订单:', '').trim()];
            }
            orderNos.forEach(no => allOrderNos.add(no));
          }
          if (allOrderNos.size > 0) {
            await Order.update({ [flagField]: 1 }, { where: { order_no: { [require('sequelize').Op.in]: [...allOrderNos] } } });
            logToFile(`[IMPORT] SYNC: updated ${allOrderNos.size} orders ${flagField}=1`);
          }
        };

        if (bookedFinances.length > 0) {
          await updateOrderFlags(bookedFinances, 'finance_booked');
        }
      } catch (syncErr) {
        logToFile(`[IMPORT] SYNC order flags FAIL: ${syncErr.message}`);
      }
    }

    if (isContract) {
      // 合同导入后 → 同步更新关联订单的合同相关信息
      // 并同步更新项目金额
      const { syncContractAmount, syncProjectAmount } = require('../utils/syncAmount');

      // 收集所有已导入的合同编号
      const importedContractNos = new Set();
      toCreate.forEach(item => { if (item.record.contract_no) importedContractNos.add(item.record.contract_no); });
      toUpdate.forEach(item => { if (item.instance.contract_no) importedContractNos.add(item.instance.contract_no); });

      const projectIdsToSync = new Set();
      for (const contractNo of importedContractNos) {
        // 从数据库获取最新的合同数据
        const contract = await Contract.findOne({ where: { contract_no: contractNo } });
        if (!contract) continue;
        const contractData = contract.dataValues || contract;

        // 合同的客户、部门、公司信息变更时，同步到关联订单
        if (contractData.id) {
          try {
            await Order.update(
              {
                customer_name: contractData.customer_name,
                company_id: contractData.company_id,
                company_name: contractData.company_name,
                dept_id: contractData.dept_id,
                dept_name: contractData.dept_name
              },
              { where: { contract_id: contractData.id } }
            );
          } catch (syncErr) {
            logToFile(`[IMPORT] SYNC orders from contract ${contractData.id} FAIL: ${syncErr.message}`);
          }

          // 同步合同金额
          try {
            await syncContractAmount(contractData.id, { Contract, Finance });
          } catch (syncErr) {
            logToFile(`[IMPORT] SYNC contract amount ${contractData.id} FAIL: ${syncErr.message}`);
          }

          if (contractData.project_id) {
            projectIdsToSync.add(contractData.project_id);
          }
        }
      }

      // 同步项目金额
      for (const projectId of projectIdsToSync) {
        try {
          await syncProjectAmount(projectId, { Project, Contract });
        } catch (syncErr) {
          logToFile(`[IMPORT] SYNC project ${projectId} FAIL: ${syncErr.message}`);
        }
      }
    }

    if (isPerformance) {
      // 绩效导入后 → 同步更新关联订单的绩效已生成标识
      const orderIdsToSync = new Set();
      for (const item of toCreate.concat(toUpdate)) {
        if (item.record?.order_id) orderIdsToSync.add(item.record.order_id);
        if (item.instance?.order_id) orderIdsToSync.add(item.instance.order_id);
      }
      if (orderIdsToSync.size > 0) {
        try {
          await Order.update(
            { perf_generated: 1 },
            { where: { id: { [require('sequelize').Op.in]: Array.from(orderIdsToSync) } } }
          );
        } catch (syncErr) {
          logToFile(`[IMPORT] SYNC perf_generated FAIL: ${syncErr.message}`);
        }
      }
    }

    if (isPaymentRequest) {
      const batchIdsToSync = new Set();
      const orderIdsToSync = new Set();
      for (const item of toCreate.concat(toUpdate)) {
        if (item.record?.batch_id) batchIdsToSync.add(item.record.batch_id);
        if (item.instance?.batch_id) batchIdsToSync.add(item.instance.batch_id);
        if (item.record?.order_id) orderIdsToSync.add(item.record.order_id);
        if (item.instance?.order_id) orderIdsToSync.add(item.instance.order_id);
      }
      for (const batchId of batchIdsToSync) {
        await recalculateImportedBatch(batchId).catch(() => {});
      }
      for (const orderId of orderIdsToSync) {
        await recalculateImportedOrder(orderId).catch(() => {});
      }
    }

    if (isReceipt && receiptImportLinks.length > 0) {
      const requestIdsToSync = new Set();
      for (const link of receiptImportLinks) {
        const receipt = await Receipt.findOne({ where: { receipt_no: link.receipt_no } });
        if (!receipt || !link.payment_request_id) continue;
        await ReceiptItem.destroy({
          where: {
            receipt_id: receipt.id,
            payment_request_id: link.payment_request_id
          }
        });
        await ReceiptItem.create({
          receipt_id: receipt.id,
          payment_request_id: link.payment_request_id,
          allocated_amount: link.allocated_amount,
          remark: `历史导入收款 ${receipt.receipt_no}`
        });
        requestIdsToSync.add(link.payment_request_id);
      }

      const batchIdsToSync = new Set();
      const orderIdsToSync = new Set();
      for (const requestId of requestIdsToSync) {
        const request = await PaymentRequest.findByPk(requestId);
        if (!request) continue;
        await recalculateImportedPaymentRequest(requestId).catch(() => {});
        if (request.batch_id) batchIdsToSync.add(request.batch_id);
        if (request.order_id) orderIdsToSync.add(request.order_id);
      }
      for (const batchId of batchIdsToSync) {
        await recalculateImportedBatch(batchId).catch(() => {});
      }
      for (const orderId of orderIdsToSync) {
        await recalculateImportedOrder(orderId).catch(() => {});
      }
    }

    logToFile(`[IMPORT] Phase2 OK: created=${createdCount}, updated=${updatedCount}`);
    created = createdCount;
    updated = updatedCount;


    const errorMessages = errors.slice(0, 20).map(e => {
      return e.data === `第${e.row}行` 
        ? `第${e.row}行: ${e.error}` 
        : `第${e.row}行【${e.data}】: ${e.error}`;
    });

    // 保存失败行数据到会话中（用于下载）
    const failedDataKey = `import_failed_${model}_${Date.now()}`;
    if (errors.length > 0) {
      // 保存到全局缓存（5分钟内有效）
      global.importFailedCache = global.importFailedCache || {};
      global.importFailedCache[failedDataKey] = errors.map(e => ({
        ...e.rowData,
        '★错误原因': e.error
      }));
      // 5分钟后自动清理
      setTimeout(() => {
        if (global.importFailedCache) delete global.importFailedCache[failedDataKey];
      }, 5 * 60 * 1000);
    }
    
    const result = { 
      created, 
      updated, 
      failed: errors.length, 
      errors: errorMessages,
      total: rows.length - 1, // 总行数（不含表头）
      failedDataKey // 返回失败数据的key
    };
    
    if (errors.length > 20) {
      result.errors.push(`...还有 ${errors.length - 20} 条错误`);
    }

    if (created === 0 && updated === 0 && errors.length > 0) {
      return fail(res, `导入失败: ${errorMessages[0]}`, 400);
    }

    success(res, result, `成功导入 ${created} 条，更新 ${updated} 条`);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// 下载失败数据
router.get('/failed-data/:key', auth, async (req, res) => {
  try {
    const { key } = req.params;
    const failedData = global.importFailedCache?.[key];
    
    if (!failedData || failedData.length === 0) {
      return fail(res, '没有失败数据或已过期', 404);
    }

    // 构建Excel
    const headers = Object.keys(failedData[0]);
    const rows = [headers];
    failedData.forEach(row => {
      rows.push(headers.map(h => row[h]));
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = headers.map(() => ({ wch: 20 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '失败数据');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent('导入失败数据')}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    fail(res, err.message, 500);
  }
});

module.exports = router;
