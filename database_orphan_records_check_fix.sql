-- ============================================
-- 孤儿记录检测和修复脚本
-- 生成时间: 2026-05-18
-- 目的: 解决批量删除后403 Forbidden错误
-- 说明: 孤儿记录指关联ID指向不存在记录的数据
-- ============================================

USE engineering_mgmt;

-- ============================================
-- 第一部分：孤儿记录检测
-- ============================================

-- 1.1 检测请款批次中的孤儿业务员记录
SELECT 
    '请款批次-业务员孤儿' AS 问题类型,
    COUNT(*) AS 问题记录数,
    '业务员ID指向不存在的员工' AS 问题描述
FROM payment_request_batches 
WHERE salesman_id IS NOT NULL 
  AND salesman_id NOT IN (SELECT id FROM employees);

-- 1.2 检测请款批次中的孤儿合同记录
SELECT 
    '请款批次-合同孤儿' AS 问题类型,
    COUNT(*) AS 问题记录数,
    '合同ID指向不存在的合同' AS 问题描述
FROM payment_request_batches 
WHERE contract_id IS NOT NULL 
  AND contract_id NOT IN (SELECT id FROM contracts);

-- 1.3 检测请款批次中的孤儿项目记录
SELECT 
    '请款批次-项目孤儿' AS 问题类型,
    COUNT(*) AS 问题记录数,
    '项目ID指向不存在的项目' AS 问题描述
FROM payment_request_batches 
WHERE project_id IS NOT NULL 
  AND project_id NOT IN (SELECT id FROM projects);

-- 1.4 检测收款记录中的孤儿业务员记录
SELECT 
    '收款记录-业务员孤儿' AS 问题类型,
    COUNT(*) AS 问题记录数,
    '业务员ID指向不存在的员工' AS 问题描述
FROM receipts 
WHERE salesman_id IS NOT NULL 
  AND salesman_id NOT IN (SELECT id FROM employees);

-- 1.5 检测收款记录中的孤儿合同记录
SELECT 
    '收款记录-合同孤儿' AS 问题类型,
    COUNT(*) AS 问题记录数,
    '合同ID指向不存在的合同' AS 问题描述
FROM receipts 
WHERE contract_id IS NOT NULL 
  AND contract_id NOT IN (SELECT id FROM contracts);

-- 1.6 检测收款记录中的孤儿批次记录
SELECT 
    '收款记录-批次孤儿' AS 问题类型,
    COUNT(*) AS 问题记录数,
    '批次ID指向不存在的请款批次' AS 问题描述
FROM receipts 
WHERE batch_id IS NOT NULL 
  AND batch_id NOT IN (SELECT id FROM payment_request_batches);

-- 1.7 检测财务记录中的孤儿业务员记录
SELECT 
    '财务记录-业务员孤儿' AS 问题类型,
    COUNT(*) AS 问题记录数,
    '通过关联查询发现的业务员孤儿' AS 问题描述
FROM finances f
WHERE f.source_type = 'receipt' 
  AND f.source_id IS NOT NULL
  AND f.source_id NOT IN (SELECT id FROM receipts);

-- 1.8 检测财务记录中的孤儿合同记录
SELECT 
    '财务记录-合同孤儿' AS 问题类型,
    COUNT(*) AS 问题记录数,
    '合同ID指向不存在的合同' AS 问题描述
FROM finances 
WHERE contract_id IS NOT NULL 
  AND contract_id NOT IN (SELECT id FROM contracts);

-- 1.9 检测财务记录中的孤儿订单记录
SELECT 
    '财务记录-订单孤儿' AS 问题类型,
    COUNT(*) AS 问题记录数,
    '订单ID指向不存在的订单' AS 问题描述
FROM finances 
WHERE order_id IS NOT NULL 
  AND order_id NOT IN (SELECT id FROM orders);

-- 1.10 检测请款明细中的孤儿订单记录
SELECT 
    '请款明细-订单孤儿' AS 问题类型,
    COUNT(*) AS 问题记录数,
    '订单ID指向不存在的订单' AS 问题描述
FROM payment_requests 
WHERE order_id IS NOT NULL 
  AND order_id NOT IN (SELECT id FROM orders);

