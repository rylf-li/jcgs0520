# 数据库调整方案与开发清单

## 1. 目标

基于已确认业务规则，进入可实施阶段。

本文件定义：

- 数据库调整方案
- 模块开发顺序
- 每阶段代码改造范围

## 2. 已确认的核心规则

### 2.1 绩效规则

- 绩效只分给业务员
- 绩效在“实际收款”后生成
- 支持部分收款按比例生成绩效
- 订单无业务员时，不允许生成绩效

### 2.2 账户规则

- 一家公司可有多个银行账户
- 合同必须绑定收款银行账户
- 财务记录应关联实际使用的银行账户
- 历史单据要保留银行账户快照

### 2.3 主业务链路

- 项目
- 合同
- 订单
- 请款单
- 财务收款
- 订单已收款
- 绩效生成
- 合同、项目回写

### 2.4 订单变更规则

- 未请款：直接重算
- 已请款未收款：重算并同步未锁定请款
- 已收款：进入差异处理，不允许无痕覆盖

## 3. 数据库调整方案

## 3.1 员工表 `employees`

当前问题：

- 缺月薪工资
- 缺社保费
- 缺业务员角色

建议新增字段：

- `monthly_salary decimal(15,2) default 0`
- `social_security_fee decimal(15,2) default 0`

建议调整字段：

- `role enum('admin','manager','sales','staff')`

建议保留字段：

- `name`
- `phone`
- `password`
- `dept_id`
- `dept_name`
- `company_id`
- `company_name`

## 3.2 项目表 `projects`

当前问题：

- 只有 `salesman` 文本字段，没有业务员ID

建议新增字段：

- `salesman_id int null`

说明：

- `salesman` 继续保留为快照名称
- 权限过滤和绩效链路逐步迁移到 `salesman_id`

## 3.3 合同表 `contracts`

当前问题：

- 只有 `salesman` 文本字段
- 银行账户快照已基本具备，可继续保留

建议新增字段：

- `salesman_id int null`

保留现有字段：

- `bank_account_id`
- `bank_account_name`
- `bank_account`
- `bank_name`

## 3.4 订单表 `orders`

当前问题：

- 只有 `salesman` 文本字段
- 缺订单金额差异处理辅助字段
- 当前 `finance_generated / finance_booked / perf_generated` 语义过粗

建议新增字段：

- `salesman_id int null`
- `requested_amount decimal(15,2) default 0`
- `received_amount decimal(15,2) default 0`
- `performance_amount decimal(15,2) default 0`
- `calc_version int default 1`
- `is_dirty tinyint default 0`
- `last_recalc_at datetime null`

建议新增或优化状态字段：

- 保留 `status`
- 可新增 `payment_status varchar(20)`，建议值：
  - `未请款`
  - `部分请款`
  - `已请款`
  - `部分收款`
  - `已收款`

说明：

- 不建议继续只靠 `finance_generated` 和 `finance_booked` 表达完整链路

## 3.5 财务表 `finances`

当前问题：

- 当前可记录收支，但与请款、订单的来源关联不够清晰

建议新增字段：

- `order_id int null`
- `order_no varchar(50) null`
- `project_id int null`
- `customer_id int null`
- `source_type varchar(50) null`
- `source_id int null`
- `company_bank_account varchar(100) null`

字段说明：

- `source_type` 推荐：
  - `payment_request`
  - `manual`
  - `salary`
  - `expense`
- `source_id` 用于关联请款单或其他来源单据
- `company_bank_account` 用于保存历史账号快照

## 3.6 绩效表 `performance`

当前情况：

- 表存在
- 当前无数据
- 非常适合直接重构为绩效明细表

建议保留并调整为绩效明细用途。

建议标准字段：

- `employee_id`
- `employee_name`
- `date`
- `order_id`
- `order_no`
- `contract_id`
- `contract_no`
- `project_id`
- `project_no`
- `project_name`
- `dept_id`
- `dept_name`
- `company_id`
- `company_name`
- `sales_amount`
- `performance_rate`
- `performance_amount`
- `received_amount`
- `source_type`
- `source_id`
- `status`
- `remark`

建议移除或逐步废弃的旧口径字段：

- `month`
- `emp_no`
- `name`
- `position`
- `amount`

说明：

- 为了降低改库风险，第一阶段可以“保留旧字段，新增新字段”
- 第二阶段再清理历史兼容字段

