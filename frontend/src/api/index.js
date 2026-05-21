import request from '@/utils/request'

export const authApi = {
  login: (data) => request.post('/auth/login', data),
  changePassword: (data) => request.post('/auth/change-password', data),
  me: () => request.get('/auth/me')
}

export const employeeApi = {
  list: (params) => request.get('/employees', { params }),
  all: () => request.get('/employees/all/list'),
  get: (id) => request.get(`/employees/${id}`),
  create: (data) => request.post('/employees', data),
  update: (id, data) => request.put(`/employees/${id}`, data),
  delete: (id) => request.delete(`/employees/${id}`)
}

export const departmentApi = {
  list: (params) => request.get('/departments', { params }),
  all: (params) => request.get('/departments/all/list', { params }),
  get: (id) => request.get(`/departments/${id}`),
  create: (data) => request.post('/departments', data),
  update: (id, data) => request.put(`/departments/${id}`, data),
  delete: (id) => request.delete(`/departments/${id}`)
}

export const companyApi = {
  list: (params) => request.get('/companies', { params }),
  all: () => request.get('/companies/all/list'),
  get: (id) => request.get(`/companies/${id}`),
  create: (data) => request.post('/companies', data),
  update: (id, data) => request.put(`/companies/${id}`, data),
  delete: (id) => request.delete(`/companies/${id}`)
}

export const bankAccountApi = {
  list: (params) => request.get('/bank-accounts', { params }),
  get: (id) => request.get(`/bank-accounts/${id}`),
  create: (data) => request.post('/bank-accounts', data),
  update: (id, data) => request.put(`/bank-accounts/${id}`, data),
  delete: (id) => request.delete(`/bank-accounts/${id}`)
}

export const customerApi = {
  list: (params) => request.get('/customers', { params }),
  all: () => request.get('/customers/all/list'),
  get: (id) => request.get(`/customers/${id}`),
  create: (data) => request.post('/customers', data),
  update: (id, data) => request.put(`/customers/${id}`, data),
  delete: (id) => request.delete(`/customers/${id}`)
}

export const projectApi = {
  list: (params) => request.get('/projects', { params }),
  get: (id) => request.get(`/projects/${id}`),
  create: (data) => request.post('/projects', data),
  update: (id, data) => request.put(`/projects/${id}`, data),
  delete: (id) => request.delete(`/projects/${id}`),
  summary: (id) => request.get(`/projects/summary/${id}`)
}

export const contractApi = {
  list: (params) => request.get('/contracts', { params }),
  all: (params) => request.get('/contracts/all/list', { params }),
  get: (id, params) => request.get(`/contracts/${id}`, { params }),
  create: (data) => request.post('/contracts', data),
  update: (id, data) => request.put(`/contracts/${id}`, data),
  delete: (id) => request.delete(`/contracts/${id}`),
  summary: (id) => request.get(`/contracts/summary/${id}`),
  refresh: (id) => request.post(`/contracts/refresh/${id}`),
  batchDeletePaymentRequests: (contractId, ids) => request.post(`/contracts/${contractId}/payment-requests/batch-delete`, { ids }),
  updateContractNo: (id, contract_no) => request.put(`/contracts/${id}/number`, { contract_no }),
  exportOrders: (id) => request.get(`/contracts/${id}/orders/export`, { responseType: 'blob' }),
  batchUpdateStatus: (ids, status) => request.post('/contracts/batch/status', { ids, status })
}

export const businessApi = {
  list: (params) => request.get('/business', { params }),
  all: (params) => request.get('/business/all/list', { params }),
  categories: () => request.get('/business/categories'),
  get: (id) => request.get(`/business/${id}`),
  create: (data) => request.post('/business', data),
  update: (id, data) => request.put(`/business/${id}`, data),
  delete: (id) => request.delete(`/business/${id}`)
}

export const orderApi = {
  list: (params) => request.get('/orders', { params }),
  get: (id) => request.get(`/orders/${id}`),
  create: (data) => request.post('/orders', data),
  update: (id, data) => request.put(`/orders/${id}`, data),
  delete: (id) => request.delete(`/orders/${id}`),
  cancelFlag: (id, data) => request.post(`/orders/${id}/cancel-flag`, data),
  resolveDirty: (id) => request.post(`/orders/${id}/resolve-dirty`),
  stats: (params) => request.get('/orders/stats', { params }),
  batchDelete: (ids) => request.post('/orders/batch/delete', { ids }),
  batchUpdateStatus: (ids, status) => request.post('/orders/batch/status', { ids, status }),
  updateOrderNo: (id, order_no) => request.put(`/orders/${id}/order-no`, { order_no })
}

