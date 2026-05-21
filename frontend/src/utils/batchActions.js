// 批量操作 mixin - 在需要的页面引入即可
import { ElMessage, ElMessageBox } from 'element-plus'

export function useBatchActions(apiName, apiMethods) {
  const selectedRows = ref([])
  const batchLoading = ref(false)

  const onSelectionChange = (rows) => {
    selectedRows.value = rows
  }

  const batchDelete = async (extraMsg = '') => {
    if (selectedRows.value.length === 0) return ElMessage.warning('请先选择数据')
    const count = selectedRows.value.length
    try {
      await ElMessageBox.confirm(`确定删除选中的 ${count} 条记录吗？${extraMsg}`, '批量删除', { type: 'warning' })
    } catch { return }

    batchLoading.value = true
    try {
      const ids = selectedRows.value.map(r => r.id)
      // 逐个删除（兼容不支持批量删除的API）
      let successCount = 0
      for (const id of ids) {
        try {
          const res = await apiMethods.delete(id)
          if (res.success) successCount++
        } catch (e) {}
      }
      ElMessage.success(`成功删除 ${successCount} 条记录`)
      selectedRows.value = []
      return successCount
    } finally { batchLoading.value = false }
  }

  const clearSelection = () => {
    selectedRows.value = []
  }

  return { selectedRows, batchLoading, onSelectionChange, batchDelete, clearSelection }
}
