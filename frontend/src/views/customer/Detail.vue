<template>
  <div class="page-container">
    <div class="page-header">
      <el-page-header @back="$router.back()" :content="`客户详情 - ${detail.name || ''}`" />
      <el-button type="primary" @click="openEdit">
        <el-icon><Edit /></el-icon> 编辑信息
      </el-button>
    </div>

    <el-row :gutter="16" style="margin-top:16px">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header><span class="card-title">基本信息</span></template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="客户名称">{{ detail.name }}</el-descriptions-item>
            <el-descriptions-item label="客户状态">
              <el-tag :type="detail.status === '活跃客户' ? 'success' : 'info'" size="small">
                {{ detail.status || '潜在客户' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="联系人">{{ detail.contact || '-' }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ detail.phone || '-' }}</el-descriptions-item>
            <el-descriptions-item label="地址" :span="2">{{ detail.address || '-' }}</el-descriptions-item>
            <el-descriptions-item label="银行账号">{{ detail.bank_account || '-' }}</el-descriptions-item>
            <el-descriptions-item label="开户行">{{ detail.bank_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="结算方式">{{ detail.settlement_method || '-' }}</el-descriptions-item>
            <el-descriptions-item label="所属公司">{{ detail.company_name || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header><span class="card-title">订单统计</span></template>
          <div class="stat-list">
            <div class="stat-item">
              <span class="stat-label">订单总数</span>
              <span class="stat-value primary">{{ stats.order_count }} 单</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">订单总额</span>
              <span class="stat-value success">{{ formatMoney(stats.total_amount) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">累计请款</span>
              <span class="stat-value">{{ formatMoney(stats.total_requested) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">累计收款</span>
              <span class="stat-value success">{{ formatMoney(stats.total_received) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">未收款金额</span>
              <span class="stat-value warning">{{ formatMoney(stats.unreceived_amount) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:12px">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="card-title">关联项目（{{ projects.length }} 个）</span></template>
          <el-table :data="projects" stripe border size="small" max-height="300">
            <el-table-column prop="name" label="项目名称" min-width="150">
              <template #default="{ row }">
                <el-link type="primary" @click="$router.push(`/projects/${row.id}`)">{{ row.name }}</el-link>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="projectStatusType(row.status)" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="合同金额" width="120">
              <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
            </el-table-column>
            <el-table-column prop="salesman" label="负责人" width="80" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="card-title">关联合同（{{ contracts.length }} 个）</span></template>
          <el-table :data="contracts" stripe border size="small" max-height="300">
            <el-table-column prop="contract_no" label="合同编号" width="120">
              <template #default="{ row }">
                <el-link type="primary" @click="$router.push(`/contracts/${row.id}`)">{{ row.contract_no }}</el-link>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="合同名称" min-width="150" />
            <el-table-column prop="date" label="签订日期" width="100" />
            <el-table-column prop="amount" label="合同金额" width="120">
              <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="editVisible" title="编辑客户信息" width="600px" destroy-on-close>
      <el-form :model="editForm" label-width="100px" :rules="editRules" ref="editFormRef">
        <el-form-item label="客户名称" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入客户名称" />
        </el-form-item>
        <el-form-item label="客户状态" prop="status">
          <el-select v-model="editForm.status" style="width:100%">
            <el-option label="潜在客户" value="潜在客户" />
            <el-option label="活跃客户" value="活跃客户" />
          </el-select>
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="editForm.contact" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="editForm.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="editForm.address" />
        </el-form-item>
        <el-form-item label="银行账号" prop="bank_account">
          <el-input v-model="editForm.bank_account" placeholder="请输入银行账号" />
        </el-form-item>
        <el-form-item label="开户行">
          <el-input v-model="editForm.bank_name" />
        </el-form-item>
        <el-form-item label="结算方式">
          <el-input v-model="editForm.settlement_method" />
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
const stats = ref({ order_count: 0, total_amount: 0, total_requested: 0, total_received: 0, unreceived_amount: 0 })
const projects = ref([])
const contracts = ref([])

const editVisible = ref(false)
const saving = ref(false)
const editFormRef = ref(null)
const editForm = reactive({
  name: '',
  status: '潜在客户',
  contact: '',
  phone: '',
  address: '',
  bank_account: '',
  bank_name: '',
  settlement_method: ''
})

const editRules = {
  name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }],
  bank_account: [{ pattern: /^\d{10,25}$/, message: '请输入正确的银行账号', trigger: 'blur' }]
}

const formatMoney = (val) => {
  const num = parseFloat(val) || 0
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const projectStatusType = (status) => {
  const map = { '进行中': 'primary', '已完成': 'success', '已暂停': 'warning', '已取消': 'info' }
  return map[status] || 'info'
}

const loadDetail = async () => {
  try {
    const res = await request.get(`/customers/${route.params.id}`)
    if (res.success) {
      detail.value = res.data
    } else {
      ElMessage.error('客户不存在')
      router.push('/customers')
    }
  } catch (err) {
    ElMessage.error('加载客户信息失败')
    router.push('/customers')
  }
}

const loadStats = async () => {
  try {
    const res = await request.get(`/customers/${route.params.id}/stats`)
    if (res.success) stats.value = res.data
  } catch (err) { console.error(err) }
}

const loadProjects = async () => {
  try {
    const res = await request.get(`/customers/${route.params.id}/projects`, { params: { pageSize: 50 } })
    if (res.success) projects.value = res.data.list
  } catch (err) { console.error(err) }
}

const loadContracts = async () => {
  try {
    const res = await request.get(`/customers/${route.params.id}/contracts`, { params: { pageSize: 50 } })
    if (res.success) contracts.value = res.data.list
  } catch (err) { console.error(err) }
}

const openEdit = () => {
  Object.assign(editForm, {
    name: detail.value.name || '',
    status: detail.value.status || '潜在客户',
    contact: detail.value.contact || '',
    phone: detail.value.phone || '',
    address: detail.value.address || '',
    bank_account: detail.value.bank_account || '',
    bank_name: detail.value.bank_name || '',
    settlement_method: detail.value.settlement_method || ''
  })
  editVisible.value = true
}

const saveEdit = async () => {
  try {
    await editFormRef.value.validate()
  } catch { return }

  try {
    const checkRes = await request.post('/customers/check-name', { name: editForm.name, excludeId: route.params.id })
    if (!checkRes.success) {
      ElMessage.warning('客户名称已存在')
      return
    }
  } catch { return }

  saving.value = true
  try {
    const res = await request.put(`/customers/${route.params.id}`, editForm)
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
  loadStats()
  loadProjects()
  loadContracts()
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
.stat-value.warning { color: #e6a23c; }
</style>
