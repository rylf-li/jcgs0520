<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="query" inline>
        <el-form-item label="收款编号"><el-input v-model="query.receipt_no" clearable style="width:150px" /></el-form-item>
        <el-form-item label="请款批次"><el-input v-model="query.batch_no" clearable style="width:150px" /></el-form-item>
        <el-form-item label="合同编号"><el-input v-model="query.contract_no" clearable style="width:150px" /></el-form-item>
        <el-form-item label="客户名称"><el-input v-model="query.customer_name" clearable style="width:150px" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable style="width:120px">
            <el-option label="已确认" value="已确认" />
            <el-option label="待归档" value="待归档" />
            <el-option label="已归档" value="已归档" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="action-card">
      <template #header>
        <div class="card-header">
          <span>待收款请款明细</span>
          <div class="header-actions">
            <span v-if="selectedRequests.length" class="selected-tip">已选 {{ selectedRequests.length }} 条请款明细</span>
            <el-button type="primary" :disabled="selectedRequests.length === 0" @click="openReceiptDialog">生成收款记录</el-button>
          </div>
        </div>
      </template>

      <el-table :data="requestList" v-loading="requestLoading" stripe border @selection-change="selectedRequests = $event">
        <el-table-column type="selection" width="45" />
        <el-table-column prop="batch_no" label="请款批次" width="140" />
        <el-table-column prop="request_no" label="请款单号" width="130" />
        <el-table-column prop="order_no" label="订单编号" width="130" />
        <el-table-column prop="contract_no" label="合同编号" width="130" />
        <el-table-column prop="project_name" label="项目名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="request_amount" label="请款金额" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.request_amount) }}</template>
        </el-table-column>
        <el-table-column prop="received_amount" label="已收金额" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.received_amount) }}</template>
        </el-table-column>
        <el-table-column label="待收金额" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(getRemainAmount(row)) }}</template>
        </el-table-column>
        <el-table-column prop="request_status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.request_status || row.status)" size="small">{{ row.request_status || row.status || '草稿' }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>收款记录</span>
          <div class="header-actions">
            <span v-if="selectedReceipts.length" class="selected-tip">已选 {{ selectedReceipts.length }} 条收款记录</span>
            <el-select v-if="selectedReceipts.length" v-model="batchReceiptStatus" placeholder="批量状态" size="small" style="width:120px">
              <el-option label="已确认" value="已确认" />
              <el-option label="待归档" value="待归档" />
              <el-option label="已归档" value="已归档" />
            </el-select>
            <el-button v-if="selectedReceipts.length" size="small" type="warning" :loading="batchLoading" @click="handleBatchStatus">批量改状态</el-button>
            <el-button v-if="selectedReceipts.length" size="small" type="danger" :loading="batchLoading" @click="handleBatchDelete">批量删除</el-button>
            <span class="header-tip">收款记录确认业务实收，生成财务归档后再进入财务管理核账。</span>
            <ImportExportButtons model="receipts" modelName="收款记录" @success="handleImportSuccess" />
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe border @selection-change="selectedReceipts = $event">
        <el-table-column type="selection" width="45" />
        <el-table-column prop="receipt_no" label="收款编号" width="130" />
        <el-table-column prop="date" label="日期" width="100" />
        <el-table-column prop="batch_no" label="请款批次" width="140" />
        <el-table-column prop="contract_no" label="合同编号" width="130" />
        <el-table-column prop="customer_name" label="客户名称" width="140" show-overflow-tooltip />
        <el-table-column prop="planned_amount" label="应收金额" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.planned_amount) }}</template>
        </el-table-column>
        <el-table-column prop="actual_amount" label="实收金额" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.actual_amount) }}</template>
        </el-table-column>
        <el-table-column prop="discount_amount" label="差额说明" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.discount_amount) }}</template>
        </el-table-column>
        <el-table-column prop="account_type" label="账户类型" width="100" />
        <el-table-column prop="bank_account_name" label="收款账户" width="140" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="receiptStatusType(row.status)" size="small">{{ row.status || '已确认' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" plain @click="openDetail(row)">查看明细</el-button>
            <el-button size="small" plain @click="openEditDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" plain @click="handleDelete(row)">删除</el-button>
            <el-button size="small" type="success" plain @click="generateFinance(row)">生成财务</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10,20,50]"
          layout="total, sizes, prev, pager, next"
          @change="loadData"
        />
      </div>
    </el-card>

    <el-dialog v-model="receiptDialogVisible" title="生成收款记录" width="640px" destroy-on-close>
      <el-form :model="receiptForm" label-width="110px">
        <el-form-item label="请款批次">
          <el-input :model-value="selectedBatchNo" disabled />
        </el-form-item>
        <el-form-item label="应收金额">
          <el-input :model-value="fmtMoney(selectedPlannedAmount)" disabled />
        </el-form-item>
        <el-form-item label="收款日期">
          <el-date-picker v-model="receiptForm.date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="实收金额">
          <el-input-number v-model="receiptForm.actual_amount" :min="0" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="账户类型">
          <el-select v-model="receiptForm.account_type" style="width:100%">
            <el-option label="银行" value="银行" />
            <el-option label="现金" value="现金" />
          </el-select>
        </el-form-item>
        <el-form-item label="银行账户">
          <el-select v-model="receiptForm.bank_account_id" clearable filterable style="width:100%" @change="onBankAccountChange">
            <el-option v-for="item in bankAccounts" :key="item.id" :label="formatBankAccountLabel(item)" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注说明">
          <el-input v-model="receiptForm.remark" type="textarea" :rows="3" placeholder="可填写折扣、尾款、部分收款等说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="receiptDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="receiptSaving" @click="handleCreateReceipt">确认生成</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="收款记录明细" width="960px" destroy-on-close>
      <el-table :data="detailItems" v-loading="detailLoading" stripe border>
        <el-table-column prop="paymentRequest.batch_no" label="请款批次" width="140" />
        <el-table-column prop="paymentRequest.request_no" label="请款单号" width="130" />
        <el-table-column prop="paymentRequest.order_no" label="订单编号" width="130" />
        <el-table-column prop="paymentRequest.project_name" label="项目名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="paymentRequest.request_amount" label="请款金额" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.paymentRequest?.request_amount) }}</template>
        </el-table-column>
        <el-table-column prop="allocated_amount" label="本次分配" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.allocated_amount) }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
      </el-table>
    </el-dialog>

    <el-dialog v-model="editDialogVisible" title="编辑收款记录" width="640px" destroy-on-close>
      <el-form :model="editForm" label-width="110px">
        <el-form-item label="收款编号">
          <el-input v-model="editForm.receipt_no" disabled />
        </el-form-item>
        <el-form-item label="收款日期">
          <el-date-picker v-model="editForm.date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="实收金额">
          <el-input-number v-model="editForm.actual_amount" :min="0" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="账户类型">
          <el-select v-model="editForm.account_type" style="width:100%">
            <el-option label="银行" value="银行" />
            <el-option label="现金" value="现金" />
          </el-select>
        </el-form-item>
        <el-form-item label="银行账户">
          <el-select v-model="editForm.bank_account_id" clearable filterable style="width:100%" @change="onEditBankAccountChange">
            <el-option v-for="item in bankAccounts" :key="item.id" :label="formatBankAccountLabel(item)" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注说明">
          <el-input v-model="editForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSaving" @click="handleUpdateReceipt">保存修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { receiptApi, paymentRequestApi, bankAccountApi } from '@/api'
