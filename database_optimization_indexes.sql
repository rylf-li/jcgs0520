-- ============================================
-- 数据库性能优化 - 索引添加脚本
-- 生成时间: 2026-05-18
-- 目的: 解决批量删除后查询超时问题
-- ============================================

-- 使用工程管理数据库
USE engineering_mgmt;

-- ============================================
-- 一、财务表索引 (finances)
-- ============================================

-- 1.1 合同ID索引（最频繁的查询条件）
ALTER TABLE finances ADD INDEX idx_contract_id (contract_id);

-- 1.2 订单ID索引
ALTER TABLE finances ADD INDEX idx_order_id (order_id);

-- 1.3 请款批次ID索引
ALTER TABLE finances ADD INDEX idx_batch_id (batch_id);

-- 1.4 收款记录ID索引
ALTER TABLE finances ADD INDEX idx_receipt_id (receipt_id);

-- 1.5 来源类型和ID复合索引（用于追溯来源）
ALTER TABLE finances ADD INDEX idx_source (source_type, source_id);

-- 1.6 入账状态和类型复合索引（用于金额汇总计算）
ALTER TABLE finances ADD INDEX idx_booked_type (booked, type);

-- 1.7 日期索引（用于日期范围查询）
ALTER TABLE finances ADD INDEX idx_date (date);

-- 1.8 公司ID索引（用于按公司筛选）
ALTER TABLE finances ADD INDEX idx_company_id (company_id);

-- ============================================
-- 二、请款明细表索引 (payment_requests)
-- ============================================

-- 2.1 订单ID索引（最频繁的查询条件）
ALTER TABLE payment_requests ADD INDEX idx_order_id (order_id);

-- 2.2 请款批次ID索引
ALTER TABLE payment_requests ADD INDEX idx_batch_id (batch_id);

-- 2.3 合同ID索引
ALTER TABLE payment_requests ADD INDEX idx_contract_id (contract_id);

-- 2.4 项目ID索引
ALTER TABLE payment_requests ADD INDEX idx_project_id (project_id);

-- 2.5 业务员ID索引（用于权限过滤）
ALTER TABLE payment_requests ADD INDEX idx_salesman_id (salesman_id);

-- 2.6 请款日期索引
ALTER TABLE payment_requests ADD INDEX idx_date (date);

-- ============================================
-- 三、收款明细表索引 (receipt_items)
-- ============================================

-- 3.1 请款明细ID索引（最频繁的关联查询）
ALTER TABLE receipt_items ADD INDEX idx_payment_request_id (payment_request_id);

-- 3.2 收款记录ID索引
ALTER TABLE receipt_items ADD INDEX idx_receipt_id (receipt_id);

-- ============================================
-- 四、收款表索引 (receipts)
-- ============================================

-- 4.1 请款批次ID索引
ALTER TABLE receipts ADD INDEX idx_batch_id (batch_id);

-- 4.2 合同ID索引
ALTER TABLE receipts ADD INDEX idx_contract_id (contract_id);

-- 4.3 项目ID索引
ALTER TABLE receipts ADD INDEX idx_project_id (project_id);

-- 4.4 业务员ID索引（用于权限过滤）
ALTER TABLE receipts ADD INDEX idx_salesman_id (salesman_id);

-- 4.5 收款日期索引
ALTER TABLE receipts ADD INDEX idx_date (date);

-- 4.6 状态索引
ALTER TABLE receipts ADD INDEX idx_status (status);

-- ============================================
-- 五、订单表索引 (orders)
-- ============================================

-- 5.1 合同ID索引（最频繁的关联查询）
ALTER TABLE orders ADD INDEX idx_contract_id (contract_id);

-- 5.2 业务员ID索引（用于权限过滤）
ALTER TABLE orders ADD INDEX idx_salesman_id (salesman_id);

-- 5.3 订单状态索引
ALTER TABLE orders ADD INDEX idx_status (status);

-- 5.4 付款状态索引
ALTER TABLE orders ADD INDEX idx_payment_status (payment_status);

-- 5.5 订单日期索引
ALTER TABLE orders ADD INDEX idx_date (date);

-- 5.6 项目ID索引
ALTER TABLE orders ADD INDEX idx_project_id (project_id);

-- 5.7 公司ID索引
ALTER TABLE orders ADD INDEX idx_company_id (company_id);

-- 5.8 部门ID索引
ALTER TABLE orders ADD INDEX idx_dept_id (dept_id);

-- ============================================
-- 六、合同表索引 (contracts)
-- ============================================

-- 6.1 项目ID索引（最频繁的关联查询）
ALTER TABLE contracts ADD INDEX idx_project_id (project_id);

