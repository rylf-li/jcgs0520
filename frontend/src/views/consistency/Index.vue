<template>
  <div class="consistency-check">
    <el-card class="check-card">
      <template #header>
        <div class="card-header">
          <span>数据一致性检测</span>
          <div>
            <el-button type="primary" @click="checkAll" :loading="checking">检测全部</el-button>
            <el-button type="success" @click="autoFix(true)" :loading="fixing">预览修复</el-button>
            <el-button type="warning" @click="autoFix(false)" :loading="fixing">执行修复</el-button>
          </div>
        </div>
      </template>
      
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="部门数据" name="department">
          <el-button type="primary" size="small" @click="checkDepartment" :loading="checking">检测部门一致性</el-button>
        </el-tab-pane>
        <el-tab-pane label="员工数据" name="employee">
          <el-button type="primary" size="small" @click="checkEmployee" :loading="checking">检测员工一致性</el-button>
        </el-tab-pane>
        <el-tab-pane label="业务数据" name="business">
          <el-select v-model="businessType" placeholder="选择业务类型" style="width: 150px; margin-right: 10px">
            <el-option label="全部" value="all" />
            <el-option label="订单" value="order" />
            <el-option label="合同" value="contract" />
            <el-option label="项目" value="project" />
          </el-select>
          <el-button type="primary" size="small" @click="checkBusiness" :loading="checking">检测业务数据一致性</el-button>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-card class="summary-card" v-if="summary">
      <template #header>
        <span>检测结果汇总</span>
      </template>
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-value">{{ summary.totalChecked }}</div>
            <div class="stat-label">检测总数</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-value" :class="{ danger: summary.totalInconsistent > 0 }">{{ summary.totalInconsistent }}</div>
            <div class="stat-label">不一致数</div>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="stat-item">
            <div class="detail-stats">
              <span>部门: {{ summary.byType?.departments?.inconsistent || 0 }}</span>
              <span>员工: {{ summary.byType?.employees?.inconsistent || 0 }}</span>
              <span>订单: {{ summary.byType?.orders?.inconsistent || 0 }}</span>
              <span>合同: {{ summary.byType?.contracts?.inconsistent || 0 }}</span>
              <span>项目: {{ summary.byType?.projects?.inconsistent || 0 }}</span>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="result-card">
      <template #header>
        <div class="card-header">
          <span>不一致数据列表</span>
          <el-button v-if="inconsistencies.length > 0" type="primary" size="small" @click="previewFix">生成修复方案</el-button>
        </div>
      </template>
      
      <el-table :data="inconsistencies" v-loading="loading" stripe max-height="500">
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag>{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="名称" width="150" show-overflow-tooltip />
        <el-table-column label="问题详情">
          <template #default="{ row }">
            <div v-for="(issue, index) in row.issues" :key="index" class="issue-item">
              <el-icon color="#F56C6C"><Warning /></el-icon>
              <span>{{ issue.message }}</span>
              <span class="issue-detail">
                ({{ issue.field }}: "{{ issue.current }}" → "{{ issue.expected }}")
              </span>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="fixPreviewVisible" title="修复预览" width="900px">
      <el-table :data="fixSuggestions" max-height="400" stripe>
        <el-table-column prop="type" label="类型" width="80" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="field" label="字段" width="120" />
        <el-table-column label="当前值" width="150">
          <template #default="{ row }">
            <span class="old-value">{{ row.currentValue }}</span>
          </template>
        </el-table-column>
        <el-table-column label="修复值" width="150">
          <template #default="{ row }">
            <span class="new-value">{{ row.expectedValue }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" show-overflow-tooltip />
      </el-table>
      <template #footer>
        <el-button @click="fixPreviewVisible = false">取消</el-button>
        <el-button type="primary" @click="executeFix" :loading="executingFix">执行修复</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'
import request from '@/utils/request'

const activeTab = ref('department')
const businessType = ref('all')
const checking = ref(false)
const fixing = ref(false)
const loading = ref(false)
const executingFix = ref(false)

const summary = ref(null)
const inconsistencies = ref([])
const fixSuggestions = ref([])
const fixPreviewVisible = ref(false)

const checkAll = async () => {
  checking.value = true
  try {
    const res = await request.get('/consistency/check/all')
    if (res.data.success) {
      summary.value = {
        totalChecked: res.data.data.summary.departments.checked + 
                      res.data.data.summary.employees.checked +
                      res.data.data.summary.orders.checked +
                      res.data.data.summary.contracts.checked +
                      res.data.data.summary.projects.checked,
        totalInconsistent: res.data.data.totalInconsistent,
        byType: res.data.data.summary
      }
      inconsistencies.value = res.data.data.inconsistencies
      ElMessage.success(`检测完成，发现 ${res.data.data.totalInconsistent} 条不一致数据`)
    }
  } catch (error) {
    ElMessage.error('检测失败')
  } finally {
    checking.value = false
  }
}

const checkDepartment = async () => {
  checking.value = true
  try {
    const res = await request.get('/consistency/check/department')
    if (res.data.success) {
      inconsistencies.value = res.data.data.inconsistencies
      ElMessage.success(`检测完成，发现 ${res.data.data.inconsistent} 条不一致数据`)
    }
  } catch (error) {
    ElMessage.error('检测失败')
  } finally {
    checking.value = false
  }
}

const checkEmployee = async () => {
  checking.value = true
  try {
    const res = await request.get('/consistency/check/employee')
    if (res.data.success) {
      inconsistencies.value = res.data.data.inconsistencies
      ElMessage.success(`检测完成，发现 ${res.data.data.inconsistent} 条不一致数据`)
    }
  } catch (error) {
    ElMessage.error('检测失败')
  } finally {
    checking.value = false
  }
}

const checkBusiness = async () => {
  checking.value = true
  try {
    const res = await request.get('/consistency/check/business', {
      params: { type: businessType.value }
    })
    if (res.data.success) {
      inconsistencies.value = res.data.data.inconsistencies
      ElMessage.success(`检测完成，发现 ${res.data.data.inconsistent} 条不一致数据`)
    }
  } catch (error) {
    ElMessage.error('检测失败')
  } finally {
    checking.value = false
  }
}

const handleTabChange = (tab) => {
  inconsistencies.value = []
}

const autoFix = async (dryRun) => {
  try {
    if (!dryRun) {
      await ElMessageBox.confirm('确认执行自动修复？这将直接修改数据库。', '确认', {
        type: 'warning'
      })
    }

    fixing.value = true
    const res = await request.post('/consistency/auto-fix', { dryRun })
    if (res.data.success) {
      const data = res.data.data
      if (dryRun) {
        ElMessage.success(`预览完成，共 ${data.fixes} 条需要修复`)
        fixSuggestions.value = data.result.results
        fixPreviewVisible.value = true
      } else {
        ElMessage.success(`修复完成，成功 ${data.result.success} 条，失败 ${data.result.failed} 条`)
        checkAll()
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '操作失败')
    }
  } finally {
    fixing.value = false
  }
}

const previewFix = async () => {
  if (inconsistencies.value.length === 0) {
    ElMessage.warning('没有需要修复的数据')
    return
  }

  try {
    const res = await request.post('/consistency/fix/preview', {
      inconsistencies: inconsistencies.value
    })
    if (res.data.success) {
      fixSuggestions.value = res.data.data.suggestions
      fixPreviewVisible.value = true
    }
  } catch (error) {
    ElMessage.error('生成修复方案失败')
  }
}

const executeFix = async () => {
  try {
    await ElMessageBox.confirm('确认执行修复？', '确认', { type: 'warning' })
    
    executingFix.value = true
    const res = await request.post('/consistency/fix/execute', {
      fixItems: fixSuggestions.value
    })
    if (res.data.success) {
      ElMessage.success(`修复完成，成功 ${res.data.data.success} 条，失败 ${res.data.data.failed} 条`)
      fixPreviewVisible.value = false
      checkAll()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('执行修复失败')
    }
  } finally {
    executingFix.value = false
  }
}

const loadSummary = async () => {
  try {
    const res = await request.get('/consistency/summary')
    if (res.data.success) {
      summary.value = res.data.data
    }
  } catch (error) {
    console.error('加载汇总失败:', error)
  }
}

onMounted(() => {
  loadSummary()
})
</script>

<style scoped>
.consistency-check {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.check-card {
  margin-bottom: 20px;
}

.summary-card {
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
  padding: 10px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #67C23A;
}

.stat-value.danger {
  color: #F56C6C;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.detail-stats {
  display: flex;
  gap: 15px;
  justify-content: center;
  color: #606266;
}

.result-card {
  margin-bottom: 20px;
}

.issue-item {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 5px;
}

.issue-detail {
  color: #909399;
  font-size: 12px;
}

.old-value {
  color: #F56C6C;
  text-decoration: line-through;
}

.new-value {
  color: #67C23A;
  font-weight: bold;
}
</style>
