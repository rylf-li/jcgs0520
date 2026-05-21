<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header><span class="card-title">部门报表</span></template>
      <el-form inline style="margin-bottom:16px">
        <el-form-item label="部门名称"><el-input v-model="query.dept_name" placeholder="请输入" clearable style="width:140px" /></el-form-item>
        <el-form-item label="公司名称"><el-input v-model="query.company_name" placeholder="请输入" clearable style="width:140px" /></el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker v-model="dateRange" type="daterange" range-separator="至" value-format="YYYY-MM-DD" style="width:240px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="displayList" stripe border v-loading="loading">
        <el-table-column prop="dept_name" label="部门名称" width="120" />
        <el-table-column prop="company_name" label="公司名称" min-width="140" />
        <el-table-column prop="project_count" label="项目数量" width="100" align="center" />
        <el-table-column prop="total_amount" label="合同金额" width="130" align="right">
          <template #default="{ row }">{{ fmtMoney(row.total_amount) }}</template>
        </el-table-column>
        <el-table-column prop="total_receivable" label="应收金额" width="130" align="right">
          <template #default="{ row }">{{ fmtMoney(row.total_receivable) }}</template>
        </el-table-column>
        <el-table-column prop="total_requested" label="请款金额" width="130" align="right">
          <template #default="{ row }">{{ fmtMoney(row.total_requested) }}</template>
        </el-table-column>
        <el-table-column prop="total_received" label="收款金额" width="130" align="right">
          <template #default="{ row }">{{ fmtMoney(row.total_received) }}</template>
        </el-table-column>
        <el-table-column prop="total_expenditure" label="支出" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.total_expenditure) }}</template>
        </el-table-column>
        <el-table-column prop="total_profit" label="利润" width="120" align="right">
          <template #default="{ row }"><span :style="{ color: row.total_profit >= 0 ? '#52c41a' : '#ff4d4f' }">{{ fmtMoney(row.total_profit) }}</span></template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @change="updateDisplay"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { reportApi } from '@/api'

const list = ref([])
const loading = ref(false)
const total = ref(0)
const dateRange = ref([])
const query = reactive({ page: 1, pageSize: 20, dept_name: '', company_name: '', date_start: '', date_end: '' })

const fmtMoney = (v) => v ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00'

const displayList = computed(() => {
  const start = (query.page - 1) * query.pageSize
  const end = start + query.pageSize
  return list.value.slice(start, end)
})

const loadData = async () => {
  if (dateRange.value?.length === 2) { query.date_start = dateRange.value[0]; query.date_end = dateRange.value[1] }
  loading.value = true
  try {
    const res = await reportApi.department(query)
    if (res.success) {
      list.value = res.data
      total.value = res.data.length
    }
  } finally { loading.value = false }
}

const updateDisplay = () => {}

const resetQuery = () => {
  Object.assign(query, { page: 1, dept_name: '', company_name: '', date_start: '', date_end: '' })
  dateRange.value = []
  loadData()
}

onMounted(() => loadData())
</script>

<style scoped>
.card-title { font-size: 15px; font-weight: 600; }
.pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
