<template>
  <div class="page-container">
    <div class="page-header">
      <el-page-header @back="$router.back()" :content="`员工详情 - ${detail.name || ''}`" />
      <el-button type="primary" @click="openEdit">
        <el-icon><Edit /></el-icon> 编辑信息
      </el-button>
    </div>

    <!-- 基本信息 -->
    <el-row :gutter="16" style="margin-top:16px">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header><span class="card-title">基本信息</span></template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="姓名">{{ detail.name }}</el-descriptions-item>
            <el-descriptions-item label="手机号">{{ detail.phone }}</el-descriptions-item>
            <el-descriptions-item label="角色">{{ roleText(detail.role) }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ detail.status === 1 ? '在职' : '离职' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header><span class="card-title">统计</span></template>
          <div class="stat-list">
            <div class="stat-item">
              <span class="stat-label">所属部门</span>
              <span class="stat-value primary">{{ detail.departments?.length || 0 }} 个</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 关联部门 -->
    <el-card shadow="never" style="margin-top:12px">
      <template #header>
        <div class="card-header">
          <span class="card-title">关联部门（{{ detail.departments?.length || 0 }} 个）</span>
          <el-button type="primary" size="small" @click="openDeptDialog">
            <el-icon><Plus /></el-icon> 添加部门
          </el-button>
        </div>
      </template>
      <el-table :data="detail.departments" stripe border size="small">
        <el-table-column prop="name" label="部门名称" min-width="160" />
        <el-table-column prop="company_name" label="所属公司" min-width="140">
          <template #default="{ row }">
            <el-tag v-if="row.company_name" size="small" type="success">{{ row.company_name }}</el-tag>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" plain @click="removeDept(row)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 未关联部门 -->
    <el-card shadow="never" style="margin-top:12px" v-if="unlinkedDepts.length > 0">
      <template #header>
        <span class="card-title">未关联部门（可添加到当前员工）</span>
      </template>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <el-tag v-for="d in unlinkedDepts" :key="d.id" style="cursor:pointer" @click="addDept(d)" type="info" effect="plain">
          {{ d.name }} <el-icon><Plus /></el-icon>
        </el-tag>
      </div>
    </el-card>

    <!-- 编辑员工弹窗 -->
    <el-dialog v-model="editVisible" title="编辑员工" width="500px" destroy-on-close>
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="姓名">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="editForm.phone" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editForm.role" style="width:100%">
            <el-option label="管理员" value="admin" />
            <el-option label="经理" value="manager" />
            <el-option label="业务员" value="sales" />
            <el-option label="员工" value="staff" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editForm.status" style="width:100%">
            <el-option label="在职" :value="1" />
            <el-option label="离职" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加部门弹窗 -->
    <el-dialog v-model="deptDialogVisible" title="添加部门" width="400px">
      <el-select v-model="selectedDeptId" placeholder="选择部门" style="width:100%">
        <el-option v-for="d in unlinkedDepts" :key="d.id" :label="d.name" :value="d.id" />
      </el-select>
      <template #footer>
        <el-button @click="deptDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddDept" :disabled="!selectedDeptId">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { employeeApi, departmentApi } from '@/api'

const route = useRoute()
const employeeId = computed(() => route.params.id)

const detail = ref({})
const allDepts = ref([])
const editVisible = ref(false)
const deptDialogVisible = ref(false)
const selectedDeptId = ref('')
const saving = ref(false)
const editForm = ref({})

const unlinkedDepts = computed(() => {
  const linkedIds = (detail.value.departments || []).map(d => d.id)
  return allDepts.value.filter(d => !linkedIds.includes(d.id))
})

const roleText = (role) => ({ admin: '管理员', manager: '经理', sales: '业务员', staff: '员工' }[role] || role)

const loadDetail = async () => {
  try {
    const res = await employeeApi.get(employeeId.value)
    if (res.success) detail.value = res.data
  } catch (e) { ElMessage.error('加载失败') }
}

const loadDepts = async () => {
  try {
    const res = await departmentApi.all()
    if (res.success) allDepts.value = res.data
  } catch (e) {}
}

const openEdit = () => {
  editForm.value = { ...detail.value }
  editVisible.value = true
}

const saveEdit = async () => {
  saving.value = true
  try {
    const res = await employeeApi.update(employeeId.value, editForm.value)
    if (res.success) {
      ElMessage.success('保存成功')
      editVisible.value = false
      loadDetail()
    }
  } finally { saving.value = false }
}

const openDeptDialog = () => {
  selectedDeptId.value = ''
  deptDialogVisible.value = true
}

const confirmAddDept = async () => {
  if (!selectedDeptId.value) return
  await addDept(allDepts.value.find(d => d.id === selectedDeptId.value))
  deptDialogVisible.value = false
}

const addDept = async (dept) => {
  try {
    const currentIds = (detail.value.departments || []).map(d => d.id)
    const newIds = [...currentIds, dept.id]
    const res = await employeeApi.update(employeeId.value, { dept_ids: newIds })
    if (res.success) {
      ElMessage.success('添加成功')
      loadDetail()
    }
  } catch (e) { ElMessage.error('添加失败') }
}

const removeDept = async (dept) => {
  try {
    const currentIds = (detail.value.departments || []).map(d => d.id)
    const newIds = currentIds.filter(id => id !== dept.id)
    const res = await employeeApi.update(employeeId.value, { dept_ids: newIds })
    if (res.success) {
      ElMessage.success('移除成功')
      loadDetail()
    }
  } catch (e) { ElMessage.error('移除失败') }
}

onMounted(() => {
  loadDetail()
  loadDepts()
})
</script>

<style scoped>
.page-header { display:flex; justify-content:space-between; align-items:center; }
.card-title { font-weight:500; }
.card-header { display:flex; justify-content:space-between; align-items:center; }
.stat-list { display:flex; flex-direction:column; gap:12px; }
.stat-item { display:flex; justify-content:space-between; align-items:center; }
.stat-label { color:#666; font-size:14px; }
.stat-value { font-size:18px; font-weight:600; color:#333; }
.stat-value.primary { color:#409eff; }
</style>