-- 1.11 检测请款明细中的孤儿批次记录
SELECT 
    '请款明细-批次孤儿' AS 问题类型,
    COUNT(*) AS 问题记录数,
    '批次ID指向不存在的请款批次' AS 问题描述
FROM payment_requests 
WHERE batch_id IS NOT NULL 
  AND batch_id NOT IN (SELECT id FROM payment_request_batches);

-- 1.12 检测收款明细中的孤儿请款明细记录
SELECT 
    '收款明细-请款明细孤儿' AS 问题类型,
    COUNT(*) AS 问题记录数,
    '请款明细ID指向不存在的请款明细' AS 问题描述
FROM receipt_items 
WHERE payment_request_id IS NOT NULL 
  AND payment_request_id NOT IN (SELECT id FROM payment_requests);

-- 1.13 检测收款明细中的孤儿收款记录
SELECT 
    '收款明细-收款记录孤儿' AS 问题类型,
    COUNT(*) AS 问题记录数,
    '收款记录ID指向不存在的收款记录' AS 问题描述
FROM receipt_items 
WHERE receipt_id IS NOT NULL 
  AND receipt_id NOT IN (SELECT id FROM receipts);

-- 1.14 检测订单中的孤儿合同记录
SELECT 
    '订单-合同孤儿' AS 问题类型,
    COUNT(*) AS 问题记录数,
    '合同ID指向不存在的合同' AS 问题描述
FROM orders 
WHERE contract_id IS NOT NULL 
  AND contract_id NOT IN (SELECT id FROM contracts);

-- 1.15 检测订单中的孤儿业务员记录
SELECT 
    '订单-业务员孤儿' AS 问题类型,
    COUNT(*) AS 问题记录数,
    '业务员ID指向不存在的员工' AS 问题描述
FROM orders 
WHERE salesman_id IS NOT NULL 
  AND salesman_id NOT IN (SELECT id FROM employees);

-- 1.16 检测合同中的孤儿项目记录
SELECT 
    '合同-项目孤儿' AS 问题类型,
    COUNT(*) AS 问题记录数,
    '项目ID指向不存在的项目' AS 问题描述
FROM contracts 
WHERE project_id IS NOT NULL 
  AND project_id NOT IN (SELECT id FROM projects);

-- 1.17 检测合同中的孤儿业务员记录
SELECT 
    '合同-业务员孤儿' AS 问题类型,
    COUNT(*) AS 问题记录数,
    '业务员ID指向不存在的员工' AS 问题描述
FROM contracts 
WHERE salesman_id IS NOT NULL 
  AND salesman_id NOT IN (SELECT id FROM employees);

-- ============================================
-- 第二部分：详细孤儿记录查看
-- ============================================

-- 查看10条请款批次业务员孤儿记录详情
SELECT 
    '请款批次业务员孤儿详情' AS 类型,
    id, batch_no, salesman_id, salesman_name
FROM payment_request_batches 
WHERE salesman_id IS NOT NULL 
  AND salesman_id NOT IN (SELECT id FROM employees)
LIMIT 10;

-- 查看10条收款记录业务员孤儿记录详情
SELECT 
    '收款记录业务员孤儿详情' AS 类型,
    id, receipt_no, salesman_id, salesman_name
FROM receipts 
WHERE salesman_id IS NOT NULL 
  AND salesman_id NOT IN (SELECT id FROM employees)
LIMIT 10;

-- 查看10条财务记录合同孤儿详情
SELECT 
    '财务记录合同孤儿详情' AS 类型,
    id, finance_no, contract_id, contract_no, amount
FROM finances 
WHERE contract_id IS NOT NULL 
  AND contract_id NOT IN (SELECT id FROM contracts)
LIMIT 10;

-- ============================================
-- 第三部分：孤儿记录修复脚本（谨慎执行！）
-- ============================================

-- 警告：以下修复脚本会将孤儿记录的关联ID设置为NULL
-- 执行前请务必备份数据库！
-- 建议先在测试环境验证！

-- 3.1 修复请款批次的业务员孤儿记录
-- UPDATE payment_request_batches 
-- SET salesman_id = NULL 
-- WHERE salesman_id IS NOT NULL 
--   AND salesman_id NOT IN (SELECT id FROM employees);

