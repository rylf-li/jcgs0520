# 项目导入错误修复 · 2026-04-15 16:52

## 问题描述
项目管理模块导入时出现两个错误：
1. `Unknown column 'phone' in 'field list'`
2. `Unknown column 'contract_no' in 'field list'`

## 根因分析
错误发生在 `importExport.js` 的 `getCache` 函数（第147行）：

```javascript
cache[modelKey] = await config.model.findAll({ 
  attributes: ['id', 'name', 'phone', 'contract_no', 'order_no', 'project_no'] 
});
```

该代码对所有模型使用固定的字段列表查询，但不同模型的字段不同：
- `customers` 表有 `phone`，但没有 `contract_no`
- `projects` 表有 `project_no`，但没有 `phone`
- `contracts` 表有 `contract_no`，但没有 `phone`

当导入项目时，查找客户缓存会触发 `customers.findAll({attributes:['phone',...]})`，而 customers 表没有 `contract_no` 等字段，导致报错。

## 修复方案
修改 `getCache` 函数，移除固定的 `attributes` 限制，查询所有字段：

```javascript
async function getCache(modelKey) {
  if (cache[modelKey]) return cache[modelKey];
  const config = MODELS[modelKey];
  if (!config) return null;
  // 查询所有字段，避免不同模型字段不一致导致的错误
  cache[modelKey] = await config.model.findAll();
  return cache[modelKey];
}
```

## 状态
- ✅ 后端代码已修复
- ✅ 服务已重启（端口 3001）
- ⏳ 待用户重新导入测试

## 文件
`backend/src/routes/importExport.js` 第 144-151 行
