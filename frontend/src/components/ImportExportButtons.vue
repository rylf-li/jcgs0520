<template>
  <div class="import-export-buttons">
    <!-- 导入按钮 -->
    <el-button type="primary" :icon="Upload" @click="showImportDialog" :loading="importing">
      导入
    </el-button>
    
    <!-- 导出按钮 -->
    <el-button type="success" :icon="Download" @click="handleExport" :loading="exporting">
      导出
    </el-button>
    
    <!-- 下载模板按钮 -->
    <el-button :icon="Document" @click="handleDownloadTemplate" :loading="downloading">
      下载模板
    </el-button>
    
    <!-- 导入弹窗 -->
    <el-dialog 
      v-model="importDialogVisible" 
      title="导入数据" 
      width="600px"
      :close-on-click-modal="false"
    >
      <div class="import-dialog-content">
        <el-alert 
          type="info" 
          :closable="false"
          style="margin-bottom: 16px"
        >
          <template #title>
            请先下载模板，按模板格式填写数据后上传
          </template>
        </el-alert>
        
        <el-upload
          ref="uploadRef"
          class="upload-area"
          drag
          :auto-upload="false"
          :limit="1"
          :on-change="handleFileChange"
          :on-exceed="handleExceed"
          accept=".xlsx,.xls"
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">
            将文件拖到此处，或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              只能上传 xlsx/xls 文件
            </div>
          </template>
        </el-upload>
        
        <!-- 导入结果 -->
        <div v-if="importResult" class="import-result">
          <el-alert 
            :type="importResult.success ? 'success' : 'error'"
            :closable="false"
          >
            <template #title>
              {{ importResult.success ? '导入完成' : '导入失败' }}
            </template>
            <div v-if="importResult.data">
              <div class="result-stats">
                <span v-if="importResult.data.total !== undefined">共 {{ importResult.data.total }} 条，</span>
                <span v-if="importResult.data.created !== undefined">新增 <b>{{ importResult.data.created }}</b> 条，</span>
                <span v-if="importResult.data.updated !== undefined">更新 <b>{{ importResult.data.updated }}</b> 条</span>
                <span v-if="importResult.data.failed > 0">，失败 <b style="color: #f56c6c">{{ importResult.data.failed }}</b> 条</span>
              </div>
              <div v-if="importResult.data.errors && importResult.data.errors.length > 0" class="error-list">
                <p style="color: #f56c6c; margin-top: 12px; font-weight: bold;">失败原因：</p>
                <div class="error-scroll">
                  <p v-for="(err, idx) in importResult.data.errors" :key="idx" style="color: #f56c6c; font-size: 13px; margin: 4px 0; padding: 4px 8px; background: #fef0f0; border-radius: 4px;">
                    {{ err }}
                  </p>
                </div>
                <!-- 下载失败数据按钮 -->
                <div v-if="importResult.data.failedDataKey" class="failed-download">
                  <el-button 
                    type="warning" 
                    size="small" 
                    :icon="Download" 
                    @click="handleDownloadFailedData(importResult.data.failedDataKey)"
                    :loading="downloadingFailed"
                  >
                    下载失败数据（含原始内容）
                  </el-button>
                  <p style="color: #909399; font-size: 12px; margin-top: 8px;">
                    失败数据包含原始表格内容，修正后可重新导入
                  </p>
                </div>
              </div>
              <!-- 全部成功时显示提示 -->
              <div v-else-if="importResult.success && importResult.data.failed === 0" class="success-tip">
                <el-icon color="#67c23a"><SuccessFilled /></el-icon>
                <span style="margin-left: 8px;">所有数据导入成功！</span>
              </div>
            </div>
          </el-alert>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="importDialogVisible = false">关闭</el-button>
        <el-button 
          type="primary" 
          @click="handleImport" 
          :loading="importing"
          :disabled="!selectedFile"
        >
          确认导入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Download, Document, UploadFilled, SuccessFilled } from '@element-plus/icons-vue'
import { importExportApi } from '@/api'

const props = defineProps({
  // 模块名称，对应后端 MODEL_CONFIG 的 key
  model: {
    type: String,
    required: true
  },
  // 模块中文名，用于提示信息
  modelName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['success'])

// 状态
const importDialogVisible = ref(false)
const importing = ref(false)
const exporting = ref(false)
const downloading = ref(false)
const downloadingFailed = ref(false)
const selectedFile = ref(null)
const importResult = ref(null)
const uploadRef = ref(null)

// 显示导入弹窗
const showImportDialog = () => {
  selectedFile.value = null
  importResult.value = null
  importDialogVisible.value = true
}

// 文件选择
const handleFileChange = (file) => {
  selectedFile.value = file.raw
}

// 文件超出限制
const handleExceed = () => {
  ElMessage.warning('只能上传一个文件')
}

// 执行导入
const handleImport = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }
  
  importing.value = true
  importResult.value = null
  
  try {
    const res = await importExportApi.importData(props.model, selectedFile.value)
    importResult.value = res
    
    if (res.success && (res.data?.created > 0 || res.data?.updated > 0)) {
      emit('success')
    }
  } catch (err) {
    importResult.value = {
      success: false,
      data: {
        errors: [err.response?.data?.message || err.message || '导入失败']
      }
    }
  } finally {
    importing.value = false
  }
}

// 下载失败数据
const handleDownloadFailedData = async (key) => {
  downloadingFailed.value = true
  try {
    const blob = await importExportApi.downloadFailedData(key)
    downloadBlob(blob, `${props.modelName || props.model}_导入失败数据_${formatDate(new Date())}.xlsx`)
    ElMessage.success('失败数据下载成功')
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '下载失败')
  } finally {
    downloadingFailed.value = false
  }
}

// 导出数据
const handleExport = async () => {
  exporting.value = true
  try {
    const blob = await importExportApi.exportData(props.model)
    downloadBlob(blob, `${props.modelName || props.model}_数据_${formatDate(new Date())}.xlsx`)
    ElMessage.success('导出成功')
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

// 下载模板
const handleDownloadTemplate = async () => {
  downloading.value = true
  try {
    const blob = await importExportApi.downloadTemplate(props.model)
    downloadBlob(blob, `${props.modelName || props.model}_导入模板.xlsx`)
    ElMessage.success('模板下载成功')
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '下载模板失败')
  } finally {
    downloading.value = false
  }
}

// 下载Blob文件
const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// 格式化日期
const formatDate = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}
</script>

<style scoped>
.import-export-buttons {
  display: inline-flex;
  gap: 8px;
}

.import-dialog-content {
  min-height: 200px;
}

.upload-area {
  width: 100%;
}

.import-result {
  margin-top: 16px;
}

.result-stats {
  font-size: 14px;
  line-height: 1.8;
}

.result-stats b {
  font-size: 16px;
}

.error-list {
  margin-top: 8px;
}

.error-scroll {
  max-height: 200px;
  overflow-y: auto;
}

.failed-download {
  margin-top: 16px;
  padding: 12px;
  background: #fdf6ec;
  border-radius: 6px;
  border: 1px solid #f5dab1;
}

.success-tip {
  display: flex;
  align-items: center;
  margin-top: 12px;
  padding: 8px 12px;
  background: #f0f9eb;
  border-radius: 4px;
  color: #67c23a;
}

:deep(.el-upload-dragger) {
  width: 100%;
}
</style>