-- 3.2 修复请款批次的合同孤儿记录
-- UPDATE payment_request_batches 
-- SET contract_id = NULL, contract_no = NULL 
-- WHERE contract_id IS NOT NULL 
--   AND contract_id NOT IN (SELECT id FROM contracts);

-- 3.3 修复请款批次的项目孤儿记录
-- UPDATE payment_request_batches 
-- SET project_id = NULL, project_name = NULL 
-- WHERE project_id IS NOT NULL 
--   AND project_id NOT IN (SELECT id FROM projects);

-- 3.4 修复收款记录的业务员孤儿记录
-- UPDATE receipts 
-- SET salesman_id = NULL 
-- WHERE salesman_id IS NOT NULL 
--   AND salesman_id NOT IN (SELECT id FROM employees);

-- 3.5 修复收款记录的合同孤儿记录
-- UPDATE receipts 
-- SET contract_id = NULL, contract_no = NULL 
-- WHERE contract_id IS NOT NULL 
--   AND contract_id NOT IN (SELECT id FROM contracts);

-- 3.6 修复收款记录的批次孤儿记录
-- UPDATE receipts 
-- SET batch_id = NULL, batch_no = NULL 
-- WHERE batch_id IS NOT NULL 
--   AND batch_id NOT IN (SELECT id FROM payment_request_batches);

-- 3.7 修复财务记录的合同孤儿记录
-- UPDATE finances 
-- SET contract_id = NULL, contract_no = NULL 
-- WHERE contract_id IS NOT NULL 
--   AND contract_id NOT IN (SELECT id FROM contracts);

-- 3.8 修复财务记录的订单孤儿记录
-- UPDATE finances 
-- SET order_id = NULL, order_no = NULL 
-- WHERE order_id IS NOT NULL 
  AND order_id NOT IN (SELECT id FROM orders);

-- 3.9 修复请款明细的订单孤儿记录
-- UPDATE payment_requests 
-- SET order_id = NULL, order_no = NULL 
-- WHERE order_id IS NOT NULL 
--   AND order_id NOT IN (SELECT id FROM orders);

-- 3.10 修复请款明细的批次孤儿记录
-- UPDATE payment_requests 
-- SET batch_id = NULL, batch_no = NULL 
-- WHERE batch_id IS NOT NULL 
--   AND batch_id NOT IN (SELECT id FROM payment_request_batches);

-- 3.11 修复订单的合同孤儿记录
-- UPDATE orders 
-- SET contract_id = NULL, contract_no = NULL 
-- WHERE contract_id IS NOT NULL 
--   AND contract_id NOT IN (SELECT id FROM contracts);

-- 3.12 修复订单的业务员孤儿记录
-- UPDATE orders 
-- SET salesman_id = NULL 
-- WHERE salesman_id IS NOT NULL 
--   AND salesman_id NOT IN (SELECT id FROM employees);

-- 3.13 修复合同的项目孤儿记录
-- UPDATE contracts 
-- SET project_id = NULL, project_name = NULL 
-- WHERE project_id IS NOT NULL 
--   AND project_id NOT IN (SELECT id FROM projects);

-- 3.14 修复合同的业务员孤儿记录
-- UPDATE contracts 
-- SET salesman_id = NULL 
-- WHERE salesman_id IS NOT NULL 
--   AND salesman_id NOT IN (SELECT id FROM employees);

-- ============================================
-- 第四部分：删除完全孤立的记录（可选）
-- ============================================

-- 警告：以下脚本会删除完全孤立的记录
-- 请务必备份数据库后谨慎执行！

-- 4.1 删除没有关联任何数据的收款明细
-- DELETE FROM receipt_items 
-- WHERE payment_request_id IS NULL 
--   OR receipt_id IS NULL;

-- 4.2 删除没有关联订单的请款明细
-- DELETE FROM payment_requests 
-- WHERE order_id IS NULL 
--   AND batch_id IS NULL;

-- ============================================
-- 执行说明
-- ============================================
-- 1. 首先执行"第一部分：孤儿记录检测"，查看是否存在孤儿记录
-- 2. 如果存在孤儿记录，执行"第二部分"查看详细信息
-- 3. 根据实际情况，谨慎执行"第三部分"的修复脚本（取消注释）
-- 4. 执行前务必备份数据库！
-- 5. 建议在测试环境先验证
-- ============================================
