<template>
  <div class="enhanced-table">
    <el-table
      ref="tableRef"
      :data="data"
      :border="border"
      :stripe="stripe"
      :height="height"
      :max-height="maxHeight"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
      v-loading="loading"
      class="data-table"
    >
      <slot></slot>
    </el-table>

    <div v-if="showPagination" class="pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="pageSizes"
        :total="total"
        :layout="paginationLayout"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <div v-if="showConfig" class="config-panel">
      <el-button size="small" @click="saveConfig" :loading="saving">
        <el-icon><Check /></el-icon>
        保存配置
      </el-button>
      <el-button size="small" @click="resetConfig">
        <el-icon><RefreshRight /></el-icon>
        重置默认
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, RefreshRight } from '@element-plus/icons-vue'
import request from '@/utils/request'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  total: {
    type: Number,
    default: 0
  },
  page: {
    type: Number,
    default: 1
  },
  size: {
    type: Number,
    default: 20
  },
  loading: {
    type: Boolean,
    default: false
  },
  border: {
    type: Boolean,
    default: true
  },
  stripe: {
    type: Boolean,
    default: true
  },
  height: {
    type: [String, Number],
    default: undefined
  },
  maxHeight: {
    type: [String, Number],
    default: undefined
  },
  showPagination: {
    type: Boolean,
    default: true
  },
  showConfig: {
    type: Boolean,
    default: false
  },
  formId: {
    type: String,
    default: ''
  },
  pageSizes: {
    type: Array,
    default: () => [10, 20, 50, 100]
  },
  paginationLayout: {
    type: String,
    default: 'total, sizes, prev, pager, next, jumper'
  }
})

const emit = defineEmits([
  'update:page',
  'update:size',
  'selection-change',
  'sort-change',
  'page-change',
  'size-change'
])

const tableRef = ref(null)
const currentPage = ref(props.page)
const pageSize = ref(props.size)
const saving = ref(false)
const configLoaded = ref(false)

watch(() => props.page, (val) => {
  currentPage.value = val
})

watch(() => props.size, (val) => {
  pageSize.value = val
})

const handleSelectionChange = (selection) => {
  emit('selection-change', selection)
}

const handleSortChange = ({ prop, order }) => {
  emit('sort-change', { prop, order })
}

const handleSizeChange = (size) => {
  emit('update:size', size)
  emit('size-change', size)
  emit('page-change', { page: currentPage.value, size })
}

const handleCurrentChange = (page) => {
  emit('update:page', page)
  emit('page-change', { page, size: pageSize.value })
}

const saveConfig = async () => {
  if (!props.formId) {
    ElMessage.warning('未配置表单ID')
    return
  }

  saving.value = true
  try {
    const columns = tableRef.value?.columns || []
    const columnWidths = {}
    
    columns.forEach(col => {
      if (col.property && col.width) {
        columnWidths[col.property] = col.width
      }
    })

    await request.post('/api/user-config', {
      formId: props.formId,
      config: {
        columnWidths,
        sortConfig: []
      }
    })

    ElMessage.success('配置保存成功')
  } catch (error) {
    ElMessage.error('配置保存失败')
  } finally {
    saving.value = false
  }
}

const resetConfig = async () => {
  if (!props.formId) {
    ElMessage.warning('未配置表单ID')
    return
  }

  try {
    await request.delete(`/api/user-config/${props.formId}`)
    ElMessage.success('配置已重置')
    
    setTimeout(() => {
      window.location.reload()
    }, 500)
  } catch (error) {
    ElMessage.error('配置重置失败')
  }
}

const loadConfig = async () => {
  if (!props.formId || configLoaded.value) {
    return
  }

  try {
    const res = await request.get(`/api/user-config/${props.formId}`)
    if (res.success && res.data?.config?.columnWidths) {
      const { columnWidths } = res.data.config
      
      setTimeout(() => {
        const columns = tableRef.value?.columns || []
        columns.forEach(col => {
          if (col.property && columnWidths[col.property]) {
            col.width = columnWidths[col.property]
          }
        })
      }, 100)
    }
    configLoaded.value = true
  } catch (error) {
    console.error('加载配置失败:', error)
  }
}

onMounted(() => {
  if (props.showConfig) {
    loadConfig()
  }
})

defineExpose({
  tableRef,
  clearSelection: () => tableRef.value?.clearSelection(),
  toggleRowSelection: (row, selected) => tableRef.value?.toggleRowSelection(row, selected),
  toggleAllSelection: () => tableRef.value?.toggleAllSelection()
})
</script>

<style scoped>
.enhanced-table {
  width: 100%;
}

.data-table {
  width: 100%;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  padding: 0 0 20px 0;
}

.config-panel {
  margin-top: 16px;
  padding: 12px;
  background: var(--color-muted);
  border-radius: var(--radius-md);
  display: flex;
  gap: 12px;
}
</style>
