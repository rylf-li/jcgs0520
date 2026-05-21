<template>
  <div class="page-container">
    <div class="page-header">
      <el-page-header @back="$router.back()" :content="`工资详情 - ${detail.employee_name || ''}`" />
      <el-button type="primary" @click="openEdit">
        <el-icon><Edit /></el-icon> 编辑信息
      </el-button>
    </div>

    <el-row :gutter="16" style="margin-top:16px">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header><span class="card-title">基本信息</span></template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="员工姓名">{{ detail.employee_name }}</el-descriptions-item>
            <el-descriptions-item label="日期">{{ detail.date }}</el-descriptions-item>
            <el-descriptions-item label="基本工资">{{ formatMoney(detail.base_salary) }}</el-descriptions-item>
            <el-descriptions-item label="绩效">{{ formatMoney(detail.performance) }}</el-descriptions-item>
            <el-descriptions-item label="报销">{{ formatMoney(detail.reimbursement) }}</el-descriptions-item>
            <el-descriptions-item label="扣款">{{ formatMoney(detail.deduction) }}</el-descriptions-item>
            <el-descriptions-item label="油费">{{ formatMoney(detail.fuel_cost) }}</el-descriptions-item>
            <el-descriptions-item label="社保">{{ formatMoney(detail.social_security) }}</el-descriptions-item>
            <el-descriptions-item label="实发工资">
              <span style="color:#67c23a;font-weight:600;font-size:16px">{{ formatMoney(detail.actual_salary) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="备注">{{ detail.remark || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span class="card-title">当月绩效</span>
              <el-button type="primary" size="small" @click="autoSumPerformance" :loading="summing">
                自动汇总
              </el-button>
            </div>
          </template>
          <div class="stat-list">
            <div class="stat-item">
              <span class="stat-label">绩效条数</span>
              <span class="stat-value primary">{{ performances.length }} 条</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">绩效总额</span>
              <span class="stat-value success">{{ formatMoney(performanceTotal) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-top:12px">
      <template #header><span class="card-title">当月绩效明细</span></template>
      <el-table :data="performances" stripe border size="small" max-height="300">
        <el-table-column prop="date" label="日期" width="100" />
        <el-table-column prop="source" label="来源" min-width="120" />
        <el-table-column prop="order_no" label="订单编号" width="140" />
        <el-table-column prop="contract_no" label="合同编号" width="140" />
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="{ row }">
            <span style="color:#67c23a;font-weight:600">{{ formatMoney(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ row.status || '未设置' }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="editVisible" title="编辑工资信息" width="600px" destroy-on-close>
      <el-form :model="editForm" label-width="100px" ref="editFormRef">
        <el-form-item label="日期">
          <el-date-picker v-model="editForm.date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="基本工资">
          <el-input-number v-model="editForm.base_salary" :min="0" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="绩效">
          <el-input-number v-model="editForm.performance" :min="0" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="报销">
          <el-input-number v-model="editForm.reimbursement" :min="0" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="扣款">
          <el-input-number v-model="editForm.deduction" :min="0" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="油费">
          <el-input-number v-model="editForm.fuel_cost" :min="0" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="社保">
          <el-input-number v-model="editForm.social_security" :min="0" :precision="2" style="width:100%" />
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Edit } from '@element-plus/icons-vue'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

const detail = ref({})
const performances = ref([])
const summing = ref(false)

const editVisible = ref(false)
const saving = ref(false)
const editFormRef = ref(null)
const editForm = reactive({
  date: '',
  base_salary: 0,
  performance: 0,
  reimbursement: 0,
  deduction: 0,
  fuel_cost: 0,
  social_security: 0,
  remark: ''
})

const formatMoney = (val) => {
  const num = parseFloat(val) || 0
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const statusType = (status) => {
  const map = { '已确认': 'success', '待审核': 'warning', '已驳回': 'danger' }
  return map[status] || 'info'
}

const performanceTotal = computed(() => {
  return performances.value.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
})

const loadDetail = async () => {
  try {
    const res = await request.get(`/salary/${route.params.id}`)
    if (res.success) {
      detail.value = res.data
    } else {
      ElMessage.error('工资记录不存在')
      router.push('/salary')
    }
  } catch (err) {
    ElMessage.error('加载工资信息失败')
    router.push('/salary')
  }
}

const loadPerformances = async () => {
  try {
    const res = await request.get(`/salary/${route.params.id}/performances`)
    if (res.success) {
      performances.value = res.data.list
    }
  } catch (err) { console.error(err) }
}

const autoSumPerformance = async () => {
  summing.value = true
  try {
    const res = await request.post(`/salary/${route.params.id}/auto-performance`)
    if (res.success) {
      ElMessage.success(res.message || '汇总成功')
      loadDetail()
      loadPerformances()
    } else {
      ElMessage.error(res.message || '汇总失败')
    }
  } catch (err) {
    ElMessage.error('汇总失败')
  } finally {
    summing.value = false
  }
}

const openEdit = () => {
  Object.assign(editForm, {
    date: detail.value.date || '',
    base_salary: parseFloat(detail.value.base_salary) || 0,
    performance: parseFloat(detail.value.performance) || 0,
    reimbursement: parseFloat(detail.value.reimbursement) || 0,
    deduction: parseFloat(detail.value.deduction) || 0,
    fuel_cost: parseFloat(detail.value.fuel_cost) || 0,
    social_security: parseFloat(detail.value.social_security) || 0,
    remark: detail.value.remark || ''
  })
  editVisible.value = true
}

const saveEdit = async () => {
  saving.value = true
  try {
    const res = await request.put(`/salary/${route.params.id}`, editForm)
    if (res.success) {
      ElMessage.success('保存成功')
      editVisible.value = false
      loadDetail()
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
  loadPerformances()
})
</script>

<style scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-weight: 600; font-size: 14px; }
.stat-list { display: flex; flex-direction: column; gap: 12px; }
.stat-item { display: flex; justify-content: space-between; align-items: center; }
.stat-label { color: #666; font-size: 13px; }
.stat-value { font-size: 16px; font-weight: 600; }
.stat-value.primary { color: #409eff; }
.stat-value.success { color: #67c23a; }
</style>
