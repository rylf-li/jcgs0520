<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header><span class="card-title">报表中心</span></template>
      <div class="report-grid">
        <div class="report-card" v-for="report in reports" :key="report.path" @click="$router.push(report.path)">
          <div class="report-icon" :style="{ background: report.color + '20', color: report.color }">
            <el-icon size="32"><component :is="report.icon" /></el-icon>
          </div>
          <div class="report-name">{{ report.name }}</div>
          <div class="report-desc">{{ report.desc }}</div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
const reports = [
  { name: '日报表', desc: '当日财务收支详情', path: '/reports/daily', icon: 'Calendar', color: '#1677ff' },
  { name: '季度报表', desc: '季度财务统计汇总', path: '/reports/quarterly', icon: 'DataLine', color: '#52c41a' },
  { name: '年度报表', desc: '年度财务统计汇总', path: '/reports/annual', icon: 'TrendCharts', color: '#fa8c16' },
  { name: '公司报表', desc: '公司运营统计分析', path: '/reports/company', icon: 'Home', color: '#13c2c2' },
  { name: '部门报表', desc: '部门运营统计分析', path: '/reports/department', icon: 'OfficeBuilding', color: '#722ed1' },
  { name: '员工报表', desc: '员工工资绩效统计', path: '/reports/employee', icon: 'User', color: '#eb2f96' },
  { name: '人事报表', desc: '组织架构与人员分布', path: '/reports/hr', icon: 'Histogram', color: '#2f54eb' },
  { name: '业务报表', desc: '部门、员工、项目业务分析', path: '/reports/business', icon: 'PieChart', color: '#08979c' },
  { name: '统计快照', desc: '每日部门/公司/客户快照', path: '/reports/snapshots', icon: 'CollectionTag', color: '#fa541c' },
  { name: '项目报表', desc: '项目详细统计信息', path: '/reports/project', icon: 'Folder', color: '#1677ff' },
  { name: '合同报表', desc: '合同详细统计信息', path: '/reports/contract', icon: 'Document', color: '#52c41a' }
]
</script>

<style scoped>
.card-title { font-size: 15px; font-weight: 600; }
.report-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.report-card { background: #fff; border-radius: 8px; padding: 24px; text-align: center; cursor: pointer; transition: all .3s; border: 1px solid #f0f0f0; }
.report-card:hover { transform: translateY(-4px); box-shadow: 0 8px 16px rgba(0,0,0,.1); }
.report-icon { width: 60px; height: 60px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
.report-name { font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 6px; }
.report-desc { font-size: 12px; color: #999; }
</style>
