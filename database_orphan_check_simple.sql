-- ============================================
-- 孤儿记录检测脚本（无中文乱码版）
-- ============================================

USE engineering_mgmt;

-- ============================================
-- 一、孤儿记录检测汇总
-- ============================================

SELECT 
    'payment_request_batches-salesman' AS check_type,
    COUNT(*) AS orphan_count
FROM payment_request_batches 
WHERE salesman_id IS NOT NULL 
  AND salesman_id NOT IN (SELECT id FROM employees)

UNION ALL

SELECT 
    'payment_request_batches-contract' AS check_type,
    COUNT(*) AS orphan_count
FROM payment_request_batches 
WHERE contract_id IS NOT NULL 
  AND contract_id NOT IN (SELECT id FROM contracts)

UNION ALL

SELECT 
    'payment_request_batches-project' AS check_type,
    COUNT(*) AS orphan_count
FROM payment_request_batches 
WHERE project_id IS NOT NULL 
  AND project_id NOT IN (SELECT id FROM projects)

UNION ALL

SELECT 
    'receipts-salesman' AS check_type,
    COUNT(*) AS orphan_count
FROM receipts 
WHERE salesman_id IS NOT NULL 
  AND salesman_id NOT IN (SELECT id FROM employees)

UNION ALL

SELECT 
    'receipts-contract' AS check_type,
    COUNT(*) AS orphan_count
FROM receipts 
WHERE contract_id IS NOT NULL 
  AND contract_id NOT IN (SELECT id FROM contracts)

UNION ALL

SELECT 
    'receipts-batch' AS check_type,
    COUNT(*) AS orphan_count
FROM receipts 
WHERE batch_id IS NOT NULL 
  AND batch_id NOT IN (SELECT id FROM payment_request_batches)

UNION ALL

SELECT 
    'finances-contract' AS check_type,
    COUNT(*) AS orphan_count
FROM finances 
WHERE contract_id IS NOT NULL 
  AND contract_id NOT IN (SELECT id FROM contracts)

UNION ALL

SELECT 
    'finances-order' AS check_type,
    COUNT(*) AS orphan_count
FROM finances 
WHERE order_id IS NOT NULL 
  AND order_id NOT IN (SELECT id FROM orders)

UNION ALL

SELECT 
    'payment_requests-order' AS check_type,
    COUNT(*) AS orphan_count
FROM payment_requests 
WHERE order_id IS NOT NULL 
  AND order_id NOT IN (SELECT id FROM orders)

UNION ALL

SELECT 
    'payment_requests-batch' AS check_type,
    COUNT(*) AS orphan_count
FROM payment_requests 
WHERE batch_id IS NOT NULL 
  AND batch_id NOT IN (SELECT id FROM payment_request_batches)

UNION ALL

SELECT 
    'receipt_items-payment_request' AS check_type,
    COUNT(*) AS orphan_count
FROM receipt_items 
WHERE payment_request_id IS NOT NULL 
  AND payment_request_id NOT IN (SELECT id FROM payment_requests)

UNION ALL

SELECT 
    'receipt_items-receipt' AS check_type,
    COUNT(*) AS orphan_count
FROM receipt_items 
WHERE receipt_id IS NOT NULL 
  AND receipt_id NOT IN (SELECT id FROM receipts)

UNION ALL

SELECT 
    'orders-contract' AS check_type,
    COUNT(*) AS orphan_count
FROM orders 
WHERE contract_id IS NOT NULL 
  AND contract_id NOT IN (SELECT id FROM contracts)

UNION ALL

SELECT 
    'orders-salesman' AS check_type,
    COUNT(*) AS orphan_count
FROM orders 
WHERE salesman_id IS NOT NULL 
  AND salesman_id NOT IN (SELECT id FROM employees)

UNION ALL

SELECT 
    'contracts-project' AS check_type,
    COUNT(*) AS orphan_count
FROM contracts 
WHERE project_id IS NOT NULL 
  AND project_id NOT IN (SELECT id FROM projects)

UNION ALL

SELECT 
    'contracts-salesman' AS check_type,
    COUNT(*) AS orphan_count
FROM contracts 
WHERE salesman_id IS NOT NULL 
  AND salesman_id NOT IN (SELECT id FROM employees);

-- ============================================
-- 二、孤儿记录总数统计
-- ============================================

SELECT 
    'TOTAL_ORPHAN_COUNT' AS summary,
    (
        (SELECT COUNT(*) FROM payment_request_batches WHERE salesman_id IS NOT NULL AND salesman_id NOT IN (SELECT id FROM employees))
        + (SELECT COUNT(*) FROM payment_request_batches WHERE contract_id IS NOT NULL AND contract_id NOT IN (SELECT id FROM contracts))
        + (SELECT COUNT(*) FROM payment_request_batches WHERE project_id IS NOT NULL AND project_id NOT IN (SELECT id FROM projects))
        + (SELECT COUNT(*) FROM receipts WHERE salesman_id IS NOT NULL AND salesman_id NOT IN (SELECT id FROM employees))
        + (SELECT COUNT(*) FROM receipts WHERE contract_id IS NOT NULL AND contract_id NOT IN (SELECT id FROM contracts))
        + (SELECT COUNT(*) FROM receipts WHERE batch_id IS NOT NULL AND batch_id NOT IN (SELECT id FROM payment_request_batches))
        + (SELECT COUNT(*) FROM finances WHERE contract_id IS NOT NULL AND contract_id NOT IN (SELECT id FROM contracts))
        + (SELECT COUNT(*) FROM finances WHERE order_id IS NOT NULL AND order_id NOT IN (SELECT id FROM orders))
        + (SELECT COUNT(*) FROM payment_requests WHERE order_id IS NOT NULL AND order_id NOT IN (SELECT id FROM orders))
        + (SELECT COUNT(*) FROM payment_requests WHERE batch_id IS NOT NULL AND batch_id NOT IN (SELECT id FROM payment_request_batches))
        + (SELECT COUNT(*) FROM receipt_items WHERE payment_request_id IS NOT NULL AND payment_request_id NOT IN (SELECT id FROM payment_requests))
        + (SELECT COUNT(*) FROM receipt_items WHERE receipt_id IS NOT NULL AND receipt_id NOT IN (SELECT id FROM receipts))
        + (SELECT COUNT(*) FROM orders WHERE contract_id IS NOT NULL AND contract_id NOT IN (SELECT id FROM contracts))
        + (SELECT COUNT(*) FROM orders WHERE salesman_id IS NOT NULL AND salesman_id NOT IN (SELECT id FROM employees))
        + (SELECT COUNT(*) FROM contracts WHERE project_id IS NOT NULL AND project_id NOT IN (SELECT id FROM projects))
        + (SELECT COUNT(*) FROM contracts WHERE salesman_id IS NOT NULL AND salesman_id NOT IN (SELECT id FROM employees))
    ) AS total_orphans;
