<template>
  <div class="page-container">
    <!-- 工具栏 -->
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-select v-model="query.employee_id" placeholder="全部员工" clearable filterable style="width:160px" @change="loadData">
            <el-option v-for="e in employees" :key="e.id" :label="e.name" :value="e.id" />
          </el-select>
          <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始月份" end-placeholder="结束月份" value-format="YYYY-MM" style="width:240px" @change="loadData" />
        </div>
        <div class="toolbar-right">
          <ImportExportButtons model="salaries" modelName="工资" @success="loadData" />
          <el-button v-if="selectedRows.length>0" type="danger" size="small" @click="batchDelete" :loading="batchLoading">
            <el-icon><Delete /></el-icon>批量删除({{selectedRows.length}})
          </el-button>
          <el-button v-if="selectedRows.length>0" size="small" @click="selectedRows=[]">取消选择</el-button>
          <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增记录</el-button>
        </div>
      </div>
    </el-card>

    <!-- 统计卡片 -->
    <el-row :gutter="12" class="stat-cards">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">工资总额</div>
          <div class="stat-value primary">{{ fmtMoney(statTotal.totalSalary) }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">实发总额</div>
          <div class="stat-value success">{{ fmtMoney(statTotal.totalActual) }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">社保总额</div>
          <div class="stat-value warning">{{ fmtMoney(statTotal.totalSocial) }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">记录条数</div>
          <div class="stat-value">{{ total }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- 主表格 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">工资记录</span>
          <span class="card-tip">共 {{ total }} 条</span>
        </div>
      </template>
      <el-table
        :data="list"
        border
        v-loading="loading"
        :max-height="tableMaxHeight"
        size="default"
        show-summary
        :summary-method="getSummaries"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="45" />
        <el-table-column type="index" label="#" width="60" align="center" />
        <el-table-column prop="date" label="月份" width="100" sortable />
        <el-table-column label="员工" min-width="120">
          <template #default="{ row }">
            <div class="emp-cell">
              <span class="emp-name">{{ row.employee?.name }}</span>
              <span class="emp-dept">{{ row.employee?.dept_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="base_salary" label="月薪" width="110" align="right" sortable>
          <template #default="{ row }">{{ fmtMoney(row.base_salary) }}</template>
        </el-table-column>
        <el-table-column prop="reimbursement" label="报销" width="90" align="right">
          <template #default="{ row }">{{ fmtMoney(row.reimbursement) }}</template>
        </el-table-column>
        <el-table-column prop="fuel_cost" label="加油费" width="90" align="right">
          <template #default="{ row }">{{ fmtMoney(row.fuel_cost) }}</template>
        </el-table-column>
        <el-table-column prop="performance" label="绩效" width="90" align="right">
          <template #default="{ row }">{{ fmtMoney(row.performance) }}</template>
        </el-table-column>
        <el-table-column prop="deduction" label="扣款" width="80" align="right">
          <template #default="{ row }"><span class="danger">{{ fmtMoney(row.deduction) }}</span></template>
        </el-table-column>
        <el-table-column prop="social_security" label="社保" width="90" align="right">
          <template #default="{ row }">{{ fmtMoney(row.social_security) }}</template>
        </el-table-column>
        <el-table-column prop="actual_salary" label="实发工资" width="110" align="right" sortable>
          <template #default="{ row }"><strong class="actual">{{ fmtMoney(row.actual_salary) }}</strong></template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="success" text size="small" @click="$router.push(`/salary/${row.id}`)"><el-icon><View /></el-icon></el-button>
            <el-button type="primary" text size="small" @click="openDialog(row)"><el-icon><Edit /></el-icon></el-button>
            <el-popconfirm title="确定删除？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button type="danger" text size="small"><el-icon><Delete /></el-icon></el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <span class="total">共 {{ total }} 条记录</span>
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="sizes, prev, pager, next"
          @current-change="loadData"
          @size-change="loadData"
        />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editId ? '编辑记录' : '新增记录'" width="560px" destroy-on-close>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
        <el-form-item label="员工" prop="employee_id">
          <el-select v-model="form.employee_id" placeholder="请选择员工" filterable style="width:100%" @change="onEmployeeChange">
            <el-option v-for="e in employees" :key="e.id" :label="`${e.name} - ${e.dept_name}`" :value="e.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="月份" prop="date">
          <el-date-picker v-model="form.date" type="month" placeholder="选择月份" value-format="YYYY-MM" style="width:100%" />
        </el-form-item>
        <el-divider content-position="left">工资明细</el-divider>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="月薪">
              <el-input-number v-model="form.base_salary" :precision="2" :min="0" style="width:100%" @change="calcActual" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="绩效">
              <el-input-number v-model="form.performance" :precision="2" :min="0" style="width:100%" @change="calcActual" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="报销">
              <el-input-number v-model="form.reimbursement" :precision="2" :min="0" style="width:100%" @change="calcActual" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="加油费">
              <el-input-number v-model="form.fuel_cost" :precision="2" :min="0" style="width:100%" @change="calcActual" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="扣款">
              <el-input-number v-model="form.deduction" :precision="2" :min="0" style="width:100%" @change="calcActual" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="社保">
              <el-input-number v-model="form.social_security" :precision="2" :min="0" style="width:100%" @change="calcActual" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-divider content-position="left">实发工资 = 月薪 + 报销 + 加油费 + 绩效 - 扣款 - 社保</el-divider>
        <el-form-item label="实发工资">
          <el-input-number v-model="form.actual_salary" :precision="2" :min="0" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Edit, Delete, View } from '@element-plus/icons-vue'
import { salaryApi, employeeApi } from '@/api'
import ImportExportButtons from '@/components/ImportExportButtons.vue'

const loading = ref(false)
const saving = ref(false)
const selectedRows = ref([])
const batchLoading = ref(false)
const onSelectionChange = (rows) => { selectedRows.value = rows }
const batchDelete = async () => {
  if (selectedRows.value.length === 0) return ElMessage.warning('请先选择数据')
  try { await ElMessageBox.confirm('确定删除选中的 ' + selectedRows.value.length + ' 条工资记录吗？', '批量删除', { type: 'warning' }) } catch { return }
  batchLoading.value = true
  try {
    let ok = 0
    for (const row of selectedRows.value) { try { const r = await salaryApi.delete(row.id); if (r.success) ok++ } catch {} }
    ElMessage.success('成功删除 ' + ok + ' 条记录')
    selectedRows.value = []
    loadData()
  } finally { batchLoading.value = false }
}
const dialogVisible = ref(false)
const editId = ref(null)
const formRef = ref()
const employees = ref([])
const list = ref([])
const total = ref(0)
const dateRange = ref([])
const tableMaxHeight = ref(500)

const query = reactive({ page: 1, pageSize: 20, employee_id: '', date_start: '', date_end: '' })
const form = reactive({
  employee_id: '', date: '',
  base_salary: 0, reimbursement: 0, deduction: 0,
  fuel_cost: 0, social_security: 0, performance: 0, actual_salary: 0
})
const rules = {
  employee_id: [{ required: true, message: '请选择员工', trigger: 'change' }],
  date: [{ required: true, message: '请选择月份', trigger: 'change' }]
}

// 统计
const statTotal = computed(() => {
  const t = { totalSalary: 0, totalActual: 0, totalSocial: 0 }
  list.value.forEach(r => {
    t.totalSalary += Number(r.base_salary) || 0
    t.totalActual += Number(r.actual_salary) || 0
    t.totalSocial += Number(r.social_security) || 0
  })
  return t
})

const fmtMoney = (v) => v ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00'

const calcActual = () => {
  form.actual_salary = (form.base_salary || 0) + (form.reimbursement || 0) + (form.fuel_cost || 0) + (form.performance || 0) - (form.deduction || 0) - (form.social_security || 0)
}

const getSummaries = () => ['合计', '', '', '', fmtMoney(statTotal.value.totalSalary), '', '', '', '', '', fmtMoney(statTotal.value.totalActual)]

const loadData = async () => {
  if (dateRange.value?.length === 2) {
    query.date_start = dateRange.value[0]
    query.date_end = dateRange.value[1]
  } else {
    query.date_start = ''
    query.date_end = ''
  }
  loading.value = true
  try {
    const res = await salaryApi.list(query)
    if (res.success) { list.value = res.data.list; total.value = res.data.total }
  } finally { loading.value = false }
}

const onEmployeeChange = (id) => {
  const e = employees.value.find(x => x.id === id)
  if (e) form.dept_name = e.dept_name
}

const openDialog = (row = null) => {
  editId.value = row?.id || null
  Object.assign(form, { employee_id: '', date: '', base_salary: 0, reimbursement: 0, deduction: 0, fuel_cost: 0, social_security: 0, performance: 0, actual_salary: 0 })
  if (row) {
    Object.assign(form, {
      ...row,
      employee_id: row.employee_id ? Number(row.employee_id) : ''
    })
    form.base_salary = Number(row.base_salary) || 0
    form.reimbursement = Number(row.reimbursement) || 0
    form.deduction = Number(row.deduction) || 0
    form.fuel_cost = Number(row.fuel_cost) || 0
    form.social_security = Number(row.social_security) || 0
    form.performance = Number(row.performance) || 0
    form.actual_salary = Number(row.actual_salary) || 0
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  await formRef.value.validate()
  saving.value = true
  try {
    const data = { ...form }
    if (!data.date) data.date = null
    const res = editId.value ? await salaryApi.update(editId.value, data) : await salaryApi.create(data)
    if (res.success) { ElMessage.success(res.message); dialogVisible.value = false; loadData() }
  } finally { saving.value = false }
}

const handleDelete = async (row) => {
  try {
    const res = await salaryApi.delete(row.id)
    if (res.success) { ElMessage.success('删除成功'); loadData() }
  } catch (e) { ElMessage.error('删除失败') }
}

const batchImport = () => {
  ElMessage.info('批量导入功能开发中...')
}

const calcHeight = () => { tableMaxHeight.value = window.innerHeight - 320 }

onMounted(async () => {
  loadData()
  calcHeight()
  window.addEventListener('resize', calcHeight)
  const res = await employeeApi.all()
  if (res.success) employees.value = res.data
})
onUnmounted(() => { window.removeEventListener('resize', calcHeight) })
</script>

<style scoped>
.page-container { padding: 12px; height: 100%; display: flex; flex-direction: column; gap: 12px; }
.toolbar-card { flex-shrink: 0; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.toolbar-left, .toolbar-right { display: flex; gap: 8px; align-items: center; }
.stat-cards { flex-shrink: 0; }
.stat-card { background: #fff; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.stat-label { font-size: 12px; color: #999; margin-bottom: 6px; }
.stat-value { font-size: 20px; font-weight: 700; color: #333; }
.stat-value.primary { color: #409eff; }
.stat-value.success { color: #52c41a; }
.stat-value.warning { color: #fa8c16; }
.table-card { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.table-card :deep(.el-card__body) { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.table-card :deep(.el-table) { flex: 1; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.card-tip { font-size: 13px; color: #999; font-weight: normal; }
.emp-cell { display: flex; flex-direction: column; }
.emp-name { font-weight: 600; }
.emp-dept { font-size: 11px; color: #999; }
.danger { color: #ff4d4f; }
.actual { color: #52c41a; font-size: 14px; }
.pagination-wrapper { display: flex; justify-content: space-between; align-items: center; padding: 12px 0 0; border-top: 1px solid #ebeef5; margin-top: 12px; }
.pagination-wrapper .total { color: #999; font-size: 13px; }
</style>
