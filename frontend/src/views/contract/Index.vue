<template>
  <div class="contract-page">
    <!-- 顶部统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
          <el-icon><Document /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ total }}</div>
          <div class="stat-label">合同总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
          <el-icon><Money /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ fmtMoney(totalAmount) }}</div>
          <div class="stat-label">合同总金额</div>
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
          <div class="stat-value">{{ fmtMoney(totalProfit) }}</div>
          <div class="stat-label">利润总额</div>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
    <el-card shadow="never" class="search-card">
      <el-form :model="query" inline>
        <el-form-item label="合同名称"><el-input v-model="query.name" placeholder="请输入" clearable style="width:160px" /></el-form-item>
        <el-form-item label="合同编号"><el-input v-model="query.contract_no" placeholder="请输入" clearable style="width:160px" /></el-form-item>
        <el-form-item label="客户"><el-input v-model="query.customer_name" placeholder="请输入" clearable style="width:140px" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width:110px">
            <el-option label="待签订" value="待签订" /><el-option label="进行中" value="进行中" />
            <el-option label="已完成" value="已完成" /><el-option label="已取消" value="已取消" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="query.dept_id" placeholder="全部" clearable style="width:130px">
            <el-option v-for="d in depts" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:12px">
      <template #header>
        <div class="card-header">
          <span>合同列表</span>
          <div style="display:flex;gap:8px;align-items:center">
            <ImportExportButtons model="contracts" modelName="合同" @success="loadData" />
            <el-button v-if="selectedRows.length>0" type="primary" size="small" @click="showBatchStatusDialog = true">
              <el-icon><Switch /></el-icon>批量改状态({{selectedRows.length}})
            </el-button>
            <el-button v-if="selectedRows.length>0" type="danger" size="small" @click="batchDelete" :loading="batchLoading">
              <el-icon><Delete /></el-icon>批量删除({{selectedRows.length}})
            </el-button>
            <el-button v-if="selectedRows.length>0" size="small" @click="selectedRows=[]">取消选择</el-button>
            <span style="display:flex">
            <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增合同</el-button>
            </span>
          </div>
        </div>
      </template>
      <el-table :data="list" v-loading="loading" stripe class="contract-table" @selection-change="onSelectionChange">
        <el-table-column type="selection" width="45" />
        <el-table-column prop="contract_no" label="合同编号" width="150" />
        <el-table-column prop="date" label="日期" width="110" />
        <el-table-column prop="name" label="合同名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="project_name" label="关联项目" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link v-if="row.project_id" type="primary" @click="$router.push(`/projects/${row.project_id}`)">{{ row.project_name || '查看项目' }}</el-link>
            <span v-else class="text-muted">无</span>
          </template>
        </el-table-column>
        <el-table-column prop="customer_name" label="客户" width="120" show-overflow-tooltip />
        <el-table-column prop="dept_name" label="部门" width="100" />
        <el-table-column prop="company_name" label="公司" width="120" show-overflow-tooltip />
        <el-table-column prop="amount" label="合同金额" width="110" align="right">
          <template #default="{ row }">{{ fmtMoney(row.amount) }}</template>
        </el-table-column>
        <el-table-column prop="received" label="收款" width="110" align="right">
          <template #default="{ row }">{{ fmtMoney(row.received) }}</template>
        </el-table-column>
        <el-table-column prop="profit" label="利润" width="100" align="right">
          <template #default="{ row }"><span :style="{ color: row.profit >= 0 ? '#52c41a' : '#ff4d4f' }">{{ fmtMoney(row.profit) }}</span></template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-select v-model="row.status" size="small" :style="{ width: '85px' }" @change="handleStatusChange(row)">
              <el-option label="待签订" value="待签订" /><el-option label="进行中" value="进行中" /><el-option label="已完成" value="已完成" /><el-option label="已取消" value="已取消" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" plain @click="$router.push(`/contracts/${row.id}`)">详情</el-button>
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination"><el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" @change="loadData" /></div>
    </el-card>
    </div>

    <!-- 批量状态变更弹窗 -->
    <el-dialog v-model="showBatchStatusDialog" title="批量变更合同状态" width="500px" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="目标状态">
          <el-select v-model="batchTargetStatus" placeholder="请选择" style="width:200px">
            <el-option label="待签订" value="待签订" />
            <el-option label="进行中" value="进行中" />
            <el-option label="已完成" value="已完成" />
            <el-option label="已取消" value="已取消" />
          </el-select>
        </el-form-item>
        <el-form-item label="选中合同">
          <span>共 <b>{{ selectedRows.length }}</b> 条合同</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchStatusDialog = false">取消</el-button>
        <el-button type="primary" @click="handleBatchStatusChange" :loading="batchStatusLoading">确认变更</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="dialogVisible" :title="editId ? '编辑合同' : '新增合同'" width="760px" destroy-on-close>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="合同名称" prop="name"><el-input v-model="form.name" placeholder="请输入合同名称" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="日期"><el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="关联项目">
            <el-select v-model="form.project_id" filterable clearable placeholder="可选择关联项目" style="width:100%" @change="onProjectChange">
              <el-option v-for="p in projects" :key="p.id" :label="`${p.project_no} - ${p.name}`" :value="p.id" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="客户名称">
            <el-select v-model="form.customer_id" filterable placeholder="请选择客户" style="width:100%" @change="onCustomerChange">
              <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="部门">
            <el-select v-model="form.dept_id" placeholder="请选择部门" style="width:100%" @change="onDeptChange">
              <el-option v-for="d in depts" :key="d.id" :label="d.name" :value="d.id" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="公司">
            <el-select v-model="form.company_id" placeholder="请选择公司" style="width:100%" @change="onCompanyChange">
              <el-option v-for="c in companies" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="负责人">
            <el-select v-model="form.manager" filterable clearable placeholder="请选择" style="width:100%">
              <el-option v-for="e in employees" :key="e.id" :label="e.name" :value="e.name" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="业务员">
            <el-select v-model="form.salesman" filterable clearable placeholder="请选择" style="width:100%">
              <el-option v-for="e in employees" :key="e.id" :label="e.name" :value="e.name" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="合同状态">
            <el-select v-model="form.status" style="width:100%">
              <el-option label="待签订" value="待签订" /><el-option label="进行中" value="进行中" />
              <el-option label="已完成" value="已完成" /><el-option label="已取消" value="已取消" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="24"><el-form-item label="合同附件">
            <div class="attachment-area">
              <el-upload
                :action="uploadUrl"
                :headers="uploadHeaders"
                :on-success="handleUploadSuccess"
                :on-error="handleUploadError"
                :show-file-list="false"
                :multiple="true"
                accept=".pdf,.doc,.docx,.jpg,.png,.jpeg"
                :data="{ originalName: '' }"
              >
                <el-button size="small" type="primary" plain>
                  <el-icon><Upload /></el-icon> 上传附件（可多选）
                </el-button>
              </el-upload>
              <div v-if="attachmentList.length > 0" class="file-list">
                <div v-for="(url, idx) in attachmentList" :key="idx" class="file-item">
                  <el-icon class="file-icon"><Document /></el-icon>
                  <el-link type="primary" :href="url" target="_blank" class="file-name">{{ getFileName(url) }}</el-link>
                  <el-button size="small" type="danger" text circle @click="removeAttachment(idx, url)">
                    <el-icon><Close /></el-icon>
                  </el-button>
                </div>
              </div>
              <div v-else class="no-file">暂无附件</div>
            </div>
          </el-form-item></el-col>
          <el-col :span="24"><el-form-item label="服务内容"><el-input v-model="form.service_content" type="textarea" :rows="2" /></el-form-item></el-col>
        </el-row>
        <el-divider>金额信息
          <el-button v-if="editId" size="small" type="primary" plain @click="fillFromSummary" :loading="filling" style="margin-left:12px">
            <el-icon><Refresh /></el-icon>从关联数据自动填充
          </el-button>
          <div v-if="summaryData" class="summary-hint">已获取汇总数据，可手动调整后保存</div>
        </el-divider>
        <el-row :gutter="16">
          <el-col :span="8" v-for="f in amountFields" :key="f.key">
            <el-form-item :label="f.label"><el-input-number v-model="form[f.key]" :precision="2" :min="0" style="width:100%" /></el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/store/auth'
