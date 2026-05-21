<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header><span class="card-title">项目报表</span></template>
      <el-form inline style="margin-bottom:16px">
        <el-form-item label="项目编号"><el-input v-model="query.project_no" placeholder="请输入" clearable style="width:140px" /></el-form-item>
        <el-form-item label="项目名称"><el-input v-model="query.name" placeholder="请输入" clearable style="width:140px" /></el-form-item>
        <el-form-item label="客户名称"><el-input v-model="query.customer_name" placeholder="请输入" clearable style="width:140px" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width:100px">
            <el-option label="进行中" value="进行中" /><el-option label="已完成" value="已完成" /><el-option label="已取消" value="已取消" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker v-model="dateRange" type="daterange" range-separator="至" value-format="YYYY-MM-DD" style="width:240px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="list" stripe border v-loading="loading" max-height="500">
        <el-table-column prop="project_no" label="项目编号" width="150" fixed />
        <el-table-column prop="name" label="项目名称" min-width="160" show-overflow-tooltip fixed />
        <el-table-column prop="customer_name" label="客户名称" width="120" />
        <el-table-column prop="manager" label="负责人" width="90" />
        <el-table-column prop="salesman" label="业务员" width="90" />
        <el-table-column prop="amount" label="项目金额" width="110" align="right"><template #default="{ row }">{{ fmtMoney(row.amount) }}</template></el-table-column>
        <el-table-column prop="receivable" label="应收金额" width="110" align="right"><template #default="{ row }">{{ fmtMoney(row.receivable) }}</template></el-table-column>
        <el-table-column prop="requested" label="请款金额" width="110" align="right"><template #default="{ row }">{{ fmtMoney(row.requested) }}</template></el-table-column>
        <el-table-column prop="received" label="收款金额" width="110" align="right"><template #default="{ row }">{{ fmtMoney(row.received) }}</template></el-table-column>
        <el-table-column prop="labor_cost" label="劳务费" width="100" align="right"><template #default="{ row }">{{ fmtMoney(row.labor_cost) }}</template></el-table-column>
        <el-table-column prop="cost" label="成本金额" width="100" align="right"><template #default="{ row }">{{ fmtMoney(row.cost) }}</template></el-table-column>
        <el-table-column prop="tax" label="税费" width="100" align="right"><template #default="{ row }">{{ fmtMoney(row.tax) }}</template></el-table-column>
        <el-table-column prop="business_fee" label="业务费" width="100" align="right"><template #default="{ row }">{{ fmtMoney(row.business_fee) }}</template></el-table-column>
        <el-table-column prop="performance" label="绩效" width="100" align="right"><template #default="{ row }">{{ fmtMoney(row.performance) }}</template></el-table-column>
        <el-table-column prop="profit" label="利润" width="100" align="right">
          <template #default="{ row }"><span :style="{ color: row.profit >= 0 ? '#52c41a' : '#ff4d4f' }">{{ fmtMoney(row.profit) }}</span></template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }"><el-tag :type="{ '进行中': 'primary', '已完成': 'success', '已取消': 'danger' }[row.status]" size="small">{{ row.status }}</el-tag></template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @change="loadData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { reportApi } from '@/api'

const list = ref([])
const loading = ref(false)
const total = ref(0)
const dateRange = ref([])
const query = reactive({ page: 1, pageSize: 20, project_no: '', name: '', customer_name: '', status: '', date_start: '', date_end: '' })

const fmtMoney = (v) => v ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00'

const loadData = async () => {
  if (dateRange.value?.length === 2) { query.date_start = dateRange.value[0]; query.date_end = dateRange.value[1] }
  loading.value = true
  try {
    const res = await reportApi.project(query)
    if (res.success) {
      list.value = res.data.list || res.data
      total.value = res.data.total || 0
    }
  } finally { loading.value = false }
}

const resetQuery = () => {
  Object.assign(query, { page: 1, project_no: '', name: '', customer_name: '', status: '', date_start: '', date_end: '' })
  dateRange.value = []
  loadData()
}

onMounted(() => loadData())
</script>

<style scoped>
.card-title { font-size: 15px; font-weight: 600; }
.pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