import ImportExportButtons from '@/components/ImportExportButtons.vue'

const loading = ref(false)
const requestLoading = ref(false)
const receiptSaving = ref(false)
const editDialogVisible = ref(false)
const editSaving = ref(false)
const batchLoading = ref(false)
const receiptDialogVisible = ref(false)
const detailVisible = ref(false)
const detailLoading = ref(false)
const list = ref([])
const total = ref(0)
const requestList = ref([])
const selectedRequests = ref([])
const selectedReceipts = ref([])
const bankAccounts = ref([])
const detailItems = ref([])
const currentEditId = ref(null)
const batchReceiptStatus = ref('')

const query = reactive({
  page: 1,
  pageSize: 20,
  receipt_no: '',
  batch_no: '',
  contract_no: '',
  customer_name: '',
  status: ''
})

const requestQuery = reactive({
  page: 1,
  pageSize: 200,
  batch_no: '',
  request_no: '',
  contract_no: '',
  status: ''
})

const receiptForm = reactive({
  date: new Date().toISOString().slice(0, 10),
  actual_amount: 0,
  account_type: '银行',
  bank_account_id: null,
  bank_account_name: '',
  remark: ''
})
const editForm = reactive({
  receipt_no: '',
  date: '',
  actual_amount: 0,
  account_type: '银行',
  bank_account_id: null,
  bank_account_name: '',
  remark: ''
})

