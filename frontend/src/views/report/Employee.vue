<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header><span class="card-title">员工报表</span></template>
      <el-form inline style="margin-bottom:16px">
        <el-form-item label="员工">
          <el-select v-model="query.employee_id" placeholder="全部" clearable style="width:140px">
            <el-option v-for="e in employees" :key="e.id" :label="e.name" :value="e.id" />
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

      <el-table :data="salaryList" stripe border v-loading="loading">
        <el-table-column prop="employee_name" label="员工姓名" width="100">
          <template #default="{ row }">{{ row['employee.name'] || row.employee?.name }}</template>
        </el-table-column>
        <el-table-column label="部门" width="120">
          <template #default="{ row }">{{ row['employee.dept_name'] || row.employee?.dept_name }}</template>
        </el-table-column>
        <el-table-column prop="months" label="月份数" width="90" align="center" />
        <el-table-column prop="total_salary" label="工资总额" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.total_salary) }}</template>
        </el-table-column>
        <el-table-column prop="total_performance" label="绩效总额" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.total_performance) }}</template>
        </el-table-column>
        <el-table-column prop="total_actual" label="实发总额" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.total_actual) }}</template>
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
import { reportApi, employeeApi } from '@/api'

const salaryList = ref([])
const employees = ref([])
const loading = ref(false)
const total = ref(0)
const dateRange = ref([])
const query = reactive({ page: 1, pageSize: 20, employee_id: '', date_start: '', date_end: '' })

const fmtMoney = (v) => v ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00'

const loadData = async () => {
  if (dateRange.value?.length === 2) { query.date_start = dateRange.value[0]; query.date_end = dateRange.value[1] }
  loading.value = true
  try {
    const res = await reportApi.employee(query)
    if (res.success) {
      const data = res.data.salaryStats || []
      total.value = data.length
      const start = (query.page - 1) * query.pageSize
      const end = start + query.pageSize
      salaryList.value = data.slice(start, end)
    }
  } finally { loading.value = false }
}

const resetQuery = () => {
  Object.assign(query, { page: 1, employee_id: '', date_start: '', date_end: '' })
  dateRange.value = []
  loadData()
}

onMounted(async () => {
  loadData()
  const res = await employeeApi.all()
  if (res.success) employees.value = res.data
})
</script>

<style scoped>
.card-title { font-size: 15px; font-weight: 600; }
.pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
