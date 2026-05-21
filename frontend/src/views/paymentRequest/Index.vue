<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="query" inline>
        <el-form-item label="请款批次"><el-input v-model="query.batch_no" clearable style="width:150px" /></el-form-item>
        <el-form-item label="请款单号"><el-input v-model="query.request_no" clearable style="width:150px" /></el-form-item>
        <el-form-item label="订单编号"><el-input v-model="query.order_no" clearable style="width:150px" /></el-form-item>
        <el-form-item label="合同编号"><el-input v-model="query.contract_no" clearable style="width:150px" /></el-form-item>
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
          <span>请款明细列表</span>
          <div class="header-actions">
            <span class="header-tip">请款明细由订单批量生成，新增入口已切换到订单管理。</span>
            <ImportExportButtons model="payment_requests" modelName="请款明细" @success="loadData" />
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe border>
        <el-table-column prop="batch_no" label="请款批次" width="140" />
        <el-table-column prop="request_no" label="请款单号" width="130" />
        <el-table-column prop="date" label="日期" width="100" />
        <el-table-column prop="order_no" label="订单编号" width="130" />
        <el-table-column prop="contract_no" label="合同编号" width="130" />
        <el-table-column prop="project_name" label="项目名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="customer_name" label="客户名称" width="140" show-overflow-tooltip />
        <el-table-column prop="salesman_name" label="业务员" width="90" />
        <el-table-column prop="request_amount" label="请款金额" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.request_amount) }}</template>
        </el-table-column>
        <el-table-column prop="received_amount" label="已收金额" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.received_amount) }}</template>
        </el-table-column>
        <el-table-column prop="request_status" label="明细状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.request_status || row.status)" size="small">{{ row.request_status || row.status || '草稿' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { paymentRequestApi } from '@/api'
import ImportExportButtons from '@/components/ImportExportButtons.vue'

const loading = ref(false)
const list = ref([])
const total = ref(0)

const query = reactive({
  page: 1,
  pageSize: 20,
  batch_no: '',
  request_no: '',
  order_no: '',
  contract_no: '',
  status: ''
})

const fmtMoney = (value) => value ? Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00'
const statusType = (status) => ({ 草稿: 'info', 已请款: 'primary', 已确认: 'primary', 部分收款: 'warning', 已收款: 'success' }[status] || 'info')

const loadData = async () => {
  loading.value = true
  try {
    const res = await paymentRequestApi.list(query)
    if (res.success) {
      list.value = res.data.list
      total.value = res.data.total
    }
  } finally {
    loading.value = false
  }
}

const resetQuery = () => {
  Object.assign(query, { page: 1, pageSize: 20, batch_no: '', request_no: '', order_no: '', contract_no: '', status: '' })
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 12px; }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.header-actions { display: flex; align-items: center; gap: 12px; }
.header-tip { color: #909399; font-size: 13px; }
.pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
