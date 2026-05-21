<template>
  <div class="page-container">
    <div class="page-header">
      <el-page-header @back="$router.back()" :content="`公司详情 - ${detail.name || ''}`" />
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
            <el-descriptions-item label="公司名称">{{ detail.name }}</el-descriptions-item>
            <el-descriptions-item label="默认银行账户">{{ defaultBankAccount }}</el-descriptions-item>
            <el-descriptions-item label="税号">{{ detail.tax_number || '-' }}</el-descriptions-item>
            <el-descriptions-item label="税率">{{ detail.tax_rate != null ? detail.tax_rate + '%' : '-' }}</el-descriptions-item>
            <el-descriptions-item label="地址" :span="2">{{ detail.address || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header><span class="card-title">统计</span></template>
          <div class="stat-list">
            <div class="stat-item">
              <span class="stat-label">部门数量</span>
              <span class="stat-value primary">{{ detail.departments?.length || 0 }} 个</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">员工数量</span>
              <span class="stat-value">{{ detail.employee_count || 0 }} 人</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">原始资金合计</span>
              <span class="stat-value warning">{{ totalInitialCapital }}</span>
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
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="员工" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.employee_count || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" plain @click="removeDept(row)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 银行账户管理 -->
    <el-card shadow="never" style="margin-top:12px">
      <template #header>
        <div class="card-header">
          <span class="card-title">银行账户（{{ bankAccounts.length }} 个）</span>
          <el-button type="primary" size="small" @click="openBankAccountDialog()">
            <el-icon><Plus /></el-icon> 添加账户
          </el-button>
        </div>
      </template>
      <el-table :data="bankAccounts" stripe border size="small">
        <el-table-column prop="account_name" label="账户名称" min-width="140" />
        <el-table-column prop="bank_account" label="银行账号" min-width="140" />
        <el-table-column prop="bank_name" label="开户行" min-width="140" show-overflow-tooltip />
        <el-table-column prop="account_type" label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.account_type === '公账' ? 'primary' : row.account_type === '私账' ? 'warning' : 'info'" size="small">
              {{ row.account_type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="is_default" label="默认" width="70" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.is_default" type="success" size="small">是</el-tag>
            <el-tag v-else type="info" size="small">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="initial_capital" label="原始资金" width="130" align="right">
          <template #default="{ row }">
            {{ row.initial_capital ? Number(row.initial_capital).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openBankAccountDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" plain @click="deleteBankAccount(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 未关联部门 -->
    <el-card shadow="never" style="margin-top:12px" v-if="unlinkedDepts.length > 0">
      <template #header>
        <span class="card-title">未关联部门（可添加到当前公司）</span>
      </template>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <el-tag v-for="d in unlinkedDepts" :key="d.id" style="cursor:pointer" @click="addDept(d)" type="info" effect="plain">
          {{ d.name }} <el-icon><Plus /></el-icon>
        </el-tag>
      </div>
    </el-card>

    <!-- 编辑公司弹窗 -->
    <el-dialog v-model="editVisible" title="编辑公司" width="500px" destroy-on-close>
      <el-form :model="editForm" ref="editFormRef" label-width="90px" size="default">
        <el-form-item label="公司名称" prop="name" :rules="{ required: true, message: '请输入公司名称' }">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="税号">
          <el-input v-model="editForm.tax_number" />
        </el-form-item>
        <el-form-item label="税率(%)">
          <el-input-number v-model="editForm.tax_rate" :precision="2" :min="0" :max="100" style="width:100%" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="editForm.address" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 编辑银行账户弹窗 -->
    <el-dialog v-model="bankAccountVisible" :title="bankAccountForm.id ? '编辑银行账户' : '添加银行账户'" width="500px" destroy-on-close>
      <el-form :model="bankAccountForm" ref="bankAccountFormRef" label-width="100px" size="default">
        <el-form-item label="账户名称" prop="account_name" :rules="{ required: true, message: '请输入账户名称' }">
          <el-input v-model="bankAccountForm.account_name" placeholder="例如：工行基本户、建行一般户" />
        </el-form-item>
        <el-form-item label="银行账号" prop="bank_account" :rules="{ required: true, message: '请输入银行账号' }">
          <el-input v-model="bankAccountForm.bank_account" />
        </el-form-item>
        <el-form-item label="开户行名称">
          <el-input v-model="bankAccountForm.bank_name" placeholder="例如：中国工商银行北京分行" />
        </el-form-item>
        <el-form-item label="账户类型" prop="account_type">
          <el-select v-model="bankAccountForm.account_type" style="width:100%">
            <el-option label="公账" value="公账" />
            <el-option label="私账" value="私账" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="原始资金">
          <el-input-number v-model="bankAccountForm.initial_capital" :precision="2" :min="0" style="width:100%" placeholder="输入该账户的原始资金" />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="bankAccountForm.is_default" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="bankAccountForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bankAccountVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingBankAccount" @click="handleSaveBankAccount">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { companyApi, departmentApi, bankAccountApi } from '@/api'

const route = useRoute()
const detail = ref({})
const editVisible = ref(false)
const saving = ref(false)
const editFormRef = ref()
const editForm = ref({})
const allDepts = ref([])

// Bank account management
const bankAccounts = ref([])
const bankAccountVisible = ref(false)
const savingBankAccount = ref(false)
const bankAccountFormRef = ref()
const bankAccountForm = ref({
  account_name: '',
  bank_account: '',
  bank_name: '',
  account_type: '公账',
  is_default: false,
  initial_capital: 0,
  remark: ''
})

const unlinkedDepts = computed(() =>
  (allDepts.value || []).filter(d => !detail.value.departments?.some(dd => dd.id === d.id))
)

const totalInitialCapital = computed(() => {
  const total = bankAccounts.value.reduce((s, ba) => s + Number(ba.initial_capital || 0), 0)
  return total.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
})

const defaultBankAccount = computed(() => {
  const ba = bankAccounts.value.find(b => b.is_default) || bankAccounts.value[0]
  return ba ? `${ba.bank_account}（${ba.bank_name || ba.account_name}）` : '-'
})

const loadDetail = async () => {
  const res = await companyApi.get(route.params.id)
  if (res.success) {
    detail.value = res.data
  }
}

const loadAllDepts = async () => {
  const res = await departmentApi.all()
  if (res.success) allDepts.value = res.data
}

const loadBankAccounts = async () => {
  const res = await bankAccountApi.list({ company_id: route.params.id })
  if (res.success) {
    bankAccounts.value = res.data?.list || res.data || []
  }
}

const openEdit = () => {
  editForm.value = { ...detail.value }
  editVisible.value = true
}

const handleSave = async () => {
  try { await editFormRef.value.validate() } catch { return }
  saving.value = true
  try {
    const res = await companyApi.update(route.params.id, editForm.value)
    if (res.success) {
      ElMessage.success('保存成功')
      editVisible.value = false
      loadDetail()
    }
  } finally { saving.value = false }
}

const openDeptDialog = () => {
  ElMessage.info('请从下方「未关联部门」区域点击添加')
}

const addDept = async (dept) => {
  try {
    await ElMessageBox.confirm(`确定将「${dept.name}」添加到当前公司吗？`, '添加部门', { type: 'info' })
  } catch { return }
  const res = await departmentApi.update(dept.id, { company_id: route.params.id, company_name: detail.value.name })
  if (res.success) {
    ElMessage.success('已添加')
    await loadDetail()
    await loadAllDepts()
  }
}

const removeDept = async (dept) => {
  try {
    await ElMessageBox.confirm(`确定将「${dept.name}」从当前公司移除吗？`, '移除部门', { type: 'warning' })
  } catch { return }
  const res = await departmentApi.update(dept.id, { company_id: null, company_name: '' })
  if (res.success) {
    ElMessage.success('已移除')
    await loadDetail()
    await loadAllDepts()
  }
}

const openBankAccountDialog = (row = null) => {
  if (row) {
    bankAccountForm.value = { ...row }
  } else {
    bankAccountForm.value = {
      company_id: route.params.id,
      company_name: detail.value.name,
      account_name: '',
      bank_account: '',
      bank_name: '',
      account_type: '公账',
      is_default: false,
      initial_capital: 0,
      remark: ''
    }
  }
  bankAccountVisible.value = true
}

const handleSaveBankAccount = async () => {
  try { await bankAccountFormRef.value.validate() } catch { return }
  savingBankAccount.value = true
  try {
    let res
    if (bankAccountForm.value.id) {
      res = await bankAccountApi.update(bankAccountForm.value.id, bankAccountForm.value)
    } else {
      res = await bankAccountApi.create(bankAccountForm.value)
    }
    if (res.success) {
      ElMessage.success('保存成功')
      bankAccountVisible.value = false
      loadBankAccounts()
    }
  } finally { savingBankAccount.value = false }
}

const deleteBankAccount = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除银行账户「${row.account_name}」吗？`, '删除确认', { type: 'warning' })
  } catch { return }
  const res = await bankAccountApi.delete(row.id)
  if (res.success) {
    ElMessage.success('删除成功')
    loadBankAccounts()
  }
}

onMounted(async () => {
  await loadDetail()
  await loadAllDepts()
  await loadBankAccounts()
})
</script>

<style scoped>
.page-container { padding: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-size: 15px; font-weight: 600; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.stat-list { display: flex; flex-direction: column; gap: 12px; }
.stat-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.stat-label { color: #666; }
.stat-value { font-weight: 700; color: #1677ff; }
.stat-value.primary { color: #1677ff; }
.stat-value.warning { color: #e6a23c; }
</style>
