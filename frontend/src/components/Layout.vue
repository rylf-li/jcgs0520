<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapse ? '72px' : '260px'" class="sidebar">
      <div class="sidebar-header">
        <div class="logo-icon">
          <el-icon size="24"><DataBoard /></el-icon>
        </div>
        <transition name="fade">
          <span v-if="!isCollapse" class="logo-text">工程管理系统</span>
        </transition>
      </div>
      
      <el-menu
        :default-active="$route.path"
        router
        :collapse="isCollapse"
        background-color="transparent"
        text-color="#64748B"
        active-text-color="#0052FF"
        class="sidebar-menu"
      >
        <el-menu-item index="/dashboard" class="menu-item">
          <el-icon><DataBoard /></el-icon>
          <template #title>工作台</template>
        </el-menu-item>

        <el-sub-menu v-if="!isSales" index="basic" class="menu-sub">
          <template #title>
            <el-icon><Grid /></el-icon>
            <span>基础管理</span>
          </template>
          <el-menu-item index="/employees"><el-icon><User /></el-icon><template #title>员工管理</template></el-menu-item>
          <el-menu-item index="/departments"><el-icon><OfficeBuilding /></el-icon><template #title>部门管理</template></el-menu-item>
          <el-menu-item index="/companies"><el-icon><House /></el-icon><template #title>公司管理</template></el-menu-item>
          <el-menu-item index="/customers"><el-icon><Avatar /></el-icon><template #title>客户管理</template></el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="business" class="menu-sub">
          <template #title>
            <el-icon><Briefcase /></el-icon>
            <span>业务管理</span>
          </template>
          <el-menu-item index="/projects"><el-icon><FolderOpened /></el-icon><template #title>项目管理</template></el-menu-item>
          <el-menu-item index="/contracts"><el-icon><Document /></el-icon><template #title>合同管理</template></el-menu-item>
          <el-menu-item index="/orders"><el-icon><List /></el-icon><template #title>订单管理</template></el-menu-item>
          <el-menu-item index="/orders/review"><el-icon><Warning /></el-icon><template #title>订单复核</template></el-menu-item>
          <el-menu-item index="/payment-request-batches"><el-icon><Tickets /></el-icon><template #title>请款批次</template></el-menu-item>
          <el-menu-item v-if="!isSales" index="/business"><el-icon><Tools /></el-icon><template #title>业务管理</template></el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="finance" class="menu-sub">
          <template #title>
            <el-icon><Money /></el-icon>
            <span>财务管理</span>
          </template>
          <el-menu-item index="/receipts"><el-icon><Coin /></el-icon><template #title>收款管理</template></el-menu-item>
          <el-menu-item index="/finance"><el-icon><CreditCard /></el-icon><template #title>财务管理</template></el-menu-item>
          <el-menu-item v-if="!isSales" index="/salary"><el-icon><Wallet /></el-icon><template #title>工资管理</template></el-menu-item>
          <el-menu-item index="/performance"><el-icon><TrendCharts /></el-icon><template #title>绩效管理</template></el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="reports" class="menu-sub">
          <template #title>
            <el-icon><DataAnalysis /></el-icon>
            <span>报表管理</span>
          </template>
          <el-menu-item index="/reports/daily"><template #title>日报表</template></el-menu-item>
          <el-menu-item index="/reports/quarterly"><template #title>季度报表</template></el-menu-item>
          <el-menu-item index="/reports/annual"><template #title>年度报表</template></el-menu-item>
          <el-menu-item index="/reports/company"><template #title>公司报表</template></el-menu-item>
          <el-menu-item index="/reports/department"><template #title>部门报表</template></el-menu-item>
          <el-menu-item index="/reports/employee"><template #title>员工报表</template></el-menu-item>
          <el-menu-item index="/reports/snapshots"><template #title>统计快照</template></el-menu-item>
          <el-menu-item index="/reports/project"><template #title>项目报表</template></el-menu-item>
          <el-menu-item index="/reports/contract"><template #title>合同报表</template></el-menu-item>
          <el-menu-item index="/reports/hr"><template #title>人事报表</template></el-menu-item>
          <el-menu-item index="/reports/business"><template #title>业务报表</template></el-menu-item>
        </el-sub-menu>

        <el-sub-menu v-if="!isSales" index="system" class="menu-sub">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统管理</span>
          </template>
          <el-menu-item index="/sync"><el-icon><Refresh /></el-icon><template #title>数据同步</template></el-menu-item>
          <el-menu-item index="/consistency"><el-icon><Warning /></el-icon><template #title>一致性检测</template></el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container class="main-container">
      <el-header class="header">
        <div class="header-left">
          <button class="collapse-btn" @click="isCollapse = !isCollapse">
            <el-icon size="20">
              <Fold v-if="!isCollapse" />
              <Expand v-else />
            </el-icon>
          </button>
          <el-breadcrumb separator="/" class="breadcrumb">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ $route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand" trigger="click">
            <div class="user-dropdown">
              <div class="user-avatar">
                {{ auth.user?.name?.charAt(0) }}
              </div>
              <span class="user-name">{{ auth.user?.name }}</span>
              <el-icon size="16"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  <span>个人信息</span>
                </el-dropdown-item>
                <el-dropdown-item command="password">
                  <el-icon><Key /></el-icon>
                  <span>修改密码</span>
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>
                  <span>退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/store/auth'
import { 
  Setting, DataBoard, Grid, User, OfficeBuilding, House, Avatar,
  Briefcase, FolderOpened, Document, List, Warning, Tickets, Tools,
  Money, Coin, CreditCard, Wallet, TrendCharts, DataAnalysis,
  Fold, Expand, ArrowDown, Refresh, Key, SwitchButton
} from '@element-plus/icons-vue'

const auth = useAuthStore()
const router = useRouter()
const isCollapse = ref(false)
const isSales = computed(() => auth.user?.role === 'sales')

const handleCommand = (cmd) => {
  if (cmd === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' }).then(() => {
      auth.logout()
      router.push('/login')
    })
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  background: var(--color-background);
}

.sidebar {
  background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%);
  border-right: 1px solid var(--color-border);
  transition: width var(--transition-base);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 20px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-secondary));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-foreground);
  white-space: nowrap;
  font-family: var(--font-display);
}

.sidebar-menu {
  flex: 1;
  overflow-y: auto;
  border-right: none;
  padding: 8px;
}

.menu-item {
  border-radius: var(--radius-md);
  margin: 4px 0;
  transition: all var(--transition-base);
}

.menu-item:hover {
  background: var(--color-muted);
}

.menu-item.is-active {
  background: linear-gradient(135deg, rgba(0, 82, 255, 0.1), rgba(77, 124, 255, 0.1));
  color: var(--color-accent) !important;
  font-weight: 600;
}

.menu-sub {
  border-radius: var(--radius-md);
  margin: 4px 0;
}

.main-container {
  display: flex;
  flex-direction: column;
}

.header {
  height: 72px;
  background: white;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  box-shadow: var(--shadow-sm);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.collapse-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--color-muted);
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-muted-foreground);
  transition: all var(--transition-base);
}

.collapse-btn:hover {
  background: var(--color-border);
  color: var(--color-foreground);
}

.breadcrumb {
  font-size: 14px;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: var(--radius-lg);
  transition: all var(--transition-base);
}

.user-dropdown:hover {
  background: var(--color-muted);
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-secondary));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-foreground);
}

.main-content {
  background: var(--color-background);
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-base);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
}
</style>
