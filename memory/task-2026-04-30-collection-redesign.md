# 订单-请款-收款-财务重构设计

## 1. 目标

把当前“订单单条请款、请款直接生成财务”的链路，调整为更符合真实业务的结构：

- 订单明细化
- 请款批次化
- 收款归集化
- 财务归档化

核心要求：

- 一个订单可以独立被请款
- 多个订单可以合并为同一批请款
- 一批请款可以分多次收款
- 收款金额可以小于请款金额
- 财务管理以账户和台账归档为主，不直接承载业务分摊

## 2. 现状问题

当前系统已有：

- `orders`
- `payment_requests`
- `finances`

但现状问题明显：

- `payment_requests` 现在是单订单导向
- 财务记录被设计成过于贴近业务单据
- 订单列表展示请款金额和收款金额，容易和真实收款差异打架
- 不支持“同合同多订单合并请款”
- 不支持“同一批请款分多次收款”

## 3. 新的业务对象

建议拆成 4 层：

1. 订单 `orders`
2. 请款批次 `payment_request_batches`
3. 请款明细 `payment_requests`
4. 收款记录 `receipts`
5. 财务归档 `finances`

## 4. 新链路

### 4.1 订单层

订单只保留业务状态，不承载严格金额对账。

建议订单重点字段：

- `id`
- `order_no`
- `contract_id`
- `contract_no`
- `project_id`
- `project_name`
- `salesman_id`
- `salesman`
- `status`
- `payment_status`
- `requested_amount`
- `received_amount`
- `is_dirty`
- `dirty_reason`

其中：

- `requested_amount`
- `received_amount`

作为回写参考值保留，但前端订单列表建议默认不突出展示金额，只展示状态：

- `未请款`
- `部分请款`
- `已请款`
- `部分收款`
- `已收款`

## 4.2 请款批次表 `payment_request_batches`

新增。

作用：

- 表达“一次对客户发起的请款动作”
- 一个批次下可包含多条订单请款明细
- 对外导出请款清单时，以批次为主

建议字段：

- `id`
- `batch_no` 统一请款编号
- `date` 请款日期
- `contract_id`
- `contract_no`
- `project_id`
- `project_name`
- `customer_id`
- `customer_name`
- `company_id`
- `company_name`
- `dept_id`
- `dept_name`
- `salesman_id`
- `salesman_name`
- `request_total_amount`
- `received_total_amount`
- `discount_amount`
- `status`
- `remark`
- `createdAt`
- `updatedAt`

建议状态：

- `草稿`
- `已确认`
- `部分收款`
- `已完成`
- `已取消`

说明：

- `request_total_amount` 为本批次请款总额
- `received_total_amount` 为该批次累计实收总额
- `discount_amount` 为请款和收款之间的确认差异，可选

## 4.3 请款明细表 `payment_requests`

保留现有表，但角色调整为“批次下的订单请款明细”。

新增建议字段：

- `batch_id`
- `batch_no`
- `request_status`
- `sort_no`

保留核心字段：

- `order_id`
- `order_no`
- `contract_id`
- `contract_no`
- `project_id`
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
- `remark`

建议状态：

- `草稿`
- `已请款`
- `部分收款`
- `已完成`
- `已取消`

说明：

- 一个批次对应多条请款明细
- 每条请款明细仍然绑定单个订单
- 后续导出请款清单时，可以按批次导出包含的明细行

## 4.4 收款记录表 `receipts`

新增。

这是本次重构最关键的新对象。

作用：

- 记录客户实际支付行为
- 支持一条收款记录关联多个请款明细
- 支持折扣收款、部分收款、多次收款

建议字段：

- `id`
- `receipt_no` 收款编号
- `date` 收款日期
- `batch_id`
- `batch_no`
- `contract_id`
- `contract_no`
- `customer_id`
- `customer_name`
- `company_id`
- `company_name`
- `bank_account_id`
- `bank_account_name`
- `account_type` 银行/现金
- `planned_amount` 应收参考金额
- `actual_amount` 实收金额
- `discount_amount`
- `status`
- `remark`
- `createdAt`
- `updatedAt`

建议状态：

- `已登记`
- `已确认`
- `已归档`
- `已取消`

说明：

- `planned_amount` 通常为本次选中请款明细的应收合计
- `actual_amount` 为本次真实到账
- `discount_amount = planned_amount - actual_amount`
- 如果客户只付一半，也允许直接登记

## 4.5 收款明细关联表 `receipt_items`

新增。

作用：

- 记录“某条收款记录”分摊到了哪些请款明细

