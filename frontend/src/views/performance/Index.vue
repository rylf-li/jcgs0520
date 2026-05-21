<template>
  <div class="page-container">
    <!-- 搜索工具栏 -->
    <el-card shadow="never" class="search-card">
      <el-form :model="query" inline>
        <el-form-item label="员工">
          <el-select v-model="query.employee_id" placeholder="全部" clearable filterable style="width:160px">
            <el-option v-for="e in employees" :key="e.id" :label="e.name" :value="e.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="query.dept_id" placeholder="全部" clearable style="width:140px">
            <el-option v-for="d in depts" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:240px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData"><el-icon><Search /></el-icon>查询</el-button>
          <el-button @click="resetQuery"><el-icon><Refresh /></el-icon>重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 快捷操作 + 统计 -->
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <span class="toolbar-title">⚡ 收款绩效同步</span>
          <el-button type="primary" size="small" @click="openAutoDialog('order')"><el-icon><Refresh /></el-icon>从订单收款同步</el-button>
          <el-button type="success" size="small" @click="openAutoDialog('contract')"><el-icon><Refresh /></el-icon>按合同批量同步</el-button>
        </div>
        <div class="toolbar-right">
          <ImportExportButtons model="performances" modelName="绩效" @success="loadData" />
          <span v-if="selectedRows.length > 0" class="batch-tip">已选 <strong>{{ selectedRows.length }}</strong> 条</span>
          <el-button v-if="selectedRows.length > 0" type="danger" size="small" @click="batchDelete" :loading="batchLoading">
            <el-icon><Delete /></el-icon>批量删除
          </el-button>
          <el-button v-if="selectedRows.length > 0" size="small" @click="selectedRows = []">取消选择</el-button>
          <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>手动新增</el-button>
        </div>
      </div>
    </el-card>

    <!-- 统计卡片 -->
    <el-row :gutter="12" class="stat-cards">
      <el-col :span="8"><div class="stat-card"><div class="stat-label">绩效总额</div><div class="stat-value primary">{{ fmtMoney(statTotal) }}</div></div></el-col>
      <el-col :span="8"><div class="stat-card"><div class="stat-label">绩效记录</div><div class="stat-value">{{ total }} 条</div></div></el-col>
      <el-col :span="8"><div class="stat-card"><div class="stat-label">绩效人员</div><div class="stat-value">{{ statEmployees }} 人</div></div></el-col>
    </el-row>

    <!-- 主表格 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">绩效列表</span>
        </div>
      </template>
      <el-table :data="list" v-loading="loading" stripe border @selection-change="onSelectionChange">
        <el-table-column type="selection" width="45" />
        <el-table-column type="index" label="#" width="60" align="center" />
        <el-table-column prop="date" label="日期" width="100" />
        <el-table-column prop="employee_name" label="员工姓名" width="100">
          <template #default="{ row }">{{ row.employee?.name || row.employee_name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="dept_name" label="部门" width="100" />
        <el-table-column prop="company_name" label="公司" width="120" show-overflow-tooltip />
        <el-table-column prop="order_no" label="订单编号" width="130" show-overflow-tooltip />
        <el-table-column prop="received_amount" label="已收金额" width="120" align="right">
          <template #default="{ row }"><span>{{ fmtMoney(row.received_amount) }}</span></template>
        </el-table-column>
        <el-table-column prop="performance_rate" label="绩效比例" width="100" align="right">
          <template #default="{ row }">{{ fmtRate(row.performance_rate) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === '已完成' ? 'success' : 'warning'" size="small">{{ row.status || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="绩效金额" width="120" align="right">
          <template #default="{ row }"><span class="amount">{{ fmtMoney(row.amount) }}</span></template>
        </el-table-column>
        <el-table-column label="生成方式" width="100">
          <template #default="{ row }">
            <el-tag :type="String(row.source || '').startsWith('订单收款绩效:') ? 'primary' : 'info'" size="small">
              {{ String(row.source || '').startsWith('订单收款绩效:') ? '自动' : '手工' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" min-width="140" show-overflow-tooltip />
        <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" plain @click="$router.push(`/performance/${row.id}`)"><el-icon><View /></el-icon>详情</el-button>
            <el-button size="small" type="primary" plain @click="openDialog(row)"><el-icon><Edit /></el-icon>编辑</el-button>
            <el-button size="small" type="danger" plain @click="handleDelete(row)"><el-icon><Delete /></el-icon>删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination"><el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" @change="loadData" /></div>
    </el-card>

    <!-- 手动新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editId ? '编辑绩效' : '新增绩效'" width="500px" destroy-on-close>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
        <el-form-item label="员工" prop="employee_id">
          <el-select v-model="form.employee_id" filterable placeholder="请选择员工" style="width:100%" @change="onEmployeeChange">
            <el-option v-for="e in employees" :key="e.id" :label="e.name" :value="e.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期" prop="date"><el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
        <el-form-item label="部门">
          <el-select v-model="form.dept_id" placeholder="请选择" style="width:100%" @change="onDeptChange">
            <el-option v-for="d in depts" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="公司">
          <el-select v-model="form.company_id" placeholder="请选择" style="width:100%" @change="onCompanyChange">
            <el-option v-for="c in companies" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="绩效金额" prop="amount"><el-input-number v-model="form.amount" :precision="2" :min="0" style="width:100%" /></el-form-item>
        <el-form-item label="来源"><el-input v-model="form.source" placeholder="如：订单DD20240101" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 自动生成弹窗 -->
    <el-dialog v-model="autoDialogVisible" :title="autoType === 'order' ? '从订单自动生成绩效' : '从合同自动生成绩效'" width="500px" destroy-on-close>
      <el-form :model="autoForm" ref="autoFormRef" label-width="100px">
        <el-form-item label="日期范围">
          <el-date-picker v-model="autoForm.dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="覆盖已有">
          <el-switch v-model="autoForm.overwrite" active-text="是" inactive-text="否" />
          <div class="form-tip">开启后将更新已存在的相同来源绩效记录</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="autoDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="autoSaving" @click="handleAutoGenerate">开始生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete, View } from '@element-plus/icons-vue'
import { performanceApi, employeeApi, departmentApi, companyApi } from '@/api'
import ImportExportButtons from '@/components/ImportExportButtons.vue'

const list = ref([]), total = ref(0), loading = ref(false), saving = ref(false)
const dialogVisible = ref(false), editId = ref(null), formRef = ref()
const employees = ref([]), depts = ref([]), companies = ref([])
const dateRange = ref([])

const autoDialogVisible = ref(false), autoType = ref('order'), autoFormRef = ref(), autoSaving = ref(false)
const selectedRows = ref([])
const batchLoading = ref(false)
const onSelectionChange = (rows) => { selectedRows.value = rows }

const batchDelete = async () => {
  if (selectedRows.value.length === 0) return ElMessage.warning('请先选择数据')
  try { await ElMessageBox.confirm('确定删除选中的 ' + selectedRows.value.length + ' 条绩效记录吗？', '批量删除', { type: 'warning' }) } catch { return }
  batchLoading.value = true
  try {
    let ok = 0
    for (const row of selectedRows.value) { try { const r = await performanceApi.delete(row.id); if (r.success) ok++ } catch {} }
    ElMessage.success('成功删除 ' + ok + ' 条记录')
    selectedRows.value = []
    loadData()
  } finally { batchLoading.value = false }
}
const autoForm = reactive({ dateRange: [], overwrite: false })

const query = reactive({ page: 1, pageSize: 20, employee_id: '', dept_id: '', date_start: '', date_end: '' })
const form = reactive({ employee_id:'', date:'', dept_id:'', dept_name:'', company_id:'', company_name:'', amount:0, source:'', remark:'' })
const rules = { 
  employee_id: [{ required: true, message: '请选择员工', trigger: 'change' }],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }]
}

