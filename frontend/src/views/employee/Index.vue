<template>
  <div class="employee-page">
    <!-- 顶部统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
          <el-icon><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ total }}</div>
          <div class="stat-label">员工总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
          <el-icon><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ roleStats.admin }}</div>
          <div class="stat-label">管理员</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #fa8c16 0%, #fadb14 100%)">
          <el-icon><Star /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ roleStats.manager }}</div>
          <div class="stat-label">经理</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%)">
          <el-icon><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ roleStats.sales }}</div>
          <div class="stat-label">业务员</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #36d1dc 0%, #5b86e5 100%)">
          <el-icon><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ roleStats.staff }}</div>
          <div class="stat-label">员工</div>
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
            <el-input v-model="searchText" placeholder="搜索姓名、手机号..." clearable @input="handleSearch" />
          </div>
          <el-select v-model="query.dept_id" placeholder="全部部门" clearable style="width:150px" @change="loadData" class="filter-select">
            <el-option v-for="d in depts" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
          <el-select v-model="query.role" placeholder="全部角色" clearable style="width:110px" @change="loadData" class="filter-select">
            <el-option label="管理员" value="admin" />
            <el-option label="经理" value="manager" />
            <el-option label="业务员" value="sales" />
            <el-option label="员工" value="staff" />
          </el-select>
        </div>
        <div class="toolbar-right">
          <ImportExportButtons model="employees" modelName="员工" @success="loadData" />
          <el-button v-if="selectedRows.length>0" type="danger" @click="batchDelete" :loading="batchLoading" class="btn-action">
            <el-icon><Delete /></el-icon>批量删除({{selectedRows.length}})
          </el-button>
          <el-button v-if="selectedRows.length>0" @click="selectedRows=[]" class="btn-ghost">取消选择</el-button>
          <el-button type="primary" @click="openDialog()" class="btn-primary">
            <el-icon><Plus /></el-icon>新增员工
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
          class="employee-table"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column type="index" label="#" width="70" align="center" />
          <el-table-column label="姓名" width="110">
            <template #default="{ row }">
              <el-input v-if="row._editing" v-model="row.name" placeholder="姓名" size="small" />
              <span v-else class="cell-name">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column label="手机号" width="140">
            <template #default="{ row }">
              <el-input v-if="row._editing" v-model="row.phone" placeholder="手机号" size="small" />
              <span v-else class="cell-phone">{{ row.phone }}</span>
            </template>
          </el-table-column>
          <el-table-column label="部门" width="170">
            <template #default="{ row }">
              <div class="dept-tags">
                <el-tag v-for="d in (row.departments||[])" :key="d.id" size="small" type="info" class="dept-tag">{{ d.name }}</el-tag>
                <span v-if="!(row.departments||[]).length" class="text-muted">-</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="角色" width="100" align="center">
            <template #default="{ row }">
              <el-select v-if="row._editing" v-model="row.role" size="small" style="width:80px">
                <el-option label="管理员" value="admin" />
                <el-option label="经理" value="manager" />
                <el-option label="业务员" value="sales" />
                <el-option label="员工" value="staff" />
              </el-select>
                  <el-tag v-else :type="row.role === 'admin' ? 'danger' : row.role === 'manager' ? 'warning' : row.role === 'sales' ? 'success' : 'info'" size="default" class="role-tag">
                    {{ { admin: '管理员', manager: '经理', sales: '业务员', staff: '员工' }[row.role] }}
                  </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-switch v-if="row._editing" v-model="row.status" :active-value="1" :inactive-value="0" size="small" />
              <el-tag v-else :type="row.status ? 'success' : 'danger'" size="default" class="status-tag">
                {{ row.status ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" align="center" fixed="right">
            <template #default="{ row }">
              <template v-if="row._editing">
                <el-button type="primary" size="small" @click="saveRow(row)" class="btn-save">保存</el-button>
                <el-button size="small" @click="cancelEdit(row)">取消</el-button>
              </template>
              <template v-else>
                <el-button type="primary" size="small" @click="$router.push(`/employees/${row.id}`)" class="btn-view">
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
        <span class="total">共 <b>{{ total }}</b> 名员工</span>
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="sizes, prev, pager, next"
          @current-change="loadData"
          @size-change="loadData"
          background
        />
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editId ? '编辑员工' : '新增员工'" width="520px" destroy-on-close class="edit-dialog">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="95px" class="edit-form">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item :prop="editId ? '' : 'password'">
          <template #label>密码<span class="tip">{{ editId ? '（不填则不修改）' : '' }}</span></template>
          <el-input v-model="form.password" type="password" :placeholder="editId ? '不填则不修改' : '请输入密码'" show-password />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width:100%">
            <el-option label="管理员" value="admin" />
            <el-option label="经理" value="manager" />
            <el-option label="业务员" value="sales" />
            <el-option label="员工" value="staff" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用" />
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
import { employeeApi, departmentApi } from '@/api'
import ImportExportButtons from '@/components/ImportExportButtons.vue'

const loading = ref(false)
const selectedRows = ref([])
const batchLoading = ref(false)
const onSelectionChange = (rows) => { selectedRows.value = rows }

const batchDelete = async () => {
  if (selectedRows.value.length === 0) return ElMessage.warning('请先选择数据')
  try { await ElMessageBox.confirm('确定删除选中的 ' + selectedRows.value.length + ' 名员工吗？', '批量删除', { type: 'warning' }) } catch { return }
  batchLoading.value = true
  try {
    let ok = 0
    for (const row of selectedRows.value) { try { const r = await employeeApi.delete(row.id); if (r.success) ok++ } catch {} }
    ElMessage.success('成功删除 ' + ok + ' 条记录')
    selectedRows.value = []
    loadData()
  } finally { batchLoading.value = false }
}
const saving = ref(false)
const dialogVisible = ref(false)
const editId = ref(null)
const formRef = ref()
const depts = ref([])
const list = ref([])
const total = ref(0)
const searchText = ref('')
const tableMaxHeight = ref(600)

// 导入成功后刷新数据
const handleImportSuccess = () => {
  loadData()
}

const query = reactive({ page: 1, pageSize: 20, name: '', phone: '', dept_id: '', role: '' })
const form = reactive({ name: '', phone: '', password: '', dept_ids: [], role: 'staff', status: 1 })
const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  dept_id: [{ required: true, message: '请选择部门', trigger: 'change' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

let searchTimer = null
const handleSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    query.page = 1
    loadData()
  }, 300)
}

const roleStats = computed(() => {
  const s = { admin: 0, manager: 0, sales: 0, staff: 0 }
  list.value.forEach(r => { if (s[r.role] !== undefined) s[r.role]++ })
  return s
})

const filteredData = computed(() => {
  if (!searchText.value) return list.value
  const kw = searchText.value.toLowerCase()
  return list.value.filter(r =>
    (r.name || '').toLowerCase().includes(kw) ||
    (r.phone || '').includes(kw)
  )
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await employeeApi.list(query)
    if (res.success) {
      list.value = res.data?.list?.map(item => ({ ...item, _editing: false }))
      total.value = res.data.total
    }
  } finally { loading.value = false }
}

const startEdit = (row) => {
  row._backup = { ...row }
  row._editing = true
  row.dept_ids = (row.departments || []).map(d => d.id)
}

const cancelEdit = (row) => {
  if (row._backup) Object.assign(row, row._backup)
  row._editing = false
  delete row._backup
}

const onDeptChange = (row) => {
  const d = depts.value.find(x => x.id === row.dept_id)
  row.dept_name = d?.name || ''
}

const saveRow = async (row) => {
  if (!row.name || !row.phone) { ElMessage.warning('姓名和手机号不能为空'); return }
  // 二次确认
  try { await ElMessageBox.confirm('确定要保存修改吗？', '确认保存', { type: 'info' }) } catch { return }
  try {
    const data = { name: row.name, phone: row.phone, dept_ids: row.dept_ids || [], role: row.role, status: row.status }
    const res = await employeeApi.update(row.id, data)
    if (res.success) { row._editing = false; delete row._backup; ElMessage.success('保存成功'); loadData() }
  } catch (e) { ElMessage.error('保存失败') }
}

const openDialog = (row = null) => {
  editId.value = row?.id || null
  Object.assign(form, { name: '', phone: '', password: '', role: 'staff', status: 1 })
  if (row) Object.assign(form, { name: row.name, phone: row.phone, role: row.role, status: row.status, dept_ids: (row.departments||[]).map(d=>d.id) })
  dialogVisible.value = true
}


const handleSave = async () => {
  await formRef.value.validate()
  // 二次确认
  const action = editId.value ? '修改' : '新增'
  try { await ElMessageBox.confirm(`确定要${action}该员工吗？`, '确认保存', { type: 'info' }) } catch { return }
  saving.value = true
  try {
    const data = { ...form }
    delete data.dept_ids
    delete data.dept_name
    if (editId.value && !data.password) delete data.password
    const res = editId.value ? await employeeApi.update(editId.value, data) : await employeeApi.create(data)
    if (res.success) { ElMessage.success(res.message); dialogVisible.value = false; loadData() }
  } finally { saving.value = false }
}

const handleDelete = async (row) => {
  try {
    const res = await employeeApi.delete(row.id)
    if (res.success) { ElMessage.success('删除成功'); loadData() }
  } catch (e) { ElMessage.error('删除失败') }
}

const calcHeight = () => { tableMaxHeight.value = window.innerHeight - 320 }

onMounted(async () => {
  loadData()
  calcHeight()
  window.addEventListener('resize', calcHeight)
  const res = await departmentApi.all()
  if (res.success) depts.value = res.data
})
onUnmounted(() => { window.removeEventListener('resize', calcHeight) })
</script>

<style scoped>
.employee-page {
  min-height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  padding: 20px;
}

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
}

