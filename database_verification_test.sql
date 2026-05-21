-- ============================================
-- 数据一致性验证测试脚本
-- 生成时间: 2026-05-18
-- 目的: 验证修复后的数据一致性
-- ============================================

USE engineering_mgmt;

-- ============================================
-- 一、金额一致性验证
-- ============================================

-- 1.1 验证合同金额与订单汇总是否一致
SELECT 
    '合同-订单金额一致性' AS 检查项,
    COUNT(*) AS 不一致记录数
FROM (
    SELECT 
        c.id,
        c.contract_no,
        c.received AS 合同已收款,
        COALESCE(SUM(o.received_amount), 0) AS 订单已收款汇总,
        ABS(c.received - COALESCE(SUM(o.received_amount), 0)) AS 差额
    FROM contracts c
    LEFT JOIN orders o ON o.contract_id = c.id
    GROUP BY c.id
    HAVING ABS(差额) > 0.01
) AS inconsistent;

-- 1.2 查看合同-订单金额不一致的详细信息（前10条）
SELECT 
    c.id AS 合同ID,
    c.contract_no AS 合同编号,
    c.received AS 合同已收款,
    COALESCE(SUM(o.received_amount), 0) AS 订单已收款汇总,
    ROUND(ABS(c.received - COALESCE(SUM(o.received_amount), 0)), 2) AS 差额
FROM contracts c
LEFT JOIN orders o ON o.contract_id = c.id
GROUP BY c.id
HAVING ABS(差额) > 0.01
ORDER BY 差额 DESC
LIMIT 10;

-- 1.3 验证项目金额与合同汇总是否一致
SELECT 
    '项目-合同金额一致性' AS 检查项,
    COUNT(*) AS 不一致记录数
FROM (
    SELECT 
        p.id,
        p.name AS 项目名称,
        p.received AS 项目已收款,
        COALESCE(SUM(c.received), 0) AS 合同已收款汇总,
        ABS(p.received - COALESCE(SUM(c.received), 0)) AS 差额
    FROM projects p
    LEFT JOIN contracts c ON c.project_id = p.id
    GROUP BY p.id
    HAVING ABS(差额) > 0.01
) AS inconsistent;

-- 1.4 查看项目-合同金额不一致的详细信息（前10条）
SELECT 
    p.id AS 项目ID,
    p.name AS 项目名称,
    p.received AS 项目已收款,
    COALESCE(SUM(c.received), 0) AS 合同已收款汇总,
    ROUND(ABS(p.received - COALESCE(SUM(c.received), 0)), 2) AS 差额
FROM projects p
LEFT JOIN contracts c ON c.project_id = p.id
GROUP BY p.id
HAVING ABS(差额) > 0.01
ORDER BY 差额 DESC
LIMIT 10;

-- 1.5 验证订单金额与请款明细汇总是否一致
SELECT 
    '订单-请款明细金额一致性' AS 检查项,
    COUNT(*) AS 不一致记录数
FROM (
    SELECT 
        o.id,
        o.order_no,
        o.received_amount AS 订单已收款,
        COALESCE(SUM(pr.received_amount), 0) AS 请款明细已收款汇总,
        ABS(o.received_amount - COALESCE(SUM(pr.received_amount), 0)) AS 差额
    FROM orders o
    LEFT JOIN payment_requests pr ON pr.order_id = o.id
    GROUP BY o.id
    HAVING ABS(差额) > 0.01
) AS inconsistent;

-- 1.6 查看订单-请款明细金额不一致的详细信息（前10条）
SELECT 
    o.id AS 订单ID,
    o.order_no AS 订单编号,
    o.received_amount AS 订单已收款,
    COALESCE(SUM(pr.received_amount), 0) AS 请款明细已收款汇总,
    ROUND(ABS(o.received_amount - COALESCE(SUM(pr.received_amount), 0)), 2) AS 差额
