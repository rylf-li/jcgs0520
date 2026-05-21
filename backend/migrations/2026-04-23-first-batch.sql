ALTER TABLE employees
  MODIFY role ENUM('admin','manager','sales','staff') NOT NULL DEFAULT 'staff',
  ADD COLUMN monthly_salary DECIMAL(15,2) DEFAULT 0 COMMENT '月薪工资' AFTER password,
  ADD COLUMN social_security_fee DECIMAL(15,2) DEFAULT 0 COMMENT '社保费' AFTER monthly_salary;

ALTER TABLE projects
  ADD COLUMN salesman_id INT NULL COMMENT '业务员ID' AFTER manager;

ALTER TABLE contracts
  ADD COLUMN salesman_id INT NULL COMMENT '业务员ID' AFTER manager;

ALTER TABLE orders
  ADD COLUMN salesman_id INT NULL COMMENT '业务员ID' AFTER manager,
  ADD COLUMN payment_status VARCHAR(20) NULL COMMENT '请收款状态' AFTER status,
  ADD COLUMN requested_amount DECIMAL(15,2) DEFAULT 0 COMMENT '累计请款金额' AFTER payment_status,
  ADD COLUMN received_amount DECIMAL(15,2) DEFAULT 0 COMMENT '累计收款金额' AFTER requested_amount,
  ADD COLUMN performance_amount DECIMAL(15,2) DEFAULT 0 COMMENT '累计绩效金额' AFTER received_amount,
  ADD COLUMN calc_version INT DEFAULT 1 COMMENT '计算版本' AFTER performance_amount,
  ADD COLUMN is_dirty TINYINT DEFAULT 0 COMMENT '是否存在待处理差异' AFTER calc_version,
  ADD COLUMN last_recalc_at DATETIME NULL COMMENT '最近重算时间' AFTER is_dirty;

ALTER TABLE finances
  ADD COLUMN order_id INT NULL COMMENT '订单ID' AFTER contract_no,
  ADD COLUMN order_no VARCHAR(50) NULL COMMENT '订单编号' AFTER order_id,
  ADD COLUMN project_id INT NULL COMMENT '项目ID' AFTER order_no,
  ADD COLUMN customer_id INT NULL COMMENT '客户ID' AFTER company_name,
  ADD COLUMN source_type VARCHAR(50) NULL COMMENT '来源类型' AFTER attachment,
  ADD COLUMN source_id INT NULL COMMENT '来源ID' AFTER source_type,
  ADD COLUMN company_bank_account VARCHAR(100) NULL COMMENT '公司银行账号快照' AFTER source_id;

CREATE TABLE IF NOT EXISTS payment_requests (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  request_no VARCHAR(50) UNIQUE,
  date DATE NULL,
  order_id INT NULL,
  order_no VARCHAR(50) NULL,
  contract_id INT NULL,
  contract_no VARCHAR(50) NULL,
  project_id INT NULL,
  project_no VARCHAR(50) NULL,
  project_name VARCHAR(200) NULL,
  customer_id INT NULL,
  customer_name VARCHAR(100) NULL,
  company_id INT NULL,
  company_name VARCHAR(100) NULL,
  dept_id INT NULL,
  dept_name VARCHAR(50) NULL,
  salesman_id INT NULL,
  salesman_name VARCHAR(50) NULL,
  request_amount DECIMAL(15,2) DEFAULT 0,
  received_amount DECIMAL(15,2) DEFAULT 0,
  snapshot_total DECIMAL(15,2) DEFAULT 0,
  snapshot_settlement_fee DECIMAL(15,2) DEFAULT 0,
  snapshot_performance_fee DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT '草稿',
  remark TEXT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
