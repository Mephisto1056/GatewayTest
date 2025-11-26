<template>
  <div class="dashboard-overview page-container">
    <div class="page-header">
      <h1>系统概览</h1>
      <p class="page-subtitle">领导力评估系统数据总览</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon users">
          <MaterialIcon name="users" size="lg" />
        </div>
        <div class="stat-content">
          <h3>{{ stats.totalUsers }}</h3>
          <p>总用户数</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon evaluations">
          <MaterialIcon name="evaluations" size="lg" />
        </div>
        <div class="stat-content">
          <h3>{{ stats.totalEvaluations }}</h3>
          <p>总评估数</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon completed">
          <MaterialIcon name="check" size="lg" />
        </div>
        <div class="stat-content">
          <h3>{{ stats.completedEvaluations }}</h3>
          <p>已完成评估</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon questions">
          <MaterialIcon name="questions" size="lg" />
        </div>
        <div class="stat-content">
          <h3>{{ stats.totalQuestions }}</h3>
          <p>题目总数</p>
        </div>
      </div>
    </div>

    <!-- 最近活动 -->
    <div class="recent-activity">
      <h2>最近活动</h2>
      <div class="activity-list">
        <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
          <div class="activity-icon">
            <MaterialIcon :name="activity.iconName" size="sm" />
          </div>
          <div class="activity-content">
            <p class="activity-text">{{ activity.text }}</p>
            <span class="activity-time">{{ formatTime(activity.time) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 快速操作 -->
    <div class="quick-actions">
      <h2>快速操作</h2>
      <div class="actions-grid">
        <router-link to="/dashboard/evaluations" class="action-card">
          <div class="action-icon">
            <MaterialIcon name="plus" size="xl" />
          </div>
          <h3>创建新评估</h3>
          <p>为用户创建新的领导力评估</p>
        </router-link>
        
        <router-link to="/dashboard/users" class="action-card">
          <div class="action-icon">
            <MaterialIcon name="users" size="xl" />
          </div>
          <h3>管理用户</h3>
          <p>添加、编辑和管理用户信息</p>
        </router-link>
        
        <router-link to="/dashboard/questions" class="action-card">
          <div class="action-icon">
            <MaterialIcon name="questions" size="xl" />
          </div>
          <h3>管理题目</h3>
          <p>编辑和管理评估题目</p>
        </router-link>
        
        <router-link to="/dashboard/reports" class="action-card">
          <div class="action-icon">
            <MaterialIcon name="reports" size="xl" />
          </div>
          <h3>查看报告</h3>
          <p>查看评估结果和数据分析</p>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MaterialIcon from '../components/icons/MaterialIcon.vue'
import apiClient from '../services/api'

// 统计数据
const stats = ref({
  totalUsers: 0,
  totalEvaluations: 0,
  completedEvaluations: 0,
  totalQuestions: 0
})

// 最近活动
const recentActivities = ref<any[]>([])

// 格式化时间
const formatTime = (time: Date | string) => {
  const now = new Date()
  const date = new Date(time)
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else {
    return `${days}天前`
  }
}

// 加载统计数据
const loadStats = async () => {
  try {
    const response = await apiClient.get('/system/stats')
    if (response.data) {
      stats.value = {
        totalUsers: response.data.totalUsers,
        totalEvaluations: response.data.totalEvaluations,
        completedEvaluations: response.data.completedEvaluations,
        totalQuestions: response.data.totalQuestions
      }
      recentActivities.value = response.data.recentActivities
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.dashboard-overview {
  display: flex;
  flex-direction: column;
  gap: var(--space-10);
}

.page-header {
  margin-bottom: var(--space-8);
}

.page-header h1 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--gray-900);
  margin: 0 0 var(--space-2) 0;
}

.page-subtitle {
  color: var(--gray-600);
  font-size: var(--text-lg);
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-12);
}

.stat-card {
  background: white;
  padding: var(--space-6);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  display: flex;
  align-items: center;
  gap: var(--space-4);
  border: 1px solid var(--gray-100);
  transition: all var(--transition-normal);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.stat-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-xl);
  color: white;
}

.stat-icon.users {
  background: linear-gradient(135deg, var(--info-500), var(--info-600));
}

.stat-icon.evaluations {
  background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
}

.stat-icon.completed {
  background: linear-gradient(135deg, var(--success-500), var(--success-600));
}

.stat-icon.questions {
  background: linear-gradient(135deg, var(--warning-500), var(--warning-600));
}

.stat-content h3 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--gray-900);
  margin: 0 0 var(--space-1) 0;
}

.stat-content p {
  color: var(--gray-600);
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.recent-activity {
  margin-bottom: var(--space-12);
}

.recent-activity h2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--gray-900);
  margin: 0 0 var(--space-6) 0;
}

.activity-list {
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  border: 1px solid var(--gray-100);
}

.activity-item {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  border-bottom: 1px solid var(--gray-100);
  transition: all var(--transition-fast);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-item:hover {
  background: var(--gray-50);
}

.activity-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-100), var(--primary-200));
  color: var(--primary-700);
  border-radius: var(--radius-lg);
}

.activity-content {
  flex: 1;
}

.activity-text {
  color: var(--gray-900);
  margin: 0 0 var(--space-1) 0;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.activity-time {
  color: var(--gray-500);
  font-size: var(--text-xs);
}

.quick-actions h2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--gray-900);
  margin: 0 0 var(--space-6) 0;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-6);
}

.action-card {
  background: white;
  padding: var(--space-8);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  text-decoration: none;
  color: inherit;
  transition: all var(--transition-normal);
  border: 1px solid var(--gray-100);
  position: relative;
  overflow: hidden;
}

.action-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary-500), var(--primary-600));
  transform: scaleX(0);
  transition: transform var(--transition-normal);
}

.action-card:hover::before {
  transform: scaleX(1);
}

.action-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-xl);
}

.action-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-100), var(--primary-200));
  color: var(--primary-700);
  border-radius: var(--radius-xl);
  margin-bottom: var(--space-4);
}

.action-card h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--gray-900);
  margin: 0 0 var(--space-2) 0;
}

.action-card p {
  color: var(--gray-600);
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.6;
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }
  
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }
  
  .stat-card {
    padding: var(--space-4);
    gap: var(--space-3);
  }
  
  .stat-icon {
    width: 48px;
    height: 48px;
  }
  
  .stat-content h3 {
    font-size: var(--text-2xl);
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
  
  .action-card {
    padding: var(--space-6);
  }
  
  .action-icon {
    width: 48px;
    height: 48px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }
  
  .stat-card {
    padding: var(--space-3);
    gap: var(--space-2);
  }
  
  .page-header h1 {
    font-size: var(--text-2xl);
  }
  
  .page-subtitle {
    font-size: var(--text-base);
  }
  
  .action-card {
    padding: var(--space-4);
  }
}
</style>
