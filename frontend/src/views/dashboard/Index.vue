<template>
  <div class="dashboard-modern">
    <div class="glow-accent glow-1"></div>
    <div class="glow-accent glow-2"></div>
    
    <div class="welcome-section animate-fade-in-up">
      <div class="welcome-content">
        <h1 class="welcome-title">
          欢迎回来，<span class="text-gradient">{{ auth.user?.name }}</span>
        </h1>
        <p class="welcome-date">{{ today }}</p>
      </div>
      <div class="welcome-decoration">
        <div class="decoration-ring animate-float"></div>
      </div>
    </div>

    <div class="stats-grid">
      <div 
        v-for="(card, index) in statCards" 
        :key="card.label"
        class="stat-card card animate-fade-in-up"
        :class="[`stagger-${index + 1}`, card.featured ? 'card-accent' : '']"
      >
        <div class="stat-icon-wrapper" :style="{ background: card.gradient }">
          <el-icon size="26"><component :is="card.icon" /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ card.value }}</div>
          <div class="stat-label">{{ card.label }}</div>
        </div>
        <div v-if="card.trend" class="stat-trend" :class="card.trend > 0 ? 'trend-up' : 'trend-down'">
          <el-icon size="14"><component :is="card.trend > 0 ? 'Top' : 'Bottom'" /></el-icon>
          <span>{{ Math.abs(card.trend) }}%</span>
        </div>
      </div>
    </div>

    <div class="overview-section">
      <div class="overview-panel card animate-fade-in-up stagger-1">
        <div class="panel-header">
          <div class="panel-icon">
            <el-icon size="20"><FolderOpened /></el-icon>
          </div>
          <h2 class="panel-title">项目概览</h2>
        </div>
        <div class="panel-content">
          <div class="overview-grid">
            <div v-for="item in projectOverview" :key="item.label" class="overview-item">
              <div class="overview-value" :style="{ color: item.color }">{{ item.value }}</div>
              <div class="overview-label">{{ item.label }}</div>
              <div v-if="item.progress" class="progress-bar">
                <div class="progress-fill" :style="{ width: item.progress + '%', background: item.color }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="overview-panel card animate-fade-in-up stagger-2">
        <div class="panel-header">
          <div class="panel-icon" style="background: linear-gradient(135deg, #10B981, #059669)">
            <el-icon size="20"><Document /></el-icon>
          </div>
          <h2 class="panel-title">合同概览</h2>
        </div>
        <div class="panel-content">
          <div class="overview-grid">
            <div v-for="item in contractOverview" :key="item.label" class="overview-item">
              <div class="overview-value" :style="{ color: item.color }">{{ item.value }}</div>
              <div class="overview-label">{{ item.label }}</div>
              <div v-if="item.progress" class="progress-bar">
                <div class="progress-fill" :style="{ width: item.progress + '%', background: item.color }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="quick-actions card animate-fade-in-up stagger-3">
      <div class="actions-header">
        <h2 class="actions-title">快捷操作</h2>
        <p class="actions-subtitle">常用功能一键直达</p>
      </div>
      <div class="actions-grid">
        <div 
          v-for="(link, index) in quickLinks" 
          :key="link.path"
          class="action-item"
          :class="`stagger-${index + 1}`"
          @click="$router.push(link.path)"
        >
          <div class="action-icon" :style="{ background: link.gradient }">
            <el-icon size="24"><component :is="link.icon" /></el-icon>
          </div>
          <div class="action-label">{{ link.label }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/store/auth'
import { reportApi } from '@/api'
import dayjs from 'dayjs'

const auth = useAuthStore()
const today = dayjs().format('YYYY年MM月DD日 dddd')
const dashData = ref({ projectStats: {}, contractStats: {} })

const fmt = (v) => v ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 0 }) : '0'

const statCards = computed(() => [
  { 
    label: '项目总数', 
    value: dashData.value.projectStats?.total || 0, 
    gradient: 'linear-gradient(135deg, #0052FF, #4D7CFF)',
    icon: 'FolderOpened',
    featured: true,
    trend: 12
  },
  { 
    label: '合同总数', 
    value: dashData.value.contractStats?.total || 0, 
    gradient: 'linear-gradient(135deg, #10B981, #059669)',
    icon: 'Document',
    trend: 8
  },
  { 
    label: '应收款(万)', 
    value: fmt(((dashData.value.projectStats?.total_receivable || 0) / 10000).toFixed(2)), 
    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
    icon: 'Money'
  },
  { 
    label: '已收款(万)', 
    value: fmt(((dashData.value.projectStats?.total_received || 0) / 10000).toFixed(2)), 
    gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)',
    icon: 'Wallet'
  }
])