const fmtMoney = (v) => v ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00'
const fmtRate = (v) => `${(Number(v || 0) * 100).toFixed(2)}%`
const statTotal = computed(() => list.value.reduce((s, r) => s + (Number(r.amount) || 0), 0))
const statEmployees = computed(() => new Set(list.value.map(r => r.employee_id || r.employee?.id)).size)

const loadData = async () => {
  if (dateRange.value?.length === 2) { query.date_start = dateRange.value[0]; query.date_end = dateRange.value[1] }
  loading.value = true
  try {
    const res = await performanceApi.list(query)
    if (res.success) { list.value = res.data.list; total.value = res.data.total }
  } finally { loading.value = false }
}

const resetQuery = () => { 
  Object.assign(query, { page: 1, employee_id: '', dept_id: '', date_start: '', date_end: '' })
  dateRange.value = []
  loadData()
}

const openDialog = (row = null) => {
  editId.value = row?.id || null
  Object.assign(form, { employee_id:'', date:'', dept_id:'', dept_name:'', company_id:'', company_name:'', amount:0, source:'', remark:'' })
  if (row) {
    Object.assign(form, {
      ...row,
      employee_id: row.employee_id || row.employee?.id,
      // 数字字段强制转换
      amount: Number(row.amount) || 0,
      dept_id: row.dept_id ? Number(row.dept_id) : '',
      company_id: row.company_id ? Number(row.company_id) : ''
    })
  }
  dialogVisible.value = true
}