export const financeApi = {
  list: (params) => request.get('/finance', { params }),
  get: (id) => request.get(`/finance/${id}`),
  create: (data) => request.post('/finance', data),
  update: (id, data) => request.put(`/finance/${id}`, data),
  delete: (id) => request.delete(`/finance/${id}`),
  autoFromOrders: (data) => request.post('/finance/auto-from-orders', data),
  autoFromContracts: (data) => request.post('/finance/auto-from-contracts', data)
}

export const salaryApi = {
  list: (params) => request.get('/salary', { params }),
  get: (id) => request.get(`/salary/${id}`),
  create: (data) => request.post('/salary', data),
  update: (id, data) => request.put(`/salary/${id}`, data),
  delete: (id) => request.delete(`/salary/${id}`)
}

export const performanceApi = {
  list: (params) => request.get('/performance', { params }),
  create: (data) => request.post('/performance', data),
  update: (id, data) => request.put(`/performance/${id}`, data),
  delete: (id) => request.delete(`/performance/${id}`),
  // 自动从订单生成绩效
  autoFromOrders: (data) => request.post('/performance/auto-from-orders', data),
  // 自动从合同生成绩效
  autoFromContracts: (data) => request.post('/performance/auto-from-contracts', data)
}

export const paymentRequestApi = {
  list: (params) => request.get('/payment-requests', { params }),
  all: (params) => request.get('/payment-requests/all/list', { params }),
  get: (id) => request.get(`/payment-requests/${id}`),
  create: (data) => request.post('/payment-requests', data),
  update: (id, data) => request.put(`/payment-requests/${id}`, data),
  delete: (id) => request.delete(`/payment-requests/${id}`),
  generateFinance: (id) => request.post(`/payment-requests/${id}/generate-finance`)
}

export const paymentRequestBatchApi = {
  list: (params) => request.get('/payment-request-batches', { params }),
  get: (id) => request.get(`/payment-request-batches/${id}`),
  createFromOrders: (data) => request.post('/payment-request-batches/create-from-orders', data),
  update: (id, data) => request.put(`/payment-request-batches/${id}`, data),
  batchDelete: (ids) => request.post('/payment-request-batches/batch/delete', { ids }),
  batchUpdateStatus: (ids, status) => request.put('/payment-request-batches/batch/status', { ids, status }),
  delete: (id) => request.delete(`/payment-request-batches/${id}`)
}

export const receiptApi = {
  list: (params) => request.get('/receipts', { params }),
  get: (id) => request.get(`/receipts/${id}`),
  update: (id, data) => request.put(`/receipts/${id}`, data),
  delete: (id) => request.delete(`/receipts/${id}`),
  batchDelete: (ids) => request.post('/receipts/batch/delete', { ids }),
  batchUpdateStatus: (ids, status) => request.put('/receipts/batch/status', { ids, status }),
  createFromRequests: (data) => request.post('/receipts/create-from-requests', data),
  generateFinance: (id) => request.post(`/receipts/${id}/generate-finance`)
}

export const uploadApi = {
  // 单文件上传
  single: (file, type = 'common') => {
    const formData = new FormData()
    formData.append('file', file)
    return request.post(`/upload/${type}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  // 多文件上传
  multiple: (files, type = 'common') => {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    return request.post(`/upload/multiple/${type}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

export const reportApi = {
  daily: (params) => request.get('/reports/daily', { params }),
  quarterly: (params) => request.get('/reports/quarterly', { params }),
  annual: (params) => request.get('/reports/annual', { params }),
  company: (params) => request.get('/reports/company', { params }),
  department: (params) => request.get('/reports/department', { params }),
  employee: (params) => request.get('/reports/employee', { params }),
  project: (params) => request.get('/reports/project', { params }),
  contract: (params) => request.get('/reports/contract', { params }),
  dashboard: () => request.get('/reports/dashboard')
}

export const statsApi = {
  generateDaily: (data) => request.post('/stats/generate-daily', data),
  status: (params) => request.get('/stats/status', { params }),
  departments: (params) => request.get('/stats/departments', { params }),
  companies: (params) => request.get('/stats/companies', { params }),
  customers: (params) => request.get('/stats/customers', { params }),
  dirtyOrders: (params) => request.get('/stats/dirty-orders', { params })
}

// 导入导出API
export const importExportApi = {
  // 获取支持的模块列表
  getModels: () => request.get('/import-export/models'),
  
  // 下载导入模板
  downloadTemplate: (model) => request.get(`/import-export/template/${model}`, { 
    responseType: 'blob' 
  }),
  
  // 导出数据
  exportData: (model) => request.get(`/import-export/export/${model}`, { 
    responseType: 'blob' 
  }),
  
  // 导入数据
  importData: (model, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return request.post(`/import-export/import/${model}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  // 下载失败数据
  downloadFailedData: (key) => request.get(`/import-export/failed-data/${key}`, {
    responseType: 'blob'
  })
}
