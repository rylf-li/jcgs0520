<template>
  <div class="business-page">
    <!-- 顶部统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
          <el-icon><Document /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ filteredData.length }}</div>
          <div class="stat-label">业务条目</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%)">
          <el-icon><Folder /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ categoryCount }}</div>
          <div class="stat-label">业务类别</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
          <el-icon><Coin /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ fmtMoney(totalUnitPrice) }}</div>
          <div class="stat-label">单价合计</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
          <el-icon><Money /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ fmtMoney(totalPerformance) }}</div>
          <div class="stat-label">绩效费合计</div>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 工具栏 -->
      <div class="toolbar-section">
        <div class="toolbar-left">
          <div class="search-box">
            <el-icon class="search-icon"><Search /></el-icon>
            <el-input v-model="searchText" placeholder="搜索项目或参数..." clearable />
          </div>
          <el-select v-model="filterCategory" placeholder="全部类别" clearable class="category-select">
            <el-option v-for="c in allCategories" :key="c" :label="c" :value="c" />
          </el-select>
        </div>
        <div class="toolbar-right">
          <ImportExportButtons model="business" modelName="业务" @success="loadData" />
          <el-button v-if="selectedRows.length>0" type="danger" @click="batchDelete" :loading="batchLoading" class="btn-action">
            <el-icon><Delete /></el-icon>批量删除({{selectedRows.length}})
          </el-button>
          <el-button v-if="selectedRows.length>0" @click="selectedRows=[]" class="btn-ghost">取消选择</el-button>
          <el-button type="primary" @click="addRow" class="btn-primary">
            <el-icon><Plus /></el-icon> 添加行
          </el-button>
          <el-button type="success" @click="addCategoryRow" class="btn-success">
            <el-icon><FolderAdd /></el-icon> 添加类别
          </el-button>
        </div>
      </div>

      <!-- 数据表格 -->
      <div class="table-wrapper">
        <el-table
          :data="filteredData"
          :span-method="arraySpanMethod"
          :cell-class-name="tableCellClassName"
          style="width: 100%"
          v-loading="loading"
          :max-height="tableMaxHeight"
          size="large"
          @selection-change="onSelectionChange"
          class="business-table"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column label="序号" width="70" align="center">
            <template #default="{ $index }">{{ $index + 1 }}</template>
          </el-table-column>
          <el-table-column label="业务类别" width="150">
            <template #default="{ row }">
              <span class="cat-tag">{{ row.category }}</span>
            </template>
          </el-table-column>
          <el-table-column label="业务项目" min-width="180" prop="project" />
          <el-table-column label="业务参数" min-width="150" prop="parameter" />
          <el-table-column label="单价" width="130" align="right">
            <template #default="{ row }">
              <span class="money-cell">{{ fmtMoney(row.unit_price) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="单位" width="90" align="center" prop="unit" />
          <el-table-column label="结算费率(%)" width="110" align="right">
            <template #default="{ row }">
              <span class="money-cell">{{ row.settlement_fee || 0 }}%</span>
            </template>
          </el-table-column>
          <el-table-column label="绩效率(%)" width="110" align="right">
            <template #default="{ row }">
              <span class="money-cell highlight">{{ row.performance_fee || 0 }}%</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" align="center" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="openEdit(row)" class="btn-edit">
                <el-icon><Edit /></el-icon>编辑
              </el-button>
              <el-popconfirm title="确定删除？" @confirm="handleDelete(row)">
                <template #reference>
                  <el-button type="danger" size="small" class="btn-delete">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 底部统计 -->
      <div class="footer-stats" v-if="filteredData.length > 0">
        <div class="footer-item">
          <span class="footer-label">共</span>
          <span class="footer-value">{{ filteredData.length }}</span>
          <span class="footer-label">条记录，</span>
          <span class="footer-value">{{ categoryCount }}</span>
          <span class="footer-label">个类别</span>
        </div>
        <div class="footer-divider"></div>
        <div class="footer-item">
          <span class="footer-label">单价合计：</span>
          <span class="footer-value primary">{{ fmtMoney(totalUnitPrice) }}</span>
        </div>
        <div class="footer-item">
          <span class="footer-label">结算费合计：</span>
          <span class="footer-value success">{{ fmtMoney(totalSettlement) }}</span>
        </div>
        <div class="footer-item">
          <span class="footer-label">绩效费合计：</span>
          <span class="footer-value warning">{{ fmtMoney(totalPerformance) }}</span>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editId ? '编辑业务项目' : '新增业务项目'" width="520px" :close-on-click-modal="false" class="edit-dialog">
      <el-form :model="form" label-width="95px" class="edit-form">
        <el-form-item label="业务类别" required>
          <el-select v-model="form.category" filterable allow-create placeholder="选择或输入类别" style="width:100%">
            <el-option v-for="c in allCategories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="业务项目" required>
          <el-input v-model="form.project" placeholder="项目名称" />
        </el-form-item>
        <el-form-item label="业务参数">
          <el-input v-model="form.parameter" placeholder="如：土壤/水质" />
        </el-form-item>
        <el-form-item label="单价">
          <el-input-number v-model="form.unit_price" :precision="4" :min="0" :controls="false" style="width:100%" />
        </el-form-item>
        <el-form-item label="单位">
          <el-input v-model="form.unit" placeholder="如：项、个" />
        </el-form-item>
        <el-form-item label="结算费率(%)">
          <el-input-number v-model="form.settlement_fee" :precision="2" :min="0" :max="100" :controls="false" placeholder="如：5 = 5%" style="width:100%" />
        </el-form-item>
        <el-form-item label="绩效率(%)">
          <el-input-number v-model="form.performance_fee" :precision="2" :min="0" :max="100" :controls="false" placeholder="如：3 = 3%" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false" class="btn-cancel">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving" class="btn-save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { businessApi } from '@/api'
import ImportExportButtons from '@/components/ImportExportButtons.vue'

const loading = ref(false)
const selectedRows = ref([])
const batchLoading = ref(false)
const onSelectionChange = (rows) => { selectedRows.value = rows }

// 弹窗相关
const dialogVisible = ref(false)
const editId = ref(null)
const form = ref({ category: '', project: '', parameter: '', unit_price: 0, unit: '', settlement_fee: 5, performance_fee: 3 })
const saving = ref(false)

const batchDelete = async () => {
  if (selectedRows.value.length === 0) return ElMessage.warning('请先选择数据')
  try { await ElMessageBox.confirm('确定删除选中的 ' + selectedRows.value.length + ' 条业务项目吗？', '批量删除', { type: 'warning' }) } catch { return }
  batchLoading.value = true
  try {
    let ok = 0
    for (const row of selectedRows.value) {
      if (row.id) { try { const r = await businessApi.delete(row.id); if (r.success) ok++ } catch {} }
      else { const idx = allData.value.indexOf(row); if (idx > -1) allData.value.splice(idx, 1); ok++ }
    }
    ElMessage.success('成功删除 ' + ok + ' 条记录')
    selectedRows.value = []
    loadData()
  } finally { batchLoading.value = false }
}
const allData = ref([])       // 全部原始数据
const searchText = ref('')
const filterCategory = ref('')
const allCategories = ref([])
const tableMaxHeight = ref(600)

// 过滤后的数据
const filteredData = computed(() => {
  let data = allData.value
  if (filterCategory.value) {
    data = data.filter(r => r.category === filterCategory.value)
  }
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    data = data.filter(r =>
      (r.project || '').toLowerCase().includes(kw) ||
      (r.parameter || '').toLowerCase().includes(kw) ||
      (r.category || '').toLowerCase().includes(kw)
    )
  }
  return data
})

// 类别数量
const categoryCount = computed(() => new Set(filteredData.value.map(r => r.category)).size)

// 合计
const totalUnitPrice = computed(() => filteredData.value.reduce((s, r) => s + (Number(r.unit_price) || 0), 0))
const totalSettlement = computed(() => filteredData.value.reduce((s, r) => s + (Number(r.settlement_fee) || 0), 0))
const totalPerformance = computed(() => filteredData.value.reduce((s, r) => s + (Number(r.performance_fee) || 0), 0))

const fmtMoney = (v) => v.toLocaleString('zh-CN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })

// 表格合并单元格（按类别合并第一列）
const arraySpanMethod = ({ row, column, rowIndex, columnIndex }) => {
  if (columnIndex !== 1) return [1, 1]
  if (!filterCategory.value) {
    // 需要在 filteredData 中计算
    const data = filteredData.value
    if (rowIndex === 0) {
      let span = 1
      for (let i = 1; i < data.length; i++) {
        if (data[i].category === row.category) span++
        else break
      }
      return [span, 1]
    }
    if (rowIndex > 0 && filteredData.value[rowIndex - 1].category === row.category) {
      return [0, 0]
    } else {
      let span = 1
      for (let i = rowIndex + 1; i < data.length; i++) {
        if (data[i].category === row.category) span++
        else break
      }
      return [span, 1]
    }
  }
  return [1, 1]
}

const tableRowClassName = ({ row }) => {
  // 类别分隔行
  return ''
}

const tableCellClassName = ({ row, columnIndex }) => {
  if (columnIndex === 1) return 'cat-cell'
  return ''
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const res = await businessApi.all({ page: 1, pageSize: 999 })
    if (res.success) {
      // 兼容处理：支持 { data: [] } 和 { data: { list: [] } } 两种格式
      const list = Array.isArray(res.data) ? res.data : (res.data?.list || [])
      allData.value = list.map(item => ({
        ...item,
        unit_price: Number(item.unit_price) || 0,
        settlement_fee: Number(item.settlement_fee) || 0,
        performance_fee: Number(item.performance_fee) || 0
      }))
      updateCategories()
    }
  } finally { loading.value = false }
}

const updateCategories = () => {
  allCategories.value = [...new Set(allData.value.map(r => r.category).filter(Boolean))].sort()
}

const filterList = () => {} // select 已绑定

// 添加新行（在当前筛选的类别下，或空类别）
const addRow = () => {
  const cat = filterCategory.value || allCategories.value[0] || ''
  editId.value = null
  form.value = { category: cat, project: '', parameter: '', unit_price: 0, unit: '', settlement_fee: 5, performance_fee: 3 }
  dialogVisible.value = true
}

// 添加新类别行
const addCategoryRow = () => {
  editId.value = null
  form.value = { category: '新类别', project: '', parameter: '', unit_price: 0, unit: '', settlement_fee: 5, performance_fee: 3 }
  dialogVisible.value = true
}

// 编辑行
const openEdit = (row) => {
  editId.value = row.id
  form.value = { ...row }
  dialogVisible.value = true
}

// 保存
const handleSave = async () => {
  if (!form.value.category || !form.value.project) {
    ElMessage.warning('类别和项目名称不能为空')
    return
  }
  // 二次确认
  const action = editId.value ? '修改' : '新增'
  try { await ElMessageBox.confirm(`确定要${action}该业务项目吗？`, '确认保存', { type: 'info' }) } catch { return }
  saving.value = true
  try {
    const data = { ...form.value }
    if (editId.value) {
      await businessApi.update(editId.value, data)
      ElMessage.success('保存成功')
    } else {
      const res = await businessApi.create(data)
      if (res.success) {
        ElMessage.success('保存成功')
        loadData()
      }
    }
    dialogVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error('保存失败: ' + (e.response?.data?.message || e.message))
  } finally {
    saving.value = false
  }
}

// 删除行
const handleDelete = async (row) => {
  // 检查是否被订单引用
  if (row.id) {
    try {
      const res = await businessApi.delete(row.id)
      if (res.success) {
        const idx = allData.value.indexOf(row)
        if (idx > -1) allData.value.splice(idx, 1)
        updateCategories()
      }
    } catch (e) {
      ElMessage.error('删除失败，可能有订单正在使用该业务项目')
    }
  } else {
    const idx = allData.value.indexOf(row)
    if (idx > -1) allData.value.splice(idx, 1)
  }
}

// 动态计算表格高度
const calcHeight = () => {
  tableMaxHeight.value = window.innerHeight - 240
}

onMounted(() => {
  loadData()
  calcHeight()
  window.addEventListener('resize', calcHeight)
})
onUnmounted(() => {
  window.removeEventListener('resize', calcHeight)
})
</script>

<style scoped>
.business-page {
  min-height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  padding: 20px;
}

/* 顶部统计卡片 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a2e;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #8c8c9e;
  margin-top: 4px;
}

/* 主内容区 */
.main-content {
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

/* 工具栏 */
.toolbar-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f5;
  background: white;
}

.toolbar-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-box {
  position: relative;
  width: 240px;
}

.search-box .search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #8c8c9e;
  font-size: 16px;
  z-index: 1;
}

