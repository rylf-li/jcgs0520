<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="query" inline>
        <el-form-item label="订单编号"><el-input v-model="query.order_no" placeholder="请输入" clearable style="width:150px" /></el-form-item>
        <el-form-item label="合同编号"><el-input v-model="query.contract_no" placeholder="请输入" clearable style="width:150px" /></el-form-item>
        <el-form-item label="工程名称"><el-input v-model="query.project_name" placeholder="请输入" clearable style="width:150px" /></el-form-item>
        <el-form-item label="客户"><el-input v-model="query.customer_name" placeholder="请输入" clearable style="width:130px" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width:100px">
            <el-option label="待处理" value="待处理" /><el-option label="进行中" value="进行中" />
            <el-option label="已完成" value="已完成" /><el-option label="已取消" value="已取消" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="query.only_requestable">仅看可请款订单</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 批量操作区 -->
    <el-card shadow="never" class="batch-card">
      <div class="batch-bar">
        <span class="batch-tip" v-if="selectedOrders.length > 0">已选择 <strong>{{ selectedOrders.length }}</strong> 条订单</span>
        <div class="batch-actions">
          <el-button v-if="selectedOrders.length > 0" type="primary" size="small" @click="handleBatchCreatePaymentRequest">
            <el-icon><Tickets /></el-icon>批量请款({{ requestableSelectedOrders.length }})
          </el-button>
          <el-button v-if="selectedOrders.length > 0" type="primary" size="small" @click="showBatchStatusDialog = true">
            <el-icon><Switch /></el-icon>批量改状态({{ selectedOrders.length }})
          </el-button>
          <el-button v-if="selectedOrders.length > 0" type="success" size="small" @click="batchGenerate('performance')">
            <el-icon><Refresh /></el-icon>生成绩效({{ selectedOrders.length }})
          </el-button>
          <el-button v-if="selectedOrders.length > 0" type="warning" size="small" @click="batchGenerate('finance')">
            <el-icon><Lightning /></el-icon>生成财务({{ selectedOrders.length }})
          </el-button>
          <el-button v-if="selectedOrders.length > 0" type="info" size="small" @click="batchCancelFlag">
            <el-icon><CloseBold /></el-icon>取消标识({{ selectedOrders.length }})
          </el-button>
          <el-button v-if="selectedOrders.length > 0" type="danger" size="small" @click="batchDeleteOrders">
            <el-icon><Delete /></el-icon>删除({{ selectedOrders.length }})
          </el-button>
          <el-button v-if="selectedOrders.length > 0" size="small" @click="selectedOrders = []">取消选择</el-button>
        </div>
      </div>
    </el-card>

    <!-- 统计卡片 -->
    <el-row :gutter="12" class="stat-cards">
      <el-col :span="6"><div class="stat-card"><div class="stat-label">订单总数</div><div class="stat-value primary">{{ stats.total }}</div></div></el-col>
      <el-col :span="6"><div class="stat-card"><div class="stat-label">进行中</div><div class="stat-value warning">{{ stats.processing }}</div></div></el-col>
      <el-col :span="6"><div class="stat-card"><div class="stat-label">已完成</div><div class="stat-value success">{{ stats.completed }}</div></div></el-col>
      <el-col :span="6"><div class="stat-card"><div class="stat-label">订单总金额</div><div class="stat-value">{{ fmtMoney(stats.totalAmount) }}</div></div></el-col>
    </el-row>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">订单列表</span>
          <div style="display:flex;gap:8px;align-items:center">
            <ImportExportButtons model="orders" modelName="订单" @success="loadData" />
            <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增订单</el-button>
          </div>
        </div>
      </template>
      <el-table ref="tableRef" :data="list" v-loading="loading" stripe border row-key="id" @selection-change="onSelectionChange">
        <el-table-column type="selection" width="45" />
        <el-table-column prop="order_no" label="订单编号" width="140" />
        <el-table-column prop="date" label="日期" width="100" />
        <el-table-column prop="contract_no" label="合同编号" width="140">
          <template #default="{ row }">
            <el-link v-if="row.contract_no" type="primary">{{ row.contract_no }}</el-link>
            <span v-else class="text-muted">无合同</span>
          </template>
        </el-table-column>
        <el-table-column prop="project_name" label="工程名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="customer_name" label="客户" width="110" show-overflow-tooltip />
        <el-table-column prop="company_name" label="公司名称" width="140" show-overflow-tooltip />
        <el-table-column label="业务明细" min-width="180">
          <template #default="{ row }">
            <div v-if="row.items && row.items.length" class="business-items">
              <span v-for="(item, i) in row.items.slice(0,2)" :key="i" class="item-tag">{{ item.business_category }}-{{ item.business_project }}</span>
              <span v-if="row.items.length > 2" class="item-more">+{{ row.items.length - 2 }}</span>
            </div>
            <span v-else class="text-muted">{{ row.business_category || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="total" label="合计" width="110" align="right">
          <template #default="{ row }"><span class="money">{{ fmtMoney(row.total) }}</span></template>
        </el-table-column>
        <el-table-column prop="report_no" label="报告编号" width="120" show-overflow-tooltip />
        <el-table-column prop="report_date" label="报告日期" width="100" />
        <el-table-column prop="salesman" label="业务员" width="80" />
        <el-table-column prop="payment_status" label="请收状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="paymentTagType(row.payment_status)">{{ row.payment_status || '未请款' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态摘要" width="180">
          <template #default="{ row }">
            <div class="money-stack">
              <span>请款：{{ Number(row.requested_amount || 0) > 0 ? '已请款' : '未请款' }}</span>
              <span>收款：{{ Number(row.received_amount || 0) > 0 ? (Number(row.received_amount || 0) >= Number(row.requested_amount || 0) ? '已收款' : '部分收款') : '未收款' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-select v-model="row.status" size="small" :style="{ width: '80px' }" @change="handleStatusChange(row)">
              <el-option label="待处理" value="待处理" /><el-option label="进行中" value="进行中" /><el-option label="已完成" value="已完成" /><el-option label="已取消" value="已取消" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="标识" width="130">
          <template #default="{ row }">
            <div style="display:flex;flex-wrap:wrap;gap:2px">
              <el-tag v-if="row.perf_generated" size="small" type="success" effect="plain">绩效✓</el-tag>
              <el-tag v-if="row.finance_generated" size="small" type="warning" effect="plain">已请款</el-tag>
              <el-tag v-if="row.finance_booked" size="small" type="primary" effect="plain">已记账</el-tag>
              <el-tag v-if="row.is_dirty" size="small" type="danger" effect="plain">待复核</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="360" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              plain
              @click="$router.push(`/orders/${row.id}`)"
            >
              详情
            </el-button>
            <el-button
              size="small"
              type="success"
              plain
              :disabled="!canCreatePaymentRequest(row)"
              @click="handleCreatePaymentBatch(row)"
            >
              发起请款
            </el-button>
            <el-button
              v-if="row.is_dirty"
              size="small"
              type="warning"
              plain
              @click="handleResolveDirty(row)"
            >
              清除差异
            </el-button>
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination"><el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" @change="loadData" /></div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editId ? '编辑订单' : '新增订单'" width="900px" destroy-on-close>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="日期" prop="date"><el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="合同">
            <el-select v-model="form.contract_id" filterable clearable placeholder="可选择合同" style="width:100%" @change="onContractChange">
              <el-option v-for="c in contracts" :key="c.id" :label="`${c.contract_no} - ${c.name}`" :value="c.id" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="8"><el-form-item label="订单状态">
            <el-select v-model="form.status" style="width:100%">
              <el-option label="待处理" value="待处理" /><el-option label="进行中" value="进行中" />
              <el-option label="已完成" value="已完成" /><el-option label="已取消" value="已取消" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="工程名称"><el-input v-model="form.project_name" placeholder="请输入工程名称" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="客户名称"><el-input v-model="form.customer_name" placeholder="请输入客户名称" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="收款账户"><el-input v-model="form.bank_account_name" disabled placeholder="选择合同后自动带出" /></el-form-item></el-col>
        </el-row>

        <!-- 业务明细表格 -->
        <el-divider content-position="left">业务明细（可添加多项）</el-divider>
        <div class="items-header">
          <el-button type="primary" size="small" plain @click="addItem"><el-icon><Plus /></el-icon>添加业务</el-button>
          <div class="items-summary">
            <span>合计：<b>{{ fmtMoney(form.total) }}</b></span>
            <span>报告编号：<b>{{ form.report_no || '-' }}</b></span>
            <span>报告日期：<b>{{ form.report_date || '-' }}</b></span>
          </div>
        </div>
        <el-table :data="orderItems" border size="small" style="margin-bottom:16px">
          <el-table-column type="index" label="#" width="50" align="center" />
          <el-table-column label="业务类别" min-width="140">
            <template #default="{ row }">
              <el-select v-model="row.business_category" filterable placeholder="选择类别" size="small" style="width:100%" @change="onItemCategoryChange(row)">
                <el-option v-for="cat in businessCategories" :key="cat" :label="cat" :value="cat" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="业务项目" min-width="160">
            <template #default="{ row }">
              <el-select v-model="row.business_id" filterable placeholder="选择项目" size="small" style="width:100%" @change="onItemBusinessChange(row)">
                <el-option v-for="b in filteredBusiness(row.business_category)" :key="b.id" :label="b.project" :value="b.id" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="业务参数" width="120">
            <template #default="{ row }">
              <el-input v-model="row.parameter" size="small" placeholder="参数" />
            </template>
          </el-table-column>
          <el-table-column label="数量" width="100" align="center">
            <template #default="{ row }">
              <el-input-number v-model="row.quantity" :min="0" :precision="2" size="small" controls-position="right" style="width:80px" @change="calcItemTotal(row)" />
            </template>
          </el-table-column>
          <el-table-column label="单价" width="100" align="center">
            <template #default="{ row }">
              <el-input-number v-model="row.unit_price" :min="0" :precision="4" size="small" controls-position="right" style="width:90px" @change="calcItemTotal(row)" />
            </template>
          </el-table-column>
          <el-table-column label="金额" width="100" align="right">
            <template #default="{ row }"><span class="money">{{ fmtMoney(row.total) }}</span></template>
          </el-table-column>
          <el-table-column label="结算费" width="90" align="center">
            <template #default="{ row }">
              <el-input-number v-model="row.settlement_fee" :min="0" :precision="2" size="small" controls-position="right" style="width:80px" @change="calcSummary" />
            </template>
          </el-table-column>
          <el-table-column label="绩效费" width="90" align="center">
            <template #default="{ row }">
              <el-input-number v-model="row.performance_fee" :min="0" :precision="2" size="small" controls-position="right" style="width:80px" @change="calcSummary" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="60" align="center">
            <template #default="{ $index }">
              <el-button size="small" type="danger" text @click="removeItem($index)"><el-icon><Delete /></el-icon></el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-row :gutter="16">
          <el-col :span="6"><el-form-item label="负责人">
            <el-select v-model="form.manager" filterable clearable placeholder="请选择" style="width:100%">
              <el-option v-for="e in employees" :key="e.id" :label="e.name" :value="e.name" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="6"><el-form-item label="业务员">
            <el-select v-model="form.salesman" filterable clearable placeholder="请选择" style="width:100%">
              <el-option v-for="e in employees" :key="e.id" :label="e.name" :value="e.name" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="6"><el-form-item label="报告日期"><el-date-picker v-model="form.report_date" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="报告编号"><el-input v-model="form.report_no" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" /></el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量状态变更弹窗 -->
    <el-dialog v-model="showBatchStatusDialog" title="批量变更订单状态" width="500px" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="目标状态">
          <el-select v-model="batchTargetStatus" placeholder="请选择" style="width:200px">
            <el-option label="待审核" value="待审核" />
            <el-option label="已审核" value="已审核" />
            <el-option label="进行中" value="进行中" />
            <el-option label="已完成" value="已完成" />
            <el-option label="已取消" value="已取消" />
          </el-select>
        </el-form-item>
        <el-form-item label="选中订单">
          <span>共 <b>{{ selectedOrders.length }}</b> 条订单</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchStatusDialog = false">取消</el-button>
        <el-button type="primary" @click="handleBatchStatusChange" :loading="batchStatusLoading">确认变更</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, h } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { orderApi, contractApi, businessApi, employeeApi, performanceApi, financeApi, paymentRequestBatchApi } from '@/api'
import ImportExportButtons from '@/components/ImportExportButtons.vue'

const list = ref([]), total = ref(0), loading = ref(false), saving = ref(false)
const dialogVisible = ref(false), editId = ref(null), formRef = ref(), tableRef = ref()
const contracts = ref([]), businessItems = ref([]), employees = ref([])
const auth = useAuthStore()
const router = useRouter()
const orderItems = ref([]) // 订单明细行
const businessCategories = ref([])
const selectedOrders = ref([]) // 多选的订单
const showBatchStatusDialog = ref(false)
const batchTargetStatus = ref('')
const batchStatusLoading = ref(false)
const stats = ref({ total: 0, processing: 0, completed: 0, totalAmount: 0 }) // 统计数据

const query = reactive({ page:1, pageSize:20, order_no:'', contract_no:'', project_name:'', customer_name:'', status:'', only_requestable: false })
const form = reactive({
  date:'', contract_id:'', contract_no:'', project_name:'', customer_name:'', customer_id:'',
  total:0, settlement_fee:0, performance_fee:0, manager:'', salesman:'',
  report_date:'', report_no:'', status:'待处理', remark:'',
  dept_id:'', dept_name:'', company_id:'', company_name:'', bank_account_id:'', bank_account_name:''
})
const rules = { date: [{ required: true, message: '请选择日期', trigger: 'change' }] }

const fmtMoney = (v) => v ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits:2 }) : '0.00'
const paymentTagType = (status) => ({
  '未请款': 'info',
  '已请款': 'warning',
  '部分收款': 'success',
  '已收款': 'primary'
}[status] || 'info')

const canCreatePaymentRequest = (row) => {
  const total = Number(row.total || 0)
  const requested = Number(row.requested_amount || 0)
  return row.status === '已完成' && total > requested
}

const requestableSelectedOrders = computed(() => selectedOrders.value.filter(canCreatePaymentRequest))
const getSelectedOrderRows = () => {
  const rows = tableRef.value?.getSelectionRows?.() || []
  return rows.length > 0 ? rows : selectedOrders.value
}

// 按类别筛选业务
const filteredBusiness = (category) => {
  if (!category) return businessItems.value
  return businessItems.value.filter(b => b.category === category)
}

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: query.page,
      pageSize: query.pageSize,
      order_no: query.order_no,
      contract_no: query.contract_no,
      project_name: query.project_name,
      customer_name: query.customer_name,
      status: query.only_requestable ? '已完成' : query.status
    }
    const res = await orderApi.list(params)
    if (res.success) {
      const loadedList = res.data.list || []
      list.value = query.only_requestable ? loadedList.filter(canCreatePaymentRequest) : loadedList
      total.value = query.only_requestable ? list.value.length : res.data.total
    }
    // 加载统计数据（忽略分页，使用查询条件）
    await loadStats()
  } finally { loading.value = false }
}

