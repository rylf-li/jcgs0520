<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="query" inline>
        <el-form-item label="财务编号"><el-input v-model="query.finance_no" placeholder="请输入" clearable style="width:140px" /></el-form-item>
        <el-form-item label="合同编号"><el-input v-model="query.contract_no" placeholder="请输入" clearable style="width:140px" /></el-form-item>
        <el-form-item label="项目名称"><el-input v-model="query.project_name" placeholder="请输入" clearable style="width:140px" /></el-form-item>
        <el-form-item label="部门">
          <el-select v-model="query.dept_id" placeholder="全部" clearable style="width:150px">
            <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="收支类别">
          <el-select v-model="query.type" placeholder="全部" clearable style="width:100px">
            <el-option label="收入" value="收入" /><el-option label="支出" value="支出" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否入账">
          <el-select v-model="query.booked" placeholder="全部" clearable style="width:100px">
            <el-option label="已入账" :value="1" /><el-option label="未入账" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 批量生成操作区 -->
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <span class="toolbar-title">⚡ 批量生成</span>
          <el-button type="primary" size="small" @click="openAutoDialog('order')"><el-icon><Refresh /></el-icon>从订单生成</el-button>
          <el-button type="success" size="small" @click="openAutoDialog('contract')"><el-icon><Refresh /></el-icon>从合同生成</el-button>
        </div>
        <div class="toolbar-right">
          <ImportExportButtons model="finances" modelName="财务" @success="loadData" />
        </div>
      </div>
    </el-card>

    <!-- 统计卡片 -->
    <el-row :gutter="12" class="stat-cards">
      <el-col :span="6"><div class="stat-card"><div class="stat-label">收入合计</div><div class="stat-value success">{{ fmtMoney(statIncome) }}</div></div></el-col>
      <el-col :span="6"><div class="stat-card"><div class="stat-label">支出合计</div><div class="stat-value danger">{{ fmtMoney(statExpense) }}</div></div></el-col>
      <el-col :span="6"><div class="stat-card"><div class="stat-label">净收益</div><div class="stat-value primary">{{ fmtMoney(statIncome - statExpense) }}</div></div></el-col>
      <el-col :span="6"><div class="stat-card"><div class="stat-label">记录条数</div><div class="stat-value">{{ total }}</div></div></el-col>
    </el-row>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">财务记录</span>
          <div style="display:flex;gap:8px;align-items:center">
            <el-button v-if="selectedRows.length>0" type="success" size="small" @click="batchBook(1)" :loading="batchLoading">
              <el-icon><Check /></el-icon>批量入账({{selectedRows.length}})
            </el-button>
            <el-button v-if="selectedRows.length>0" type="warning" size="small" @click="batchBook(0)" :loading="batchLoading">
              <el-icon><CloseBold /></el-icon>取消入账({{selectedRows.length}})
            </el-button>
            <el-button v-if="selectedRows.length>0" type="danger" size="small" @click="batchDelete" :loading="batchLoading">
              <el-icon><Delete /></el-icon>批量删除({{selectedRows.length}})
            </el-button>
            <el-button v-if="selectedRows.length>0" size="small" @click="selectedRows=[]">取消选择</el-button>
            <span style="display:flex">
            <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增记录</el-button>
            </span>
          </div>
        </div>
      </template>
      <el-table :data="list" v-loading="loading" stripe border @selection-change="onSelectionChange">
        <el-table-column type="selection" width="45" />
        <el-table-column prop="finance_no" label="财务编号" width="130" />
        <el-table-column prop="date" label="日期" width="100" />
        <el-table-column prop="contract_no" label="合同编号" width="130" />
        <el-table-column prop="description" label="内容描述" min-width="140" show-overflow-tooltip />
        <el-table-column prop="project_name" label="项目名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="category" label="款项类别" width="100" />
        <el-table-column prop="type" label="收支类别" width="90">
          <template #default="{ row }">
            <el-tag :type="row.type === '收入' ? 'success' : 'danger'" size="small">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="120" align="right">
          <template #default="{ row }">
            <span :style="{ color: row.type === '收入' ? '#52c41a' : '#ff4d4f', fontWeight: 600 }">{{ fmtMoney(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="company_name" label="公司" width="120" show-overflow-tooltip />
        <el-table-column prop="customer_name" label="客户名称" width="130" show-overflow-tooltip />
        <el-table-column prop="bank_account_name" label="银行账户" width="120" show-overflow-tooltip />
        <el-table-column prop="booked" label="入账" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.booked ? 'success' : 'info'" size="small">{{ row.booked ? '已入账' : '未入账' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="invoice_no" label="发票号" width="120" />
        <el-table-column label="附件" width="80" align="center">
          <template #default="{ row }">
            <span v-if="getAttachmentList(row.attachment).length > 0">
              <el-tag size="small" type="success">{{ getAttachmentList(row.attachment).length }}个</el-tag>
            </span>
            <span v-else class="text-gray">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" @change="loadData" />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editId ? '编辑财务记录' : '新增财务记录'" width="680px" destroy-on-close>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="日期" prop="date">
              <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="请款单">
              <el-select v-model="form.source_id" filterable clearable placeholder="可选择请款单" style="width:100%" @change="onPaymentRequestChange">
                <el-option v-for="item in paymentRequests" :key="item.id" :label="`${item.request_no || item.id} - ${item.project_name}`" :value="item.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同编号">
              <el-select v-model="form.contract_id" filterable clearable placeholder="可选择合同" style="width:100%" @change="onContractChange">
                <el-option v-for="c in contracts" :key="c.id" :label="`${c.contract_no} - ${c.name}`" :value="c.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="项目名称">
              <el-input v-model="form.project_name" placeholder="请输入项目名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="款项类别">
              <el-input v-model="form.category" placeholder="如：首付款、尾款等" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="收支类别" prop="type">
              <el-select v-model="form.type" style="width:100%">
                <el-option label="收入" value="收入" /><el-option label="支出" value="支出" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="金额" prop="amount">
              <el-input-number v-model="form.amount" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属公司">
              <el-select v-model="form.company_id" placeholder="请选择" style="width:100%" @change="onCompanyChange">
                <el-option v-for="c in companies" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="客户名称">
              <el-input v-model="form.customer_name" placeholder="付款方名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发票号">
              <el-input v-model="form.invoice_no" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否入账">
              <el-switch v-model="form.booked" :active-value="1" :inactive-value="0" active-text="已入账" inactive-text="未入账" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="发票附件">
              <div class="attachment-area">
                <!-- 上传按钮 -->
                <el-upload
                  :action="uploadUrl"
                  :headers="uploadHeaders"
                  :on-success="handleUploadSuccess"
                  :on-error="handleUploadError"
                  :show-file-list="false"
                  :multiple="true"
                  accept=".pdf,.jpg,.png,.jpeg,.doc,.docx"
                >
                  <el-button type="primary" plain size="small">
                    <el-icon><Upload /></el-icon> 上传附件（可多选）
                  </el-button>
                </el-upload>
                <!-- 已上传文件列表 -->
                <div v-if="attachmentList.length > 0" class="file-list">
                  <div v-for="(url, idx) in attachmentList" :key="idx" class="file-item">
                    <el-icon class="file-icon"><Document /></el-icon>
                    <el-link type="primary" :href="url" target="_blank" class="file-name">
                      {{ getFileName(url) }}
                    </el-link>
                    <el-button size="small" type="danger" text circle @click="removeAttachment(idx, url)">
                      <el-icon><CloseBold /></el-icon>
                    </el-button>
                  </div>
                </div>
                <div v-else class="no-file">暂无附件</div>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.description" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量生成弹窗 -->
    <el-dialog v-model="autoDialogVisible" :title="autoType === 'order' ? '从订单批量生成财务记录' : '从合同批量生成财务记录'" width="500px" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="日期范围">
          <el-date-picker v-model="autoForm.dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="覆盖已有">
          <el-switch v-model="autoForm.overwrite" active-text="是" inactive-text="否" />
          <div class="form-tip">开启后将更新已存在的相同来源记录</div>
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
import { financeApi, contractApi, companyApi, paymentRequestApi, departmentApi } from '@/api'
import request from '@/utils/request'
import ImportExportButtons from '@/components/ImportExportButtons.vue'

const list = ref([]), total = ref(0), loading = ref(false), saving = ref(false)
const dialogVisible = ref(false), editId = ref(null), formRef = ref()
const selectedRows = ref([])
const batchLoading = ref(false)
const onSelectionChange = (rows) => { selectedRows.value = rows }
const batchDelete = async () => {
  if (selectedRows.value.length === 0) return ElMessage.warning('请先选择数据')
  try { await ElMessageBox.confirm('确定删除选中的 ' + selectedRows.value.length + ' 条财务记录吗？', '批量删除', { type: 'warning' }) } catch { return }
  batchLoading.value = true
  try {
    let ok = 0
    for (const row of selectedRows.value) { try { const r = await financeApi.delete(row.id); if (r.success) ok++ } catch {} }
    ElMessage.success('成功删除 ' + ok + ' 条记录')
    selectedRows.value = []
    loadData()
  } finally { batchLoading.value = false }
}
const batchBook = async (booked) => {
  if (selectedRows.value.length === 0) return ElMessage.warning('请先选择数据')
  const action = booked === 1 ? '入账' : '取消入账'
  try { await ElMessageBox.confirm('确定将选中的 ' + selectedRows.value.length + ' 条财务记录' + action + '吗？', '批量' + action, { type: 'info' }) } catch { return }
  batchLoading.value = true
  try {
    let ok = 0
    for (const row of selectedRows.value) {
      try {
        const r = await financeApi.update(row.id, { booked })
        if (r.success) ok++
      } catch {}
    }
    ElMessage.success('成功' + action + ' ' + ok + ' 条记录')
    selectedRows.value = []
    loadData()
  } finally { batchLoading.value = false }
}
const contracts = ref([]), companies = ref([]), paymentRequests = ref([]), departments = ref([])
const attachmentList = ref([])
const autoDialogVisible = ref(false), autoType = ref('order'), autoSaving = ref(false)
const autoForm = reactive({ dateRange: [], overwrite: false })
const query = reactive({ page:1, pageSize:20, finance_no:'', contract_no:'', project_name:'', type:'', booked:'', dept_id: '' })
const form = reactive({
  date:'', contract_id:'', contract_no:'', project_name:'', category:'', type:'收入',
  amount:0, company_id:'', company_name:'', customer_name:'', booked:0, invoice_no:'', attachment:'', description:'', source_type:'', source_id:'', order_id:'', order_no:''
})
const rules = {
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  type: [{ required: true, message: '请选择收支类别', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }]
}

const uploadUrl = computed(() => `/api/upload/finance`)
const uploadHeaders = computed(() => ({ Authorization: `Bearer ${localStorage.getItem('token')}` }))

// 将逗号分隔的字符串转为数组
const getAttachmentList = (str) => str ? str.split(',').filter(Boolean) : []
// 从 URL 中提取文件名
const getFileName = (url) => url ? decodeURIComponent(url.split('/').pop()) : ''

const fmtMoney = (v) => v ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits:2 }) : '0.00'
const statIncome = computed(() => list.value.filter(r => r.type === '收入').reduce((s, r) => s + (Number(r.amount) || 0), 0))
const statExpense = computed(() => list.value.filter(r => r.type === '支出').reduce((s, r) => s + (Number(r.amount) || 0), 0))

const loadData = async () => {
  loading.value = true
  try {
    const res = await financeApi.list(query)
    if (res.success) { list.value = res.data.list; total.value = res.data.total }
  } finally { loading.value = false }
}
const resetQuery = () => {
  Object.assign(query, { page:1, finance_no:'', contract_no:'', project_name:'', type:'', booked:'' })
  loadData()
}
const openDialog = (row = null) => {
  editId.value = row?.id || null
  Object.assign(form, { date:'', contract_id:'', contract_no:'', project_name:'', category:'', type:'收入', amount:0, company_id:'', company_name:'', customer_name:'', booked:0, invoice_no:'', attachment:'', description:'', source_type:'', source_id:'', order_id:'', order_no:'' })
  if (row) {
    Object.assign(form, row)
    form.amount = Number(row.amount) || 0
    form.booked = Number(row.booked) || 0
    form.company_id = row.company_id ? Number(row.company_id) : ''
    form.contract_id = row.contract_id ? Number(row.contract_id) : ''
    form.source_id = row.source_id ? Number(row.source_id) : ''
    form.customer_name = row.customer_name || ''
  }
  // 初始化附件列表
  attachmentList.value = getAttachmentList(form.attachment)
  dialogVisible.value = true
}
const onContractChange = (id) => {
  if (!id) { form.contract_no = ''; return }
  const c = contracts.value.find(x => x.id === id)
  if (c) { form.contract_no = c.contract_no; form.project_name = form.project_name || c.name }
}
const onPaymentRequestChange = (id) => {
  const item = paymentRequests.value.find(x => x.id === id)
  if (!item) {
    form.source_type = ''
    return
  }
  form.source_type = 'payment_request'
  form.date = form.date || item.date
  form.contract_id = item.contract_id || ''
  form.contract_no = item.contract_no || ''
  form.order_id = item.order_id || ''
  form.order_no = item.order_no || ''
  form.project_name = item.project_name || ''
  form.amount = Number(item.request_amount) || 0
  form.company_id = item.company_id || ''
  form.company_name = item.company_name || ''
  form.customer_name = item.customer_name || ''
  form.category = form.category || '项目收款'
  form.type = '收入'
  form.description = form.description || `请款单:${item.request_no || item.id}`
}
const onCompanyChange = (id) => {
  const c = companies.value.find(x => x.id === id)
  form.company_name = c?.name || ''
}

// 上传成功：追加到附件列表
const handleUploadSuccess = (res) => {
  if (res.success) {
    attachmentList.value.push(res.data.url)
    ElMessage.success(`${res.data.filename} 上传成功`)
  } else {
    ElMessage.error(res.message || '上传失败')
  }
}
const handleUploadError = () => ElMessage.error('上传失败')

// 删除附件：从列表移除 + 物理删除文件
const removeAttachment = async (idx, url) => {
  try {
    await request.delete('/api/upload/delete', { data: { url } })
  } catch (e) {
    // 文件不存在也继续移除
  }
  attachmentList.value.splice(idx, 1)
}

const handleSave = async () => {
  await formRef.value.validate()
  // 二次确认
  const action = editId.value ? '修改' : '新增'
  try { await ElMessageBox.confirm(`确定要${action}该财务记录吗？`, '确认保存', { type: 'info' }) } catch { return }
  saving.value = true
  try {
    const formData = { ...form }
    if (!formData.date || formData.date === 'Invalid date') delete formData.date
    // 将附件列表合并为逗号分隔字符串
    formData.attachment = attachmentList.value.join(',')
    const res = editId.value ? await financeApi.update(editId.value, formData) : await financeApi.create(formData)
    if (res.success) { ElMessage.success(res.message); dialogVisible.value = false; loadData() }
  } finally { saving.value = false }
}

// 删除财务记录时同步删除附件文件
const handleDelete = (row) => {
  ElMessageBox.confirm('确定删除该财务记录吗？', '警告', { type:'warning' }).then(async () => {
    // 删除附件文件
    const files = getAttachmentList(row.attachment)
    for (const url of files) {
      try { await request.delete('/api/upload/delete', { data: { url } }) } catch (e) {}
    }
    const res = await financeApi.delete(row.id)
    if (res.success) { ElMessage.success('删除成功'); loadData() }
  })
}

// 批量生成
const openAutoDialog = (type) => {
  autoType.value = type
  autoForm.dateRange = []
  autoForm.overwrite = false
  autoDialogVisible.value = true
}
const handleAutoGenerate = async () => {
  // 二次确认
  try { await ElMessageBox.confirm('确定要批量生成财务记录吗？', '确认生成', { type: 'info' }) } catch { return }
  autoSaving.value = true
  try {
    const data = { date_start: autoForm.dateRange?.[0] || '', date_end: autoForm.dateRange?.[1] || '', overwrite: autoForm.overwrite }
    const res = autoType.value === 'order'
      ? await financeApi.autoFromOrders(data)
      : await financeApi.autoFromContracts(data)
    if (res.success) { ElMessage.success(res.message); autoDialogVisible.value = false; loadData() }
  } catch (e) { ElMessage.error(e.response?.data?.message || '生成失败') }
  finally { autoSaving.value = false }
}

onMounted(async () => {
  loadData()
  const [cr, co, pr, de] = await Promise.all([contractApi.all(), companyApi.all(), paymentRequestApi.all({ status: '已确认' }), departmentApi.all()])
  if (cr.success) contracts.value = cr.data
  if (co.success) companies.value = co.data
  if (pr.success) paymentRequests.value = pr.data
  if (de.success) departments.value = de.data
})
</script>

<style scoped>
.page-container { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
.toolbar-card { flex-shrink: 0; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.toolbar-left { display: flex; align-items: center; gap: 8px; }
.toolbar-title { font-weight: 600; font-size: 14px; color: #333; }
.stat-cards { flex-shrink: 0; }
.stat-card { background: #fff; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.stat-label { font-size: 12px; color: #999; margin-bottom: 6px; }
.stat-value { font-size: 20px; font-weight: 700; color: #333; }
.stat-value.primary { color: #409eff; }
.stat-value.success { color: #52c41a; }
.stat-value.danger { color: #ff4d4f; }
.table-card { flex: 1; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
.text-gray { color: #c0c4cc; }
.attachment-area { width: 100%; }
.file-list { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.file-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: #f5f7fa; border-radius: 4px; border: 1px solid #e4e7ed; }
.file-icon { color: #409eff; flex-shrink: 0; }
.file-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.no-file { color: #c0c4cc; font-size: 13px; margin-top: 8px; }
.form-tip { font-size: 12px; color: #999; margin-top: 4px; }
</style>
