import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store/auth'

const routes = [
  { path: '/login', name: 'Login', component: () => import('@/views/Login.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('@/components/Layout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/dashboard/Index.vue'), meta: { title: '工作台' } },
      { path: 'employees', name: 'Employees', component: () => import('@/views/employee/Index.vue'), meta: { title: '员工管理' } },
      { path: 'employees/:id', name: 'EmployeeDetail', component: () => import('@/views/employee/Detail.vue'), meta: { title: '员工详情' } },
      { path: 'departments', name: 'Departments', component: () => import('@/views/department/Index.vue'), meta: { title: '部门管理' } },
      { path: 'departments/:id', name: 'DepartmentDetail', component: () => import('@/views/department/Detail.vue'), meta: { title: '部门详情' } },
      { path: 'companies', name: 'Companies', component: () => import('@/views/company/Index.vue'), meta: { title: '公司管理' } },
      { path: 'company/:id', name: 'CompanyDetail', component: () => import('@/views/company/Detail.vue'), meta: { title: '公司详情' } },
      { path: 'customers', name: 'Customers', component: () => import('@/views/customer/Index.vue'), meta: { title: '客户管理' } },
      { path: 'customers/:id', name: 'CustomerDetail', component: () => import('@/views/customer/Detail.vue'), meta: { title: '客户详情' } },
      { path: 'projects', name: 'Projects', component: () => import('@/views/project/Index.vue'), meta: { title: '项目管理' } },
      { path: 'projects/:id', name: 'ProjectDetail', component: () => import('@/views/project/Detail.vue'), meta: { title: '项目详情' } },
      { path: 'contracts', name: 'Contracts', component: () => import('@/views/contract/Index.vue'), meta: { title: '合同管理' } },
      { path: 'contracts/:id', name: 'ContractDetail', component: () => import('@/views/contract/Detail.vue'), meta: { title: '合同详情' } },
      { path: 'orders', name: 'Orders', component: () => import('@/views/order/Index.vue'), meta: { title: '订单管理' } },
      { path: 'orders/:id', name: 'OrderDetail', component: () => import('@/views/order/Detail.vue'), meta: { title: '订单详情' } },
      { path: 'orders/review', name: 'OrderDirtyReview', component: () => import('@/views/order/DirtyReview.vue'), meta: { title: '订单复核' } },
      { path: 'payment-request-batches', name: 'PaymentRequestBatches', component: () => import('@/views/paymentRequestBatch/Index.vue'), meta: { title: '请款批次' } },
      { path: 'payment-requests', name: 'PaymentRequests', component: () => import('@/views/paymentRequest/Index.vue'), meta: { title: '请款明细' } },
      { path: 'business', name: 'Business', component: () => import('@/views/business/Index.vue'), meta: { title: '业务管理' } },
      { path: 'receipts', name: 'Receipts', component: () => import('@/views/receipt/Index.vue'), meta: { title: '收款管理' } },
      { path: 'finance', name: 'Finance', component: () => import('@/views/finance/Index.vue'), meta: { title: '财务管理' } },
      { path: 'salary', name: 'Salary', component: () => import('@/views/salary/Index.vue'), meta: { title: '工资管理' } },
      { path: 'salary/:id', name: 'SalaryDetail', component: () => import('@/views/salary/Detail.vue'), meta: { title: '工资详情' } },
      { path: 'performance', name: 'Performance', component: () => import('@/views/performance/Index.vue'), meta: { title: '绩效管理' } },
      { path: 'performance/:id', name: 'PerformanceDetail', component: () => import('@/views/performance/Detail.vue'), meta: { title: '绩效详情' } },
      { path: 'reports', name: 'Reports', component: () => import('@/views/report/Index.vue'), meta: { title: '报表管理' } },
      { path: 'reports/daily', name: 'DailyReport', component: () => import('@/views/report/Daily.vue'), meta: { title: '日报表' } },
      { path: 'reports/quarterly', name: 'QuarterlyReport', component: () => import('@/views/report/Quarterly.vue'), meta: { title: '季度报表' } },
      { path: 'reports/annual', name: 'AnnualReport', component: () => import('@/views/report/Annual.vue'), meta: { title: '年度报表' } },
      { path: 'reports/company', name: 'CompanyReport', component: () => import('@/views/report/Company.vue'), meta: { title: '公司报表' } },
      { path: 'reports/department', name: 'DeptReport', component: () => import('@/views/report/Department.vue'), meta: { title: '部门报表' } },
      { path: 'reports/employee', name: 'EmployeeReport', component: () => import('@/views/report/Employee.vue'), meta: { title: '员工报表' } },
      { path: 'reports/snapshots', name: 'SnapshotReport', component: () => import('@/views/report/Snapshot.vue'), meta: { title: '统计快照' } },
      { path: 'reports/project', name: 'ProjectReport', component: () => import('@/views/report/ProjectReport.vue'), meta: { title: '项目报表' } },
      { path: 'reports/contract', name: 'ContractReport', component: () => import('@/views/report/ContractReport.vue'), meta: { title: '合同报表' } },
      { path: 'sync', name: 'SyncManagement', component: () => import('@/views/sync/Index.vue'), meta: { title: '数据同步' } },
      { path: 'consistency', name: 'ConsistencyCheck', component: () => import('@/views/consistency/Index.vue'), meta: { title: '一致性检测' } },
      { path: 'reports/hr', name: 'HRReports', component: () => import('@/views/reports/HRReports.vue'), meta: { title: '人事报表' } },
      { path: 'reports/business', name: 'BusinessReports', component: () => import('@/views/reports/BusinessReports.vue'), meta: { title: '业务报表' } }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.token) {
    next('/login')
  } else {
    next()
  }
})

export default router