// 加载统计数据（基于全部数据）
const loadStats = async () => {
  try {
    // 使用查询条件但不分页，获取统计数据
    const res = await orderApi.stats({
      order_no: query.order_no,
      contract_no: query.contract_no,
      project_name: query.project_name,
      customer_name: query.customer_name,
      status: query.only_requestable ? '已完成' : query.status
    })
    if (res.success) {
      stats.value = {
        total: res.data.total,
        processing: res.data.processing,
        completed: res.data.completed,
        totalAmount: res.data.totalAmount
      }
    }
  } catch (e) {
    console.error('加载统计数据失败', e)
  }
}

const resetQuery = () => { Object.assign(query, { page:1, pageSize:20, order_no:'', contract_no:'', project_name:'', customer_name:'', status:'', only_requestable: false }); loadData() }

const openDialog = (row = null) => {
  editId.value = row?.id || null
  Object.assign(form, { date:'', contract_id:'', contract_no:'', project_name:'', customer_name:'', customer_id:'', total:0, settlement_fee:0, performance_fee:0, manager: row?.manager || auth.user?.name || '', salesman: row?.salesman || auth.user?.name || '', report_date:'', report_no:'', status:'待处理', remark:'', dept_id:'', dept_name:'', company_id:'', company_name:'', bank_account_id:'', bank_account_name:'' })
  orderItems.value = []
  if (row) {
    if (row.is_dirty && row.dirty_reason) {
      ElMessage.warning(row.dirty_reason)
    }
    Object.assign(form, row)
    form.contract_id = row.contract_id ? Number(row.contract_id) : ''
    form.dept_id = row.dept_id ? Number(row.dept_id) : ''
    form.company_id = row.company_id ? Number(row.company_id) : ''
    // 解析订单明细（如果有）
    if (row.items && Array.isArray(row.items)) {
      orderItems.value = row.items.map(item => ({
        ...item,
        business_id: item.business_id ? Number(item.business_id) : '',
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        total: Number(item.total) || 0,
        settlement_unit_price: Number(item.settlement_unit_price) || 0,
        settlement_fee: Number(item.settlement_fee) || 0,
        performance_unit_price: Number(item.performance_unit_price) || 0,
        performance_fee: Number(item.performance_fee) || 0
      }))
      calcSummary()
    } else if (row.business_id) {
      // 兼容旧数据：单业务转成明细行
      orderItems.value = [{
        business_id: Number(row.business_id) || '',
        business_category: row.business_category || '',
        business_project: '',
        parameter: '',
        quantity: Number(row.quantity) || 1,
        unit_price: Number(row.unit_price) || 0,
        total: Number(row.total) || 0,
        settlement_unit_price: Number(row.settlement_unit_price) || 0,
        settlement_fee: Number(row.settlement_fee) || 0,
        performance_unit_price: Number(row.performance_unit_price) || 0,
        performance_fee: Number(row.performance_fee) || 0
      }]
      calcSummary()
    }
  }
  dialogVisible.value = true
}