建议字段：

- `id`
- `receipt_id`
- `payment_request_id`
- `allocated_amount`
- `remark`

说明：

- 一条收款记录可以分配到多条请款明细
- 一条请款明细也可以被多次收款

## 4.6 财务表 `finances`

财务表继续保留，但定位改成“账务归档”。

建议新增字段：

- `receipt_id`
- `receipt_no`
- `batch_id`
- `batch_no`
- `account_type`

保留字段：

- `finance_no`
- `date`
- `category`
- `description`
- `type`
- `amount`
- `company_id`
- `company_name`
- `customer_id`
- `customer_name`
- `booked`
- `invoice_no`
- `attachment`
- `bank_account_id`
- `bank_account_name`
- `company_bank_account`

说明：

- 财务记录由“收款记录”生成，不再由单条请款明细直接生成
- 财务的重点是账户归档、到账管理、支出收入台账，不负责业务分摊

## 5. 建议流程

### 5.1 批量请款

1. 在订单列表勾选多个订单
2. 系统校验：
   - 必须属于同一合同，或至少同一客户与同一公司
   - 订单必须可请款
3. 创建一个请款批次
4. 同时生成多条请款明细
5. 批次获得统一 `batch_no`
6. 订单标记为：
   - `部分请款`
   - 或 `已请款`

### 5.2 批量收款

1. 在请款管理勾选多条请款明细
2. 创建一条收款记录
3. 用户确认：
   - 本次实收金额
   - 账户
   - 备注
4. 系统生成 `receipt_items`
5. 按分配金额回写请款明细
6. 再汇总回写请款批次
7. 再按订单维度更新 `payment_status`

### 5.3 财务归档

1. 从收款记录生成财务记录
2. 财务记录确认银行账户、到账日期、入账状态
3. 入账后订单可标记为：
   - `部分收款`
   - 或 `已收款`
4. 绩效根据实际收款再生成

## 6. 页面调整建议

### 6.1 订单管理

改为状态导向。

建议保留：

- 订单编号
- 合同编号
- 项目名称
- 业务员
- 订单金额
- 订单状态
- 请收款状态
- 请款批次标识
- 收款标识
- 待复核标识

建议弱化：

- `requested_amount`
- `received_amount`

说明：

- 金额明细去请款管理和收款管理看

### 6.2 请款管理

改成“双层视图”：

- 批次视图
- 明细视图

支持：

- 批量生成请款批次
- 导出请款清单
- 查看批次下订单明细

### 6.3 收款管理

新增页面。

支持：

- 多选请款明细生成收款
- 填写实收金额
- 填写折扣说明
- 查看收款分配明细
- 生成财务记录

### 6.4 财务管理

继续保留，但更偏会计台账视图。

支持：

- 查看收入支出
- 查看账户归属
- 查看是否入账
- 通过 `receipt_no` / `batch_no` 追溯来源

## 7. 状态回写规则

### 7.1 订单

- 明细都未请款：`未请款`
- 部分请款：`部分请款`
- 全部请款未收：`已请款`
- 有实收但未全部完成：`部分收款`
- 全部完成：`已收款`

### 7.2 请款明细

- 未进入批次：`草稿`
- 已进入批次：`已请款`
- 部分实收：`部分收款`
- 已全部覆盖：`已完成`

### 7.3 请款批次

- 批次下明细都未收：`已确认`
- 存在部分实收：`部分收款`
- 全部完成：`已完成`

### 7.4 收款记录

- 已创建未归档：`已确认`
- 财务已生成但未入账：`待归档`
- 财务已入账：`已归档`

## 8. 实施建议

建议分 3 步做：

### 第一步：结构改造

- 新增 `payment_request_batches`
- 新增 `receipts`
- 新增 `receipt_items`
- 扩展 `payment_requests`
- 扩展 `finances`

### 第二步：业务链改造

- 订单批量生成请款批次
- 请款明细归属批次
- 请款明细批量生成收款
- 收款生成财务
- 回写订单、请款、绩效

### 第三步：页面重构

- 订单页状态化
- 请款页批次化
- 新增收款管理页
- 财务页按归档视图优化

## 9. 结论

按这个方向改，会比当前结构更符合真实业务：

- 支持一个合同多个订单统一请款
- 支持折扣和部分收款
- 财务数据不会被业务明细淹没
- 订单列表不再被金额差异干扰
- 后续绩效也更容易按实收去生成

下一步应直接进入：

- 数据库表设计与迁移清单
- 第一批后端模型改造
