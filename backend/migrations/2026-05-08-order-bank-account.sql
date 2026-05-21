ALTER TABLE `orders`
  ADD COLUMN `bank_account_id` INT NULL COMMENT '银行账户ID' AFTER `company_name`,
  ADD COLUMN `bank_account_name` VARCHAR(100) NULL COMMENT '银行账户名称' AFTER `bank_account_id`;
