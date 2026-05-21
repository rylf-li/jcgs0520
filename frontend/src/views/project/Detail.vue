<template>
  <div class="page-container">
    <div class="page-header">
      <el-page-header @back="$router.back()" :content="`项目详情 - ${detail.project?.name || ''}`" />
      <el-button type="primary" @click="openEdit">
        <el-icon><Edit /></el-icon> 编辑项目
      </el-button>
    </div>

    <el-row :gutter="16" style="margin-top:16px">
      <!-- 左：基本信息 -->
      <el-col :span="16">
        <el-card shadow="never">
          <template #header><span class="card-title">基本信息</span></template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="项目编号">{{ detail.project?.project_no || '-' }}</el-descriptions-item>
            <el-descriptions-item label="项目名称">{{ detail.project?.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="项目内容" :span="2">{{ detail.project?.content || '-' }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ detail.project?.remark || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <!-- 右：汇总信息 -->
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span class="card-title">金额汇总（来自关联合同）</span>
              <el-button size="small" type="success" plain @click="refreshAmount" :loading="refreshing">
                <el-icon><Refresh /></el-icon> 刷新统计
              </el-button>
            </div>
          </template>
          <div class="amount-grid">
            <div class="amount-item" v-for="item in amountItems" :key="item.label">
              <div class="amount-val" :style="{ color: item.color || '#1677ff' }">{{ fmtMoney(item.total) }}</div>
              <div class="amount-label">{{ item.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 关联合同 -->
    <el-card shadow="never" style="margin-top:12px">
      <template #header>
        <div class="card-header">
          <span class="card-title">关联合同（{{ detail.contracts?.length || 0 }} 份）</span>
          <div style="display:flex;gap:8px">
            <el-button type="success" size="small" @click="openContractDialog">
              <el-icon><Plus /></el-icon> 新增合同
            </el-button>
            <el-button type="primary" size="small" @click="$router.push('/contracts')">查看合同</el-button>
          </div>
        </div>
      </template>
      <el-table :data="detail.contracts" stripe border size="small">
        <el-table-column prop="contract_no" label="合同编号" width="150" />
        <el-table-column prop="date" label="日期" width="110" />
        <el-table-column prop="name" label="合同名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="customer_name" label="客户" width="120" show-overflow-tooltip />
        <el-table-column prop="amount" label="合同金额" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.amount) }}</template>
        </el-table-column>
        <el-table-column prop="requested" label="已请款" width="110" align="right">
          <template #default="{ row }">{{ fmtMoney(row.requested) }}</template>
        </el-table-column>
        <el-table-column prop="received" label="已收款" width="110" align="right">
          <template #default="{ row }">{{ fmtMoney(row.received) }}</template>
        </el-table-column>
        <el-table-column prop="labor_cost" label="劳务费" width="100" align="right">
          <template #default="{ row }">{{ fmtMoney(row.labor_cost) }}</template>
        </el-table-column>
        <el-table-column prop="business_fee" label="业务费" width="100" align="right">
          <template #default="{ row }">{{ fmtMoney(row.business_fee) }}</template>
        </el-table-column>
        <el-table-column prop="profit" label="利润" width="110" align="right">
          <template #default="{ row }">
            <span :style="{ color: row.profit >= 0 ? '#52c41a' : '#ff4d4f' }">{{ fmtMoney(row.profit) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="{ '待签订':'warning','进行中':'primary','已完成':'success','已取消':'danger' }[row.status]" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" plain @click="$router.push(`/contracts/${row.id}`)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 编辑弹窗（简化版：只保留基本字段，详细数据在合同中管理） -->
    <el-dialog v-model="editVisible" title="编辑项目" width="520px" destroy-on-close>
      <el-form :model="editForm" :rules="rules" ref="editFormRef" label-width="90px" size="default">
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目编号">
          <el-input v-model="editForm.project_no" placeholder="请输入项目编号（选填）" />
        </el-form-item>
        <el-form-item label="项目内容">
          <el-input v-model="editForm.content" type="textarea" :rows="3" placeholder="请输入项目内容" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新增合同弹窗 -->
    <el-dialog v-model="contractVisible" title="新增合同" width="760px" destroy-on-close>
      <el-form :model="contractForm" :rules="contractRules" ref="contractFormRef" label-width="90px" size="default">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="合同名称" prop="name">
              <el-input v-model="contractForm.name" placeholder="请输入合同名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="签订日期">
              <el-date-picker v-model="contractForm.date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户名称">
              <el-input v-model="contractForm.customer_name" placeholder="自动带出项目客户" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同状态">
              <el-select v-model="contractForm.status" style="width:100%">
                <el-option label="待签订" value="待签订" />
                <el-option label="进行中" value="进行中" />
                <el-option label="已完成" value="已完成" />
                <el-option label="已取消" value="已取消" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="负责人">
              <el-select v-model="contractForm.manager" filterable clearable placeholder="请选择" style="width:100%">
                <el-option v-for="e in employees" :key="e.id" :label="e.name" :value="e.name" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="业务员">
              <el-select v-model="contractForm.salesman" filterable clearable placeholder="请选择" style="width:100%">
                <el-option v-for="e in employees" :key="e.id" :label="e.name" :value="e.name" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="服务内容">
              <el-input v-model="contractForm.service_content" type="textarea" :rows="2" placeholder="自动带出项目内容" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属部门">
              <el-select v-model="contractForm.dept_id" placeholder="选择部门" clearable style="width:100%" @change="onDeptChange">
                <el-option v-for="d in depts" :key="d.id" :label="d.name" :value="d.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属公司">
              <el-select v-model="contractForm.company_id" placeholder="选择公司" clearable style="width:100%" @change="onCompanyChange">
                <el-option v-for="c in companies" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="合同金额">
              <el-input-number v-model="contractForm.amount" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="应收款">
              <el-input-number v-model="contractForm.receivable" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="已请款">
              <el-input-number v-model="contractForm.requested" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="已收款">
              <el-input-number v-model="contractForm.received" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="结算金额">
              <el-input-number v-model="contractForm.cost" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="税费">
              <el-input-number v-model="contractForm.tax" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="劳务费">
              <el-input-number v-model="contractForm.labor_cost" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="业务费">
              <el-input-number v-model="contractForm.business_fee" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="其他费用">
              <el-input-number v-model="contractForm.other" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="绩效">
              <el-input-number v-model="contractForm.performance" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="利润">
              <el-input-number v-model="contractForm.profit" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="contractVisible = false">取消</el-button>
        <el-button type="primary" :loading="contractSaving" @click="handleContractSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/store/auth'
import { projectApi, contractApi, departmentApi, companyApi, employeeApi } from '@/api'

const route = useRoute()
const detail = ref({ project: null, contracts: [], summary: {} })
const editVisible = ref(false)
const saving = ref(false)
const refreshing = ref(false)
const editFormRef = ref()
const editForm = ref({})
const auth = useAuthStore()

// 新增合同相关
const contractVisible = ref(false)
const contractSaving = ref(false)
const contractFormRef = ref()
const contractForm = ref({})
const contractRules = { name: [{ required: true, message: '请输入合同名称' }] }
const depts = ref([])
const companies = ref([])
const employees = ref([])

const fmtMoney = (v) => v != null ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00'

const amountItems = computed(() => {
  const contracts = detail.value?.contracts || []
  return [
    { label: '合同金额', total: contracts.reduce((s, c) => s + (c.amount || 0), 0) },
    { label: '应收款', total: contracts.reduce((s, c) => s + (c.receivable || 0), 0) },
    { label: '已请款', total: contracts.reduce((s, c) => s + (c.requested || 0), 0) },
    { label: '已收款', total: contracts.reduce((s, c) => s + (c.received || 0), 0), color: '#52c41a' },
    { label: '结算金额', total: contracts.reduce((s, c) => s + (c.cost || 0), 0) },
    { label: '税费', total: contracts.reduce((s, c) => s + (c.tax || 0), 0) },
    { label: '劳务费', total: contracts.reduce((s, c) => s + (c.labor_cost || 0), 0) },
    { label: '业务费', total: contracts.reduce((s, c) => s + (c.business_fee || 0), 0) },
    { label: '其他', total: contracts.reduce((s, c) => s + (c.other || 0), 0) },
    { label: '绩效', total: contracts.reduce((s, c) => s + (c.performance || 0), 0) },
    { label: '利润', total: contracts.reduce((s, c) => s + (c.profit || 0), 0), color: '#1677ff' }
  ]
})

const rules = { name: [{ required: true, message: '请输入项目名称' }] }

const loadDetail = async () => {
  const res = await projectApi.get(route.params.id)
  if (res.success) detail.value = res.data
}

const openEdit = () => {
  const p = detail.value.project
  editForm.value = {
    name: p?.name || '',
    project_no: p?.project_no || '',
    content: p?.content || '',
    remark: p?.remark || ''
  }
  editVisible.value = true
}

const handleSave = async () => {
  try { await editFormRef.value.validate() } catch { return }
  saving.value = true
  try {
    const res = await projectApi.update(route.params.id, editForm.value)
    if (res.success) {
      ElMessage.success('保存成功')
      editVisible.value = false
      loadDetail()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } finally { saving.value = false }
}

const refreshAmount = async () => {
  refreshing.value = true
  try {
    const res = await projectApi.summary(route.params.id)
    if (res.success) {
      const s = res.data
      await projectApi.update(route.params.id, {
        receivable: s.receivable,
        requested: s.requested,
        received: s.received,
        cost: s.cost,
        tax: s.tax,
        labor_cost: s.labor_cost,
        business_fee: s.business_fee,
        other: s.other,
        performance: s.performance,
        profit: s.profit
      })
      ElMessage.success('金额已更新')
      loadDetail()
    }
  } finally { refreshing.value = false }
}

// 打开新增合同弹窗，自动带入项目关联数据
const openContractDialog = () => {
  const p = detail.value.project
  contractForm.value = {
    name: p?.name || '',
    date: '',
    project_id: route.params.id,
    customer_id: p?.customer_id || null,
    customer_name: p?.customer_name || '',
    status: '待签订',
    manager: p?.manager || auth.user?.name || '',
    salesman: p?.salesman || auth.user?.name || '',
    service_content: p?.content || '',
    dept_id: p?.dept_id || null,
    dept_name: p?.dept_name || '',
    company_id: p?.company_id || null,
    company_name: p?.company_name || '',
    amount: 0,
    receivable: 0,
    requested: 0,
    received: 0,
    cost: 0,
    tax: 0,
    labor_cost: 0,
    business_fee: 0,
    other: 0,
    performance: 0,
    profit: 0
  }
  contractVisible.value = true
}

const onDeptChange = (id) => {
  const d = depts.value.find(x => x.id === id)
  contractForm.value.dept_name = d?.name || ''
}

const onCompanyChange = (id) => {
  const c = companies.value.find(x => x.id === id)
  contractForm.value.company_name = c?.name || ''
}

const handleContractSave = async () => {
  try { await contractFormRef.value.validate() } catch { return }
  contractSaving.value = true
  try {
    const res = await contractApi.create(contractForm.value)
    if (res.success) {
      ElMessage.success('合同创建成功')
      contractVisible.value = false
      loadDetail()
    } else {
      ElMessage.error(res.message || '创建失败')
    }
  } finally { contractSaving.value = false }
}

onMounted(async () => {
  // 确保获取最新用户信息
  await auth.fetchUser()
  loadDetail()
  // 加载部门、公司和员工列表
  const [dr, cr, er] = await Promise.all([departmentApi.all(), companyApi.all(), employeeApi.all()])
  if (dr.success) depts.value = dr.data
  if (cr.success) companies.value = cr.data
  if (er.success) employees.value = er.data
})
</script>

<style scoped>
.page-container { padding: 20px; background: #f5f7fa; min-height: calc(100vh - 84px); }
.page-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  background: #fff;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}
.page-header :deep(.el-page-header__title) { font-size: 18px; font-weight: 600; color: #303133; }
.page-header :deep(.el-page-header__content) { font-size: 16px; color: #606266; }
:deep(.el-card) { border-radius: 8px; border: none; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
:deep(.el-card__header) { padding: 14px 16px; border-bottom: 1px solid #f0f0f0; }
:deep(.el-card__body) { padding: 16px; }
.card-title { font-size: 15px; font-weight: 600; color: #303133; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.amount-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.amount-item { text-align: center; padding: 16px 10px; background: linear-gradient(135deg, #f0f5ff 0%, #fafbff 100%); border-radius: 8px; transition: all 0.3s; }
.amount-item:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(22,119,255,0.15); }
.amount-val { font-size: 18px; font-weight: 700; color: #1677ff; }
.amount-label { font-size: 12px; color: #909399; margin-top: 6px; }
:deep(.el-table) { border-radius: 8px; overflow: hidden; }
:deep(.el-table th) { background: #fafafa !important; font-weight: 600; color: #606266; }
:deep(.el-table td) { padding: 10px 0; }
:deep(.el-table--border) { border: 1px solid #ebeef5; }
:deep(.el-tag) { border-radius: 4px; }
.summary-mini { display: flex; flex-direction: column; gap: 8px; }
.sm-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.sm-label { color: #909399; font-size: 13px; }
.sm-val { font-weight: 600; color: #1677ff; }
</style>
