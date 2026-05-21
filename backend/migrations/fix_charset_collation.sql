-- ========================================
-- 修复数据库字符集和排序规则问题
-- 运行前请先备份数据库！
-- ========================================

-- 1. 查看当前数据库的字符集设置
SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME 
FROM information_schema.SCHEMATA 
WHERE SCHEMA_NAME = 'engineering_mgmt';

-- 2. 查看 orders 表的字符集
SELECT TABLE_NAME, TABLE_COLLATION 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'engineering_mgmt' 
AND TABLE_NAME IN ('orders', 'contracts', 'business');

-- 3. 查看关键字段的排序规则
SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'engineering_mgmt'
AND TABLE_NAME = 'orders'
AND CHARACTER_SET_NAME IS NOT NULL;

-- 4. 检查是否有存储过程使用 latin1 排序规则
SELECT SPECIFIC_NAME, ROUTINE_TYPE, DATA_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
FROM information_schema.PARAMETERS
WHERE SPECIFIC_SCHEMA = 'engineering_mgmt'
AND CHARACTER_SET_NAME IS NOT NULL
UNION ALL
SELECT SPECIFIC_NAME, ROUTINE_TYPE, DATA_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'engineering_mgmt'
AND CHARACTER_SET_NAME IS NOT NULL;

-- 5. 【关键修复】确保数据库使用 utf8mb4
ALTER DATABASE engineering_mgmt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 6. 【关键修复】将 orders 表转换为 utf8mb4
ALTER TABLE orders CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 7. 将其他相关表也转换
SET @tables = NULL;
SELECT GROUP_CONCAT(table_name) INTO @tables
FROM information_schema.tables 
WHERE table_schema = 'engineering_mgmt' 
AND table_name IN ('contracts', 'business', 'employees', 'customers', 'departments', 'companies', 'finances', 'projects', 'performances', 'salaries', 'bank_accounts');

SET @sql = CONCAT('ALTER TABLE ', REPLACE(@tables, ',', ' CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, ALTER TABLE '), ' CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 8. 检查并修复特定字段（如果有 latin1 字段）
-- 先查看哪些字段有问题
SELECT COLUMN_NAME, TABLE_NAME, CHARACTER_SET_NAME, COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'engineering_mgmt'
AND COLLATION_NAME LIKE 'latin1%';

-- 9. 如果发现有 latin1 字段，执行以下命令修复（替换 table_name 和 column_name）
-- ALTER TABLE table_name MODIFY column_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 10. 验证修复结果
SELECT '修复完成！' AS status;
SHOW VARIABLES LIKE 'character_set%';
SHOW VARIABLES LIKE 'collation%';
