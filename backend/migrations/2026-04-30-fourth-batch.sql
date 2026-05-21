ALTER TABLE orders
  ADD COLUMN dirty_reason TEXT NULL COMMENT '差异原因说明' AFTER is_dirty;
