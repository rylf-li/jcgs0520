# 项目导入客户名称无法保存 · 2026-04-16 09:28

## 问题
项目管理导入时，客户名称（customer_name）无法保存到数据库。

## 根因分析
导入逻辑第392-398行：
```javascript
if (f.lookup && value) {
  const id = await lookupId(f.lookup, f.lookupBy, value);
  if (id) {
    record[f.setField] = id;  // 只设置 customer_id
  }
  // ...
} else if (!f.setField) {
  record[f.field] = value;  // 只有当没有 setField 时才设置原字段
}
```

当字段配置了 `setField` 时，只会设置外键 ID，不会设置原字段值。
但 Project 模型需要同时保存 `customer_id` 和 `customer_name`。

## 修复方案
修改逻辑，在设置外键 ID 的同时，也设置原字段值：
```javascript
if (id) {
  record[f.setField] = id;
  record[f.field] = value;  // 同时保存原字段值
}
```

## 状态
- ✅ 代码已修复
- ✅ 后端已重启
- ⏳ 待用户测试验证

## 文件
`backend/src/routes/importExport.js` 第392-407行