import { contractApi, customerApi, departmentApi, companyApi, employeeApi, projectApi } from '@/api'
import ImportExportButtons from '@/components/ImportExportButtons.vue'

const list = ref([]), total = ref(0), loading = ref(false), saving = ref(false)
const totalAmount = computed(() => list.value.reduce((s, r) => s + (Number(r.amount) || 0), 0))
const totalReceived = computed(() => list.value.reduce((s, r) => s + (Number(r.received) || 0), 0))
const totalProfit = computed(() => list.value.reduce((s, r) => s + (Number(r.profit) || 0), 0))
const dialogVisible = ref(false), editId = ref(null), formRef = ref()
const customers = ref([]), depts = ref([]), companies = ref([]), employees = ref([]), projects = ref([])
const selectedRows = ref([])
const batchLoading = ref(false)
const showBatchStatusDialog = ref(false)
const batchTargetStatus = ref('')
const batchStatusLoading = ref(false)
const auth = useAuthStore()
const onSelectionChange = (rows) => { selectedRows.value = rows }

const handleBatchStatusChange = async () => {
  if (!batchTargetStatus.value) {
    ElMessage.warning('请选择目标状态')
    return
  }
  
  batchStatusLoading.value = true
  try {
    const ids = selectedRows.value.map(r => r.id)
    const res = await contractApi.batchUpdateStatus(ids, batchTargetStatus.value)
    
    if (res.success) {
      const data = res.data || {}
      const msg = res.message || data.message || `成功更新 ${data.updatedCount || 0} 条合同状态`
      
      if (data.failedItems && data.failedItems.length > 0) {
        const failedMsg = data.failedItems.map(f => `${f.contract_no}: ${f.reason}`).join('\n')
        ElMessageBox.alert(failedMsg, '部分合同变更失败', { type: 'warning' })
      } else {
        ElMessage.success(msg)
      }
      
      showBatchStatusDialog.value = false
      batchTargetStatus.value = ''
      selectedRows.value = []
      loadData()
    } else {
      ElMessage.error(res.message || '状态更新失败')
    }
  } catch (e) {
    ElMessage.error('请求失败')
  } finally {
    batchStatusLoading.value = false
  }
}

