---
name: fix-business-import-fields
overview: 修复后端 importExport.js 中 business 模块的导入导出字段配置，补充缺失的 project/parameter/settlement_fee/performance_fee 四个字段
todos:
  - id: fix-business-fields
    content: 更新 importExport.js 的 business 字段配置，补全4个缺失字段并移除废弃的 description
    status: completed
---

## 产品概述

修复后端 `importExport.js` 中业务（business）模块的字段配置不完整问题，使其与数据库表结构和 Sequelize 模型定义完全一致。

## 核心功能

- **补全缺失字段**：在 `FIELD_CONFIGS.business` 配置中添加4个缺失字段：project（业务项目）、parameter（业务参数）、settlement_fee（结算费率%）、performance_fee（绩效率%）
- **移除废弃字段**：移除配置中已从模型中删除的 `description` 字段
- **确保导入导出一致性**：修复后，业务数据的 Excel 导入模板下载、数据导出、Excel 导入三个功能均能正确处理全部10个业务字段

## 当前状态 vs 目标状态

| 项目 | 当前配置 | 数据库/模型实际 |
| --- | --- | --- |
| name | 有 | 有 |
| category | 有 | 有 |
| unit | 有 | 有 |
| unit_price | 有 | 有 |
| description | **有（多余）** | 无 |
| remark | 有 | 有 |
| project | **缺失** | VARCHAR(200) |
| parameter | **缺失** | VARCHAR(200) |
| settlement_fee | **缺失** | DECIMAL(10,2) |
| performance_fee | **缺失** | DECIMAL(10,2) |


## 技术栈

- 运行时: Node.js + Express.js
- ORM: Sequelize (MySQL)
- Excel 处理: XLSX (SheetJS)
- 修改文件: `backend/src/routes/importExport.js`

## 实现方案

### 修改策略

直接编辑 `importExport.js` 第66-73行的 `business` 字段配置数组：

1. 移除不存在的 `description` 字段
2. 按模型字段顺序插入 `project`、`parameter`、`settlement_fee`、`performance_fee` 四个字段
3. 数字类型字段（unit_price, settlement_fee, performance_fee）标注 `type: 'number'`

### 修改后的目标配置

```javascript
business: [
    { field: 'name', label: '业务名称', required: true },
    { field: 'category', label: '业务类别' },
    { field: 'project', label: '业务项目' },
    { field: 'parameter', label: '业务参数' },
    { field: 'unit', label: '业务单位' },
    { field: 'unit_price', label: '业务单价', type: 'number' },
    { field: 'settlement_fee', label: '结算费率(%)', type: 'number' },
    { field: 'performance_fee', label: '绩效率(%)', type: 'number' },
    { field: 'remark', label: '备注' }
]
```

### 实现注意事项

- **向后兼容**：已有导入逻辑基于字段名映射，新增字段不会影响旧数据的导入导出
- **顺序合理性**：字段按业务语义分组排列（基础信息 → 项目参数 → 价格费率 → 备注）
- **无需重启额外服务**：修改文件后 Node.js 开发环境（应已启用热重载或需手动重启后端）即可生效
- **无破坏性变更**：仅增加字段配置和移除一个无效字段，不影响其他模块的导入导出功能

## 架构设计

本任务为单文件局部修改，不涉及架构变更。`FIELD_CONFIGS.business` 配置被以下功能消费：

- **模板下载** (`GET /api/import-export/template/:type`) — 读取配置生成 Excel 表头
- **数据导出** (`GET /api/export/:type`) — 读取配置决定导出哪些列
- **数据导入** (`POST /api/import/:type`) — 读取配置将 Excel 列映射到 DB 字段

## 目录结构

```
backend/src/routes/
└── importExport.js    # [MODIFY] 更新 FIELD_CONFIGS.business 配置（第66-73行）
```