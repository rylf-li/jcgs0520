<template>
  <div class="page-container">
    <div class="page-header">
      <el-page-header @back="$router.back()" :content="`绩效详情 - ${detail.employee_name || ''}`" />
      <el-button type="primary" @click="openEdit">
        <el-icon><Edit /></el-icon> 编辑信息
      </el-button>
    </div>

    <el-row :gutter="16" style="margin-top:16px">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="card-title">基本信息</span></template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="员工姓名">{{ detail.employee_name }}</el-descriptions-item>
            <el-descriptions-item label="日期">{{ detail.date }}</el-descriptions-item>
            <el-descriptions-item label="月份">{{ detail.month }}</el-descriptions-item>
            <el-descriptions-item label="绩效金额">
              <span style="color:#67c23a;font-weight:600;font-size:16px">{{ formatMoney(detail.amount) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="来源">{{ detail.source || '-' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="statusType(detail.status)" size="small">{{ detail.status || '未设置' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="部门">{{ detail.dept_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="职位">{{ detail.position || '-' }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ detail.remark || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="card-title">关联业务信息</span></template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="订单编号">
              <el-link v-if="detail.order_no" type="primary" @click="$router.push(`/orders/${detail.order_id}`)">{{ detail.order_no }}</el-link>
              <span v-else>-</span>
            </el-descriptions-item>
            <el-descriptions-item label="合同编号">
              <el-link v-if="detail.contract_no" type="primary" @click="$router.push(`/contracts/${detail.contract_id}`)">{{ detail.contract_no }}</el-link>
              <span v-else>-</span>
            </el-descriptions-item>
            <el-descriptions-item label="项目名称">{{ detail.project_name || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-top:12px">
      <template #header><span class="card-title">绩效计算明细</span></template>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="销售金额">{{ formatMoney(detail.sales_amount) }}</el-descriptions-item>
        <el-descriptions-item label="已收金额">{{ formatMoney(detail.received_amount) }}</el-descriptions-item>
        <el-descriptions-item label="绩效比例">
          <span v-if="detail.performance_rate">{{ (parseFloat(detail.performance_rate) * 100).toFixed(2) }}%</span>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="绩效金额">
          <span style="color:#67c23a;font-weight:600">{{ formatMoney(detail.performance_amount) }}</span>
        </el-descriptions-item>
      </el-descriptions>
      <div style="margin-top:12px;padding:12px;background:#f5f7fa;border-radius:4px">
        <div style="font-size:13px;color:#666;margin-bottom:4px">计算公式</div>
        <div style="font-size:14px">
          绩效金额 = 已收金额 × 绩效比例
          <span v-if="detail.received_amount && detail.performance_rate">
            = {{ formatMoney(detail.received_amount) }} × {{ (parseFloat(detail.performance_rate) * 100).toFixed(2) }}%
            = <b style="color:#67c23a">{{ formatMoney(detail.performance_amount) }}</b>
          </span>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="editVisible" title="编辑绩效信息" width="600px" destroy-on-close>
      <el-form :model="editForm" label-width="100px" ref="editFormRef">
        <el-form-item label="日期">
          <el-date-picker v-model="editForm.date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="绩效金额">
          <el-input-number v-model="editForm.amount" :min="0" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="来源">
          <el-input v-model="editForm.source" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editForm.status" style="width:100%">
            <el-option label="未设置" value="" />
            <el-option label="待审核" value="待审核" />
            <el-option label="已确认" value="已确认" />
            <el-option label="已驳回" value="已驳回" />
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
import { Edit } from '@element-plus/icons-vue'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

const detail = ref({})

const editVisible = ref(false)
const saving = ref(false)
const editFormRef = ref(null)
const editForm = reactive({
  date: '',
  amount: 0,
  source: '',
  status: '',
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

const loadDetail = async () => {
  try {
    const res = await request.get(`/performance/${route.params.id}`)
    if (res.success) {
      detail.value = res.data
    } else {
      ElMessage.error('绩效记录不存在')
      router.push('/performance')
    }
  } catch (err) {
    ElMessage.error('加载绩效信息失败')
    router.push('/performance')
  }
}

const openEdit = () => {
  Object.assign(editForm, {
    date: detail.value.date || '',
    amount: parseFloat(detail.value.amount) || 0,
    source: detail.value.source || '',
    status: detail.value.status || '',
    remark: detail.value.remark || ''
  })
  editVisible.value = true
}

const saveEdit = async () => {
  saving.value = true
  try {
    const res = await request.put(`/performance/${route.params.id}`, editForm)
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
})
</script>

<style scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-weight: 600; font-size: 14px; }
</style>
