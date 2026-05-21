<template>
  <div class="page-container">
    <div class="page-header">
      <el-page-header @back="$router.back()" :content="`订单详情 - ${detail.order_no || ''}`" />
      <el-button type="primary" @click="openEdit" :disabled="detail.status === '已完成' || detail.status === '已取消'">
        <el-icon><Edit /></el-icon> 编辑信息
      </el-button>
    </div>

    <el-row :gutter="16" style="margin-top:16px">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="card-title">基本信息</span></template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="订单编号">
              <div style="display: inline-flex; align-items: center; gap: 8px;">
                <span v-if="!editingOrderNo">{{ detail.order_no }}</span>
                <el-input 
                  v-else 
                  v-model="newOrderNo" 
                  size="small" 
                  style="width: 150px"
                  @keyup.enter="saveOrderNo"
                  @keyup.esc="cancelEditOrderNo"
                />
                <el-button 
                  v-if="!editingOrderNo && !detail.requested_amount" 
                  type="primary" 
                  text 
                  size="small" 
                  @click="startEditOrderNo"
                >
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-tooltip 
                  v-if="!editingOrderNo && detail.requested_amount"
                  content="该订单已产生请款，无法修改编号"
                  placement="top"
                >
                  <el-icon style="color: #999"><WarningFilled /></el-icon>
                </el-tooltip>
                <template v-if="editingOrderNo">
                  <el-button type="success" text size="small" @click="saveOrderNo" :loading="savingOrderNo">
                    <el-icon><Check /></el-icon>
                  </el-button>
                  <el-button type="danger" text size="small" @click="cancelEditOrderNo">
                    <el-icon><Close /></el-icon>
                  </el-button>
                </template>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="订单日期">{{ detail.date }}</el-descriptions-item>
            <el-descriptions-item label="客户名称">{{ detail.customer_name }}</el-descriptions-item>
            <el-descriptions-item label="项目名称">{{ detail.project_name }}</el-descriptions-item>
            <el-descriptions-item label="合同编号">{{ detail.contract_no }}</el-descriptions-item>
            <el-descriptions-item label="业务类别">{{ detail.business_category }}</el-descriptions-item>
            <el-descriptions-item label="数量">{{ detail.quantity }}</el-descriptions-item>
            <el-descriptions-item label="单价">{{ formatMoney(detail.unit_price) }}</el-descriptions-item>
            <el-descriptions-item label="订单总额">
              <span style="color:#67c23a;font-weight:600">{{ formatMoney(detail.total) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="订单状态">
              <el-tag :type="statusType(detail.status)" size="small">{{ detail.status }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="请款状态">{{ detail.payment_status }}</el-descriptions-item>
            <el-descriptions-item label="报告签收">
              <el-tag :type="detail.report_signed ? 'success' : 'info'" size="small">
                {{ detail.report_signed ? '已签收' : '待签收' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="业务员">{{ detail.salesman }}</el-descriptions-item>
            <el-descriptions-item label="部门">{{ detail.dept_name }}</el-descriptions-item>
            <el-descriptions-item label="公司">{{ detail.company_name || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="card-title">财务状态</span></template>
          <div class="stat-list">
            <div class="stat-item">
              <span class="stat-label">订单总额</span>
              <span class="stat-value">{{ formatMoney(financialSummary.total_amount) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">累计请款</span>
              <span class="stat-value primary">{{ formatMoney(financialSummary.requested_amount) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">累计收款</span>
              <span class="stat-value success">{{ formatMoney(financialSummary.received_amount) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">未收款金额</span>
              <span class="stat-value warning">{{ formatMoney(financialSummary.unreceived_amount) }}</span>
            </div>
          </div>
          <div style="margin-top:16px">
            <div style="margin-bottom:8px;font-size:13px;color:#666">请款进度</div>
            <el-progress :percentage="financialSummary.request_progress" :stroke-width="12" />
          </div>
          <div style="margin-top:12px">
            <div style="margin-bottom:8px;font-size:13px;color:#666">收款进度</div>
            <el-progress :percentage="financialSummary.receive_progress" :stroke-width="12" color="#67c23a" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:12px">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="card-title">订单明细</span></template>
          <el-table :data="orderItems" stripe border size="small" max-height="250">
            <el-table-column prop="business_project" label="项目" min-width="120" />
            <el-table-column prop="parameter" label="参数" width="100" />
            <el-table-column prop="quantity" label="数量" width="70" />
            <el-table-column prop="unit_price" label="单价" width="100">
              <template #default="{ row }">{{ formatMoney(row.unit_price) }}</template>
            </el-table-column>
            <el-table-column prop="total" label="金额" width="100">
              <template #default="{ row }">{{ formatMoney(row.total) }}</template>
            </el-table-column>
          </el-table>
          <div v-if="orderItems.length > 0" style="text-align:right;margin-top:8px;font-weight:600">
            合计：{{ formatMoney(orderItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0)) }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="card-title">绩效分配</span></template>
          <el-table :data="performanceData.list" stripe border size="small" max-height="250">
            <el-table-column prop="employee_name" label="参与人员" min-width="120" />
            <el-table-column prop="performance_rate" label="分配比例" width="100">
              <template #default="{ row }">{{ row.performance_rate }}%</template>
            </el-table-column>
            <el-table-column prop="amount" label="分配金额" width="120">
              <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
            </el-table-column>
          </el-table>
          <div v-if="performanceData.list?.length > 0" style="margin-top:8px">
            <el-tag :type="performanceData.ratio_valid ? 'success' : 'warning'" size="small">
              比例合计：{{ performanceData.total_ratio }}%
              <span v-if="!performanceData.ratio_valid">（应为100%）</span>
            </el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:12px">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="card-title">请款记录</span></template>
          <el-table :data="paymentRequests" stripe border size="small" max-height="250">
            <el-table-column prop="batch_id" label="批次ID" width="80" />
            <el-table-column prop="request_amount" label="请款金额" width="120">
              <template #default="{ row }">{{ formatMoney(row.request_amount) }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80" />
            <el-table-column prop="createdAt" label="创建时间" width="160" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="card-title">收款记录</span></template>
          <el-table :data="receipts" stripe border size="small" max-height="250">
            <el-table-column prop="receipt_date" label="收款日期" width="100" />
            <el-table-column prop="amount" label="收款金额" width="120">
              <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
            </el-table-column>
            <el-table-column prop="bank_account_name" label="收款账户" min-width="150" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-top:12px">
      <template #header><span class="card-title">状态变更历史</span></template>
      <el-table :data="statusHistory" stripe border size="small">
        <el-table-column prop="old_status" label="原状态" width="100" />
        <el-table-column prop="new_status" label="新状态" width="100" />
        <el-table-column prop="reason" label="变更原因" min-width="150" />
        <el-table-column prop="operator_name" label="操作人" width="100" />
        <el-table-column prop="created_at" label="变更时间" width="160" />
      </el-table>
    </el-card>

    <el-dialog v-model="editVisible" title="编辑订单信息" width="600px" destroy-on-close>
      <el-form :model="editForm" label-width="100px" ref="editFormRef">
        <el-form-item label="订单编号">
          <el-input v-model="editForm.order_no" disabled />
        </el-form-item>
        <el-form-item label="订单日期">
          <el-date-picker v-model="editForm.date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="报告日期">
          <el-date-picker v-model="editForm.report_date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="报告编号">
          <el-input v-model="editForm.report_no" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="editForm.manager" />
        </el-form-item>
        <el-form-item label="业务员">
          <el-input v-model="editForm.salesman" />
        </el-form-item>
        <el-form-item label="公司">
          <el-select v-model="editForm.company_id" filterable clearable placeholder="请选择公司" style="width:100%" @change="onCompanyChange">
            <el-option v-for="c in companies" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Edit, Check, Close, WarningFilled } from '@element-plus/icons-vue'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

const detail = ref({})
const orderItems = ref([])
const paymentRequests = ref([])
const receipts = ref([])
const performanceData = ref({ list: [], total_ratio: 0, ratio_valid: true })
const statusHistory = ref([])
const financialSummary = ref({ total_amount: 0, requested_amount: 0, received_amount: 0, unreceived_amount: 0, request_progress: 0, receive_progress: 0 })

const editVisible = ref(false)
const saving = ref(false)
const editFormRef = ref(null)
const editForm = reactive({ order_no: '', date: '', report_date: '', report_no: '', manager: '', salesman: '', company_id: null, company_name: '', remark: '' })

const editingOrderNo = ref(false)
const newOrderNo = ref('')
const savingOrderNo = ref(false)

const companies = ref([])

const formatMoney = (val) => {
  const num = parseFloat(val) || 0
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const statusType = (status) => {
  const map = { '待处理': 'info', '进行中': 'primary', '已完成': 'success', '已取消': 'danger' }
  return map[status] || 'info'
}

const loadDetail = async () => {
  try {
    const res = await request.get(`/orders/${route.params.id}`)
    if (res.success) {
      detail.value = res.data
    } else {
      ElMessage.error('订单不存在')
      router.push('/orders')
    }
  } catch (err) {
    ElMessage.error('加载订单信息失败')
    router.push('/orders')
  }
}

const loadItems = async () => {
  try {
    const res = await request.get(`/orders/${route.params.id}/items`)
    if (res.success) orderItems.value = res.data
  } catch (err) { console.error(err) }
}

const loadPaymentRequests = async () => {
  try {
    const res = await request.get(`/orders/${route.params.id}/payment-requests`)
    if (res.success) paymentRequests.value = res.data
  } catch (err) { console.error(err) }
}

const loadReceipts = async () => {
  try {
    const res = await request.get(`/orders/${route.params.id}/receipts`)
    if (res.success) receipts.value = res.data
  } catch (err) { console.error(err) }
}

const loadPerformance = async () => {
  try {
    const res = await request.get(`/orders/${route.params.id}/performance`)
    if (res.success) performanceData.value = res.data
  } catch (err) { console.error(err) }
}

const loadStatusHistory = async () => {
  try {
    const res = await request.get(`/orders/${route.params.id}/status-history`)
    if (res.success) statusHistory.value = res.data
  } catch (err) { console.error(err) }
}

const loadFinancialSummary = async () => {
  try {
    const res = await request.get(`/orders/${route.params.id}/financial-summary`)
    if (res.success) financialSummary.value = res.data
  } catch (err) { console.error(err) }
}

const startEditOrderNo = () => {
  newOrderNo.value = detail.value.order_no || ''
  editingOrderNo.value = true
}

const cancelEditOrderNo = () => {
  editingOrderNo.value = false
  newOrderNo.value = ''
}

const saveOrderNo = async () => {
  const trimmedNo = newOrderNo.value.trim()
  if (!trimmedNo) {
    ElMessage.warning('订单编号不能为空')
    return
  }
  if (trimmedNo.length > 50) {
    ElMessage.warning('订单编号长度不能超过50个字符')
    return
  }
  if (!/^[A-Za-z0-9\-]+$/.test(trimmedNo)) {
    ElMessage.warning('订单编号只能包含字母、数字和连字符')
    return
  }
  
  savingOrderNo.value = true
  try {
    const res = await request.put(`/orders/${route.params.id}/order-no`, { order_no: trimmedNo })
    if (res.success) {
      ElMessage.success('订单编号更新成功')
      detail.value.order_no = trimmedNo
      editingOrderNo.value = false
    } else {
      ElMessage.error(res.message || '更新失败')
    }
  } finally {
    savingOrderNo.value = false
  }
}

const openEdit = () => {
  Object.assign(editForm, {
    order_no: detail.value.order_no || '',
    date: detail.value.date || '',
    report_date: detail.value.report_date || '',
    report_no: detail.value.report_no || '',
    manager: detail.value.manager || '',
    salesman: detail.value.salesman || '',
    company_id: detail.value.company_id || null,
    company_name: detail.value.company_name || '',
    remark: detail.value.remark || ''
  })
  editVisible.value = true
}

const onCompanyChange = (companyId) => {
  const company = companies.value.find(c => c.id === companyId)
  if (company) {
    editForm.company_name = company.name
  } else {
    editForm.company_name = ''
  }
}

const loadCompanies = async () => {
  try {
    const res = await request.get('/companies/all/list')
    if (res.success) companies.value = res.data || []
  } catch (err) { console.error(err) }
}

const saveEdit = async () => {
  saving.value = true
  try {
    const res = await request.put(`/orders/${route.params.id}`, editForm)
    if (res.success) {
      ElMessage.success('保存成功')
      editVisible.value = false
      loadDetail()
      loadFinancialSummary()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (err) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadDetail()
  loadItems()
  loadPaymentRequests()
  loadReceipts()
  loadPerformance()
  loadStatusHistory()
  loadFinancialSummary()
  loadCompanies()
})
</script>

<style scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-weight: 600; font-size: 14px; }
.stat-list { display: flex; flex-direction: column; gap: 10px; }
.stat-item { display: flex; justify-content: space-between; align-items: center; }
.stat-label { color: #666; font-size: 13px; }
.stat-value { font-size: 15px; font-weight: 600; }
.stat-value.primary { color: #409eff; }
.stat-value.success { color: #67c23a; }
.stat-value.warning { color: #e6a23c; }
</style>
