<template>
  <div class="hr-reports">
    <el-card class="filter-card">
      <template #header>
        <span>人事报表筛选</span>
      </template>
      <el-form :inline="true">
        <el-form-item label="公司">
          <el-select v-model="filters.companyId" placeholder="选择公司" clearable @change="loadData">
            <el-option v-for="c in companies" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
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
            <span>部门人员分布</span>
          </template>
          <div ref="deptChartRef" style="height: 400px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span>公司人员构成</span>
          </template>
          <div v-if="filters.companyId" ref="companyChartRef" style="height: 400px"></div>
          <el-empty v-else description="请选择公司查看人员构成" />
        </el-card>
      </el-col>
    </el-row>

    <el-card class="tree-card">
      <template #header>
        <span>组织架构树</span>
      </template>
      <el-tree
        :data="orgTree"
        :props="{ label: 'label', children: 'children' }"
        node-key="id"
        default-expand-all
        :expand-on-click-node="false"
      >
        <template #default="{ node, data }">
          <span class="tree-node">
            <el-tag v-if="data.type === 'company'" type="primary" size="small">公司</el-tag>
            <el-tag v-else-if="data.type === 'department'" type="success" size="small">部门</el-tag>
            <el-tag v-else type="info" size="small">员工</el-tag>
            <span style="margin-left: 8px">{{ node.label }}</span>
            <span v-if="data.type === 'employee' && data.data.position" style="margin-left: 8px; color: #909399">
              ({{ data.data.position }})
            </span>
          </span>
        </template>
      </el-tree>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <span>部门人员统计表</span>
      </template>
      <el-table :data="deptDistribution.departments" stripe>
        <el-table-column prop="dept_name" label="部门名称" />
        <el-table-column prop="company_name" label="所属公司" />
        <el-table-column prop="total_count" label="总人数" width="100" />
        <el-table-column prop="active_count" label="在职人数" width="100" />
        <el-table-column prop="inactive_count" label="非在职人数" width="120" />
      </el-table>
      <div style="margin-top: 20px" v-if="deptDistribution.summary">
        <el-statistic title="部门总数" :value="deptDistribution.summary.total_departments" />
        <el-statistic title="员工总数" :value="deptDistribution.summary.total_employees" style="margin-left: 40px" />
        <el-statistic title="在职员工" :value="deptDistribution.summary.active_employees" style="margin-left: 40px" />
        <el-statistic title="部门平均人数" :value="deptDistribution.summary.avg_per_dept" style="margin-left: 40px" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import * as echarts from 'echarts'

const filters = reactive({
  companyId: null
})

const companies = ref([])
const deptDistribution = ref({ departments: [], summary: null })
const companyComposition = ref(null)
const orgTree = ref([])

const deptChartRef = ref(null)
const companyChartRef = ref(null)
let deptChart = null
let companyChart = null

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

const loadDeptDistribution = async () => {
  try {
    const params = {}
    if (filters.companyId) {
      params.companyId = filters.companyId
    }
    const res = await request.get('/reports/hr/dept-distribution', { params })
    if (res.data.success) {
      deptDistribution.value = res.data.data
      nextTick(() => {
        renderDeptChart()
      })
    }
  } catch (error) {
    ElMessage.error('加载部门分布失败')
  }
}

const loadCompanyComposition = async () => {
  if (!filters.companyId) {
    companyComposition.value = null
    return
  }
  
  try {
    const res = await request.get('/reports/hr/company-composition', {
      params: { companyId: filters.companyId }
    })
    if (res.data.success) {
      companyComposition.value = res.data.data
      nextTick(() => {
        renderCompanyChart()
      })
    }
  } catch (error) {
    ElMessage.error('加载公司人员构成失败')
  }
}

const loadOrgTree = async () => {
  try {
    const params = {}
    if (filters.companyId) {
      params.companyId = filters.companyId
    }
    const res = await request.get('/reports/hr/org-tree', { params })
    if (res.data.success) {
      orgTree.value = res.data.data
    }
  } catch (error) {
    ElMessage.error('加载组织架构树失败')
  }
}

const loadData = () => {
  loadDeptDistribution()
  loadCompanyComposition()
  loadOrgTree()
}

const renderDeptChart = () => {
  if (!deptChartRef.value) return
  
  if (!deptChart) {
    deptChart = echarts.init(deptChartRef.value)
  }

  const data = deptDistribution.value.departments || []
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '部门人数',
        type: 'pie',
        radius: '50%',
        data: data.map(d => ({
          name: d.dept_name,
          value: d.total_count
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

  deptChart.setOption(option)
}

const renderCompanyChart = () => {
  if (!companyChartRef.value || !companyComposition.value) return
  
  if (!companyChart) {
    companyChart = echarts.init(companyChartRef.value)
  }

  const data = companyComposition.value.composition || []
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}人 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '部门人员',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '20',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: data.map(d => ({
          name: d.dept_name,
          value: d.count
        }))
      }
    ]
  }

  companyChart.setOption(option)
}

onMounted(() => {
  loadCompanies()
  loadData()
})
</script>

<style scoped>
.hr-reports {
  padding: 20px;
}

.filter-card {
  margin-bottom: 20px;
}

.chart-card {
  margin-bottom: 20px;
}

.tree-card {
  margin-bottom: 20px;
}

.tree-node {
  display: flex;
  align-items: center;
}

.table-card {
  margin-bottom: 20px;
}
</style>
