ALTER TABLE dept_stats
  ADD COLUMN company_id INT NULL COMMENT '公司ID' AFTER date,
  ADD COLUMN company_name VARCHAR(100) NULL COMMENT '公司名称' AFTER company_id,
  ADD COLUMN project_count INT DEFAULT 0 COMMENT '项目数量' AFTER company_name;

ALTER TABLE company_stats
  ADD COLUMN project_count INT DEFAULT 0 COMMENT '项目数量' AFTER date;

ALTER TABLE customer_stats
  ADD COLUMN contract_count INT DEFAULT 0 COMMENT '合同数量' AFTER date;
