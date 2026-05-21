-- =====================================================
-- 数据库结构修复迁移脚本
-- 生成时间: 2026-05-20
-- 说明: 修复订单状态定义、请款单重复字段、审计信息缺失等问题
-- =====================================================

-- 1. 修改订单表状态字段
-- 先修改为VARCHAR以支持数据迁移
ALTER TABLE orders MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT '待审核' COMMENT '状态';

-- 更新现有数据：将'待处理'映射为'待审核'
UPDATE orders SET status = '待审核' WHERE status = '待处理';

-- 修改为新的ENUM类型
ALTER TABLE orders MODIFY COLUMN status ENUM('待审核','已审核','进行中','已完成','已取消') NOT NULL DEFAULT '待审核' COMMENT '状态';

-- 2. 为订单表添加复核审计字段
ALTER TABLE orders 
  ADD COLUMN reviewed_by INT NULL COMMENT '复核人ID' AFTER last_recalc_at,
  ADD COLUMN reviewed_by_name VARCHAR(50) NULL COMMENT '复核人姓名' AFTER reviewed_by,
  ADD COLUMN reviewed_at DATETIME NULL COMMENT '复核时间' AFTER reviewed_by_name;

-- 3. 修改请款单表状态字段
-- 先修改为VARCHAR以支持数据迁移
ALTER TABLE payment_requests MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT '草稿' COMMENT '状态';

-- 从request_status字段迁移数据（如果存在）
UPDATE payment_requests pr 
SET status = COALESCE(pr.request_status, pr.status, '草稿')
WHERE pr.request_status IS NOT NULL OR pr.status IS NOT NULL;

-- 删除request_status字段（如果存在）
ALTER TABLE payment_requests DROP COLUMN IF EXISTS request_status;

-- 修改为新的ENUM类型
ALTER TABLE payment_requests MODIFY COLUMN status ENUM('草稿','待审核','已审核','已完成','已取消') NOT NULL DEFAULT '草稿' COMMENT '状态';

-- 4. 为请款单表添加审批审计字段
ALTER TABLE payment_requests
  ADD COLUMN approved_by INT NULL COMMENT '审批人ID' AFTER remark,
  ADD COLUMN approved_by_name VARCHAR(50) NULL COMMENT '审批人姓名' AFTER approved_by,
  ADD COLUMN approved_at DATETIME NULL COMMENT '审批时间' AFTER approved_by_name;

-- 5. 添加索引优化查询性能
CREATE INDEX idx_orders_reviewed_by ON orders(reviewed_by);
CREATE INDEX idx_payment_requests_approved_by ON payment_requests(approved_by);
CREATE INDEX idx_payment_requests_status ON payment_requests(status);

-- 6. 添加外键约束建议（可选，需要根据实际情况决定是否执行）
-- 注意：执行前请确保数据一致性，否则会失败
-- ALTER TABLE orders 
--   ADD CONSTRAINT fk_order_contract 
--   FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL ON UPDATE CASCADE,
--   ADD CONSTRAINT fk_order_salesman 
--   FOREIGN KEY (salesman_id) REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ALTER TABLE payment_requests
--   ADD CONSTRAINT fk_payment_request_order 
--   FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL ON UPDATE CASCADE,
--   ADD CONSTRAINT fk_payment_request_contract 
--   FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================
-- 迁移脚本执行完毕
-- =====================================================
-- 执行建议：
-- 1. 执行前请备份数据库
-- 2. 建议在测试环境先验证
-- 3. 外键约束建议在数据清理干净后再添加
-- =====================================================
