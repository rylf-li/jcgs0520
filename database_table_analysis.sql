-- ============================================
-- 数据表使用情况分析和清理建议
-- ============================================

USE engineering_mgmt;

-- ============================================
-- 一、所有数据表的记录数统计
-- ============================================

SELECT 
    'employees' AS table_name,
    (SELECT COUNT(*) FROM employees) AS record_count,
    '员工表-基础数据' AS description,
    '不可删除' AS can_delete

UNION ALL SELECT 'departments', (SELECT COUNT(*) FROM departments), '部门表-基础数据', '不可删除'
UNION ALL SELECT 'companies', (SELECT COUNT(*) FROM companies), '公司表-基础数据', '不可删除'
UNION ALL SELECT 'customers', (SELECT COUNT(*) FROM customers), '客户表-基础数据', '不可删除'
UNION ALL SELECT 'bank_accounts', (SELECT COUNT(*) FROM bank_accounts), '银行账户表-基础数据', '不可删除'

UNION ALL SELECT 'projects', (SELECT COUNT(*) FROM projects), '项目表-核心业务', '不可删除'
UNION ALL SELECT 'contracts', (SELECT COUNT(*) FROM contracts), '合同表-核心业务', '不可删除'
UNION ALL SELECT 'orders', (SELECT COUNT(*) FROM orders), '订单表-核心业务', '不可删除'
UNION ALL SELECT 'order_items', (SELECT COUNT(*) FROM order_items), '订单明细表-核心业务', '谨慎删除'

UNION ALL SELECT 'payment_request_batches', (SELECT COUNT(*) FROM payment_request_batches), '请款批次表-核心业务', '不可删除'
UNION ALL SELECT 'payment_requests', (SELECT COUNT(*) FROM payment_requests), '请款明细表-核心业务', '不可删除'
UNION ALL SELECT 'receipts', (SELECT COUNT(*) FROM receipts), '收款记录表-核心业务', '不可删除'
UNION ALL SELECT 'receipt_items', (SELECT COUNT(*) FROM receipt_items), '收款明细表-核心业务', '不可删除'
UNION ALL SELECT 'finances', (SELECT COUNT(*) FROM finances), '财务记录表-核心业务', '不可删除'

UNION ALL SELECT 'performances', (SELECT COUNT(*) FROM performances), '绩效表-核心业务', '谨慎删除'
UNION ALL SELECT 'salaries', (SELECT COUNT(*) FROM salaries), '工资表-核心业务', '谨慎删除'

UNION ALL SELECT 'business', (SELECT COUNT(*) FROM business), '业务类别表-基础数据', '不可删除'

UNION ALL SELECT 'order_status_histories', (SELECT COUNT(*) FROM order_status_histories), '订单状态历史表-日志数据', '可清理旧数据'
UNION ALL SELECT 'contract_status_histories', (SELECT COUNT(*) FROM contract_status_histories), '合同状态历史表-日志数据', '可清理旧数据'

UNION ALL SELECT 'dept_stats', (SELECT COUNT(*) FROM dept_stats), '部门统计表-统计数据', '可删除后重建'
UNION ALL SELECT 'company_stats', (SELECT COUNT(*) FROM company_stats), '公司统计表-统计数据', '可删除后重建'
UNION ALL SELECT 'customer_stats', (SELECT COUNT(*) FROM customer_stats), '客户统计表-统计数据', '可删除后重建'

UNION ALL SELECT 'sync_logs', (SELECT COUNT(*) FROM sync_logs), '同步日志表-日志数据', '可清理旧数据'
UNION ALL SELECT 'sync_tasks', (SELECT COUNT(*) FROM sync_tasks), '同步任务表-任务数据', '可清理已完成任务'

UNION ALL SELECT 'user_configs', (SELECT COUNT(*) FROM user_configs), '用户配置表-配置数据', '不可删除'

UNION ALL SELECT 'employee_departments', (SELECT COUNT(*) FROM employee_departments), '员工部门关联表-关联数据', '不可删除'

ORDER BY record_count DESC;

-- ============================================
-- 二、日志和历史表数据量分析（可清理）
-- ============================================

SELECT 
    'order_status_histories' AS table_name,
    COUNT(*) AS total_count,
    COUNT(CASE WHEN created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH) THEN 1 END) AS old_records_6month,
    COUNT(CASE WHEN created_at < DATE_SUB(NOW(), INTERVAL 12 MONTH) THEN 1 END) AS old_records_12month,
    '可删除6个月前的历史记录' AS suggestion
FROM order_status_histories

UNION ALL

SELECT 
    'contract_status_histories',
    COUNT(*),
    COUNT(CASE WHEN created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH) THEN 1 END),
    COUNT(CASE WHEN created_at < DATE_SUB(NOW(), INTERVAL 12 MONTH) THEN 1 END),
    '可删除6个月前的历史记录'
FROM contract_status_histories

UNION ALL

SELECT 
    'sync_logs',
    COUNT(*),
    COUNT(CASE WHEN created_at < DATE_SUB(NOW(), INTERVAL 3 MONTH) THEN 1 END),
    COUNT(CASE WHEN created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH) THEN 1 END),
    '可删除3个月前的日志记录'
FROM sync_logs;

-- ============================================
-- 三、统计数据表重建脚本
-- ============================================

-- 统计表可以删除后重建，不影响核心业务
-- 删除命令（谨慎执行！）：
-- TRUNCATE TABLE dept_stats;
-- TRUNCATE TABLE company_stats;
-- TRUNCATE TABLE customer_stats;

-- ============================================
-- 四、日志和历史数据清理脚本（谨慎执行！）
-- ============================================

-- 删除6个月前的订单状态历史（谨慎执行！）
-- DELETE FROM order_status_histories 
-- WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);

-- 删除6个月前的合同状态历史（谨慎执行！）
-- DELETE FROM contract_status_histories 
-- WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);

-- 删除3个月前的同步日志（谨慎执行！）
-- DELETE FROM sync_logs 
-- WHERE created_at < DATE_SUB(NOW(), INTERVAL 3 MONTH);

-- 删除已完成的同步任务（谨慎执行！）
-- DELETE FROM sync_tasks 
-- WHERE status IN ('completed', 'failed')
--   AND updated_at < DATE_SUB(NOW(), INTERVAL 1 MONTH);

-- ============================================
-- 五、未使用的订单明细检查
-- ============================================

SELECT 
    'order_items usage check' AS check_type,
    COUNT(*) AS total_order_items,
    COUNT(CASE WHEN order_id IS NULL THEN 1 END) AS orphan_items,
    '如果orphan_items>0，可以删除' AS suggestion
FROM order_items;

-- ============================================
-- 执行说明
-- ============================================
-- 1. 首先查看"所有数据表的记录数统计"
-- 2. 根据"日志和历史表数据量分析"决定是否清理
-- 3. 统计表可以安全清空（TRUNCATE），会自动重建
-- 4. 日志和历史数据可以删除旧数据，释放空间
-- 5. 执行前务必备份数据库！
-- ============================================
