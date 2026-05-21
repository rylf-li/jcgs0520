<template>
  <div class="page-container">
    <div class="page-header">
      <el-page-header @back="$router.back()" :content="`部门详情 - ${detail.name || ''}`" />
      <el-button type="primary" @click="openEdit">
        <el-icon><Edit /></el-icon> 编辑信息
      </el-button>
    </div>

    <el-row :gutter="16" style="margin-top:16px">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header><span class="card-title">基本信息</span></template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="部门名称">{{ detail.name }}</el-descriptions-item>
            <el-descriptions-item label="所属公司">{{ detail.company_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="部门负责人">
              <el-tag v-if="detail.manager_name" type="success" size="small">{{ detail.manager_name }}</el-tag>
              <span v-else class="text-muted">未设置</span>
            </el-descriptions-item>
            <el-descriptions-item label="员工数">
              <el-tag type="primary" size="small">{{ employees.length }} 人</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="描述" :span="2">{{ detail.description || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header><span class="card-title">业绩统计</span></template>
          <div class="stat-list">
            <div class="stat-item">
              <span class="stat-label">订单总额</span>
              <span class="stat-value primary">{{ formatMoney(performance.order_total) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">累计收款</span>
              <span class="stat-value success">{{ formatMoney(performance.received_total) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">绩效总额</span>
              <span class="stat-value">{{ formatMoney(performance.performance_total) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:12px">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="card-title">部门员工（{{ employees.length }} 人）</span></template>
          <el-table :data="employees" stripe border size="small" max-height="300">
            <el-table-column prop="name" label="姓名" min-width="100">
              <template #default="{ row }">
                <el-link type="primary" @click="$router.push(`/employees/${row.id}`)">{{ row.name }}</el-link>
                <el-tag v-if="row.is_manager" type="warning" size="small" style="margin-left:4px">负责人</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="position" label="职位" width="80" />
            <el-table-column prop="status" label="状态" width="70">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.status === 1 ? '在职' : '离职' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span class="card-title">参与项目（{{ projects.length }} 个）</span></template>
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
            <el-table-column prop="salesman" label="负责人" width="80" />
            <el-table-column prop="date" label="开始日期" width="100" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-top:12px">
      <template #header><span class="card-title">员工业绩排行榜</span></template>
      <el-table :data="performance.employee_rankings || []" stripe border size="small" max-height="300">
        <el-table-column type="index" label="排名" width="60">
          <template #default="{ $index }">
            <el-tag v-if="$index === 0" type="warning" effect="dark" size="small">1</el-tag>
            <el-tag v-else-if="$index === 1" type="success" effect="plain" size="small">{{ $index + 1 }}</el-tag>
            <el-tag v-else-if="$index === 2" type="info" effect="plain" size="small">{{ $index + 1 }}</el-tag>
            <span v-else>{{ $index + 1 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="employee_name" label="员工姓名" min-width="120" />
        <el-table-column prop="total_performance" label="累计绩效" min-width="150">
          <template #default="{ row }">
            <span style="color:#67c23a;font-weight:600">{{ formatMoney(row.total_performance) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="editVisible" title="编辑部门信息" width="500px" destroy-on-close>
      <el-form :model="editForm" label-width="100px" ref="editFormRef">
        <el-form-item label="部门名称" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入部门名称" />
        </el-form-item>
        <el-form-item label="部门负责人">
          <el-input v-model="editForm.manager_name" placeholder="请输入负责人姓名" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editForm.description" type="textarea" :rows="3" />
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
const employees = ref([])
const projects = ref([])
const performance = ref({ order_total: 0, received_total: 0, performance_total: 0, employee_rankings: [] })

const editVisible = ref(false)
const saving = ref(false)
const editFormRef = ref(null)
const editForm = reactive({ name: '', manager_name: '', description: '' })

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
    const res = await request.get(`/departments/${route.params.id}`)
    if (res.success) {
      detail.value = res.data
    } else {
      ElMessage.error('部门不存在')
      router.push('/departments')
    }
  } catch (err) {
    ElMessage.error('加载部门信息失败')
    router.push('/departments')
  }
}

const loadEmployees = async () => {
  try {
    const res = await request.get(`/departments/${route.params.id}/employees`, { params: { pageSize: 50 } })
    if (res.success) employees.value = res.data.list
  } catch (err) { console.error(err) }
}

const loadProjects = async () => {
  try {
    const res = await request.get(`/departments/${route.params.id}/projects`, { params: { pageSize: 50 } })
    if (res.success) projects.value = res.data.list
  } catch (err) { console.error(err) }
}

const loadPerformance = async () => {
  try {
    const res = await request.get(`/departments/${route.params.id}/performance`)
    if (res.success) performance.value = res.data
  } catch (err) { console.error(err) }
}

const openEdit = () => {
  Object.assign(editForm, {
    name: detail.value.name || '',
    manager_name: detail.value.manager_name || '',
    description: detail.value.description || ''
  })
  editVisible.value = true
}

const saveEdit = async () => {
  saving.value = true
  try {
    const res = await request.put(`/departments/${route.params.id}`, editForm)
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
  loadEmployees()
  loadProjects()
  loadPerformance()
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
.text-muted { color: #999; }
</style>