const fmtMoney = (value) => value ? Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00'
const formatBankAccountLabel = (item) => `${item.company_name || '未归属公司'} / ${item.account_name || item.bank_name || '账户'} / ${item.bank_account || ''}`
const statusType = (status) => ({ 已请款: 'warning', 已确认: 'primary', 部分收款: 'warning', 已收款: 'success', 已完成: 'success' }[status] || 'info')
const receiptStatusType = (status) => ({ 已确认: 'primary', 待归档: 'warning', 已归档: 'success' }[status] || 'info')
const getRemainAmount = (row) => Number((Number(row.request_amount || 0) - Number(row.received_amount || 0)).toFixed(2))
const selectedPlannedAmount = computed(() => selectedRequests.value.reduce((sum, item) => sum + getRemainAmount(item), 0))
const selectedBatchNo = computed(() => selectedRequests.value[0]?.batch_no || '')

const loadData = async () => {
  loading.value = true
  try {
    const res = await receiptApi.list(query)
    if (res.success) {
      list.value = res.data.list
      total.value = res.data.total
    }
  } finally {
    loading.value = false
  }
}

const loadRequestData = async () => {
  requestLoading.value = true
  try {
    const res = await paymentRequestApi.list(requestQuery)
    if (res.success) {
      requestList.value = (res.data.list || []).filter((item) => {
        const currentStatus = item.request_status || item.status
        return ['已请款', '已确认', '部分收款'].includes(currentStatus) && getRemainAmount(item) > 0
      })
    }
  } finally {
    requestLoading.value = false
  }
}

const loadBankAccounts = async () => {
  const res = await bankAccountApi.list({ page: 1, pageSize: 200 })
  if (res.success) {
    bankAccounts.value = res.data.list || []
  }
}

const handleImportSuccess = () => {
  loadData()
  loadRequestData()
}

const resetQuery = () => {
  Object.assign(query, { page: 1, pageSize: 20, receipt_no: '', batch_no: '', contract_no: '', customer_name: '', status: '' })
  loadData()
}

const openReceiptDialog = () => {
  if (selectedRequests.value.length === 0) return
  const firstBatchId = selectedRequests.value[0]?.batch_id || null
  const invalid = selectedRequests.value.find(item => (item.batch_id || null) !== firstBatchId)
  if (invalid) {
    ElMessage.warning('当前版本要求一次收款只选择同一请款批次的明细')
    return
  }
  Object.assign(receiptForm, {
    date: new Date().toISOString().slice(0, 10),
    actual_amount: Number(selectedPlannedAmount.value.toFixed(2)),
    account_type: '银行',
    bank_account_id: null,
    bank_account_name: '',
    remark: ''
  })
  receiptDialogVisible.value = true
}

const onBankAccountChange = (id) => {
  const item = bankAccounts.value.find(bank => bank.id === id)
  receiptForm.bank_account_name = item?.account_name || item?.bank_name || ''
}

const onEditBankAccountChange = (id) => {
  const item = bankAccounts.value.find(bank => bank.id === id)
  editForm.bank_account_name = item?.account_name || item?.bank_name || ''
}

const handleCreateReceipt = async () => {
  if (selectedRequests.value.length === 0) return ElMessage.warning('请先选择请款明细')
  if (!receiptForm.actual_amount || Number(receiptForm.actual_amount) <= 0) return ElMessage.warning('请填写实收金额')

  receiptSaving.value = true
  try {
    const res = await receiptApi.createFromRequests({
      payment_request_ids: selectedRequests.value.map(item => item.id),
      actual_amount: receiptForm.actual_amount,
      date: receiptForm.date,
      remark: receiptForm.remark,
      bank_account_id: receiptForm.bank_account_id,
      bank_account_name: receiptForm.bank_account_name,
      account_type: receiptForm.account_type
    })
    if (res.success) {
      ElMessage.success(res.message || '收款记录创建成功')
      receiptDialogVisible.value = false
      selectedRequests.value = []
      loadData()
      loadRequestData()
    }
  } finally {
    receiptSaving.value = false
  }
}

