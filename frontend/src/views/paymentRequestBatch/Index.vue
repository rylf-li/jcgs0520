<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="query" inline>
        <el-form-item label="请款批次"><el-input v-model="query.batch_no" clearable style="width:150px" /></el-form-item>
        <el-form-item label="合同编号"><el-input v-model="query.contract_no" clearable style="width:150px" /></el-form-item>
        <el-form-item label="项目名称"><el-input v-model="query.project_name" clearable style="width:150px" /></el-form-item>
        <el-form-item label="客户名称"><el-input v-model="query.customer_name" clearable style="width:150px" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable style="width:120px">
            <el-option label="草稿" value="草稿" />
            <el-option label="已请款" value="已请款" />
            <el-option label="部分收款" value="部分收款" />
            <el-option label="已收款" value="已收款" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>请款批次列表</span>
          <div class="header-actions">
            <span v-if="selectedRows.length" class="selected-tip">已选 {{ selectedRows.length }} 条</span>
            <el-select v-if="selectedRows.length" v-model="batchStatus" placeholder="批量状态" size="small" style="width:120px">
              <el-option label="草稿" value="草稿" />
              <el-option label="已请款" value="已请款" />
              <el-option label="部分收款" value="部分收款" />
              <el-option label="已收款" value="已收款" />
              <el-option label="已完成" value="已完成" />
            </el-select>
            <el-button v-if="selectedRows.length" size="small" type="warning" :loading="batchLoading" @click="handleBatchStatus">批量改状态</el-button>
            <el-button v-if="selectedRows.length" size="small" type="danger" :loading="batchLoading" @click="handleBatchDelete">批量删除</el-button>
            <span class="header-tip">请款批次由订单管理多选生成，用于统一导出和统一收款。</span>
            <ImportExportButtons model="payment_request_batches" modelName="请款批次" @success="loadData" />
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe border @selection-change="selectedRows = $event">
        <el-table-column type="selection" width="45" />
        <el-table-column prop="batch_no" label="请款批次" width="140" />
        <el-table-column prop="date" label="日期" width="100" />
        <el-table-column prop="contract_no" label="合同编号" width="130" />
        <el-table-column prop="project_name" label="项目名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="customer_name" label="客户名称" width="140" show-overflow-tooltip />
        <el-table-column prop="salesman_name" label="业务员" width="90" />
        <el-table-column prop="request_total_amount" label="请款合计" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.request_total_amount) }}</template>
        </el-table-column>
        <el-table-column prop="received_total_amount" label="收款合计" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.received_total_amount) }}</template>
        </el-table-column>
        <el-table-column prop="discount_amount" label="差额" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.discount_amount) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ row.status || '草稿' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openDetail(row)">查看明细</el-button>
            <el-button size="small" plain @click="openEditDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" plain @click="handleDelete(row)">撤回请款</el-button>
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

    <el-dialog v-model="detailVisible" title="请款批次明细" width="1000px" destroy-on-close>
      <div v-if="currentBatch" class="batch-summary">
        <el-descriptions :column="4" border>
          <el-descriptions-item label="请款批次">{{ currentBatch.batch_no }}</el-descriptions-item>
          <el-descriptions-item label="合同编号">{{ currentBatch.contract_no || '-' }}</el-descriptions-item>
          <el-descriptions-item label="客户名称">{{ currentBatch.customer_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ currentBatch.status || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <el-table :data="batchItems" v-loading="detailLoading" stripe border style="margin-top: 16px;">
        <el-table-column prop="sort_no" label="#" width="60" />
        <el-table-column prop="request_no" label="请款单号" width="130" />
        <el-table-column prop="order_no" label="订单编号" width="130" />
        <el-table-column prop="project_name" label="项目名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="request_amount" label="请款金额" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.request_amount) }}</template>
        </el-table-column>
        <el-table-column prop="received_amount" label="已收金额" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.received_amount) }}</template>
        </el-table-column>
        <el-table-column prop="request_status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.request_status || row.status)" size="small">{{ row.request_status || row.status || '草稿' }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="editVisible" title="编辑请款批次" width="560px" destroy-on-close>
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="请款批次">
          <el-input v-model="editForm.batch_no" />
        </el-form-item>
        <el-form-item label="请款日期">
          <el-date-picker v-model="editForm.date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editForm.status" style="width:100%">
            <el-option label="草稿" value="草稿" />
            <el-option label="已请款" value="已请款" />
            <el-option label="部分收款" value="部分收款" />
            <el-option label="已收款" value="已收款" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSaving" @click="handleUpdate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { paymentRequestBatchApi } from '@/api'
import ImportExportButtons from '@/components/ImportExportButtons.vue'

const loading = ref(false)
const detailLoading = ref(false)
const detailVisible = ref(false)
const editVisible = ref(false)
const editSaving = ref(false)
const batchLoading = ref(false)
const list = ref([])
const total = ref(0)
const currentBatch = ref(null)
const batchItems = ref([])
const currentEditId = ref(null)
const selectedRows = ref([])
const batchStatus = ref('')

const query = reactive({
  page: 1,
  pageSize: 20,
  batch_no: '',
  contract_no: '',
  project_name: '',
  customer_name: '',
  status: ''
})
const editForm = reactive({
  batch_no: '',
  date: '',
  status: '草稿',
  remark: ''
})

const fmtMoney = (value) => value ? Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00'
const statusType = (status) => ({ 草稿: 'info', 已请款: 'primary', 部分收款: 'warning', 已收款: 'success' }[status] || 'info')

const loadData = async () => {
  loading.value = true
  try {
    const res = await paymentRequestBatchApi.list(query)
    if (res.success) {
      list.value = res.data.list
      total.value = res.data.total
    }
  } finally {
    loading.value = false
  }
}

const resetQuery = () => {
  Object.assign(query, { page: 1, pageSize: 20, batch_no: '', contract_no: '', project_name: '', customer_name: '', status: '' })
  loadData()
}

const openDetail = async (row) => {
  detailVisible.value = true
  detailLoading.value = true
  currentBatch.value = null
  batchItems.value = []
  try {
    const res = await paymentRequestBatchApi.get(row.id)
    if (res.success) {
      currentBatch.value = res.data
      batchItems.value = res.data.items || []
    }
  } finally {
    detailLoading.value = false
  }
}

const openEditDialog = (row) => {
  currentEditId.value = row.id
  Object.assign(editForm, {
    batch_no: row.batch_no || '',
    date: row.date || '',
    status: row.status || '草稿',
    remark: row.remark || ''
  })
  editVisible.value = true
}

const handleUpdate = async () => {
  if (!currentEditId.value) return
  if (!editForm.batch_no) return ElMessage.warning('请填写请款批次号')
  editSaving.value = true
  try {
    const res = await paymentRequestBatchApi.update(currentEditId.value, { ...editForm })
    if (res.success) {
      ElMessage.success(res.message || '请款批次更新成功')
      editVisible.value = false
      loadData()
      if (detailVisible.value && currentBatch.value?.id === currentEditId.value) {
        openDetail({ id: currentEditId.value })
      }
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '请款批次更新失败')
  } finally {
    editSaving.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定撤回请款批次「${row.batch_no}」吗？系统会同步撤回该批次下全部请款明细，并回滚订单请款状态。`,
      '撤回请款批次',
      { type: 'warning' }
    )
  } catch {
    return
  }

  try {
    const res = await paymentRequestBatchApi.delete(row.id)
    if (res.success) {
      ElMessage.success(res.message || '请款批次已撤回')
      if (detailVisible.value && currentBatch.value?.id === row.id) detailVisible.value = false
      loadData()
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '撤回请款批次失败')
  }
}

const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) return
  try {
    await ElMessageBox.confirm(`确定批量删除/撤回选中的 ${selectedRows.value.length} 个请款批次吗？已产生收款或财务的批次会被跳过。`, '批量删除请款批次', { type: 'warning' })
  } catch {
    return
  }

  batchLoading.value = true
  try {
    const res = await paymentRequestBatchApi.batchDelete(selectedRows.value.map(item => item.id))
    if (res.success) {
      const data = res.data || {}
      const failed = data.failed || 0
      ElMessage[failed > 0 ? 'warning' : 'success'](`成功 ${data.success || 0} 条，失败 ${failed} 条`)
      selectedRows.value = []
      loadData()
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '批量删除失败')
  } finally {
    batchLoading.value = false
  }
}

const handleBatchStatus = async () => {
  if (selectedRows.value.length === 0) return
  if (!batchStatus.value) return ElMessage.warning('请选择要变更的状态')
  try {
    await ElMessageBox.confirm(`确定将选中的 ${selectedRows.value.length} 个请款批次状态改为「${batchStatus.value}」吗？`, '批量更改状态', { type: 'info' })
  } catch {
    return
  }

  batchLoading.value = true
  try {
    const res = await paymentRequestBatchApi.batchUpdateStatus(selectedRows.value.map(item => item.id), batchStatus.value)
    if (res.success) {
      ElMessage.success(res.message || '批量状态更新成功')
      selectedRows.value = []
      batchStatus.value = ''
      loadData()
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '批量状态更新失败')
  } finally {
    batchLoading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 12px; }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.header-actions { display: flex; align-items: center; gap: 12px; }
.header-tip, .selected-tip { color: #909399; font-size: 13px; }
.pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
