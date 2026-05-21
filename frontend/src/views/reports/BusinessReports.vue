<template>
  <div class="business-reports">
    <el-card class="filter-card">
      <template #header>
        <span>业务报表筛选</span>
      </template>
      <el-form :inline="true">
        <el-form-item label="公司">
          <el-select v-model="filters.companyId" placeholder="选择公司" clearable>
            <el-option v-for="c in companies" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="filters.deptId" placeholder="选择部门" clearable>
            <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span>部门业绩统计</span>
          </template>
          <div ref="deptPerformanceRef" style="height: 400px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span>项目制统计</span>
          </template>
          <div ref="projectStatsRef" style="height: 400px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>部门业绩明细</span>
          <el-radio-group v-model="viewType" size="small">
            <el-radio-button label="table">表格</el-radio-button>
            <el-radio-button label="chart">图表</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <el-table :data="deptPerformance.departments" stripe v-loading="loading">
        <el-table-column prop="dept_name" label="部门名称" />
        <el-table-column prop="company_name" label="所属公司" />
        <el-table-column label="订单" width="150">
          <template #default="{ row }">
            {{ row.orders.count }}单 / ¥{{ formatMoney(row.orders.amount) }}
          </template>
        </el-table-column>
        <el-table-column label="合同" width="150">
          <template #default="{ row }">
            {{ row.contracts.count }}份 / ¥{{ formatMoney(row.contracts.amount) }}
          </template>
        </el-table-column>
        <el-table-column label="项目" width="150">
          <template #default="{ row }">
            {{ row.projects.count }}个 / ¥{{ formatMoney(row.projects.budget) }}
          </template>
        </el-table-column>
        <el-table-column label="总业绩" width="150">
          <template #default="{ row }">
            <span style="color: #67C23A; font-weight: bold">¥{{ formatMoney(row.total_performance) }}</span>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top: 20px" v-if="deptPerformance.summary">
        <el-statistic title="总订单数" :value="deptPerformance.summary.total_orders" />
        <el-statistic title="总合同数" :value="deptPerformance.summary.total_contracts" style="margin-left: 40px" />
        <el-statistic title="总项目数" :value="deptPerformance.summary.total_projects" style="margin-left: 40px" />
        <el-statistic 
          title="总业绩" 
          :value="deptPerformance.summary.total_performance" 
          :formatter="(v) => '¥' + formatMoney(v)"
          style="margin-left: 40px" 
        />
      </div>
    </el-card>

    <el-card class="project-card">
      <template #header>
        <span>项目维度统计</span>
      </template>
      <el-tabs>
        <el-tab-pane label="按公司">
          <el-table :data="projectStatsByCompany" stripe>
            <el-table-column prop="name" label="公司" />
            <el-table-column prop="count" label="项目数" width="100" />
            <el-table-column label="预算总额" width="150">
              <template #default="{ row }">
                ¥{{ formatMoney(row.budget) }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="按部门">
          <el-table :data="projectStatsByDept" stripe>
            <el-table-column prop="name" label="部门" />
            <el-table-column prop="company" label="所属公司" width="120" />
            <el-table-column prop="count" label="项目数" width="100" />
            <el-table-column label="预算总额" width="150">
              <template #default="{ row }">
                ¥{{ formatMoney(row.budget) }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="按员工">
          <el-table :data="projectStatsByEmployee" stripe max-height="400">
            <el-table-column prop="name" label="员工" />
            <el-table-column prop="dept" label="所属部门" width="120" />
            <el-table-column prop="count" label="项目数" width="100" />
            <el-table-column label="预算总额" width="150">
              <template #default="{ row }">
                ¥{{ formatMoney(row.budget) }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import * as echarts from 'echarts'

const filters = reactive({
  companyId: null,
  deptId: null
})

const dateRange = ref([])
const viewType = ref('table')
const loading = ref(false)

const companies = ref([])
const departments = ref([])
const deptPerformance = ref({ departments: [], summary: null })
const projectStats = ref(null)

const deptPerformanceRef = ref(null)
const projectStatsRef = ref(null)
let deptPerformanceChart = null
let projectStatsChart = null

const projectStatsByCompany = computed(() => {
  if (!projectStats.value?.byCompany) return []
  return Object.entries(projectStats.value.byCompany).map(([name, data]) => ({
    name,
    ...data
  }))
})

const projectStatsByDept = computed(() => {
  if (!projectStats.value?.byDept) return []
  return Object.entries(projectStats.value.byDept).map(([name, data]) => ({
    name,
    ...data
  }))
})

const projectStatsByEmployee = computed(() => {
  if (!projectStats.value?.byEmployee) return []
  return Object.entries(projectStats.value.byEmployee).map(([name, data]) => ({
    name,
    ...data
  }))
})

const loadCompanies = async () => {
  try {
    const res = await request.get('/companies')
    if (res.data.success) {
      companies.value = res.data.data || []
    }
  } catch (error) {
    console.error('加载公司失败:', error)
  }
}

const loadDepartments = async () => {
  try {
    const res = await request.get('/departments')
    if (res.data.success) {
      departments.value = res.data.data || []
    }
  } catch (error) {
    console.error('加载部门失败:', error)
  }
}

const loadDeptPerformance = async () => {
  loading.value = true
  try {
    const params = {}
    if (filters.companyId) params.companyId = filters.companyId
    if (filters.deptId) params.deptIds = filters.deptId
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    const res = await request.get('/reports/business/dept-performance', { params })
    if (res.data.success) {
      deptPerformance.value = res.data.data
      nextTick(() => {
        renderDeptPerformanceChart()
      })
    }
  } catch (error) {
    ElMessage.error('加载部门业绩失败')
  } finally {
    loading.value = false
  }
}

const loadProjectStats = async () => {
  try {
    const params = {}
    if (filters.companyId) params.companyId = filters.companyId
    if (filters.deptId) params.deptId = filters.deptId
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    const res = await request.get('/reports/business/project-statistics', { params })
    if (res.data.success) {
      projectStats.value = res.data.data
      nextTick(() => {
        renderProjectStatsChart()
      })
    }
  } catch (error) {
    ElMessage.error('加载项目统计失败')
  }
}

const loadData = () => {
  loadDeptPerformance()
  loadProjectStats()
}

const renderDeptPerformanceChart = () => {
  if (!deptPerformanceRef.value) return
  
  if (!deptPerformanceChart) {
    deptPerformanceChart = echarts.init(deptPerformanceRef.value)
  }

  const data = deptPerformance.value.departments || []
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['订单金额', '合同金额', '项目预算']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.dept_name)
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '¥{value}'
      }
    },
    series: [
      {
        name: '订单金额',
        type: 'bar',
        data: data.map(d => d.orders.amount)
      },
      {
        name: '合同金额',
        type: 'bar',
        data: data.map(d => d.contracts.amount)
      },
      {
        name: '项目预算',
        type: 'bar',
        data: data.map(d => d.projects.budget)
      }
    ]
  }

  deptPerformanceChart.setOption(option)
}

const renderProjectStatsChart = () => {
  if (!projectStatsRef.value || !projectStats.value) return
  
  if (!projectStatsChart) {
    projectStatsChart = echarts.init(projectStatsRef.value)
  }

  const companyData = projectStatsByCompany.value
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c}'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '项目预算',
        type: 'pie',
        radius: '50%',
        data: companyData.map(d => ({
          name: d.name,
          value: d.budget
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }

  projectStatsChart.setOption(option)
}

const formatMoney = (value) => {
  return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

onMounted(() => {
  loadCompanies()
  loadDepartments()
  loadData()
})
</script>

<style scoped>
.business-reports {
  padding: 20px;
}

.filter-card {
  margin-bottom: 20px;
}

.chart-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-card {
  margin-bottom: 20px;
}

.project-card {
  margin-bottom: 20px;
}
</style>
