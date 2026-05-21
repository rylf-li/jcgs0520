<template>
  <div class="customer-page">
    <!-- 顶部统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
          <el-icon><Avatar /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ total }}</div>
          <div class="stat-label">客户总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%)">
          <el-icon><Message /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ hasPhoneCount }}</div>
          <div class="stat-label">有电话</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
          <el-icon><CreditCard /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ hasBankCount }}</div>
          <div class="stat-label">有银行信息</div>
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
            <el-input v-model="searchText" placeholder="搜索客户名称、联系人..." clearable @input="handleSearch" />
          </div>
        </div>
        <div class="toolbar-right">
          <ImportExportButtons model="customers" modelName="客户" @success="loadData" />
          <el-button v-if="selectedRows.length>0" type="danger" @click="batchDelete" :loading="batchLoading" class="btn-action">
            <el-icon><Delete /></el-icon>批量删除({{selectedRows.length}})
          </el-button>
          <el-button v-if="selectedRows.length>0" @click="selectedRows=[]" class="btn-ghost">取消选择</el-button>
          <el-button type="primary" @click="openDialog()" class="btn-primary">
            <el-icon><Plus /></el-icon>新增客户
          </el-button>
        </div>
      </div>

      <!-- 数据表格 -->
      <div class="table-wrapper">
        <el-table
          :data="filteredData"
          style="width: 100%"
          v-loading="loading"
          :max-height="tableMaxHeight"
          size="large"
          @selection-change="onSelectionChange"
          class="customer-table"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column type="index" label="#" width="70" align="center" />
          <el-table-column label="客户名称" min-width="180">
            <template #default="{ row }">
              <el-input v-if="row._editing" v-model="row.name" placeholder="客户名称" size="small" />
              <span v-else class="cell-name">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column label="联系人" width="120">
            <template #default="{ row }">
              <el-input v-if="row._editing" v-model="row.contact" placeholder="联系人" size="small" />
              <span v-else class="cell-value">{{ row.contact || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="联系电话" width="140">
            <template #default="{ row }">
              <el-input v-if="row._editing" v-model="row.phone" placeholder="电话" size="small" />
              <span v-else class="cell-value phone">{{ row.phone || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="银行账号" width="160" show-overflow-tooltip>
            <template #default="{ row }">
              <el-input v-if="row._editing" v-model="row.bank_account" placeholder="银行账号" size="small" />
              <span v-else class="cell-value">{{ row.bank_account || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="开户行" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">
              <el-input v-if="row._editing" v-model="row.bank_name" placeholder="开户行" size="small" />
              <span v-else class="cell-value">{{ row.bank_name || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="地址" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <el-input v-if="row._editing" v-model="row.address" placeholder="地址" size="small" />
              <span v-else class="cell-value text-muted">{{ row.address || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" align="center" fixed="right">
            <template #default="{ row, $index }">
              <template v-if="row._editing">
                <el-button type="primary" size="small" @click="saveRow(row)" class="btn-save">保存</el-button>
                <el-button size="small" @click="cancelEdit(row, $index)">取消</el-button>
              </template>
              <template v-else>
                <el-button type="success" size="small" plain @click="$router.push(`/customers/${row.id}`)" class="btn-view">
                  <el-icon><View /></el-icon>
                </el-button>
                <el-button type="primary" size="small" @click="startEdit(row)" class="btn-edit">
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
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <span class="total">共 <b>{{ total }}</b> 条</span>
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="sizes, prev, pager, next"
          @current-change="loadData"
          @size-change="handleSizeChange"
          background
        />
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editId ? '编辑客户' : '新增客户'" width="520px" destroy-on-close class="edit-dialog">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="95px" class="edit-form">
        <el-form-item label="客户名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入客户名称" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contact" placeholder="请输入联系人" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="form.address" type="textarea" :rows="2" placeholder="请输入客户地址" />
        </el-form-item>
        <el-form-item label="银行账号">
          <el-input v-model="form.bank_account" placeholder="请输入银行账号" />
        </el-form-item>
        <el-form-item label="开户行">
          <el-input v-model="form.bank_name" placeholder="请输入开户行名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false" class="btn-cancel">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave" class="btn-save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete, Plus, View } from '@element-plus/icons-vue'
import { customerApi } from '@/api'
import { MODEL_CONFIG } from '@/utils/modelConfig'
import ImportExportButtons from '@/components/ImportExportButtons.vue'

const loading = ref(false)
const saving = ref(false)

// 导入成功后刷新数据
const handleImportSuccess = () => {
  loadData()
}
const selectedRows = ref([])
const batchLoading = ref(false)
const onSelectionChange = (rows) => { selectedRows.value = rows }
const batchDelete = async () => {
  if (selectedRows.value.length === 0) return ElMessage.warning('请先选择数据')
  try { await ElMessageBox.confirm('确定删除选中的 ' + selectedRows.value.length + ' 条客户吗？', '批量删除', { type: 'warning' }) } catch { return }
  batchLoading.value = true
  try {
    let ok = 0
    for (const row of selectedRows.value) { try { const r = await customerApi.delete(row.id); if (r.success) ok++ } catch {} }
    ElMessage.success('成功删除 ' + ok + ' 条记录')
    selectedRows.value = []
    loadData()
  } finally { batchLoading.value = false }
}
const dialogVisible = ref(false)
const editId = ref(null)
const formRef = ref()

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const searchText = ref('')

const tableMaxHeight = ref(600)

// 统计
const hasPhoneCount = computed(() => list.value.filter(r => r.phone).length)
const hasBankCount = computed(() => list.value.filter(r => r.bank_account).length)

const form = reactive({ name: '', contact: '', phone: '', address: '', bank_account: '', bank_name: '' })
const rules = { name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }] }

// 搜索防抖
let searchTimer = null
const handleSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadData()
  }, 300)
}

// 过滤数据（前端搜索）
const filteredData = computed(() => {
  if (!searchText.value) return list.value
  const kw = searchText.value.toLowerCase()
  return list.value.filter(r =>
    (r.name || '').toLowerCase().includes(kw) ||
    (r.contact || '').toLowerCase().includes(kw) ||
    (r.phone || '').toLowerCase().includes(kw)
  )
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await customerApi.list({
      page: page.value,
      pageSize: pageSize.value,
      name: searchText.value || undefined
    })
    if (res.success) {
      list.value = res.data?.list?.map(item => ({ ...item, _editing: false }))
      total.value = res.data.total
    }
  } finally { loading.value = false }
}

const handleSizeChange = () => {
  page.value = 1
  loadData()
}

// 快速编辑
const startEdit = (row) => {
  row._backup = { ...row }
  row._editing = true
}

const cancelEdit = (row, index) => {
  if (row._backup) {
    Object.assign(row, row._backup)
    delete row._backup
  }
  row._editing = false
}

const saveRow = async (row) => {
  if (!row.name) {
    ElMessage.warning('客户名称不能为空')
    return
  }
  // 二次确认
  try { await ElMessageBox.confirm('确定要保存修改吗？', '确认保存', { type: 'info' }) } catch { return }
  try {
    const data = { name: row.name, contact: row.contact, phone: row.phone, address: row.address, bank_account: row.bank_account, bank_name: row.bank_name }
    const res = await customerApi.update(row.id, data)
    if (res.success) {
      row._editing = false
      delete row._backup
      ElMessage.success('保存成功')
    }
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

const openDialog = (row = null) => {
  editId.value = row?.id || null
  Object.assign(form, { name: '', contact: '', phone: '', address: '', bank_account: '', bank_name: '' })
  if (row) Object.assign(form, row)
  dialogVisible.value = true
}

const handleSave = async () => {
  await formRef.value.validate()
  // 二次确认
  const action = editId.value ? '修改' : '新增'
  try { await ElMessageBox.confirm(`确定要${action}该客户吗？`, '确认保存', { type: 'info' }) } catch { return }
  saving.value = true
  try {
    const res = editId.value
      ? await customerApi.update(editId.value, form)
      : await customerApi.create(form)
    if (res.success) {
      ElMessage.success(res.message)
      dialogVisible.value = false
      loadData()
    }
  } finally { saving.value = false }
}

const handleDelete = async (row) => {
  try {
    const res = await customerApi.delete(row.id)
    if (res.success) {
      ElMessage.success('删除成功')
      loadData()
    }
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

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
.customer-page {
  min-height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  padding: 20px;
}

/* 统计卡片 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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

.stat-content { flex: 1; }
.stat-value { font-size: 24px; font-weight: 700; color: #1a1a2e; }
.stat-label { font-size: 13px; color: #8c8c9e; margin-top: 4px; }

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
}

.toolbar-left { display: flex; gap: 12px; }
.toolbar-right { display: flex; gap: 10px; }

.search-box { position: relative; width: 260px; }
.search-box .search-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  color: #8c8c9e; font-size: 16px; z-index: 1;
}
.search-box :deep(.el-input__inner) {
  border-radius: 10px; padding-left: 38px; height: 40px;
  border: 1px solid #e8e8ec; background: #fafafa;
}
.search-box :deep(.el-input__inner:focus) {
  border-color: #667eea; background: white;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn-action, .btn-ghost, .btn-primary { height: 40px; padding: 0 18px; border-radius: 10px; font-weight: 500; }
.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4); }
.btn-ghost { background: #f5f5f5; border: none; color: #666; }
.btn-ghost:hover { background: #e8e8e8; }

/* 表格 */
.table-wrapper { padding: 0; }

.customer-table :deep(.el-table__header-wrapper th) {
  background: linear-gradient(135deg, #f8f9fc 0%, #f0f2f7 100%);
  font-weight: 600; color: #4a4a5a; font-size: 13px;
}
.customer-table :deep(.el-table__row:hover > td) {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%) !important;
}

.cell-name { font-weight: 600; color: #2d2d3a; }
.cell-value { font-size: 13px; color: #4a4a5a; }
.cell-value.phone { color: #667eea; font-family: 'Courier New', monospace; }
.text-muted { color: #8c8c9e; }

.btn-edit {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none; border-radius: 8px; padding: 6px 12px; color: white;
}
.btn-save { border-radius: 8px; }
.btn-delete { border-radius: 8px; padding: 6px 10px; margin-left: 6px; }
.btn-delete:hover { background: #ffeaea; }

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid #f0f0f5;
}
.pagination-wrapper .total { color: #8c8c9e; font-size: 14px; }
.pagination-wrapper .total b { color: #667eea; }

/* 弹窗 */
.edit-dialog :deep(.el-dialog) { border-radius: 20px; overflow: hidden; }
.edit-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 24px; margin: 0;
}
.edit-dialog :deep(.el-dialog__title) { color: white; font-size: 18px; font-weight: 600; }
.edit-dialog :deep(.el-dialog__headerbtn .el-dialog__close) { color: white; }
.edit-dialog :deep(.el-dialog__body) { padding: 28px 24px; }
.edit-dialog :deep(.el-dialog__footer) { padding: 16px 24px 24px; border-top: 1px solid #f0f0f5; }

.edit-form :deep(.el-form-item__label) { color: #4a4a5a; font-weight: 500; }
.edit-form :deep(.el-input__wrapper), .edit-form :deep(.el-select__wrapper) {
  border-radius: 10px; box-shadow: none !important; border: 1px solid #e8e8ec;
}
.edit-form :deep(.el-input__wrapper:focus-within), .edit-form :deep(.el-select__wrapper:focus) {
  border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
}

.btn-cancel { border-radius: 10px; padding: 10px 24px; }
.btn-save {
  border-radius: 10px; padding: 10px 28px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}
.btn-save:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4); }

/* 响应式 */
@media (max-width: 1200px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) {
  .stats-row { grid-template-columns: 1fr; }
  .toolbar-section { flex-direction: column; gap: 16px; }
}
</style>
