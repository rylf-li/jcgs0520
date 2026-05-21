ALTER TABLE performance
  ADD COLUMN order_no VARCHAR(50) NULL COMMENT '订单编号' AFTER order_id,
  ADD COLUMN project_id INT NULL COMMENT '项目ID' AFTER contract_no,
  ADD COLUMN project_name VARCHAR(200) NULL COMMENT '项目名称' AFTER project_id,
  ADD COLUMN received_amount DECIMAL(15,2) DEFAULT 0 COMMENT '已收金额' AFTER sales_amount,
  ADD COLUMN performance_rate DECIMAL(10,4) DEFAULT 0 COMMENT '绩效比例' AFTER received_amount,
  ADD COLUMN status VARCHAR(20) NULL COMMENT '状态' AFTER performance_amount;