const generateFinance = async (row) => {
  const res = await receiptApi.generateFinance(row.id)
  if (res.success) {
    ElMessage.success(res.message || '已生成财务归档记录')
    loadData()
  }
}

const openEditDialog = (row) => {
  currentEditId.value = row.id
  Object.assign(editForm, {
    receipt_no: row.receipt_no,
    date: row.date,
    actual_amount: Number(row.actual_amount) || 0,
    account_type: row.account_type || '银行',
    bank_account_id: row.bank_account_id || null,
    bank_account_name: row.bank_account_name || '',
    remark: row.remark || ''
  })
  editDialogVisible.value = true
}

const handleUpdateReceipt = async () => {
  if (!currentEditId.value) return
  if (!editForm.actual_amount || Number(editForm.actual_amount) <= 0) return ElMessage.warning('请填写实收金额')
  editSaving.value = true
  try {
    const res = await receiptApi.update(currentEditId.value, {
      date: editForm.date,
      actual_amount: editForm.actual_amount,
      account_type: editForm.account_type,
      bank_account_id: editForm.bank_account_id,
      bank_account_name: editForm.bank_account_name,
      remark: editForm.remark
    })
    if (res.success) {
      ElMessage.success(res.message || '收款记录更新成功')
      editDialogVisible.value = false
      loadData()
      loadRequestData()
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '收款记录更新失败')
  } finally {
    editSaving.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除收款记录「${row.receipt_no}」吗？对应未入账财务记录会一并删除，并回滚请款/订单收款状态。`, '删除收款记录', { type: 'warning' })
  } catch {
    return
  }

  try {
    const res = await receiptApi.delete(row.id)
    if (res.success) {
      ElMessage.success(res.message || '收款记录已删除')
      loadData()
      loadRequestData()
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除收款记录失败')
  }
}

const handleBatchDelete = async () => {
  if (selectedReceipts.value.length === 0) return
  try {
    await ElMessageBox.confirm(`确定批量删除选中的 ${selectedReceipts.value.length} 条收款记录吗？已入账财务关联的记录会被跳过。`, '批量删除收款记录', { type: 'warning' })
  } catch {
    return
  }

  batchLoading.value = true
  try {
    const res = await receiptApi.batchDelete(selectedReceipts.value.map(item => item.id))
    if (res.success) {
      const data = res.data || {}
      const failed = data.failed || 0
      ElMessage[failed > 0 ? 'warning' : 'success'](`成功 ${data.success || 0} 条，失败 ${failed} 条`)
      selectedReceipts.value = []
      loadData()
      loadRequestData()
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '批量删除失败')
  } finally {
    batchLoading.value = false
  }
}

const handleBatchStatus = async () => {
  if (selectedReceipts.value.length === 0) return
  if (!batchReceiptStatus.value) return ElMessage.warning('请选择要变更的状态')
  try {
    await ElMessageBox.confirm(`确定将选中的 ${selectedReceipts.value.length} 条收款记录状态改为「${batchReceiptStatus.value}」吗？`, '批量更改状态', { type: 'info' })
  } catch {
    return
  }

  batchLoading.value = true
  try {
    const res = await receiptApi.batchUpdateStatus(selectedReceipts.value.map(item => item.id), batchReceiptStatus.value)
    if (res.success) {
      ElMessage.success(res.message || '批量状态更新成功')
      selectedReceipts.value = []
      batchReceiptStatus.value = ''
      loadData()
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '批量状态更新失败')
  } finally {
    batchLoading.value = false
  }
}

const openDetail = async (row) => {
  detailVisible.value = true
  detailLoading.value = true
  detailItems.value = []
  try {
    const res = await receiptApi.get(row.id)
    if (res.success) {
      detailItems.value = res.data.items || []
    }
  } finally {
    detailLoading.value = false
  }
}

onMounted(() => {
  loadData()
  loadRequestData()
  loadBankAccounts()
})
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 12px; }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.header-actions { display: flex; align-items: center; gap: 12px; }
.selected-tip, .header-tip { color: #909399; font-size: 13px; }
.pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
