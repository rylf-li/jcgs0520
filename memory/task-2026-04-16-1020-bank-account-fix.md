# 银行账户多账户支持 · 实施完成 · 2026-04-16

## 问题修复：Unknown column 'updatedAt'

### 根因
`models/index.js` 全局设置 `underscored: false`，Sequelize 期望列名 `createdAt`/`updatedAt`（驼峰）。
但数据库 `bank_accounts` 表的列名是 `created_at`/`updated_at`（下划线）。

### 修复
`backend/src/models/BankAccount.js` 单独设置 `underscored: true`：
```js
}, { tableName: 'bank_accounts', comment: '银行账户表', underscored: true });
```

## 实施总结

### 后端改动（10个文件）
| 文件 | 操作 |
|------|------|
| `backend/src/models/BankAccount.js` | 新建（银行账户模型） |
| `backend/src/models/Contract.js` | 更新（新增 bank_account_id/bank_account_name） |
| `backend/src/models/Finance.js` | 更新（新增 bank_account_id/bank_account_name） |
| `backend/src/models/index.js` | 更新（注册 BankAccount 及关联） |
| `backend/src/routes/bankAccounts.js` | 新建（银行账户 CRUD 接口） |
| `backend/src/routes/contracts.js` | 更新（自动填充 bank_account_name） |
| `backend/src/routes/finance.js` | 更新（生成财务时带入银行账户） |
| `backend/src/routes/importExport.js` | 更新（支持银行账户导入导出） |
| `backend/src/app.js` | 更新（挂载新路由） |
| `backend/migrations/add_bank_accounts.sql` | 新建（数据库迁移脚本） |

### 前端改动（4个文件）
| 文件 | 操作 |
|------|------|
| `frontend/src/api/index.js` | 更新（新增 bankAccountApi） |
| `frontend/src/views/company/Detail.vue` | 更新（银行账户管理模块） |
| `frontend/src/views/contract/Detail.vue` | 更新（收款账户下拉选择） |
| `frontend/src/views/finance/Index.vue` | 更新（入账银行列） |

## 当前服务状态
- 后端：✅ 运行中（port 3001）
- 前端：✅ 运行中（port 5173）

## 待测试
1. 公司详情页添加/编辑/删除银行账户
2. 合同详情页选择收款账户
3. 财务列表显示入账银行
4. 导入导出银行账户