.search-box :deep(.el-input__inner) {
  border-radius: 10px;
  padding-left: 38px;
  height: 40px;
  border: 1px solid #e8e8ec;
  background: #fafafa;
  transition: all 0.3s ease;
}

.search-box :deep(.el-input__inner:focus) {
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.category-select {
  width: 150px;
}

.category-select :deep(.el-select__wrapper) {
  border-radius: 10px;
  height: 40px;
  border: 1px solid #e8e8ec;
  background: #fafafa;
  box-shadow: none !important;
}

.toolbar-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.btn-action, .btn-ghost, .btn-primary, .btn-success {
  height: 40px;
  padding: 0 18px;
  border-radius: 10px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.btn-success {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border: none;
  box-shadow: 0 4px 15px rgba(17, 153, 142, 0.3);
}

.btn-success:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(17, 153, 142, 0.4);
}

.btn-ghost {
  background: #f5f5f5;
  border: none;
  color: #666;
}

.btn-ghost:hover {
  background: #e8e8e8;
}

/* 表格区域 */
.table-wrapper {
  padding: 0;
}

.business-table {
  --el-table-border-color: #f0f0f5;
  --el-table-header-bg-color: #fafafa;
}

.business-table :deep(.el-table__header-wrapper th) {
  background: linear-gradient(135deg, #f8f9fc 0%, #f0f2f7 100%);
  font-weight: 600;
  color: #4a4a5a;
  font-size: 13px;
  letter-spacing: 0.5px;
}

.business-table :deep(.el-table__body-wrapper) {
  background: white;
}

.business-table :deep(.el-table__row) {
  transition: all 0.2s ease;
}

.business-table :deep(.el-table__row:hover > td) {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%) !important;
}

.cat-cell {
  background: linear-gradient(135deg, #e8eeff 0%, #d8e4ff 100%) !important;
  font-weight: 600;
  color: #4a6cf7;
  font-size: 13px;
  text-align: center;
}

.cat-tag {
  display: inline-block;
  padding: 4px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.money-cell {
  font-family: 'Courier New', monospace;
  font-weight: 500;
  color: #2d2d3a;
}

.money-cell.highlight {
  color: #f5576c;
  font-weight: 600;
}

.btn-edit {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
}

.btn-edit:hover {
  opacity: 0.9;
  transform: scale(1.05);
}

.btn-delete {
  border-radius: 8px;
  padding: 6px 10px;
  margin-left: 6px;
}

.btn-delete:hover {
  background: #ffeaea;
}

/* 底部统计 */
.footer-stats {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, #f8f9fc 0%, #f0f2f7 100%);
  border-top: 1px solid #f0f0f5;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.footer-label {
  color: #8c8c9e;
  font-size: 13px;
}

.footer-value {
  font-weight: 600;
  color: #2d2d3a;
  font-size: 14px;
}

.footer-value.primary { color: #667eea; }
.footer-value.success { color: #11998e; }
.footer-value.warning { color: #f5576c; }

.footer-divider {
  width: 1px;
  height: 20px;
  background: #e0e0e8;
  margin: 0 20px;
}

/* 编辑弹窗 */
.edit-dialog :deep(.el-dialog) {
  border-radius: 20px;
  overflow: hidden;
}

.edit-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 24px;
  margin: 0;
}

.edit-dialog :deep(.el-dialog__title) {
  color: white;
  font-size: 18px;
  font-weight: 600;
}

.edit-dialog :deep(.el-dialog__headerbtn .el-dialog__close) {
  color: white;
}

.edit-dialog :deep(.el-dialog__body) {
  padding: 28px 24px;
}

.edit-form :deep(.el-form-item__label) {
  color: #4a4a5a;
  font-weight: 500;
}

.edit-form :deep(.el-input__wrapper),
.edit-form :deep(.el-select__wrapper) {
  border-radius: 10px;
  box-shadow: none !important;
  border: 1px solid #e8e8ec;
}

.edit-form :deep(.el-input__wrapper:focus-within),
.edit-form :deep(.el-select__wrapper:focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
}

.edit-dialog :deep(.el-dialog__footer) {
  padding: 16px 24px 24px;
  border-top: 1px solid #f0f0f5;
}

.btn-cancel {
  border-radius: 10px;
  padding: 10px 24px;
}

.btn-save {
  border-radius: 10px;
  padding: 10px 28px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.btn-save:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

/* 响应式 */
@media (max-width: 1200px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
  
  .toolbar-section {
    flex-direction: column;
    gap: 16px;
  }
  
  .toolbar-left, .toolbar-right {
    width: 100%;
    justify-content: center;
  }
}
</style>
