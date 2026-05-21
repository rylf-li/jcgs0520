<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">每日统计快照</span>
          <div class="toolbar">
            <el-date-picker v-model="query.date" type="date" value-format="YYYY-MM-DD" style="width:160px" @change="loadAll" />
            <el-button type="primary" :loading="generating" @click="generateSnapshot">生成当日快照</el-button>
          </div>
        </div>
      </template>

      <div class="status-grid">
        <div class="status-card">
          <div class="status-label">目标日期</div>
          <div class="status-value">{{ status.target_date || '-' }}</div>
        </div>
        <div class="status-card">
          <div class="status-label">最近部门快照</div>
          <div class="status-value">{{ status.last_dates?.departments || '-' }}</div>
          <div class="status-sub">当日 {{ status.current_counts?.departments || 0 }} 条</div>
        </div>
        <div class="status-card">
          <div class="status-label">最近公司快照</div>
          <div class="status-value">{{ status.last_dates?.companies || '-' }}</div>
          <div class="status-sub">当日 {{ status.current_counts?.companies || 0 }} 条</div>
        </div>
        <div class="status-card">
          <div class="status-label">最近客户快照</div>
          <div class="status-value">{{ status.last_dates?.customers || '-' }}</div>
          <div class="status-sub">当日 {{ status.current_counts?.customers || 0 }} 条</div>
        </div>
      </div>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="部门统计表" name="dept">
          <el-table :data="deptList" v-loading="loading" stripe border>
            <el-table-column prop="date" label="日期" width="110" />
            <el-table-column prop="dept_name" label="部门名称" width="120" />
            <el-table-column prop="company_name" label="公司名称" min-width="140" />
            <el-table-column prop="project_count" label="项目数量" width="100" align="center" />
            <el-table-column prop="contract_amount" label="项目总金额" width="130" align="right"><template #default="{ row }">{{ fmtMoney(row.contract_amount) }}</template></el-table-column>
            <el-table-column prop="receivable" label="应收金额" width="130" align="right"><template #default="{ row }">{{ fmtMoney(row.receivable) }}</template></el-table-column>
            <el-table-column prop="requested" label="请款金额" width="130" align="right"><template #default="{ row }">{{ fmtMoney(row.requested) }}</template></el-table-column>
            <el-table-column prop="received" label="收款金额" width="130" align="right"><template #default="{ row }">{{ fmtMoney(row.received) }}</template></el-table-column>
            <el-table-column prop="expenditure" label="支出" width="120" align="right"><template #default="{ row }">{{ fmtMoney(row.expenditure) }}</template></el-table-column>
            <el-table-column prop="profit" label="利润" width="120" align="right"><template #default="{ row }">{{ fmtMoney(row.profit) }}</template></el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="公司统计表" name="company">
          <el-table :data="companyList" v-loading="loading" stripe border>
            <el-table-column prop="date" label="日期" width="110" />
            <el-table-column prop="company_name" label="公司名称" width="140" />
            <el-table-column prop="dept_name" label="部门名称" width="120" />
            <el-table-column prop="project_count" label="项目数量" width="100" align="center" />
            <el-table-column prop="contract_amount" label="项目总金额" width="130" align="right"><template #default="{ row }">{{ fmtMoney(row.contract_amount) }}</template></el-table-column>
            <el-table-column prop="receivable" label="应收金额" width="130" align="right"><template #default="{ row }">{{ fmtMoney(row.receivable) }}</template></el-table-column>
            <el-table-column prop="requested" label="请款金额" width="130" align="right"><template #default="{ row }">{{ fmtMoney(row.requested) }}</template></el-table-column>
            <el-table-column prop="received" label="收款金额" width="130" align="right"><template #default="{ row }">{{ fmtMoney(row.received) }}</template></el-table-column>
            <el-table-column prop="expenditure" label="支出" width="120" align="right"><template #default="{ row }">{{ fmtMoney(row.expenditure) }}</template></el-table-column>
            <el-table-column prop="profit" label="利润" width="120" align="right"><template #default="{ row }">{{ fmtMoney(row.profit) }}</template></el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="客户统计表" name="customer">
          <el-table :data="customerList" v-loading="loading" stripe border>
            <el-table-column prop="date" label="日期" width="110" />
            <el-table-column prop="customer_name" label="客户名称" min-width="160" />
            <el-table-column prop="contract_count" label="合同数量" width="100" align="center" />
            <el-table-column prop="contract_amount" label="合同金额" width="130" align="right"><template #default="{ row }">{{ fmtMoney(row.contract_amount) }}</template></el-table-column>
            <el-table-column prop="receivable" label="应收金额" width="130" align="right"><template #default="{ row }">{{ fmtMoney(row.receivable) }}</template></el-table-column>
            <el-table-column prop="requested" label="请款金额" width="130" align="right"><template #default="{ row }">{{ fmtMoney(row.requested) }}</template></el-table-column>
            <el-table-column prop="received" label="收款金额" width="130" align="right"><template #default="{ row }">{{ fmtMoney(row.received) }}</template></el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { statsApi } from '@/api'

const activeTab = ref('dept')
const loading = ref(false)
const generating = ref(false)
const deptList = ref([])
const companyList = ref([])
const customerList = ref([])
const query = reactive({ date: dayjs().format('YYYY-MM-DD') })
const status = ref({ target_date: '', last_dates: {}, current_counts: {} })

const fmtMoney = (value) => value ? Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00'

const loadAll = async () => {
  loading.value = true
  try {
    const [statusRes, deptRes, companyRes, customerRes] = await Promise.all([
      statsApi.status(query),
      statsApi.departments(query),
      statsApi.companies(query),
      statsApi.customers(query)
    ])
    if (statusRes.success) status.value = statusRes.data
    if (deptRes.success) deptList.value = deptRes.data
    if (companyRes.success) companyList.value = companyRes.data
    if (customerRes.success) customerList.value = customerRes.data
  } finally {
    loading.value = false
  }
}

const generateSnapshot = async () => {
  generating.value = true
  try {
    const res = await statsApi.generateDaily({ date: query.date })
    if (res.success) {
      ElMessage.success(res.message || '统计快照已生成')
      await loadAll()
    }
  } finally {
    generating.value = false
  }
}

onMounted(() => loadAll())
</script>

<style scoped>
.card-title { font-size: 15px; font-weight: 600; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.toolbar { display: flex; gap: 8px; align-items: center; }
.status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px; }
.status-card { border: 1px solid #f0f0f0; border-radius: 8px; padding: 14px 16px; background: #fafafa; }
.status-label { font-size: 12px; color: #909399; margin-bottom: 6px; }
.status-value { font-size: 18px; font-weight: 600; color: #303133; }
.status-sub { margin-top: 4px; font-size: 12px; color: #606266; }
</style>