## 3.7 请款单表 `payment_requests`

当前缺失：

- 该表应新增

建议字段：

- `id`
- `request_no`
- `date`
- `order_id`
- `order_no`
- `contract_id`
- `contract_no`
- `project_id`
- `project_no`
- `project_name`
- `customer_id`
- `customer_name`
- `company_id`
- `company_name`
- `dept_id`
- `dept_name`
- `salesman_id`
- `salesman_name`
- `request_amount`
- `received_amount`
- `snapshot_total`
- `snapshot_settlement_fee`
- `snapshot_performance_fee`
- `status`
- `remark`
- `createdAt`
- `updatedAt`

建议状态：

- `草稿`
- `已提交`
- `已确认`
- `部分收款`
- `已完成`
- `已取消`

## 3.8 统计快照表

当前情况：

- `dept_stats`
- `company_stats`
- `customer_stats`

数据库中已存在并且都是空表，可直接重用，但字段建议校验。

### 部门统计 `dept_stats`

建议字段：

- `dept_id`
- `dept_name`
- `date`
- `project_count`
- `project_amount`
- `receivable`
- `requested`
- `received`
- `expenditure`
- `profit`

### 公司统计 `company_stats`

建议字段：

- `company_id`
- `company_name`
- `dept_id`
- `dept_name`
- `date`
- `project_count`
- `project_amount`
- `receivable`
- `requested`
- `received`
- `expenditure`
- `profit`

### 客户统计 `customer_stats`

建议字段：

- `customer_id`
- `customer_name`
- `date`
- `contract_amount`
- `receivable`
- `requested`
- `received`

## 4. 开发阶段清单

## 4.1 第一阶段：安全与基础字段

目标：

- 修复认证
- 补齐主表字段

开发项：

- 登录改为手机号 + 密码
- 密码改为加密存储
- 角色增加 `sales`
- 员工表新增月薪工资、社保费
- 项目/合同/订单增加 `salesman_id`

## 4.2 第二阶段：请款单与财务来源

目标：

- 建立请款链路

开发项：

- 新建 `payment_requests`
- 新增请款单接口和页面
- 财务收入记录关联请款单
- 合同、项目回写 `requested`

## 4.3 第三阶段：绩效明细重构

目标：

- 让绩效真正落地

开发项：

- 重构 `performance` 为绩效明细
- 收款后按业务员生成绩效
- 支持部分收款按比例生成
- 员工页和报表页展示绩效明细与汇总

## 4.4 第四阶段：订单变更差异处理

目标：

- 避免订单变更导致下游金额错乱

开发项：

- 订单重算服务
- 差异检测服务
- 请款单同步或异常标记
- 收款后变更的人工处理标记

## 4.5 第五阶段：统计快照与报表

目标：

- 形成稳定统计与报表体系

开发项：

- 每日生成部门/公司/客户统计快照
- 工作台日常报表重构
- 日报、季度、年度报表重构
- 公司、部门、员工、项目、合同报表统一口径

## 4.6 第六阶段：权限与工程化

目标：

- 让业务员权限闭环

开发项：

- 后端数据范围过滤
- 前端菜单与按钮按角色控制
- 导入导出模块拆分
- README、环境样例、测试补齐

## 5. 代码改造范围

后端重点文件：

- `backend/src/routes/auth.js`
- `backend/src/middleware/auth.js`
- `backend/src/models/*.js`
- `backend/src/routes/orders.js`
- `backend/src/routes/finance.js`
- `backend/src/routes/contracts.js`
- `backend/src/routes/projects.js`
- `backend/src/routes/performance.js`
- 新增 `backend/src/routes/paymentRequests.js`
- 新增/拆分金额重算服务

前端重点文件：

- `frontend/src/api/index.js`
- `frontend/src/router/index.js`
- `frontend/src/store/auth.js`
- `frontend/src/views/employee/*`
- `frontend/src/views/order/*`
- `frontend/src/views/finance/*`
- `frontend/src/views/performance/*`
- 新增 `frontend/src/views/paymentRequest/*`
- 各统计与报表页面

## 6. 推荐立即执行项

下一轮代码修改，建议先做：

1. 认证安全修复
2. 员工角色扩展为 `sales`
3. 主表新增 `salesman_id`
4. 设计并创建 `payment_requests`

原因：

- 这四项是后续请款、绩效、权限、报表的共同基础
- 先把基础打稳，再继续改链路，返工最少
