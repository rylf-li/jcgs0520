<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="query" inline>
        <el-form-item label="订单编号">
          <el-input v-model="query.order_no" clearable style="width:160px" />
        </el-form-item>
        <el-form-item label="合同编号">
          <el-input v-model="query.contract_no" clearable style="width:160px" />
        </el-form-item>
        <el-form-item label="项目名称">
          <el-input v-model="query.project_name" clearable style="width:180px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>订单差异复核</span>
          <el-tag type="danger" effect="plain">仅显示待复核订单</el-tag>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe border>
        <el-table-column prop="order_no" label="订单编号" width="140" />
        <el-table-column prop="contract_no" label="合同编号" width="140" />
        <el-table-column prop="project_name" label="项目名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="salesman" label="业务员" width="100" />
        <el-table-column prop="status" label="订单状态" width="100" />
        <el-table-column prop="payment_status" label="收款状态" width="110" />
        <el-table-column label="金额摘要" width="220">
          <template #default="{ row }">
            <div class="money-stack">
              <span>订单 {{ fmtMoney(row.total) }}</span>
              <span>请款 {{ fmtMoney(row.requested_amount) }}</span>
              <span>收款 {{ fmtMoney(row.received_amount) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="dirty_reason" label="差异说明" min-width="320" show-overflow-tooltip />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="goOrder(row)">查看订单</el-button>
            <el-button size="small" type="warning" plain @click="resolveDirty(row)">清除差异</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orderApi } from '@/api'

const router = useRouter()
const loading = ref(false)
const list = ref([])
const query = reactive({ order_no: '', contract_no: '', project_name: '', is_dirty: 1 })

const fmtMoney = (value) => value ? Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00'

const loadData = async () => {
  loading.value = true
  try {
    const res = await orderApi.list({ ...query, page: 1, pageSize: 200 })
    if (res.success) list.value = res.data.list || []
  } finally {
    loading.value = false
  }
}

const resetQuery = () => {
  Object.assign(query, { order_no: '', contract_no: '', project_name: '', is_dirty: 1 })
  loadData()
}

const goOrder = (row) => {
  router.push('/orders')
  ElMessage.warning(row.dirty_reason || '请在订单列表中完成复核')
}

const resolveDirty = async (row) => {
  try {
    await ElMessageBox.confirm(row.dirty_reason || '确定清除该订单的差异标记吗？', '复核确认', { type: 'warning' })
  } catch {
    return
  }

  const res = await orderApi.resolveDirty(row.id)
  if (res.success) {
    ElMessage.success(res.message || '差异标记已清除')
    loadData()
  }
}

onMounted(() => loadData())
</script>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 12px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.money-stack { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: #606266; }
</style>
