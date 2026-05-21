<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">日报表</span>
          <el-date-picker v-model="query.date" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width:160px" @change="loadData" />
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="财务收支详情" name="finance">
          <el-table :data="data.financeList" stripe border max-height="400">
            <el-table-column prop="finance_no" label="财务编号" width="130" />
            <el-table-column prop="date" label="日期" width="110" />
            <el-table-column prop="project_name" label="项目名称" min-width="140" show-overflow-tooltip />
            <el-table-column prop="category" label="款项类别" width="100" />
            <el-table-column prop="type" label="收支类别" width="90">
              <template #default="{ row }"><el-tag :type="row.type === '收入' ? 'success' : 'danger'" size="small">{{ row.type }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="110" align="right">
              <template #default="{ row }"><span :style="{ color: row.type === '收入' ? '#52c41a' : '#ff4d4f' }">{{ fmtMoney(row.amount) }}</span></template>
            </el-table-column>
            <el-table-column prop="company_name" label="公司" width="120" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="公司收支统计" name="company">
          <el-table :data="companyStatsList" stripe border max-height="400">
            <el-table-column prop="company_name" label="公司名称" min-width="140" />
            <el-table-column prop="type" label="收支类别" width="100">
              <template #default="{ row }"><el-tag :type="row.type === '收入' ? 'success' : 'danger'" size="small">{{ row.type }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="total" label="金额合计" width="130" align="right">
              <template #default="{ row }"><span :style="{ color: row.type === '收入' ? '#52c41a' : '#ff4d4f' }">{{ fmtMoney(row.total) }}</span></template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="部门收支统计" name="dept">
          <el-table :data="data.deptStats" stripe border max-height="400">
            <el-table-column prop="dept_name" label="部门名称" min-width="140" />
            <el-table-column prop="total_amount" label="合同金额" width="130" align="right">
              <template #default="{ row }">{{ fmtMoney(row.total_amount) }}</template>
            </el-table-column>
            <el-table-column prop="total_received" label="收款金额" width="130" align="right">
              <template #default="{ row }">{{ fmtMoney(row.total_received) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>

      <div class="summary-bar">
        <span>汇总口径：{{ data.statsSource === 'snapshot' ? '快照统计' : '实时统计' }}</span>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { reportApi } from '@/api'
import dayjs from 'dayjs'

const activeTab = ref('finance')
const query = reactive({ date: dayjs().format('YYYY-MM-DD') })
const data = ref({ financeList: [], companyStats: [], deptStats: [] })

const fmtMoney = (v) => v ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00'

const companyStatsList = computed(() => {
  const list = data.value.companyStats || []
  return list.map(s => ({ ...s, total: s.total || 0 }))
})

const loadData = async () => {
  const res = await reportApi.daily(query)
  if (res.success) data.value = res.data
}

onMounted(() => loadData())
</script>

<style scoped>
.card-title { font-size: 15px; font-weight: 600; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.summary-bar { margin-top: 16px; padding-top: 12px; border-top: 1px solid #eee; color: #999; font-size: 13px; }
</style>