const batchDelete = async () => {
  if (selectedRows.value.length === 0) return ElMessage.warning('请先选择数据')
  try { await ElMessageBox.confirm('确定删除选中的 ' + selectedRows.value.length + ' 条合同吗？', '批量删除', { type: 'warning' }) } catch { return }
  batchLoading.value = true
  try {
    let ok = 0
    for (const row of selectedRows.value) { try { const r = await contractApi.delete(row.id); if (r.success) ok++ } catch {} }
    ElMessage.success('成功删除 ' + ok + ' 条记录')
    selectedRows.value = []
    loadData()
  } finally { batchLoading.value = false }
}

const query = reactive({ page: 1, pageSize: 20, name: '', contract_no: '', customer_name: '', status: '', dept_id: '' })
const form = reactive({
  name: '', date: '', project_id: '', customer_id: '', customer_name: '', service_content: '', dept_id: '', dept_name: '',
  company_id: '', company_name: '', manager: '', salesman: '', status: '待签订', attachment: '',
  amount: 0, receivable: 0, requested: 0, received: 0, labor_cost: 0, cost: 0, tax: 0, other: 0, business_fee: 0, performance: 0, profit: 0
})
const rules = { name: [{ required: true, message: '请输入合同名称', trigger: 'blur' }] }
const summaryData = ref(null)
const filling = ref(false)
const attachmentList = ref([])
const amountFields = [
  { key: 'amount' }, { key: 'receivable' }, { key: 'requested' }, { key: 'received' },
  { key: 'labor_cost' }, { key: 'cost' }, { key: 'tax' }, { key: 'other' },
  { key: 'business_fee' }, { key: 'performance' }, { key: 'profit' }
].map(k => ({ key: k.key, label: { amount:'合同金额',receivable:'应收金额',requested:'请款金额',received:'收款金额',labor_cost:'劳务费',cost:'成本金额',tax:'税费',other:'其他',business_fee:'业务费',performance:'绩效',profit:'利润' }[k.key] }))

const uploadUrl = computed(() => `/api/upload/contracts`)
const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token')
  return { Authorization: `Bearer ${token}` }
})

const fmtMoney = (v) => v ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits:2 }) : '0.00'

