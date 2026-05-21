<template>
  <div class="project-page">
    <!-- 顶部统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
          <el-icon><Document /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ total }}</div>
          <div class="stat-label">项目总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
          <el-icon><Coin /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ fmtMoney(totalAmount) }}</div>
          <div class="stat-label">项目总金额</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%)">
          <el-icon><Money /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ fmtMoney(totalReceived) }}</div>
          <div class="stat-label">收款总额</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
          <el-icon><DataLine /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value" :style="{ color: totalProfit >= 0 ? '#52c41a' : '#ff4d4f' }">{{ fmtMoney(totalProfit) }}</div>
          <div class="stat-label">利润总额</div>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
    <el-card shadow="never" class="search-card">
      <el-form :model="query" inline>
        <el-form-item label="项目名称"><el-input v-model="query.name" placeholder="请输入" clearable style="width:200px" /></el-form-item>
        <el-form-item label="项目编号"><el-input v-model="query.project_no" placeholder="请输入" clearable style="width:160px" /></el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:12px">
      <template #header>
        <div class="card-header">
          <span>项目列表</span>
          <div style="display:flex;gap:8px;align-items:center">
            <ImportExportButtons model="projects" modelName="项目" @success="loadData" />
            <el-button v-if="selectedRows.length>0" type="danger" size="small" @click="batchDelete" :loading="batchLoading">
              <el-icon><Delete /></el-icon>批量删除({{selectedRows.length}})
            </el-button>
            <el-button v-if="selectedRows.length>0" size="small" @click="selectedRows=[]">取消选择</el-button>
            <span style="display:flex">
            <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增项目</el-button>
            </span>
          </div>
        </div>
      </template>
      <el-table :data="list" v-loading="loading" stripe class="project-table" @selection-change="onSelectionChange">
        <el-table-column type="selection" width="45" />
        <el-table-column prop="name" label="项目名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="project_no" label="项目编号" width="130" />
        <el-table-column prop="amount" label="项目金额" width="110" align="right">
          <template #default="{ row }">{{ fmtMoney(row.amount) }}</template>
        </el-table-column>
        <el-table-column prop="received" label="已收款" width="110" align="right">
          <template #default="{ row }">{{ fmtMoney(row.received) }}</template>
        </el-table-column>
        <el-table-column prop="profit" label="利润" width="100" align="right">
          <template #default="{ row }"><span :style="{ color: row.profit >= 0 ? '#52c41a' : '#ff4d4f' }">{{ fmtMoney(row.profit) }}</span></template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" plain @click="$router.push(`/projects/${row.id}`)">详情</el-button>
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" @change="loadData" />
      </div>
    </el-card>
    </div>

    <el-dialog v-model="dialogVisible" :title="editId ? '编辑项目' : '新增项目'" width="600px" destroy-on-close>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="项目名称" prop="name"><el-input v-model="form.name" placeholder="请输入项目名称" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="项目编号"><el-input v-model="form.project_no" placeholder="留空自动生成" /></el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="项目内容"><el-input v-model="form.content" type="textarea" :rows="2" placeholder="项目内容描述" /></el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注信息" /></el-form-item>
          </el-col>
        </el-row>
        <div class="form-tip">💡 项目金额将由关联合同自动汇总，无需手动填写</div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/store/auth'
import ImportExportButtons from '@/components/ImportExportButtons.vue'
import { projectApi, customerApi, employeeApi } from '@/api'

