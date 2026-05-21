<template>
  <div class="sync-management">
    <el-card class="stats-card">
      <template #header>
        <div class="card-header">
          <span>同步任务统计</span>
          <el-button type="primary" size="small" @click="refreshStats">刷新</el-button>
        </div>
      </template>
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">总任务数</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-value running">{{ stats.running }}</div>
            <div class="stat-label">运行中</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-value success">{{ stats.completed }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <div class="stat-value failed">{{ stats.failed }}</div>
            <div class="stat-label">失败</div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="operation-card">
      <template #header>
        <span>批量同步操作</span>
      </template>
      <el-form :model="syncForm" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="同步类型">
              <el-select v-model="syncForm.syncType" placeholder="选择同步类型">
                <el-option label="全部" value="all" />
                <el-option label="员工" value="employee" />
                <el-option label="部门" value="department" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="同步范围">
              <el-select v-model="syncForm.scope" placeholder="选择范围">
                <el-option label="全部" value="all" />
                <el-option label="指定公司" value="company" />
                <el-option label="指定部门" value="department" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="目标ID">
              <el-input v-model="syncForm.targetId" placeholder="公司或部门ID" :disabled="syncForm.scope === 'all'" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item>
          <el-button type="primary" @click="executeBatchSync" :loading="syncing">执行批量同步</el-button>
          <el-button @click="executeIncrementalSync" :loading="incrementalSyncing">执行增量同步</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="tasks-card">
      <template #header>
        <div class="card-header">
          <span>同步任务列表</span>
          <div>
            <el-select v-model="filters.status" placeholder="状态筛选" style="width: 120px; margin-right: 10px" @change="loadTasks">
              <el-option label="全部" value="" />
              <el-option label="运行中" value="running" />
              <el-option label="已完成" value="completed" />
              <el-option label="失败" value="failed" />
            </el-select>
          </div>
        </div>
      </template>
      <el-table :data="tasks" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="task_type" label="任务类型" width="120" />
        <el-table-column prop="sync_type" label="同步类型" width="100" />
        <el-table-column prop="scope" label="范围" width="100" />
        <el-table-column label="进度" width="200">
          <template #default="{ row }">
            <div v-if="row.status === 'running'">
              <el-progress 
                :percentage="row.total_count > 0 ? Math.round((row.processed_count / row.total_count) * 100) : 0"
                :status="row.status === 'failed' ? 'exception' : ''"
              />
              <span style="font-size: 12px; color: #999">{{ row.processed_count }} / {{ row.total_count }}</span>
            </div>
            <div v-else>
              <span>{{ row.processed_count }} / {{ row.total_count }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="success_count" label="成功" width="80" />
        <el-table-column prop="failed_count" label="失败" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="viewTaskDetail(row)">详情</el-button>
            <el-button 
              v-if="row.status === 'running'" 
              type="danger" 
              size="small" 
              link 
              @click="cancelTask(row)"
            >取消</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadTasks"
          @current-change="loadTasks"
        />
      </div>
    </el-card>

    <el-dialog v-model="taskDetailVisible" title="任务详情" width="800px">
      <div v-if="currentTask">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="任务ID">{{ currentTask.id }}</el-descriptions-item>
          <el-descriptions-item label="任务类型">{{ currentTask.task_type }}</el-descriptions-item>
          <el-descriptions-item label="同步类型">{{ currentTask.sync_type }}</el-descriptions-item>
          <el-descriptions-item label="范围">{{ currentTask.scope }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentTask.status)">{{ currentTask.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="总数">{{ currentTask.total_count }}</el-descriptions-item>
          <el-descriptions-item label="已处理">{{ currentTask.processed_count }}</el-descriptions-item>
          <el-descriptions-item label="成功">{{ currentTask.success_count }}</el-descriptions-item>
          <el-descriptions-item label="失败">{{ currentTask.failed_count }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ formatTime(currentTask.start_time) }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ formatTime(currentTask.end_time) }}</el-descriptions-item>
        </el-descriptions>

        <div style="margin-top: 20px">
          <h4>同步日志</h4>
          <el-table :data="currentTask.logs || []" max-height="300" stripe>
            <el-table-column prop="sync_type" label="类型" width="120" />
            <el-table-column prop="target_type" label="目标类型" width="100" />
            <el-table-column prop="target_id" label="目标ID" width="80" />
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
                  {{ row.status === 'success' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="error_message" label="错误信息" show-overflow-tooltip />
            <el-table-column prop="created_at" label="时间" width="150">
              <template #default="{ row }">
                {{ formatTime(row.created_at) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const stats = ref({
  total: 0,
  running: 0,
  completed: 0,
  failed: 0
})

const syncForm = reactive({
  syncType: 'all',
  scope: 'all',
  targetId: ''
})

const tasks = ref([])
const loading = ref(false)
const syncing = ref(false)
const incrementalSyncing = ref(false)

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const filters = reactive({
  status: '',
  syncType: ''
})

const taskDetailVisible = ref(false)
const currentTask = ref(null)

const loadStats = async () => {
  try {
    const res = await request.get('/sync/stats')
    if (res.data.success) {
      stats.value = res.data.data
    }
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

const loadTasks = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filters.status,
      syncType: filters.syncType
    }
    const res = await request.get('/sync/tasks', { params })
    if (res.data.success) {
      tasks.value = res.data.data.tasks
      pagination.total = res.data.data.total
    }
  } catch (error) {
    ElMessage.error('加载任务列表失败')
  } finally {
    loading.value = false
  }
}

const refreshStats = () => {
  loadStats()
  loadTasks()
}

const executeBatchSync = async () => {
  try {
    await ElMessageBox.confirm('确认执行批量同步？这可能需要较长时间。', '确认', {
      type: 'warning'
    })

    syncing.value = true
    const options = {
      syncType: syncForm.syncType,
      scope: syncForm.scope,
      targetIds: syncForm.scope !== 'all' && syncForm.targetId ? [parseInt(syncForm.targetId)] : []
    }

    const res = await request.post('/sync/batch', options)
    if (res.data.success) {
      ElMessage.success('批量同步任务已启动')
      loadTasks()
      loadStats()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '执行失败')
    }
  } finally {
    syncing.value = false
  }
}

const executeIncrementalSync = async () => {
  try {
    incrementalSyncing.value = true
    const res = await request.post('/sync/incremental')
    if (res.data.success) {
      ElMessage.success(`增量同步完成，共同步 ${res.data.data.syncedCount} 条数据`)
      loadTasks()
      loadStats()
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '增量同步失败')
  } finally {
    incrementalSyncing.value = false
  }
}

const viewTaskDetail = async (task) => {
  try {
    const res = await request.get(`/sync/tasks/${task.id}`)
    if (res.data.success) {
      currentTask.value = res.data.data
      taskDetailVisible.value = true
    }
  } catch (error) {
    ElMessage.error('加载任务详情失败')
  }
}

const cancelTask = async (task) => {
  try {
    await ElMessageBox.confirm('确认取消该任务？', '确认', { type: 'warning' })
    const res = await request.post(`/sync/tasks/${task.id}/cancel`)
    if (res.data.success) {
      ElMessage.success('任务已取消')
      loadTasks()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('取消任务失败')
    }
  }
}

const getStatusType = (status) => {
  const map = {
    running: 'primary',
    completed: 'success',
    failed: 'danger',
    cancelled: 'info'
  }
  return map[status] || 'info'
}

const formatTime = (time) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

onMounted(() => {
  loadStats()
  loadTasks()
})
</script>

<style scoped>
.sync-management {
  padding: 20px;
}

.stats-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-item {
  text-align: center;
  padding: 10px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #409EFF;
}

.stat-value.running {
  color: #E6A23C;
}

.stat-value.success {
  color: #67C23A;
}

.stat-value.failed {
  color: #F56C6C;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.operation-card {
  margin-bottom: 20px;
}

.tasks-card {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
