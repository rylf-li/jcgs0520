CREATE TABLE IF NOT EXISTS payment_request_batches (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  batch_no VARCHAR(50) NULL UNIQUE COMMENT '请款批次号',
  date DATE NULL COMMENT '请款日期',
  contract_id INT NULL COMMENT '合同ID',
  contract_no VARCHAR(50) NULL COMMENT '合同编号',
  project_id INT NULL COMMENT '项目ID',
  project_name VARCHAR(200) NULL COMMENT '项目名称',
  customer_id INT NULL COMMENT '客户ID',
  customer_name VARCHAR(100) NULL COMMENT '客户名称',
  company_id INT NULL COMMENT '公司ID',
  company_name VARCHAR(100) NULL COMMENT '公司名称',
  dept_id INT NULL COMMENT '部门ID',
  dept_name VARCHAR(50) NULL COMMENT '部门名称',
  salesman_id INT NULL COMMENT '业务员ID',
  salesman_name VARCHAR(50) NULL COMMENT '业务员名称',
  request_total_amount DECIMAL(15,2) DEFAULT 0 COMMENT '请款总金额',
  received_total_amount DECIMAL(15,2) DEFAULT 0 COMMENT '累计实收金额',
  discount_amount DECIMAL(15,2) DEFAULT 0 COMMENT '折扣金额',
  status VARCHAR(20) NULL COMMENT '状态',
  remark TEXT NULL COMMENT '备注',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS receipts (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  receipt_no VARCHAR(50) NULL UNIQUE COMMENT '收款编号',
  date DATE NULL COMMENT '收款日期',
  batch_id INT NULL COMMENT '请款批次ID',
  batch_no VARCHAR(50) NULL COMMENT '请款批次号',
  contract_id INT NULL COMMENT '合同ID',
  contract_no VARCHAR(50) NULL COMMENT '合同编号',
  project_id INT NULL COMMENT '项目ID',
  project_name VARCHAR(200) NULL COMMENT '项目名称',
  customer_id INT NULL COMMENT '客户ID',
  customer_name VARCHAR(100) NULL COMMENT '客户名称',
  company_id INT NULL COMMENT '公司ID',
  company_name VARCHAR(100) NULL COMMENT '公司名称',
  dept_id INT NULL COMMENT '部门ID',
  dept_name VARCHAR(50) NULL COMMENT '部门名称',
  salesman_id INT NULL COMMENT '业务员ID',
  salesman_name VARCHAR(50) NULL COMMENT '业务员名称',
  bank_account_id INT NULL COMMENT '银行账户ID',
  bank_account_name VARCHAR(100) NULL COMMENT '银行账户名称',
  account_type VARCHAR(20) NULL COMMENT '账户类型',
  planned_amount DECIMAL(15,2) DEFAULT 0 COMMENT '应收参考金额',
  actual_amount DECIMAL(15,2) DEFAULT 0 COMMENT '实际收款金额',
  discount_amount DECIMAL(15,2) DEFAULT 0 COMMENT '折扣金额',
  status VARCHAR(20) NULL COMMENT '状态',
  remark TEXT NULL COMMENT '备注',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS receipt_items (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  receipt_id INT NOT NULL COMMENT '收款记录ID',
  payment_request_id INT NOT NULL COMMENT '请款明细ID',
  allocated_amount DECIMAL(15,2) DEFAULT 0 COMMENT '分配金额',
  remark TEXT NULL COMMENT '备注',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE payment_requests
  ADD COLUMN batch_id INT NULL COMMENT '请款批次ID' AFTER request_no,
  ADD COLUMN batch_no VARCHAR(50) NULL COMMENT '请款批次号' AFTER batch_id,
  ADD COLUMN sort_no INT DEFAULT 0 COMMENT '批次内排序' AFTER snapshot_performance_fee,
  ADD COLUMN request_status VARCHAR(20) NULL COMMENT '请款状态' AFTER sort_no;

ALTER TABLE finances
  ADD COLUMN batch_id INT NULL COMMENT '请款批次ID' AFTER attachment,
  ADD COLUMN batch_no VARCHAR(50) NULL COMMENT '请款批次号' AFTER batch_id,
  ADD COLUMN receipt_id INT NULL COMMENT '收款记录ID' AFTER batch_no,
  ADD COLUMN receipt_no VARCHAR(50) NULL COMMENT '收款编号' AFTER receipt_id,
  ADD COLUMN account_type VARCHAR(20) NULL COMMENT '账户类型' AFTER receipt_no;