const openAutoDialog = (type) => {
  autoType.value = type
  autoForm.dateRange = []
  autoForm.overwrite = false
  autoDialogVisible.value = true
}

const onEmployeeChange = (id) => { 
  const e = employees.value.find(x => x.id === id)
  if (e) {
    form.dept_id = form.dept_id || e.dept_id
    form.dept_name = form.dept_name || e.dept_name
  }
}
const onDeptChange = (id) => { const d = depts.value.find(x => x.id === id); form.dept_name = d?.name || '' }
const onCompanyChange = (id) => { const c = companies.value.find(x => x.id === id); form.company_name = c?.name || '' }

const handleSave = async () => {
  await formRef.value.validate()
  // 二次确认
  const action = editId.value ? '修改' : '新增'
  try { await ElMessageBox.confirm(`确定要${action}该绩效记录吗？`, '确认保存', { type: 'info' }) } catch { return }
  saving.value = true
  try {
    const res = editId.value ? await performanceApi.update(editId.value, form) : await performanceApi.create(form)
    if (res.success) { ElMessage.success(res.message); dialogVisible.value = false; loadData() }
  } finally { saving.value = false }
}

const handleAutoGenerate = async () => {
  // 二次确认
  try { await ElMessageBox.confirm('确定要批量生成绩效记录吗？', '确认生成', { type: 'info' }) } catch { return }
  autoSaving.value = true
  try {
    const data = {
      date_start: autoForm.dateRange?.[0] || '',
      date_end: autoForm.dateRange?.[1] || '',
      overwrite: autoForm.overwrite
    }
    const res = autoType.value === 'order' 
      ? await performanceApi.autoFromOrders(data)
      : await performanceApi.autoFromContracts(data)
    
    if (res.success) {
      const processed = res.data?.processed || 0
      const skipped = res.data?.skipped || 0
      if (processed > 0) {
        ElMessage.success(res.message)
      } else if (skipped > 0) {
        ElMessage.warning(res.message)
      } else {
        ElMessage.info(res.message)
      }
      autoDialogVisible.value = false
      loadData()
    }
  } finally { autoSaving.value = false }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除该绩效记录吗？`, '警告', { type: 'warning' }).then(async () => {
    const res = await performanceApi.delete(row.id)
    if (res.success) { ElMessage.success('删除成功'); loadData() }
  })
}

onMounted(async () => {
  loadData()
  const [er, dr, cr] = await Promise.all([employeeApi.all(), departmentApi.all(), companyApi.all()])
  if (er.success) employees.value = er.data
  if (dr.success) depts.value = dr.data
  if (cr.success) companies.value = cr.data
})
</script>

<style scoped>
.page-container { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
.toolbar-card { flex-shrink: 0; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 8px; }
.toolbar-title { font-weight: 600; font-size: 14px; color: #333; margin-right: 8px; }
.batch-tip { font-size: 14px; color: #409eff; }
.batch-tip strong { font-size: 16px; }
.stat-cards { flex-shrink: 0; }
.stat-card { background: #fff; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.stat-label { font-size: 12px; color: #999; margin-bottom: 6px; }
.stat-value { font-size: 20px; font-weight: 700; color: #333; }
.stat-value.primary { color: #409eff; }
.table-card { flex: 1; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
.amount { color: #52c41a; font-weight: 600; }
.form-tip { font-size: 12px; color: #999; margin-top: 4px; }
</style>