const onContractChange = (id) => {
  if (!id) { form.contract_no = ''; form.manager = ''; form.salesman = ''; return }
  const c = contracts.value.find(x => x.id === id)
  if (c) {
    form.contract_no = c.contract_no
    form.project_name = form.project_name || c.name
    form.customer_name = form.customer_name || c.customer_name
    form.customer_id = c.customer_id || ''
    form.dept_id = c.dept_id
    form.dept_name = c.dept_name
    form.company_id = c.company_id
    form.company_name = c.company_name
    form.bank_account_id = c.bank_account_id || ''
    form.bank_account_name = c.bank_account_name || ''
    form.manager = c.manager || ''
    form.salesman = c.salesman || ''
  }
}

// 添加明细行
const addItem = () => {
  orderItems.value.push({
    business_id: '', business_category: '', business_project: '', parameter: '',
    quantity: 1, unit_price: 0, total: 0, 
    settlement_unit_price: 0, settlement_fee: 0, 
    performance_unit_price: 0, performance_fee: 0
  })
}

// 删除明细行
const removeItem = (idx) => {
  orderItems.value.splice(idx, 1)
  calcSummary()
}

// 选择业务类别时
const onItemCategoryChange = (row) => {
  row.business_id = ''
  row.business_project = ''
}

// 选择业务项目时自动填充单价等
const onItemBusinessChange = (row) => {
  const b = businessItems.value.find(x => x.id === row.business_id)
  if (b) {
    row.business_category = b.category
    row.business_project = b.project
    row.parameter = b.parameter || ''
    row.unit_price = Number(b.unit_price) || 0
    // 保存单价，稍后在 calcItemTotal 中乘以数量
    row.settlement_unit_price = Number(b.settlement_fee) || 0
    row.performance_unit_price = Number(b.performance_fee) || 0
    calcItemTotal(row)
  }
}