const list = ref([])
const total = ref(0)
const totalAmount = computed(() => list.value.reduce((s, r) => s + (Number(r.amount) || 0), 0))
const totalReceived = computed(() => list.value.reduce((s, r) => s + (Number(r.received) || 0), 0))
const totalProfit = computed(() => list.value.reduce((s, r) => s + (Number(r.profit) || 0), 0))
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editId = ref(null)
const selectedRows = ref([])
const batchLoading = ref(false)
const onSelectionChange = (rows) => { selectedRows.value = rows }
const batchDelete = async () => {
  if (selectedRows.value.length === 0) return ElMessage.warning('请先选择数据')
  try { await ElMessageBox.confirm('确定删除选中的 ' + selectedRows.value.length + ' 个项目吗？', '批量删除', { type: 'warning' }) } catch { return }
  batchLoading.value = true
  try {
    let ok = 0
    for (const row of selectedRows.value) { try { const r = await projectApi.delete(row.id); if (r.success) ok++ } catch {} }
    ElMessage.success('成功删除 ' + ok + ' 条记录')
    selectedRows.value = []
    loadData()
  } finally { batchLoading.value = false }
}
const formRef = ref()
const customers = ref([])
const auth = useAuthStore()
const employees = ref([])
const summaryData = ref(null)
const filling = ref(false)
const dateRange = ref([])

const query = reactive({ page: 1, pageSize: 20, name: '', project_no: '', customer_name: '', status: '', date_start: '', date_end: '' })
const form = reactive({ name: '', date: '', customer_id: '', customer_name: '', content: '', amount: 0, receivable: 0, requested: 0, received: 0, labor_cost: 0, cost: 0, tax: 0, other: 0, business_fee: 0, performance: 0, profit: 0, manager: '', salesman: '', status: '进行中' })
const rules = { name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }] }

const amountFields = [
  { key: 'amount', label: '项目金额' }, { key: 'receivable', label: '应收金额' }, { key: 'requested', label: '请款金额' },
  { key: 'received', label: '收款金额' }, { key: 'labor_cost', label: '劳务费' }, { key: 'cost', label: '成本金额' },
  { key: 'tax', label: '税费' }, { key: 'other', label: '其他' }, { key: 'business_fee', label: '业务费' },
  { key: 'performance', label: '绩效' }, { key: 'profit', label: '利润' }
]

const fmtMoney = (v) => v ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00'

const loadData = async () => {
  if (dateRange.value?.length === 2) { query.date_start = dateRange.value[0]; query.date_end = dateRange.value[1] }
  loading.value = true
  try {
    const res = await projectApi.list(query)
    if (res.success) { list.value = res.data.list; total.value = res.data.total }
  } finally { loading.value = false }
}

const resetQuery = () => { Object.assign(query, { page: 1, name: '', project_no: '', customer_name: '', status: '', date_start: '', date_end: '' }); dateRange.value = []; loadData() }

const openDialog = (row = null) => {
  editId.value = row?.id || null
  const userName = auth.user?.name || ''
  Object.assign(form, { name: '', date: '', customer_id: '', customer_name: '', content: '', amount: 0, receivable: 0, requested: 0, received: 0, labor_cost: 0, cost: 0, tax: 0, other: 0, business_fee: 0, performance: 0, profit: 0, manager: userName, salesman: userName, status: '进行中' })
  if (row) {
    Object.assign(form, row)
    // 数字字段强制转换
    form.customer_id = row.customer_id ? Number(row.customer_id) : ''
    form.amount = Number(row.amount) || 0
    form.receivable = Number(row.receivable) || 0
    form.requested = Number(row.requested) || 0
    form.received = Number(row.received) || 0
    form.labor_cost = Number(row.labor_cost) || 0
    form.cost = Number(row.cost) || 0
    form.tax = Number(row.tax) || 0
    form.other = Number(row.other) || 0
    form.business_fee = Number(row.business_fee) || 0
    form.performance = Number(row.performance) || 0
    form.profit = Number(row.profit) || 0
  }
  dialogVisible.value = true
}

const onCustomerChange = (id) => { const c = customers.value.find(x => x.id === id); form.customer_name = c?.name || '' }

