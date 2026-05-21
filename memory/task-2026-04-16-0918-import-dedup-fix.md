# 导入去重逻辑修复 · 2026-04-16 09:18

## 问题描述
项目管理导入时没有排除重复数据，每次导入都创建新项目，即使项目名称相同。

## 根因分析
原去重逻辑（第417-420行）：
```javascript
if (modelConfig.uniqueKey && record[modelConfig.uniqueKey]) {
  existing = await Model.findOne({ where: { [modelConfig.uniqueKey]: record[modelConfig.uniqueKey] } });
}
```

问题：
- projects 的 uniqueKey 是 `'project_no'`（项目编号）
- Excel 中项目编号通常为空
- 当 `project_no` 为空时，条件为 falsy，去重不生效
- 结果：每次导入都创建新项目

## 修复方案
增加二级回退机制：
1. **第一级**：如果唯一键有值，用唯一键查找
2. **第二级**：如果唯一键为空，用 `name` 字段查找同名记录

修改后代码（第415-424行）：
```javascript
let existing = null;
if (modelConfig.uniqueKey && record[modelConfig.uniqueKey]) {
  // 第一级：使用唯一键查找
  existing = await Model.findOne({ where: { [modelConfig.uniqueKey]: record[modelConfig.uniqueKey] } });
} else if (record.name) {
  // 第二级：如果唯一键为空或未配置，尝试用 name 字段查找同名记录
  existing = await Model.findOne({ where: { name: record.name } });
}
```

## 影响范围
- 所有配置了唯一键但该字段可能为空的模块（projects、contracts、orders、finances）
- 其他模块不受影响

## 状态
- ✅ 代码已修复
- ✅ 后端已重启（端口 3001）
- ✅ 前端运行中（端口 5173）
- ⏳ 待用户测试导入功能

## 文件
`backend/src/routes/importExport.js` 第415-424行