// 计算单行金额
const calcItemTotal = (row) => {
  const qty = row.quantity || 0
  row.total = qty * (row.unit_price || 0)
  row.settlement_fee = qty * (row.settlement_unit_price || 0)
  row.performance_fee = qty * (row.performance_unit_price || 0)
  calcSummary()
}

// 计算合计
const calcSummary = () => {
  form.total = orderItems.value.reduce((sum, r) => sum + (Number(r.total) || 0), 0)
  form.settlement_fee = orderItems.value.reduce((sum, r) => sum + (Number(r.settlement_fee) || 0), 0)
  form.performance_fee = orderItems.value.reduce((sum, r) => sum + (Number(r.performance_fee) || 0), 0)
}

const handleSave = async () => {
  await formRef.value.validate()
  if (orderItems.value.length === 0) return ElMessage.warning('请至少添加一项业务明细')
  saving.value = true
  try {
    // 整数字段空字符串转 null
    const toInteger = (v) => (v === '' || v == null) ? null : Number(v)
    const formData = {
      ...form,
      dept_id: toInteger(form.dept_id),
      company_id: toInteger(form.company_id),
      contract_id: toInteger(form.contract_id),
      customer_id: toInteger(form.customer_id),
      bank_account_id: toInteger(form.bank_account_id),
      items: orderItems.value.map(item => ({
        ...item,
        business_id: toInteger(item.business_id)
      }))
    }
    if (!formData.date || formData.date === 'Invalid date') delete formData.date
    if (!formData.report_date || formData.report_date === 'Invalid date') delete formData.report_date
    const res = editId.value ? await orderApi.update(editId.value, formData) : await orderApi.create(formData)
    if (res.success) { ElMessage.success(res.message); dialogVisible.value = false; loadData() }
  } finally { saving.value = false }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除订单「${row.order_no}」吗？`, '警告', { type:'warning' }).then(async () => {
    try {
      const res = await orderApi.delete(row.id)
      if (res.success) { ElMessage.success('删除成功'); loadData() }
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '删除失败')
    }
  })
}

const handleCreatePaymentBatch = async (row) => {
  if (!canCreatePaymentRequest(row)) {
    return ElMessage.warning('只有已完成且仍有未请款金额的订单才能加入请款批次')
  }

  try {
    await ElMessageBox.confirm(
      `确定为订单「${row.order_no}」生成请款批次吗？系统会按剩余可请款金额生成一条请款明细。`,
      '生成请款批次',
      { type: 'info' }
    )
  } catch {
    return
  }

  try {
    const res = await paymentRequestBatchApi.createFromOrders({
      order_ids: [row.id],
      date: row.report_date || row.date || new Date().toISOString().slice(0, 10),
      remark: `由订单 ${row.order_no} 直接发起`
    })
    if (res.success) {
      ElMessage.success(res.message || '请款批次生成成功')
      loadData()
      router.push('/payment-request-batches')
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '生成请款批次失败')
  }
}

const handleBatchCreatePaymentRequest = async () => {
  const selectedRows = getSelectedOrderRows()
  const requestableOrders = selectedRows.filter(canCreatePaymentRequest)
  if (selectedRows.length === 0) {
    return ElMessage.warning('请先勾选订单后再批量请款')
  }
  if (requestableOrders.length === 0) {
    return ElMessage.warning(`已选择 ${selectedRows.length} 条订单，但都不是可请款订单，请选择“已完成且仍有未请款金额”的订单`)
  }

  try {
    await ElMessageBox.confirm(
      `确定将选中的 ${requestableOrders.length} 条订单生成同一请款批次吗？系统会按每条订单剩余可请款金额生成请款明细。`,
      '批量生成请款批次',
      { type: 'info' }
    )
  } catch {
    return
  }

  try {
    const res = await paymentRequestBatchApi.createFromOrders({
      order_ids: requestableOrders.map(item => item.id),
      date: new Date().toISOString().slice(0, 10),
      remark: `订单列表批量生成，共 ${requestableOrders.length} 条`
    })
    if (res.success) {
      ElMessage.success(res.message || '请款批次生成成功')
      selectedOrders.value = []
      tableRef.value?.clearSelection?.()
      loadData()
      router.push('/payment-request-batches')
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '生成请款批次失败')
  }
}

const handleResolveDirty = async (row) => {
  try {
    await ElMessageBox.confirm(
      row.dirty_reason || '确定在完成人工核对后清除该订单的差异标记吗？',
      '清除差异标记',
      { type: 'warning' }
    )
  } catch {
    return
  }

  try {
    const res = await orderApi.resolveDirty(row.id)
    if (res.success) {
      ElMessage.success(res.message || '差异标记已清除')
      loadData()
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '清除差异失败')
  }
}

// 快速修改状态
const handleStatusChange = async (row) => {
  try {
    await orderApi.update(row.id, { status: row.status })
    ElMessage.success('状态已更新')
  } catch (e) {
    ElMessage.error('更新状态失败')
    loadData()
  }
}

// 多选处理
const onSelectionChange = (rows) => { selectedOrders.value = rows }

const handleBatchStatusChange = async () => {
  if (!batchTargetStatus.value) {
    ElMessage.warning('请选择目标状态')
    return
  }
  
  batchStatusLoading.value = true
  try {
    const ids = selectedOrders.value.map(o => o.id)
    const res = await orderApi.batchUpdateStatus(ids, batchTargetStatus.value)
    
    if (res.success) {
      const data = res.data || {}
      const msg = res.message || data.message || `成功更新 ${data.updatedCount || 0} 条订单状态`
      
      if (data.failedItems && data.failedItems.length > 0) {
        const failedMsg = data.failedItems.map(f => `${f.order_no}: ${f.reason}`).join('\n')
        ElMessageBox.alert(failedMsg, '部分订单变更失败', { type: 'warning' })
      } else {
        ElMessage.success(msg)
      }
      
      showBatchStatusDialog.value = false
      batchTargetStatus.value = ''
      selectedOrders.value = []
      loadData()
    } else {
      ElMessage.error(res.message || '状态更新失败')
    }
  } catch (e) {
    ElMessage.error('请求失败')
  } finally {
    batchStatusLoading.value = false
  }
}

const batchDeleteOrders = async () => {
  if (selectedOrders.value.length === 0) return
  try { await ElMessageBox.confirm(`确定删除选中的 ${selectedOrders.value.length} 个订单吗？`, '批量删除', { type: 'warning' }) } catch { return }
  try {
    let ok = 0
    for (const row of selectedOrders.value) { try { const r = await orderApi.delete(row.id); if (r.success) ok++ } catch {} }
    ElMessage.success(`成功删除 ${ok} 个订单`)
    selectedOrders.value = []
    loadData()
  } catch (e) { ElMessage.error('删除失败') }
}

// 批量生成绩效/财务
const batchGenerate = async (type) => {
  const ids = selectedOrders.value.map(o => o.id)
  if (ids.length === 0) return ElMessage.warning('请先选择订单')
  
  try {
    await ElMessageBox.confirm(
      `确定将选中的 ${ids.length} 个订单批量生成${type === 'performance' ? '绩效' : '财务'}记录？`,
      '批量生成', { type: 'info' }
    )
  } catch { return } // 取消

  const data = { order_ids: ids, overwrite: false }
  try {
    let res
    if (type === 'performance') {
      res = await performanceApi.autoFromOrders(data)
    } else {
      res = await financeApi.autoFromOrders(data)
    }
    if (res.success) {
      const processed = res.data?.processed || 0
      const skipped = res.data?.skipped || 0
      if (processed > 0) {
        ElMessage.success(res.message || `成功生成 ${processed} 条${type === 'performance' ? '绩效' : '财务'}记录`)
      } else if (skipped > 0) {
        ElMessage.warning(res.message || `全部跳过，未能生成${type === 'performance' ? '绩效' : '财务'}记录`)
      } else {
        ElMessage.info(res.message || '未找到符合条件的订单')
      }
      loadData()
      selectedOrders.value = []
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '生成失败')
  }
}

// 批量取消标识
const batchCancelFlag = async () => {
  const ids = selectedOrders.value.map(o => o.id)
  if (ids.length === 0) return ElMessage.warning('请先选择订单')
  
  const hasPerf = selectedOrders.value.some(o => o.perf_generated)
  const hasFinance = selectedOrders.value.some(o => o.finance_generated || o.finance_booked)
  
  if (!hasPerf && !hasFinance) return ElMessage.warning('选中的订单没有可取消的标识')
  
  // 选择要取消的标识类型
  let flag = ''
  if (hasPerf && !hasFinance) {
    flag = 'perf'
  } else if (!hasPerf && hasFinance) {
    flag = 'finance'
  } else {
    // 两者都有，让用户选择
    flag = await ElMessageBox.confirm('选中的订单包含绩效和财务标识，请选择要取消的类型：', '选择类型', {
      confirmButtonText: '取消绩效',
      cancelButtonText: '取消财务',
      distinguishCancelAndClose: true
    }).then(() => 'perf').catch(action => action === 'cancel' ? 'finance' : Promise.reject('cancel'))
  }
  
  if (!flag) return
  
  // 询问是否删除关联数据
  let deleteData = false
  try {
    await ElMessageBox.confirm(
      `是否同时删除关联的${flag === 'perf' ? '绩效' : '财务'}数据？`,
      '删除关联数据',
      {
        confirmButtonText: '删除数据',
        cancelButtonText: '仅取消标识',
        type: 'warning',
        distinguishCancelAndClose: true
      }
    )
    deleteData = true
  } catch (action) {
    if (action === 'cancel') deleteData = false
    else return // 关闭弹窗，取消操作
  }
  
  let ok = 0
  for (const row of selectedOrders.value) {
    try {
      const res = await orderApi.cancelFlag(row.id, { flag, delete_data: deleteData })
      if (res.success) ok++
    } catch {}
  }
  ElMessage.success(`成功取消 ${ok} 个订单的标识`)
  selectedOrders.value = []
  loadData()
}

onMounted(async () => {
  loadData()
  const [cr, br, er] = await Promise.all([contractApi.all(), businessApi.all(), employeeApi.all()])
  if (cr.success) contracts.value = cr.data
  if (br.success) {
    businessItems.value = br.data
    businessCategories.value = [...new Set(br.data.map(b => b.category).filter(Boolean))]
  }
  if (er.success) employees.value = er.data
})
</script>

<style scoped>
.page-container { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
.batch-card { flex-shrink: 0; }
.batch-bar { display: flex; justify-content: space-between; align-items: center; min-height: 32px; }
.batch-tip { font-size: 14px; color: #409eff; }
.batch-tip strong { font-size: 16px; }
.batch-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.stat-cards { flex-shrink: 0; }
.stat-card { background: #fff; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.stat-label { font-size: 12px; color: #999; margin-bottom: 6px; }
.stat-value { font-size: 20px; font-weight: 700; color: #333; }
.stat-value.primary { color: #409eff; }
.stat-value.success { color: #52c41a; }
.stat-value.warning { color: #fa8c16; }
.table-card { flex: 1; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
.text-muted { color: #999; }
.money { color: #409eff; font-weight: 600; }
.money-stack { display: flex; flex-direction: column; gap: 2px; color: #606266; font-size: 12px; }
.items-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.items-summary { display: flex; gap: 20px; font-size: 14px; }
.items-summary b { color: #409eff; }
.business-items { display: flex; flex-wrap: wrap; gap: 4px; }
.item-tag { background: #ecf5ff; color: #409eff; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
.item-more { color: #909399; font-size: 12px; }
</style>