// 从关联数据自动填充金额
const fillFromSummary = async () => {
  if (!editId.value) return ElMessage.warning('请先保存项目后再填充')
  filling.value = true
  try {
    const res = await projectApi.summary(editId.value)
    if (res.success && res.data) {
      const s = res.data
      summaryData.value = s
      // 自动填充到表单（保留手动已修改的值不覆盖，用汇总数据更新）
      if (s.contract_amount) form.amount = Number(s.contract_amount) || form.amount
      if (s.contract_received) form.received = Number(s.contract_received) || form.received
      if (s.order_settlement) form.labor_cost = Number(s.order_settlement) || form.labor_cost
      if (s.order_performance) form.performance = Number(s.order_performance) || form.performance
      if (s.finance_income) form.receivable = Number(s.finance_income) || form.receivable
      if (s.finance_expense) form.cost = Number(s.finance_expense) || form.cost
      if (s.profit !== undefined) form.profit = Number(s.profit) || form.profit
      ElMessage.success('金额已从关联数据自动填充，可手动调整后保存')
    }
  } catch (e) { ElMessage.error('获取汇总数据失败') }
  finally { filling.value = false }
}

const handleSave = async () => {
  await formRef.value.validate()
  saving.value = true
  try {
    const res = editId.value ? await projectApi.update(editId.value, form) : await projectApi.create(form)
    if (res.success) { ElMessage.success(res.message); dialogVisible.value = false; loadData() }
  } finally { saving.value = false }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除项目「${row.name}」吗？`, '警告', { type: 'warning' }).then(async () => {
    const res = await projectApi.delete(row.id)
    if (res.success) { ElMessage.success('删除成功'); loadData() }
  })
}

// 快速修改状态
const handleStatusChange = async (row, type) => {
  try {
    if (type === 'project') {
      await projectApi.update(row.id, { status: row.status })
    }
    ElMessage.success('状态已更新')
  } catch (e) {
    ElMessage.error('更新状态失败')
    loadData()
  }
}

onMounted(async () => {
  loadData()
  const [cr, er] = await Promise.all([customerApi.all(), employeeApi.all()])
  if (cr.success) customers.value = cr.data
  if (er.success) employees.value = er.data
})
</script>

<style scoped>
.project-page {
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

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none; border-radius: 10px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  height: 40px; padding: 0 18px;
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4); }

.project-table :deep(.el-table__header-wrapper th) {
  background: linear-gradient(135deg, #f8f9fc 0%, #f0f2f7 100%);
  font-weight: 600; color: #4a4a5a; font-size: 13px;
}
.project-table :deep(.el-table__row:hover > td) {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%) !important;
}

.money-cell { font-family: 'Courier New', monospace; font-weight: 500; }
.profit-positive { color: #52c41a; font-weight: 600; }
.profit-negative { color: #ff4d4f; font-weight: 600; }

.btn-detail {
  background: #f0f2f7; border: none; color: #4a4a5a; border-radius: 8px;
}
.btn-edit-page {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none; border-radius: 8px; color: white;
}
.btn-delete {
  border-radius: 8px;
}
.btn-delete:hover { background: #ffeaea; }

.pagination {
  margin-top: 16px; display: flex; justify-content: flex-end; padding: 16px 24px;
  border-top: 1px solid #f0f0f5;
}

.summary-hint { font-size: 12px; color: #67c23a; margin-top: 4px; }

.edit-dialog :deep(.el-dialog) { border-radius: 20px; overflow: hidden; }
.edit-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 24px; margin: 0;
}
.edit-dialog :deep(.el-dialog__title) { color: white; font-size: 18px; font-weight: 600; }
.edit-dialog :deep(.el-dialog__headerbtn .el-dialog__close) { color: white; }
.edit-dialog :deep(.el-dialog__body) { padding: 28px 24px; }
.edit-dialog :deep(.el-dialog__footer) { padding: 16px 24px 24px; border-top: 1px solid #f0f0f5; }

@media (max-width: 1200px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) {
  .stats-row { grid-template-columns: 1fr; }
  .toolbar-section { flex-direction: column; gap: 16px; }
}
</style>
