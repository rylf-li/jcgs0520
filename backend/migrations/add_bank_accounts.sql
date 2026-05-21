-- Multi-Bank-Account Support Migration
-- This migration adds support for multiple bank accounts per company

-- 1. Create bank_accounts table
CREATE TABLE IF NOT EXISTS `bank_accounts` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL COMMENT '所属公司ID',
  `company_name` VARCHAR(100) NOT NULL COMMENT '所属公司名称',
  `account_name` VARCHAR(100) NOT NULL COMMENT '账户名称',
  `bank_account` VARCHAR(50) NOT NULL COMMENT '银行账号',
  `bank_name` VARCHAR(100) COMMENT '开户行名称',
  `account_type` ENUM('公账', '私账', '其他') DEFAULT '公账' COMMENT '账户类型',
  `is_default` BOOLEAN DEFAULT FALSE COMMENT '是否默认账户',
  `remark` VARCHAR(500) COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_account_name` (`account_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='银行账户表';

-- 2. Add bank_account_id and bank_account_name to contracts table
ALTER TABLE `contracts`
ADD COLUMN `bank_account_id` INT NULL COMMENT '银行账户ID' AFTER `settlement_method`,
ADD COLUMN `bank_account_name` VARCHAR(100) NULL COMMENT '银行账户名称' AFTER `bank_account_id`,
ADD INDEX `idx_bank_account_id` (`bank_account_id`);

-- 3. Add bank_account_id and bank_account_name to finances table
ALTER TABLE `finances`
ADD COLUMN `bank_account_id` INT NULL COMMENT '银行账户ID' AFTER `attachment`,
ADD COLUMN `bank_account_name` VARCHAR(100) NULL COMMENT '银行账户名称' AFTER `bank_account_id`,
ADD INDEX `idx_bank_account_id` (`bank_account_id`);

-- 4. Migrate existing data from companies.bank_account to bank_accounts table
-- Insert default bank accounts for each company that has bank_account data
INSERT INTO `bank_accounts` (`company_id`, `company_name`, `account_name`, `bank_account`, `bank_name`, `account_type`, `is_default`, `created_at`, `updated_at`)
SELECT
  `id` AS `company_id`,
  `name` AS `company_name`,
  '默认账户' AS `account_name`,
  `bank_account`,
  `bank_name`,
  '公账' AS `account_type`,
  TRUE AS `is_default`,
  NOW() AS `created_at`,
  NOW() AS `updated_at`
FROM `companies`
WHERE `bank_account` IS NOT NULL AND `bank_account` != '';

-- 5. Update contracts.bank_account_id and bank_account_name based on company
UPDATE `contracts` c
INNER JOIN `bank_accounts` ba ON ba.company_id = c.company_id AND ba.is_default = TRUE
SET
  c.bank_account_id = ba.id,
  c.bank_account_name = ba.account_name
WHERE c.company_id IS NOT NULL;

-- 6. Update finances.bank_account_id and bank_account_name from contract
UPDATE `finances` f
INNER JOIN `contracts` c ON f.contract_id = c.id
SET
  f.bank_account_id = c.bank_account_id,
  f.bank_account_name = c.bank_account_name
WHERE f.contract_id IS NOT NULL;

-- 7. Add foreign key constraints (optional, uncomment if needed)
-- ALTER TABLE `bank_accounts` ADD CONSTRAINT `fk_bank_accounts_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE;
-- ALTER TABLE `contracts` ADD CONSTRAINT `fk_contracts_bank_account` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts`(`id`) ON DELETE SET NULL;
-- ALTER TABLE `finances` ADD CONSTRAINT `fk_finances_bank_account` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts`(`id`) ON DELETE SET NULL;
