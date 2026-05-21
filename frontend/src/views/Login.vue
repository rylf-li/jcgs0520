<template>
  <div class="login-page-modern">
    <div class="login-bg-pattern"></div>
    <div class="glow-accent glow-1"></div>
    <div class="glow-accent glow-2"></div>
    
    <div class="login-container">
      <div class="brand-section">
        <div class="brand-content">
          <div class="brand-logo animate-fade-in-up">
            <div class="logo-icon">
              <el-icon size="32"><DataBoard /></el-icon>
            </div>
          </div>
          
          <h1 class="brand-title animate-fade-in-up stagger-1">
            <span class="text-gradient">工程综合</span><br>
            管理系统
          </h1>
          
          <p class="brand-subtitle animate-fade-in-up stagger-2">
            Engineering Management System
          </p>
          
          <div class="brand-features animate-fade-in-up stagger-3">
            <div class="feature-item">
              <div class="feature-icon">
                <el-icon size="20"><FolderOpened /></el-icon>
              </div>
              <div class="feature-text">
                <div class="feature-title">项目管理</div>
                <div class="feature-desc">全流程项目管控</div>
              </div>
            </div>
            <div class="feature-item">
              <div class="feature-icon">
                <el-icon size="20"><TrendCharts /></el-icon>
              </div>
              <div class="feature-text">
                <div class="feature-title">数据分析</div>
                <div class="feature-desc">智能报表统计</div>
              </div>
            </div>
            <div class="feature-item">
              <div class="feature-icon">
                <el-icon size="20"><Money /></el-icon>
              </div>
              <div class="feature-text">
                <div class="feature-title">财务管理</div>
                <div class="feature-desc">精细化成本控制</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="brand-decoration">
          <div class="decoration-circle circle-1 animate-float"></div>
          <div class="decoration-circle circle-2 animate-float" style="animation-delay: 1s"></div>
          <div class="decoration-circle circle-3 animate-float" style="animation-delay: 2s"></div>
        </div>
      </div>
      
      <div class="login-section">
        <div class="login-card card animate-fade-in-up stagger-2">
          <div class="login-header">
            <h2 class="login-title">欢迎回来</h2>
            <p class="login-subtitle">请登录您的账户继续使用</p>
          </div>
          
          <el-form 
            :model="form" 
            :rules="rules" 
            ref="formRef" 
            size="large"
            class="login-form"
          >
            <el-form-item prop="phone">
              <el-input 
                v-model="form.phone" 
                placeholder="请输入手机号"
                :prefix-icon="Phone"
                class="login-input"
              />
            </el-form-item>
            
            <el-form-item prop="password">
              <el-input 
                v-model="form.password" 
                type="password" 
                placeholder="请输入密码"
                :prefix-icon="Lock"
                show-password
                @keyup.enter="handleLogin"
                class="login-input"
              />
            </el-form-item>
            
            <el-form-item>
              <button 
                type="button"
                class="login-button btn-primary"
                :disabled="loading"
                @click="handleLogin"
              >
                <span v-if="!loading">登 录</span>
                <span v-else class="loading-text">
                  <el-icon class="animate-spin"><Loading /></el-icon>
                  登录中...
                </span>
              </button>
            </el-form-item>
          </el-form>
          
          <div class="login-footer">
            <div class="footer-divider">
              <span>或</span>
            </div>
            <button class="register-button btn-secondary" @click="showRegister = true">
              创建新账户
            </button>
          </div>
        </div>
        
        <div class="login-tips animate-fade-in-up stagger-3">
          <p>首次登录请联系管理员获取账户信息</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi } from '@/api'
import { useAuthStore } from '@/store/auth'
import { Phone, Lock, Loading, DataBoard, FolderOpened, TrendCharts, Money } from '@element-plus/icons-vue'

const router = useRouter()
const auth = useAuthStore()
const formRef = ref()
const loading = ref(false)
const showRegister = ref(false)

const form = reactive({ phone: '', password: '' })
const rules = {
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  await formRef.value.validate()
  loading.value = true
  try {
    const res = await authApi.login(form)
    if (res.success) {
      auth.login(res.data.token, res.data.user)
      ElMessage.success('登录成功')
      router.push('/')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page-modern {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%);
  position: relative;
  overflow: hidden;
}

.login-bg-pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
}

.glow-1 {
  top: -200px;
  right: -100px;
}

.glow-2 {
  bottom: -200px;
  left: -100px;
}

.login-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  max-width: 1200px;
  width: 100%;
  padding: 40px;
  position: relative;
  z-index: 1;
}

.brand-section {
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: white;
  position: relative;
}

.brand-content {
  position: relative;
  z-index: 1;
}

.brand-logo {
  margin-bottom: 32px;
}

.logo-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, #0052FF, #4D7CFF);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 24px rgba(0, 82, 255, 0.4);
}

.brand-title {
  font-size: 48px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 16px;
  font-family: var(--font-display);
}

.brand-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 48px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.brand-features {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all var(--transition-base);
}

.feature-item:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(8px);
}

.feature-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(0, 82, 255, 0.2), rgba(77, 124, 255, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4D7CFF;
  flex-shrink: 0;
}

.feature-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}

.feature-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.brand-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  border: 2px solid rgba(0, 82, 255, 0.2);
}

.circle-1 {
  width: 200px;
  height: 200px;
  top: 10%;
  right: 5%;
}

.circle-2 {
  width: 150px;
  height: 150px;
  bottom: 15%;
  right: 15%;
  border-color: rgba(77, 124, 255, 0.15);
}

.circle-3 {
  width: 100px;
  height: 100px;
  top: 50%;
  right: 25%;
  border-color: rgba(255, 255, 255, 0.1);
}

.login-section {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
}

.login-card {
  padding: 40px;
  border-radius: 20px;
}

.login-header {
  margin-bottom: 32px;
  text-align: center;
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-foreground);
  margin-bottom: 8px;
  font-family: var(--font-display);
}

.login-subtitle {
  font-size: 14px;
  color: var(--color-muted-foreground);
}

.login-form {
  margin-bottom: 24px;
}

.login-input {
  border-radius: 10px !important;
}

.login-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.loading-text {
  display: flex;
  align-items: center;
  gap: 8px;
}

.login-footer {
  text-align: center;
}

.footer-divider {
  position: relative;
  margin: 24px 0;
  color: var(--color-muted-foreground);
  font-size: 13px;
}

.footer-divider::before,
.footer-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background: var(--color-border);
}

.footer-divider::before {
  left: 0;
}

.footer-divider::after {
  right: 0;
}

.register-button {
  width: 100%;
  height: 44px;
  font-size: 15px;
}

.login-tips {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 1024px) {
  .login-container {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  
  .brand-section {
    text-align: center;
    align-items: center;
  }
  
  .brand-title {
    font-size: 36px;
  }
  
  .brand-features {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  
  .feature-item {
    flex-direction: column;
    text-align: center;
    padding: 20px 16px;
  }
  
  .feature-item:hover {
    transform: translateY(-4px);
  }
  
  .brand-decoration {
    display: none;
  }
}

@media (max-width: 640px) {
  .login-container {
    padding: 20px;
  }
  
  .brand-title {
    font-size: 28px;
  }
  
  .brand-features {
    grid-template-columns: 1fr;
  }
  
  .login-card {
    padding: 32px 24px;
  }
}
</style>
