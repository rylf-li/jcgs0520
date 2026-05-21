# 任务：项目管理导入功能修复（多合同编号问题）

## 日期：2026-04-16

## 问题现象
用户反映项目管理导入时出现 `Unknown column` 错误，导致所有行导入失败。

## 根因分析

### 问题1：字段配置与数据库列名不匹配
`importExport.js` 的 FIELD_CONFIGS 使用了数据库中**不存在的列名**：

| 配置字段 | 问题 |
|---------|------|
| `employees.dept_name` (lookup) | 员工表没有 dept_name 列 |
| `contracts.settlement_amount` | contracts 表没有此列 |
| `orders.settlement_amount` | 应为 `total` |
| `orders.business_category` | 缺失此字段映射 |
| `orders.contract_no` (lookup) | 用 lookup 会设置 contract_id 而不是 contract_no |
| `departments.company_name` (lookup) | 应直接设 company_id |

### 问题2：lookup 机制导致字段名丢失
原代码中，当字段配置 `lookup` 和 `setField` 时，只会设置外键 ID（如 `customer_id`），但**不保存原始名称字段**（如 `customer_name`）。

## 解决方案

### 修复1：移除所有 lookup/setField 配置
所有字段直接使用 `field` 属性（与数据库列名一致），不再依赖 lookup 机制查找外键 ID。

### 修复2：移除不存在的列映射
- `settlement_amount` → 改为 `receivable`/`cost` 等实际存在的列
- 补充所有实际存在但之前缺失的字段映射

### 修复3：移除有问题的 dept_name/dept_id lookup
员工表的 dept_name 直接写入，departments 表直接用 company_id。

## 修改内容

文件：`backend/src/routes/importExport.js`

### employees 配置（修复后）
```javascript
employees: [
  { field: 'name', label: '员工姓名', required: true },
  { field: 'phone', label: '手机号码', required: true, type: 'string' },
  { field: 'dept_name', label: '部门名称' },  // 直接写入，不再 lookup
  { field: 'role', ... },
  { field: 'status', ... }
]
```

### orders 配置（修复后）
```javascript
orders: [
  { field: 'order_no', label: '订单编号', required: true },
  { field: 'contract_id', label: '合同ID', type: 'number' },  // 直接用ID
  { field: 'contract_no', label: '合同编号' },  // 直接写入名称
  { field: 'total', label: '金额', type: 'number' },  // 原为 settlement_amount
  { field: 'business_category', label: '业务类别' },  // 新增
  // ...
]
```

### contracts 配置（修复后）
- 移除 `settlement_amount`（表里没这列）
- 添加所有实际存在的列：receivable, requested, received, labor_cost, cost, tax, other, business_fee, performance, profit, service_content, attachment, bank_account, bank_name, settlement_method

## 数据库实际列名参考

### projects 表
`id, project_no, date, name, customer_id, customer_name, content, amount, receivable, requested, received, labor_cost, cost, tax, other, business_fee, performance, profit, manager, salesman, status, remark`

### contracts 表
`id, contract_no, date, name, project_id, customer_id, customer_name, service_content, amount, receivable, requested, received, labor_cost, cost, tax, other, business_fee, performance, profit, manager, salesman, attachment, dept_id, dept_name, company_id, company_name, status, bank_account, bank_name, settlement_method, bank_account_id, bank_account_name`

### orders 表
`id, order_no, date, contract_id, contract_no, project_name, customer_name, business_id, business_category, business_parameter, business_unit, quantity, unit_price, total, report_date, report_no, report_signed, report_attachment, settlement_fee, performance_fee, manager, salesman, dept_id, dept_name, company_id, company_name, status, createdAt, updatedAt, remark, perf_generated, finance_generated, finance_booked, finance_received`

### departments 表
`id, name, description, createdAt, updatedAt, company_id, company_name`

## 状态

- [x] FIELD_CONFIGS 已完全重写，所有字段名与数据库列名匹配
- [x] 移除了有问题的 lookup/setField 机制
- [x] 补充了缺失的字段映射
- [x] 后端服务已重启

## 待办

- [ ] 前端各列表页添加导入/导出按钮（尚未实现）
- [ ] 实际测试项目管理导入功能