FROM orders o
LEFT JOIN payment_requests pr ON pr.order_id = o.id
GROUP BY o.id
HAVING ABS(差额) > 0.01
ORDER BY 差额 DESC
LIMIT 10;

-- ============================================
-- 二、状态一致性验证
-- ============================================

-- 2.1 检查订单付款状态与金额是否匹配
SELECT 
    '订单付款状态一致性' AS 检查项,
    COUNT(*) AS 不一致记录数
FROM orders
WHERE (
    (payment_status = '未请款' AND (requested_amount > 0 OR received_amount > 0))
    OR (payment_status = '已请款' AND (requested_amount <= 0 OR received_amount > 0))
    OR (payment_status = '部分收款' AND (requested_amount <= 0 OR received_amount <= 0 OR received_amount >= requested_amount))
    OR (payment_status = '已收款' AND (requested_amount <= 0 OR received_amount < requested_amount))
);

-- 2.2 查看订单付款状态不一致的详细信息（前10条）
SELECT 
    id, order_no, payment_status, requested_amount, received_amount
FROM orders
WHERE (
    (payment_status = '未请款' AND (requested_amount > 0 OR received_amount > 0))
    OR (payment_status = '已请款' AND (requested_amount <= 0 OR received_amount > 0))
    OR (payment_status = '部分收款' AND (requested_amount <= 0 OR received_amount <= 0 OR received_amount >= requested_amount))
    OR (payment_status = '已收款' AND (requested_amount <= 0 OR received_amount < requested_amount))
)
LIMIT 10;

-- 2.3 检查请款批次状态与金额是否匹配
SELECT 
    '请款批次状态一致性' AS 检查项,
    COUNT(*) AS 不一致记录数
FROM payment_request_batches
WHERE (
    (status = '草稿' AND request_total_amount > 0)
    OR (status = '已请款' AND (request_total_amount <= 0 OR received_total_amount > 0))
    OR (status = '部分收款' AND (request_total_amount <= 0 OR received_total_amount <= 0 OR received_total_amount >= request_total_amount))
    OR (status = '已收款' AND (request_total_amount <= 0 OR received_total_amount < request_total_amount))
);

-- ============================================
-- 三、查询性能测试
-- ============================================

-- 3.1 测试财务查询性能（应<1秒）
SET @start_time = NOW();
SELECT COUNT(*) AS count FROM finances WHERE contract_id IN (SELECT id FROM contracts LIMIT 10);
SELECT TIMESTAMPDIFF(MICROSECOND, @start_time, NOW()) / 1000 AS 查询耗时毫秒;

-- 3.2 测试请款明细查询性能（应<1秒）
SET @start_time = NOW();
SELECT COUNT(*) AS count FROM payment_requests WHERE order_id IN (SELECT id FROM orders LIMIT 10);
SELECT TIMESTAMPDIFF(MICROSECOND, @start_time, NOW()) / 1000 AS 查询耗时毫秒;

-- 3.3 测试收款明细查询性能（应<1秒）
SET @start_time = NOW();
SELECT COUNT(*) AS count FROM receipt_items WHERE payment_request_id IN (SELECT id FROM payment_requests LIMIT 10);
SELECT TIMESTAMPDIFF(MICROSECOND, @start_time, NOW()) / 1000 AS 查询耗时毫秒;

-- 3.4 测试合同列表查询性能（应<2秒）
SET @start_time = NOW();
SELECT * FROM contracts WHERE project_id IS NOT NULL ORDER BY id DESC LIMIT 20;
SELECT TIMESTAMPDIFF(MICROSECOND, @start_time, NOW()) / 1000 AS 查询耗时毫秒;

-- 3.5 测试项目列表查询性能（应<2秒）
SET @start_time = NOW();
SELECT * FROM projects ORDER BY id DESC LIMIT 20;
SELECT TIMESTAMPDIFF(MICROSECOND, @start_time, NOW()) / 1000 AS 查询耗时毫秒;

-- ============================================
-- 四、修复前后对比测试
-- ============================================

