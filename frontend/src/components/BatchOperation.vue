<template>
  <div class="batch-operation">
    <div v-if="selectedCount > 0" class="batch-bar">
      <span class="selected-info">
        已选择 <strong>{{ selectedCount }}</strong> 项
      </span>
      <el-button size="small" @click="$emit('clear-selection')">取消选择</el-button>
      <el-button size="small" @click="selectAll">全选当前页</el-button>
    </div>

    <el-dialog
      v-model="confirmVisible"
      :title="confirmTitle"
      width="500px"
      :before-close="handleCancel"
    >
      <div class="confirm-content">
        <div class="confirm-warning">
          <el-icon size="24" color="#F59E0B"><Warning /></el-icon>
          <span>{{ confirmMessage }}</span>
        </div>
        
        <div v-if="showDetail" class="confirm-detail">
          <div class="detail-header">
            <span>操作明细：</span>
          </div>
          <div class="detail-list">
            <div v-for="item in selectedItems" :key="item.id" class="detail-item">
              <span class="item-label">{{ item.label || item.id }}</span>
              <span v-if="item.extra" class="item-extra">{{ item.extra }}</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="handleCancel">取消</el-button>
        <el-button :type="confirmType" @click="handleConfirm" :loading="operating">
          确认{{ operationText }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="resultVisible"
      title="操作结果"
      width="500px"
    >
      <div class="result-content">
        <div class="result-summary">
          <div class="result-item success">
            <el-icon><CircleCheck /></el-icon>
            <span>成功：{{ result.success }} 条</span>
          </div>
          <div v-if="result.failed > 0" class="result-item failed">
            <el-icon><CircleClose /></el-icon>
            <span>失败：{{ result.failed }} 条</span>
          </div>
        </div>

        <div v-if="result.errors && result.errors.length > 0" class="result-errors">
          <div class="errors-header">失败明细：</div>
          <div v-for="(error, index) in result.errors" :key="index" class="error-item">
            <span class="error-id">ID: {{ error.id }}</span>
            <span class="error-msg">{{ error.message }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button type="primary" @click="resultVisible = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Warning, CircleCheck, CircleClose } from '@element-plus/icons-vue'

const props = defineProps({
  selectedCount: {
    type: Number,
    default: 0
  },
  selectedItems: {
    type: Array,
    default: () => []
  },
  operation: {
    type: String,
    default: 'delete'
  },
  showDetail: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['confirm', 'cancel', 'clear-selection', 'select-all'])

const confirmVisible = ref(false)
const resultVisible = ref(false)
const operating = ref(false)
const result = ref({ success: 0, failed: 0, errors: [] })

const operationConfig = {
  delete: {
    title: '批量删除确认',
    type: 'danger',
    text: '删除',
    getMessage: (count) => `确定要删除选中的 ${count} 条记录吗？此操作不可恢复。`
  },
  update: {
    title: '批量更新确认',
    type: 'warning',
    text: '更新',
    getMessage: (count, target) => `确定要将选中的 ${count} 条记录更新为"${target}"吗？`
  },
  approve: {
    title: '批量审核确认',
    type: 'primary',
    text: '审核',
    getMessage: (count) => `确定要审核选中的 ${count} 条记录吗？`
  },
  reject: {
    title: '批量驳回确认',
    type: 'warning',
    text: '驳回',
    getMessage: (count) => `确定要驳回选中的 ${count} 条记录吗？`
  }
}

const config = computed(() => operationConfig[props.operation] || operationConfig.delete)

const confirmTitle = computed(() => config.value.title)
const confirmType = computed(() => config.value.type)
const operationText = computed(() => config.value.text)
const confirmMessage = computed(() => config.value.getMessage(props.selectedCount))

const showConfirm = () => {
  if (props.selectedCount === 0) {
    return
  }
  confirmVisible.value = true
}

const handleConfirm = async () => {
  operating.value = true
  try {
    const res = await emit('confirm', props.selectedItems)
    
    if (res && typeof res === 'object') {
      result.value = {
        success: res.success || props.selectedCount,
        failed: res.failed || 0,
        errors: res.errors || []
      }
    } else {
      result.value = {
        success: props.selectedCount,
        failed: 0,
        errors: []
      }
    }
    
    confirmVisible.value = false
    resultVisible.value = true
  } catch (error) {
    result.value = {
      success: 0,
      failed: props.selectedCount,
      errors: [{ id: 'all', message: error.message }]
    }
    confirmVisible.value = false
    resultVisible.value = true
  } finally {
    operating.value = false
  }
}

const handleCancel = () => {
  confirmVisible.value = false
  emit('cancel')
}

const selectAll = () => {
  emit('select-all')
}

defineExpose({
  showConfirm
})
</script>

<style scoped>
.batch-operation {
  width: 100%;
}

.batch-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(0, 82, 255, 0.05), rgba(77, 124, 255, 0.05));
  border: 1px solid rgba(0, 82, 255, 0.2);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}

.selected-info {
  color: var(--color-accent);
  font-size: 14px;
}

.selected-info strong {
  font-weight: 700;
  color: var(--color-accent);
}

.confirm-content {
  padding: 20px 0;
}

.confirm-warning {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  color: var(--color-foreground);
}

.confirm-detail {
  margin-top: 20px;
  max-height: 200px;
  overflow-y: auto;
}

.detail-header {
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--color-muted-foreground);
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  padding: 8px 12px;
  background: var(--color-muted);
  border-radius: var(--radius-sm);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-label {
  font-weight: 500;
}

.item-extra {
  font-size: 13px;
  color: var(--color-muted-foreground);
}

.result-content {
  padding: 20px 0;
}

.result-summary {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
}

.result-item.success {
  color: var(--color-success);
}

.result-item.failed {
  color: var(--color-danger);
}

.result-errors {
  margin-top: 16px;
}

.errors-header {
  font-weight: 600;
  margin-bottom: 12px;
}

.error-item {
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  display: flex;
  gap: 12px;
}

.error-id {
  font-weight: 600;
  color: var(--color-danger);
}

.error-msg {
  color: var(--color-muted-foreground);
}
</style>