const projectOverview = computed(() => {
  const total = dashData.value.projectStats?.total || 0
  return [
    { 
      label: '进行中', 
      value: dashData.value.projectStats?.ongoing || 0, 
      color: '#0052FF',
      progress: total > 0 ? ((dashData.value.projectStats?.ongoing || 0) / total * 100) : 0
    },
    { 
      label: '已完成', 
      value: dashData.value.projectStats?.completed || 0, 
      color: '#10B981',
      progress: total > 0 ? ((dashData.value.projectStats?.completed || 0) / total * 100) : 0
    },
    { 
      label: '待收款(万)', 
      value: fmt(((dashData.value.projectStats?.pending_receivable || 0) / 10000).toFixed(2)), 
      color: '#F59E0B'
    }
  ]
})

const contractOverview = computed(() => {
  const total = dashData.value.contractStats?.total || 0
  return [
    { 
      label: '进行中', 
      value: dashData.value.contractStats?.ongoing || 0, 
      color: '#0052FF',
      progress: total > 0 ? ((dashData.value.contractStats?.ongoing || 0) / total * 100) : 0
    },
    { 
      label: '已完成', 
      value: dashData.value.contractStats?.completed || 0, 
      color: '#10B981',
      progress: total > 0 ? ((dashData.value.contractStats?.completed || 0) / total * 100) : 0
    },
    { 
      label: '待签订', 
      value: dashData.value.contractStats?.pending_sign || 0, 
      color: '#EF4444'
    }
  ]
})

const quickLinks = [
  { label: '新建项目', path: '/projects', icon: 'FolderAdd', gradient: 'linear-gradient(135deg, #0052FF, #4D7CFF)' },
  { label: '新建合同', path: '/contracts', icon: 'DocumentAdd', gradient: 'linear-gradient(135deg, #10B981, #059669)' },
  { label: '新建订单', path: '/orders', icon: 'Plus', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
  { label: '财务记录', path: '/finance', icon: 'CreditCard', gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)' },
  { label: '工资管理', path: '/salary', icon: 'Wallet', gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },
  { label: '报表中心', path: '/reports/daily', icon: 'DataAnalysis', gradient: 'linear-gradient(135deg, #EC4899, #DB2777)' }
]

onMounted(async () => {
  try {
    const res = await reportApi.dashboard()
    if (res.success) dashData.value = res.data
  } catch (e) {}
})
</script>

<style scoped>
.dashboard-modern {
  position: relative;
  min-height: 100vh;
  padding: 32px;
  overflow: hidden;
}

.glow-1 {
  top: -200px;
  right: -100px;
}

.glow-2 {
  bottom: -200px;
  left: -100px;
}

.welcome-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

.welcome-title {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
  font-family: var(--font-display);
}

.welcome-date {
  font-size: 15px;
  color: var(--color-muted-foreground);
}

.welcome-decoration {
  position: relative;
}

.decoration-ring {
  width: 80px;
  height: 80px;
  border: 2px solid var(--color-border);
  border-radius: 50%;
  position: relative;
}

.decoration-ring::before {
  content: '';
  position: absolute;
  inset: 4px;
  border: 2px solid var(--color-accent);
  border-radius: 50%;
  opacity: 0.3;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 32px;
  position: relative;
  z-index: 1;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  transition: all var(--transition-base);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}

.stat-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-foreground);
  line-height: 1.2;
  font-family: var(--font-display);
}

.stat-label {
  font-size: 14px;
  color: var(--color-muted-foreground);
  margin-top: 4px;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
}

.trend-up {
  color: var(--color-success);
  background: rgba(16, 185, 129, 0.1);
}

.trend-down {
  color: var(--color-danger);
  background: rgba(239, 68, 68, 0.1);
}

.overview-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 32px;
  position: relative;
  z-index: 1;
}

.overview-panel {
  padding: 0;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-muted);
}

.panel-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0052FF, #4D7CFF);
  color: white;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  font-family: var(--font-display);
}

.panel-content {
  padding: 24px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.overview-item {
  text-align: center;
}

.overview-value {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 6px;
  font-family: var(--font-display);
}

.overview-label {
  font-size: 13px;
  color: var(--color-muted-foreground);
  margin-bottom: 8px;
}

.progress-bar {
  height: 4px;
  background: var(--color-muted);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 8px;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width var(--transition-slow);
}

.quick-actions {
  padding: 24px;
  position: relative;
  z-index: 1;
}

.actions-header {
  margin-bottom: 20px;
}

.actions-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
  font-family: var(--font-display);
}

.actions-subtitle {
  font-size: 14px;
  color: var(--color-muted-foreground);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px 16px;
  border-radius: 12px;
  background: var(--color-muted);
  cursor: pointer;
  transition: all var(--transition-base);
  border: 1px solid transparent;
}

.action-item:hover {
  background: white;
  border-color: var(--color-border);
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: transform var(--transition-base);
}

.action-item:hover .action-icon {
  transform: scale(1.1);
}

.action-label {
  font-size: 13px;
  color: var(--color-muted-foreground);
  font-weight: 500;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .actions-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-modern {
    padding: 16px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .overview-section {
    grid-template-columns: 1fr;
  }
  
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .welcome-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}
</style>