-- 4.1 模拟批量删除请款批次后的数据检查
-- 查找最近被删除（或金额为0）的请款批次相关订单
SELECT 
    '已删除批次关联订单检查' AS 检查项,
    COUNT(*) AS 需要重算的订单数
FROM orders o
WHERE o.requested_amount > 0
  AND NOT EXISTS (
      SELECT 1 
      FROM payment_requests pr 
      WHERE pr.order_id = o.id 
        AND pr.request_amount > 0
  );

-- 4.2 查看需要重算的订单详情
SELECT 
    o.id AS 订单ID,
    o.order_no AS 订单编号,
    o.requested_amount AS 订单请款金额,
    o.received_amount AS 订单收款金额,
    COALESCE(SUM(pr.request_amount), 0) AS 实际请款明细汇总,
    COALESCE(SUM(pr.received_amount), 0) AS 实际收款明细汇总
FROM orders o
LEFT JOIN payment_requests pr ON pr.order_id = o.id
WHERE o.requested_amount > 0
GROUP BY o.id
HAVING ABS(订单请款金额 - 实际请款明细汇总) > 0.01
   OR ABS(订单收款金额 - 实际收款明细汇总) > 0.01
LIMIT 20;

-- ============================================
-- 五、综合健康检查
-- ============================================

-- 5.1 数据完整性综合评分
SELECT 
    '数据完整性综合评分' AS 检查项,
    (
        -- 合同-订单一致性得分
        (SELECT 100 - COUNT(*) * 10 FROM (
            SELECT c.id FROM contracts c
            LEFT JOIN orders o ON o.contract_id = c.id
            GROUP BY c.id
            HAVING ABS(c.received - COALESCE(SUM(o.received_amount), 0)) > 0.01
        ) AS t1 LIMIT 10)
        
        +
        
        -- 项目-合同一致性得分
        (SELECT 100 - COUNT(*) * 10 FROM (
            SELECT p.id FROM projects p
            LEFT JOIN contracts c ON c.project_id = p.id
            GROUP BY p.id
            HAVING ABS(p.received - COALESCE(SUM(c.received), 0)) > 0.01
        ) AS t2 LIMIT 10)
        
        +
        
        -- 订单-请款明细一致性得分
        (SELECT 100 - COUNT(*) * 10 FROM (
            SELECT o.id FROM orders o
            LEFT JOIN payment_requests pr ON pr.order_id = o.id
            GROUP BY o.id
            HAVING ABS(o.received_amount - COALESCE(SUM(pr.received_amount), 0)) > 0.01
        ) AS t3 LIMIT 10)
    ) / 3 AS 平均得分;

-- 5.2 孤儿记录数量统计
SELECT 
    '孤儿记录总数' AS 检查项,
    (
        (SELECT COUNT(*) FROM payment_request_batches WHERE salesman_id IS NOT NULL AND salesman_id NOT IN (SELECT id FROM employees))
        + (SELECT COUNT(*) FROM receipts WHERE salesman_id IS NOT NULL AND salesman_id NOT IN (SELECT id FROM employees))
        + (SELECT COUNT(*) FROM finances WHERE contract_id IS NOT NULL AND contract_id NOT IN (SELECT id FROM contracts))
        + (SELECT COUNT(*) FROM payment_requests WHERE order_id IS NOT NULL AND order_id NOT IN (SELECT id FROM orders))
        + (SELECT COUNT(*) FROM receipt_items WHERE payment_request_id IS NOT NULL AND payment_request_id NOT IN (SELECT id FROM payment_requests))
    ) AS 孤儿记录总数;

-- ============================================
-- 执行说明
-- ============================================
-- 1. 执行此脚本，查看各项检查结果
-- 2. 不一致记录数应为0，表示数据完全一致
-- 3. 查询耗时应在预期范围内
-- 4. 孤儿记录总数应为0
-- 5. 如果发现问题，需要进一步排查和修复
-- ============================================