const loadData = async () => { loading.value = true; try { const res = await contractApi.list(query); if (res.success) { list.value = res.data.list; total.value = res.data.total } } finally { loading.value = false } }
const resetQuery = () => { Object.assign(query, { page:1, name:'', contract_no:'', customer_name:'', status:'', dept_id:'' }); loadData() }
const openDialog = (row = null) => { 
  editId.value = row?.id || null
  const userName = auth.user?.name || ''
  Object.assign(form, { name:'', date:'', project_id:'', customer_id:'', customer_name:'', service_content:'', dept_id:'', dept_name:'', company_id:'', company_name:'', manager: userName, salesman: userName, status:'待签订', attachment:'', amount:0, receivable:0, requested:0, received:0, labor_cost:0, cost:0, tax:0, other:0, business_fee:0, performance:0, profit:0 })
  if (row) {
    Object.assign(form, row)
    // 数字字段强制转换
    form.project_id = row.project_id ? Number(row.project_id) : ''
    form.customer_id = row.customer_id ? Number(row.customer_id) : ''
    form.dept_id = row.dept_id ? Number(row.dept_id) : ''
    form.company_id = row.company_id ? Number(row.company_id) : ''
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
  attachmentList.value = getAttachmentList(form.attachment)
  dialogVisible.value = true 
}
const onProjectChange = (id) => { const p = projects.value.find(x => x.id === id); if (p) { form.customer_name = form.customer_name || p.customer_name; form.customer_id = form.customer_id || p.customer_id } }
const onCustomerChange = (id) => {
  const c = customers.value.find(x => x.id === id)
  form.customer_name = c?.name || ''
}
const onDeptChange = (id) => { const d = depts.value.find(x => x.id === id); form.dept_name = d?.name || '' }
const onCompanyChange = (id) => {
  const c = companies.value.find(x => x.id === id)
  if (c) {
    form.company_name = c.name
  } else {
    form.company_name = ''
  }
}

// 从关联数据自动填充金额
const fillFromSummary = async () => {
  if (!editId.value) return ElMessage.warning('请先保存合同后再填充')
  filling.value = true
  try {
    const res = await contractApi.summary(editId.value)
    if (res.success && res.data) {
      const s = res.data
      summaryData.value = s
      if (s.receivable) form.receivable = Number(s.receivable) || form.receivable
      if (s.requested) form.requested = Number(s.requested) || form.requested
      if (s.received) form.received = Number(s.received) || form.received
      if (s.cost) form.cost = Number(s.cost) || form.cost
      if (s.tax) form.tax = Number(s.tax) || form.tax
      if (s.labor_cost) form.labor_cost = Number(s.labor_cost) || form.labor_cost
      if (s.business_fee) form.business_fee = Number(s.business_fee) || form.business_fee
      if (s.other) form.other = Number(s.other) || form.other
      if (s.performance) form.performance = Number(s.performance) || form.performance
      if (s.profit !== undefined) form.profit = Number(s.profit) || form.profit
      ElMessage.success('金额已从关联数据自动填充，可手动调整后保存')
    }
  } catch (e) { ElMessage.error('获取汇总数据失败') }
  finally { filling.value = false }
}

const handleUploadSuccess = (res) => {
  if (res.success) {
    attachmentList.value.push(res.data.url)
    form.attachment = attachmentList.value.join(',')
    ElMessage.success('上传成功')
  } else {
    ElMessage.error(res.message || '上传失败')
  }
}
const handleUploadError = () => ElMessage.error('上传失败')

const getFileName = (url) => url ? decodeURIComponent(url.split('/').pop()) : ''
const getAttachmentList = (str) => str ? str.split(',').filter(Boolean) : []

const removeAttachment = async (idx, url) => {
  try {
    await fetch('/api/upload/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ url })
    })
  } catch {}
  attachmentList.value.splice(idx, 1)
  form.attachment = attachmentList.value.join(',')
}

const handleSave = async () => { 
  await formRef.value.validate()
  saving.value = true
  try { 
    const res = editId.value ? await contractApi.update(editId.value, form) : await contractApi.create(form)
    if (res.success) { ElMessage.success(res.message); dialogVisible.value = false; loadData() }
  } finally { saving.value = false }
}
const handleDelete = (row) => { 
  ElMessageBox.confirm(`确定删除合同「${row.name}」吗？`, '警告', { type:'warning' }).then(async () => { 
    const res = await contractApi.delete(row.id)
    if (res.success) { ElMessage.success('删除成功'); loadData() }
  }) 
}

// 快速修改状态
const handleStatusChange = async (row) => {
  try {
    await contractApi.update(row.id, { status: row.status })
    ElMessage.success('状态已更新')
  } catch (e) {
    ElMessage.error('更新状态失败')
    loadData()
  }
}

onMounted(async () => {
  loadData()
  const [cr, dr, co, er, pr] = await Promise.all([customerApi.all(), departmentApi.all(), companyApi.all(), employeeApi.all(), projectApi.list({ page: 1, pageSize: 100 })])
  if (cr.success) customers.value = cr.data
  if (dr.success) depts.value = dr.data
  if (co.success) companies.value = co.data
  if (er.success) employees.value = er.data
  if (pr.success) projects.value = pr.data.list
})
</script>

<style scoped>
.contract-page {
  min-height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  padding: 20px;
}
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { background: white; border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); transition: all 0.3s ease; }
.stat-card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12); }
.stat-icon { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; }
.stat-content { flex: 1; }
.stat-value { font-size: 24px; font-weight: 700; color: #1a1a2e; }
.stat-label { font-size: 13px; color: #8c8c9e; margin-top: 4px; }
.main-content { background: white; border-radius: 20px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); overflow: hidden; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; padding: 16px 24px; border-top: 1px solid #f0f0f5; }
.text-muted { color: #8c8c9e; }
.upload-box { display: flex; align-items: center; gap: 12px; }
.file-name { color: #52c41a; font-size: 12px; }
.summary-hint { font-size: 12px; color: #67c23a; margin-top: 4px; }
.contract-table :deep(.el-table__header-wrapper th) { background: linear-gradient(135deg, #f8f9fc 0%, #f0f2f7 100%); font-weight: 600; color: #4a4a5a; font-size: 13px; }
.contract-table :deep(.el-table__row:hover > td) { background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%) !important; }
.btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 10px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); height: 40px; padding: 0 18px; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4); }
@media (max-width: 1200px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .stats-row { grid-template-columns: 1fr; } }
</style>
