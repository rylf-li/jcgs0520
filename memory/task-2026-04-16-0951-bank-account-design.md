# 银行账户多账户支持方案分析 · 2026-04-16

## 一、问题现状

### 1.1 当前数据结构
```
companies 表
├── bank_account (单值)  ← 一个公司只能存一个银行账号
└── bank_name  (单值)

contracts 表
├── bank_account (单值)
└── bank_name  (单值)

finances 表
├── payee_bank (收款行 = 我方收款银行)
└── payer_bank (付款行 = 对方付款银行)
```

### 1.2 业务需求
- 一个公司可能有多个银行账户（公账、私账）
- 项目、合同、订单不需要区分公司
- 但财务记录需要区分入账银行（公账 vs 私账）

### 1.3 核心矛盾
- 公司是法律/业务主体，不应绑定具体银行
- 银行账户是资金通道，应该独立管理
- 合同签订时可指定收款账户
- 财务记录需要准确记录入账银行

---

## 二、方案对比

### 方案A：纯字符串字段（当前方式）
**做法**：在 `contracts` 和 `finances` 中直接存银行名称字符串

| 优点 | 缺点 |
|------|------|
| 改动最小 | 数据不一致（同一个银行写不同名称） |
| 简单直接 | 无法统计某个账户的汇总金额 |
| | 无法管理银行账户本身 |
| | 公账私账混用无法区分 |

### 方案B：银行账户独立表（推荐）
**做法**：新增 `bank_accounts` 表，建立公司与银行账户的1:N关系

```
companies ──1:N── bank_accounts
                ├── account_name（账户名称，如"公账"）
                ├── bank_account（账号）
                ├── bank_name（开户行）
                └── account_type（账户类型：公账/私账）

contracts ──N:1── bank_accounts（合同指定的收款账户）
orders     ──N:1── bank_accounts（通过合同间接关联）
finances   ──N:1── bank_accounts（入账银行）
```

| 优点 | 缺点 |
|------|------|
| 数据标准化，不一致 | 改动较大 |
| 支持账户类型分类 | 历史数据需要迁移 |
| 可以统计各账户汇总 | 界面改动较多 |
| 灵活：合同可换收款账户 | |
| 财务可准确追溯入账银行 | |

---

## 三、实施方案（方案B详细设计）

### 3.1 新建 bank_accounts 表

```sql
CREATE TABLE bank_accounts (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  company_id   INT NOT NULL COMMENT '所属公司ID',
  company_name VARCHAR(100) COMMENT '所属公司名称（冗余存储）',
  account_name VARCHAR(50) NOT NULL COMMENT '账户名称（如：公账/私账/支付宝）',
  bank_account VARCHAR(50) NOT NULL COMMENT '银行账号',
  bank_name    VARCHAR(100) COMMENT '开户行名称',
  account_type ENUM('公账', '私账', '其他') DEFAULT '公账' COMMENT '账户类型',
  is_default   TINYINT DEFAULT 0 COMMENT '是否默认账户',
  remark       TEXT COMMENT '备注',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_company (company_id)
) COMMENT='公司银行账户表';
```

### 3.2 改动范围

#### 数据库层
| 表 | 改动 |
|----|------|
| `bank_accounts` | 新建 |
| `contracts` | 新增 `bank_account_id` 字段（可空） |
| `finances` | 新增 `bank_account_id` 字段（可空） |
| `companies` | 保留原字段（兼容历史数据） |

#### 后端层
| 文件 | 改动 |
|------|------|
| `models/BankAccount.js` | 新建 |
| `routes/bankAccounts.js` | 新建（CRUD接口） |
| `routes/contracts.js` | 新增 bank_account_id 字段读写 |
| `routes/finance.js` | 新增 bank_account_id 字段读写 |
| `models/index.js` | 注册新模型 |
| `app.js` | 挂载新路由 |

#### 前端层
| 文件 | 改动 |
|------|------|
| `views/company/Detail.vue` | 添加"管理银行账户"按钮，弹窗列表管理 |
| `views/contract/Detail.vue` | 编辑表单中客户名下拉改为合同详情中收款账户选择 |
| `views/finance/Index.vue` | 添加入账银行选择列/筛选 |

---

## 四、数据迁移策略

### 阶段一：兼容模式（不改历史数据）
- `companies` 表原字段保留
- 新增 `bank_accounts` 表
- 合同和财务新增 `bank_account_id`（可空）
- 前端优先显示 bank_account_id 对应账户，原字段作为 fallback

### 阶段二：数据迁移
- 将 companies 表的 bank_account 迁移到 bank_accounts 表
- 将 contracts 表的 bank_account 迁移到 bank_accounts 表
- 清空原字段（或保留备查）

### 阶段三：清理
- 前端移除原字段相关代码
- 数据库删除冗余字段

---

## 五、接口设计

### 5.1 银行账户CRUD
```
GET    /api/bank-accounts              # 列表（支持 company_id 筛选）
GET    /api/bank-accounts/:id          # 详情
POST   /api/bank-accounts              # 创建
PUT    /api/bank-accounts/:id          # 更新
DELETE /api/bank-accounts/:id          # 删除
GET    /api/companies/:id/bank-accounts # 获取某公司的所有账户
```

### 5.2 合同相关改动
- 列表/详情返回 `bank_account_id` 和 `bank_account_name`
- 编辑时可选择收款账户（从 bank_accounts 表选择）
- 生成财务时自动带入合同指定的收款账户

### 5.3 财务相关改动
- 列表新增"入账银行"列
- 编辑时可选择入账账户
- 支持按入账银行筛选

---

## 六、影响评估

### 改动范围
- 数据库表：4个（新建1个，修改2个）
- 后端文件：6个
- 前端文件：3个
- 预计工作量：中等

### 风险点
1. 历史数据需要清理迁移
2. 导入导出需要同步更新
3. 用户习惯改变（需要先建银行账户再签合同）

### 回滚方案
- 数据库改动保持兼容模式
- 随时可回退到纯字符串模式