-- 6.2 业务员ID索引（用于权限过滤）
ALTER TABLE contracts ADD INDEX idx_salesman_id (salesman_id);

-- 6.3 客户ID索引
ALTER TABLE contracts ADD INDEX idx_customer_id (customer_id);

-- 6.4 公司ID索引
ALTER TABLE contracts ADD INDEX idx_company_id (company_id);

-- 6.5 部门ID索引
ALTER TABLE contracts ADD INDEX idx_dept_id (dept_id);

-- 6.6 合同状态索引
ALTER TABLE contracts ADD INDEX idx_status (status);

-- 6.7 合同日期索引
ALTER TABLE contracts ADD INDEX idx_date (date);

-- ============================================
-- 七、请款批次表索引 (payment_request_batches)
-- ============================================

-- 7.1 合同ID索引
ALTER TABLE payment_request_batches ADD INDEX idx_contract_id (contract_id);

-- 7.2 项目ID索引
ALTER TABLE payment_request_batches ADD INDEX idx_project_id (project_id);

-- 7.3 业务员ID索引（用于权限过滤）
ALTER TABLE payment_request_batches ADD INDEX idx_salesman_id (salesman_id);

-- 7.4 批次状态索引
ALTER TABLE payment_request_batches ADD INDEX idx_status (status);

-- 7.5 请款日期索引
ALTER TABLE payment_request_batches ADD INDEX idx_date (date);

-- 7.6 公司ID索引
ALTER TABLE payment_request_batches ADD INDEX idx_company_id (company_id);

-- ============================================
-- 八、项目表索引 (projects)
-- ============================================

-- 8.1 客户ID索引
ALTER TABLE projects ADD INDEX idx_customer_id (customer_id);

-- 8.2 业务员ID索引（用于权限过滤）
ALTER TABLE projects ADD INDEX idx_salesman_id (salesman_id);

-- 8.3 项目状态索引
ALTER TABLE projects ADD INDEX idx_status (status);

-- 8.4 公司ID索引
ALTER TABLE projects ADD INDEX idx_company_id (company_id);

-- ============================================
-- 九、绩效表索引 (performances)
-- ============================================

-- 9.1 员工ID索引
ALTER TABLE performances ADD INDEX idx_employee_id (employee_id);

-- 9.2 订单ID索引
ALTER TABLE performances ADD INDEX idx_order_id (order_id);

-- 9.3 合同ID索引
ALTER TABLE performances ADD INDEX idx_contract_id (contract_id);

-- 9.4 项目ID索引
ALTER TABLE performances ADD INDEX idx_project_id (project_id);

-- 9.5 月份索引
ALTER TABLE performances ADD INDEX idx_month (month);

-- ============================================
-- 十、验证索引创建结果
-- ============================================

-- 查看各表的索引情况
SELECT 
    'finances' AS table_name, 
    COUNT(*) AS index_count 
FROM information_schema.statistics 
WHERE table_schema = 'engineering_mgmt' AND table_name = 'finances'

UNION ALL

SELECT 
    'payment_requests' AS table_name, 
    COUNT(*) AS index_count 
FROM information_schema.statistics 
WHERE table_schema = 'engineering_mgmt' AND table_name = 'payment_requests'

UNION ALL

SELECT 
    'receipt_items' AS table_name, 
    COUNT(*) AS index_count 
FROM information_schema.statistics 
WHERE table_schema = 'engineering_mgmt' AND table_name = 'receipt_items'

UNION ALL

SELECT 
    'receipts' AS table_name, 
    COUNT(*) AS index_count 
FROM information_schema.statistics 
WHERE table_schema = 'engineering_mgmt' AND table_name = 'receipts'

UNION ALL

SELECT 
    'orders' AS table_name, 
    COUNT(*) AS index_count 
FROM information_schema.statistics 
WHERE table_schema = 'engineering_mgmt' AND table_name = 'orders'

UNION ALL

SELECT 
    'contracts' AS table_name, 
    COUNT(*) AS index_count 
FROM information_schema.statistics 
WHERE table_schema = 'engineering_mgmt' AND table_name = 'contracts'

UNION ALL

SELECT 
    'payment_request_batches' AS table_name, 
    COUNT(*) AS index_count 
FROM information_schema.statistics 
WHERE table_schema = 'engineering_mgmt' AND table_name = 'payment_request_batches';

-- ============================================
-- 执行说明
-- ============================================
-- 1. 请在数据库中执行此脚本，添加所有索引
-- 2. 执行时间可能需要几分钟，取决于数据量大小
-- 3. 建议在业务低峰期执行
-- 4. 索引创建后，查询性能将显著提升
-- ============================================
