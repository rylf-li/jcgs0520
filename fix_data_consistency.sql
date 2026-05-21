-- ============================================
-- 数据一致性修复脚本
-- 执行时间: 2026-05-18
-- 目的: 修复因批量删除导致的金额不一致问题
-- ============================================

USE engineering_mgmt;

-- ============================================
-- 一、修复订单金额不一致
-- ============================================

-- 1.1 修复订单的请款金额和收款金额
UPDATE orders o
SET 
    o.requested_amount = (
        SELECT COALESCE(SUM(pr.request_amount), 0)
        FROM payment_requests pr
        WHERE pr.order_id = o.id
    ),
    o.received_amount = (
        SELECT COALESCE(SUM(pr.received_amount), 0)
        FROM payment_requests pr
        WHERE pr.order_id = o.id
    );

-- 1.2 更新订单的付款状态
UPDATE orders o
SET o.payment_status = 
    CASE
        WHEN o.requested_amount <= 0 THEN '未请款'
        WHEN o.received_amount <= 0 THEN '已请款'
        WHEN o.received_amount < o.requested_amount THEN '部分收款'
        ELSE '已收款'
    END,
    o.finance_generated = CASE WHEN o.requested_amount > 0 THEN 1 ELSE 0 END,
    o.finance_booked = CASE WHEN o.received_amount > 0 THEN 1 ELSE 0 END;

SELECT '订单金额修复完成' AS status, ROW_COUNT() AS affected_rows;

-- ============================================
-- 二、修复合同金额不一致
-- ============================================

-- 2.1 从订单汇总合同金额
UPDATE contracts c
SET 
    c.receivable = (
        SELECT COALESCE(SUM(o.total), 0)
        FROM orders o
        WHERE o.contract_id = c.id
    ),
    c.cost = (
        SELECT COALESCE(SUM(o.settlement_fee), 0)
        FROM orders o
        WHERE o.contract_id = c.id
    ),
    c.performance = (
        SELECT COALESCE(SUM(o.performance_fee), 0)
        FROM orders o
        WHERE o.contract_id = c.id
    );

-- 2.2 从财务汇总合同的请款和收款金额
UPDATE contracts c
SET 
    c.requested = (
        SELECT COALESCE(SUM(f.amount), 0)
        FROM finances f
        WHERE f.contract_id = c.id AND f.type = '收入'
    ),
    c.received = (
        SELECT COALESCE(SUM(f.amount), 0)
        FROM finances f
        WHERE f.contract_id = c.id AND f.type = '收入' AND f.booked = 1
    );

-- 2.3 计算税费和利润
UPDATE contracts c
LEFT JOIN companies co ON co.id = c.company_id
SET 
    c.tax = c.received * COALESCE(co.tax_rate, 0) / 100,
    c.profit = c.received - c.cost - c.tax - c.performance - COALESCE(c.business_fee, 0) - COALESCE(c.labor_cost, 0) - COALESCE(c.other, 0);

SELECT '合同金额修复完成' AS status, ROW_COUNT() AS affected_rows;

-- ============================================
-- 三、修复项目金额不一致
-- ============================================

-- 3.1 从合同汇总项目金额
UPDATE projects p
SET 
    p.amount = (
        SELECT COALESCE(SUM(c.amount), 0)
        FROM contracts c
        WHERE c.project_id = p.id
    ),
    p.receivable = (
        SELECT COALESCE(SUM(c.receivable), 0)
        FROM contracts c
        WHERE c.project_id = p.id
    ),
    p.requested = (
        SELECT COALESCE(SUM(c.requested), 0)
        FROM contracts c
        WHERE c.project_id = p.id
    ),
    p.received = (
        SELECT COALESCE(SUM(c.received), 0)
        FROM contracts c
        WHERE c.project_id = p.id
    ),
    p.cost = (
        SELECT COALESCE(SUM(c.cost), 0)
        FROM contracts c
        WHERE c.project_id = p.id
    ),
    p.tax = (
        SELECT COALESCE(SUM(c.tax), 0)
        FROM contracts c
        WHERE c.project_id = p.id
    ),
    p.labor_cost = (
        SELECT COALESCE(SUM(c.labor_cost), 0)
        FROM contracts c
        WHERE c.project_id = p.id
    ),
    p.business_fee = (
        SELECT COALESCE(SUM(c.business_fee), 0)
        FROM contracts c
        WHERE c.project_id = p.id
    ),
    p.other = (
        SELECT COALESCE(SUM(c.other), 0)
        FROM contracts c
        WHERE c.project_id = p.id
    ),
    p.performance = (
        SELECT COALESCE(SUM(c.performance), 0)
        FROM contracts c
        WHERE c.project_id = p.id
    ),
    p.profit = (
        SELECT COALESCE(SUM(c.profit), 0)
        FROM contracts c
        WHERE c.project_id = p.id
    );

SELECT '项目金额修复完成' AS status, ROW_COUNT() AS affected_rows;

-- ============================================
-- 四、验证修复结果
-- ============================================

-- 4.1 验证订单金额一致性
SELECT 
    '订单金额一致性' AS check_item,
    COUNT(*) AS inconsistent_count
FROM (
    SELECT o.id, o.received_amount, COALESCE(SUM(pr.received_amount), 0) AS pr_received
    FROM orders o
    LEFT JOIN payment_requests pr ON pr.order_id = o.id
    GROUP BY o.id
    HAVING ABS(o.received_amount - pr_received) > 0.01
) AS t;

-- 4.2 验证合同金额一致性
SELECT 
    '合同金额一致性' AS check_item,
    COUNT(*) AS inconsistent_count
FROM (
    SELECT c.id, c.received, COALESCE(SUM(o.received_amount), 0) AS orders_received
    FROM contracts c
    LEFT JOIN orders o ON o.contract_id = c.id
    GROUP BY c.id
    HAVING ABS(c.received - orders_received) > 0.01
) AS t;

-- 4.3 验证项目金额一致性
SELECT 
    '项目金额一致性' AS check_item,
    COUNT(*) AS inconsistent_count
FROM (
    SELECT p.id, p.received, COALESCE(SUM(c.received), 0) AS contracts_received
    FROM projects p
    LEFT JOIN contracts c ON c.project_id = p.id
    GROUP BY p.id
    HAVING ABS(p.received - contracts_received) > 0.01
) AS t;

-- ============================================
-- 执行说明
-- ============================================
-- 1. 此脚本会自动修复所有金额不一致问题
-- 2. 执行时间约1-2分钟
-- 3. 执行后验证结果应全部为0
-- 4. 如有问题，请检查后端日志
-- ============================================