.stat-card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12); }

.stat-icon {
  width: 56px; height: 56px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; color: white;
}

.stat-content { flex: 1; }
.stat-value { font-size: 24px; font-weight: 700; color: #1a1a2e; }
.stat-label { font-size: 13px; color: #8c8c9e; margin-top: 4px; }

.main-content {
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.toolbar-section {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px; border-bottom: 1px solid #f0f0f5;
}

.toolbar-left { display: flex; gap: 12px; }
.toolbar-right { display: flex; gap: 10px; }

.search-box { position: relative; width: 220px; }
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

.filter-select :deep(.el-select__wrapper) {
  border-radius: 10px; height: 40px; box-shadow: none !important;
  border: 1px solid #e8e8ec; background: #fafafa;
}

.btn-action, .btn-ghost, .btn-primary { height: 40px; padding: 0 18px; border-radius: 10px; font-weight: 500; }
.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4); }
.btn-ghost { background: #f5f5f5; border: none; color: #666; }
.btn-ghost:hover { background: #e8e8e8; }

.employee-table :deep(.el-table__header-wrapper th) {
  background: linear-gradient(135deg, #f8f9fc 0%, #f0f2f7 100%);
  font-weight: 600; color: #4a4a5a; font-size: 13px;
}
.employee-table :deep(.el-table__row:hover > td) {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%) !important;
}

.cell-name { font-weight: 600; color: #667eea; }
.cell-phone { font-family: 'Courier New', monospace; color: #4a4a5a; }
.dept-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.dept-tag { background: #f0f2f7; border: none; color: #4a4a5a; }
.text-muted { color: #8c8c9e; }
.role-tag { font-weight: 500; }
.status-tag { font-weight: 500; }

.btn-view {
  background: #f0f2f7; border: none; color: #4a4a5a; border-radius: 8px; padding: 6px 10px;
}
.btn-view:hover { background: #e8eaf0; }
.btn-edit {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none; border-radius: 8px; padding: 6px 10px; color: white;
}
.btn-save { border-radius: 8px; }
.btn-delete { border-radius: 8px; padding: 6px 10px; margin-left: 6px; }
.btn-delete:hover { background: #ffeaea; }

.pagination-wrapper {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 24px; border-top: 1px solid #f0f0f5;
}
.pagination-wrapper .total { color: #8c8c9e; font-size: 14px; }
.pagination-wrapper .total b { color: #667eea; }

.tip { color: #999; font-weight: normal; margin-left: 4px; font-size: 12px; }

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

@media (max-width: 1200px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) {
  .stats-row { grid-template-columns: 1fr; }
  .toolbar-section { flex-direction: column; gap: 16px; }
}
</style>
