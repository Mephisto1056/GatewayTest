<template>
  <div class="user-dashboard">
    <div class="page-header">
      <div class="header-content">
        <h1>我的评估任务</h1>
        <p class="page-subtitle">在这里完成所有待处理的评估问卷</p>
      </div>
      <div class="header-actions">
        <div class="notification-bell" @click="clearNotifications" v-if="newTasksCount > 0">
          <MaterialIcon name="notifications_active" size="md" />
          <span class="notification-badge">{{ newTasksCount }}</span>
        </div>
        <router-link to="/my-report" class="btn btn-secondary" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none; margin-right: 8px;">
          <MaterialIcon name="summarize" size="sm" />
          我的报告
        </router-link>
        <button @click="logout" class="btn btn-secondary">
          <MaterialIcon name="logout" size="sm" />
          退出登录
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>正在加载任务...</p>
    </div>

    <div v-else-if="pendingTasks.length === 0 && completedTasks.length === 0" class="empty-state">
      <div class="empty-icon">
        <MaterialIcon name="check" size="xl" />
      </div>
      <h2>太棒了！</h2>
      <p>您暂时没有评估任务。</p>
    </div>

    <div v-else class="tasks-container">
      <!-- 待办任务 -->
      <div v-if="pendingTasks.length > 0" class="tasks-section">
        <div class="section-header">
          <h2>待完成任务</h2>
          <span class="task-count">{{ pendingTasks.length }} 个任务</span>
        </div>
        <div class="tasks-grid">
          <div v-for="task in pendingTasks" :key="task.id" class="task-card" :class="{ 'new-task': isNew(task.id) }">
            <div class="task-header">
              <div class="task-title">
                <h3>{{ task.relationship === '提名' ? '提名评价人' : task.evaluation.title }}</h3>
                <div class="title-badges">
                  <span v-if="isNew(task.id)" class="badge badge-new">新</span>
                  <span class="badge" :class="getRelationshipClass(task.relationship)">
                    {{ task.relationship }}
                  </span>
                </div>
              </div>
            </div>
            <div class="task-content">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-icon">
                    <MaterialIcon name="users" size="sm" />
                  </div>
                  <div class="info-details">
                    <span class="info-label">评估对象</span>
                    <span class="info-value">{{ task.evaluation.user.name }}</span>
                  </div>
                </div>
                <!-- 仅非提名任务显示详细信息 -->
                <template v-if="task.relationship !== '提名'">
                  <div class="info-item">
                    <div class="info-icon">
                      <MaterialIcon name="evaluations" size="sm" />
                    </div>
                    <div class="info-details">
                      <span class="info-label">对象角色</span>
                      <span class="info-value">{{ task.evaluation.user.role }}</span>
                    </div>
                  </div>
                </template>
                <div class="info-item">
                  <div class="info-icon">
                    <MaterialIcon name="warning" size="sm" />
                  </div>
                  <div class="info-details">
                    <span class="info-label">截止日期</span>
                    <span class="info-value">{{ formatDate(task.evaluation.endDate) }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="task-footer">
              <!-- 提名任务显示提名按钮 -->
              <router-link
                v-if="task.relationship === '提名'"
                :to="`/evaluation/${task.evaluationId}/nominate`"
                class="btn btn-primary"
                @click="markAsRead(task.id)"
              >
                <MaterialIcon name="group_add" size="sm" />
                选择评价人
              </router-link>
              
              <!-- 其他任务显示开始评估按钮 -->
              <div v-else class="action-wrapper">
                <router-link
                  v-if="!hasPendingNomination"
                  :to="`/questionnaire?evaluationId=${task.evaluationId}&targetUserId=${task.evaluation.userId}&relationship=${task.relationship}`"
                  class="btn btn-primary"
                  @click="markAsRead(task.id)"
                >
                  <MaterialIcon name="edit" size="sm" />
                  开始评估
                </router-link>
                <button v-else class="btn btn-disabled" disabled title="请先完成评价人提名任务">
                  <MaterialIcon name="lock" size="sm" />
                  请先完成提名
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 已完成任务 -->
      <div v-if="completedTasks.length > 0" class="tasks-section completed-section">
        <div class="section-header">
          <h2>已完成任务</h2>
          <span class="task-count count-gray">{{ completedTasks.length }} 个任务</span>
        </div>
        <div class="tasks-grid">
          <div v-for="task in completedTasks" :key="task.id" class="task-card task-completed">
            <div class="task-header header-completed">
              <div class="task-title">
                <h3>{{ task.relationship === '提名' ? '提名评价人' : task.evaluation.title }}</h3>
                <div class="title-badges">
                  <span class="badge badge-completed">已完成</span>
                  <span class="badge badge-gray">{{ task.relationship }}</span>
                </div>
              </div>
            </div>
            <div class="task-content">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-icon icon-completed">
                    <MaterialIcon name="users" size="sm" />
                  </div>
                  <div class="info-details">
                    <span class="info-label">评估对象</span>
                    <span class="info-value">{{ task.evaluation.user.name }}</span>
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-icon icon-completed">
                    <MaterialIcon name="check" size="sm" />
                  </div>
                  <div class="info-details">
                    <span class="info-label">状态</span>
                    <span class="info-value">任务已完成</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { getMyTasks } from '../services/api';
import MaterialIcon from '../components/icons/MaterialIcon.vue';

const SEEN_TASKS_KEY = 'seen_tasks';

export default defineComponent({
  name: 'UserDashboard',
  components: { MaterialIcon },
  setup() {
    const router = useRouter();
    const tasks = ref<any[]>([]);
    const loading = ref(true);
    const seenTasks = ref<Set<string>>(new Set());

    const pendingTasks = computed(() => tasks.value.filter(t => t.status === 'pending'));
    const completedTasks = computed(() => tasks.value.filter(t => t.status === 'completed'));

    // 检查是否有待完成的提名任务
    const hasPendingNomination = computed(() => {
      return pendingTasks.value.some(t => t.relationship === '提名');
    });

    const newTasksCount = computed(() => {
      return pendingTasks.value.filter(task => !seenTasks.value.has(task.id)).length;
    });

    const isNew = (taskId: string) => {
      return !seenTasks.value.has(taskId);
    };

    const loadSeenTasks = () => {
      const stored = localStorage.getItem(SEEN_TASKS_KEY);
      if (stored) {
        seenTasks.value = new Set(JSON.parse(stored));
      }
    };

    const saveSeenTasks = () => {
      localStorage.setItem(SEEN_TASKS_KEY, JSON.stringify(Array.from(seenTasks.value)));
    };

    const markAsRead = (taskId: string) => {
      if (!seenTasks.value.has(taskId)) {
        seenTasks.value.add(taskId);
        saveSeenTasks();
      }
    };
    
    const clearNotifications = () => {
      tasks.value.forEach(task => seenTasks.value.add(task.id));
      saveSeenTasks();
    };

    const fetchTasks = async () => {
      try {
        loading.value = true;
        const response = await getMyTasks('all');
        tasks.value = response.data;
      } catch (error) {
        console.error('获取待办任务失败:', error);
        // 可以在这里添加错误提示
      } finally {
        loading.value = false;
      }
    };

    const logout = () => {
      localStorage.removeItem('access_token');
      router.push('/login');
    };

    const formatDate = (dateString?: string) => {
      if (!dateString) return '无';
      return new Date(dateString).toLocaleDateString();
    };

    const getRelationshipClass = (relationship: string) => {
      const map: Record<string, string> = {
        '自评': 'badge-self',
        '上级': 'badge-superior',
        '平级': 'badge-peer',
        '下级': 'badge-subordinate',
        '提名': 'badge-nominate',
      };
      return map[relationship] || 'badge-gray';
    };

    onMounted(() => {
      loadSeenTasks();
      fetchTasks();
    });

    return {
      tasks,
      pendingTasks,
      completedTasks,
      loading,
      newTasksCount,
      logout,
      formatDate,
      getRelationshipClass,
      isNew,
      markAsRead,
      clearNotifications,
      hasPendingNomination,
    };
  },
});
</script>

<style scoped>
.user-dashboard {
  width: 100%;
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: var(--space-8) var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--gray-200);
  margin-bottom: var(--space-2);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.notification-bell {
  position: relative;
  cursor: pointer;
  color: var(--gray-600);
  padding: var(--space-2);
  border-radius: var(--radius-full);
  transition: background-color var(--transition-fast);
}

.notification-bell:hover {
  background-color: var(--gray-100);
  color: var(--primary-600);
}

.notification-badge {
  position: absolute;
  top: 0;
  right: 0;
  background-color: var(--danger-500);
  color: white;
  border-radius: var(--radius-full);
  width: 20px;
  height: 20px;
  font-size: var(--text-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-bold);
  border: 2px solid white;
}

.header-content h1 {
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

.loading-state, .empty-state {
  text-align: center;
  padding: var(--space-12);
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--gray-100);
}

.loading-state p, .empty-state p {
  color: var(--gray-600);
  margin: 0;
  font-size: var(--text-base);
}

.empty-state h2 {
  color: var(--gray-900);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin: var(--space-4) 0;
}

.empty-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--success-100), var(--success-200));
  color: var(--success-700);
  border-radius: var(--radius-xl);
  margin: 0 auto var(--space-4);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--gray-200);
  border-top: 3px solid var(--primary-600);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--space-4);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.tasks-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--gray-900);
  margin: 0;
}

.task-count {
  background: var(--primary-100);
  color: var(--primary-800);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-6);
}

.task-card {
  background: white;
  border: 1px solid var(--gray-100);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  transition: all var(--transition-normal);
  overflow: hidden;
}

.task-card.new-task {
  border-left: 4px solid var(--primary-500);
  box-shadow: var(--shadow-lg);
}

.task-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.task-header {
  padding: var(--space-6);
  border-bottom: 1px solid var(--gray-100);
  background: var(--gray-50);
}

.task-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
}

.title-badges {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.badge-new {
  background-color: var(--danger-100);
  color: var(--danger-800);
  font-weight: var(--font-bold);
}

.task-title h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
  margin: 0;
  flex: 1;
}

.task-content {
  padding: var(--space-6);
  flex-grow: 1;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.info-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.info-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-100), var(--primary-200));
  color: var(--primary-700);
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.info-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
}

.info-label {
  color: var(--gray-500);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-weight: var(--font-medium);
  color: var(--gray-900);
  font-size: var(--text-sm);
}

.task-footer {
  padding: var(--space-6);
  background: var(--gray-50);
  border-top: 1px solid var(--gray-100);
  display: flex;
  justify-content: flex-end;
}

.task-footer .btn {
  min-width: 120px;
}

.btn-disabled {
  background-color: var(--gray-200);
  color: var(--gray-500);
  cursor: not-allowed;
  border: 1px solid var(--gray-300);
}

.btn-disabled:hover {
  background-color: var(--gray-200);
  transform: none;
  box-shadow: none;
}

.action-wrapper {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 1024px) {
  .user-dashboard {
    padding: var(--space-6) var(--space-4);
    gap: var(--space-6);
  }
  
  .tasks-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-4);
  }
}

@media (max-width: 768px) {
  .user-dashboard {
    padding: var(--space-5) var(--space-3);
    gap: var(--space-5);
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-4);
  }
  
  .header-content h1 {
    font-size: var(--text-2xl);
  }
  
  .page-subtitle {
    font-size: var(--text-base);
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
  
  .tasks-grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
  
  .task-header,
  .task-content,
  .task-footer {
    padding: var(--space-4);
  }
}

@media (max-width: 480px) {
  .user-dashboard {
    padding: var(--space-4) var(--space-3);
    gap: var(--space-4);
  }
  
  .header-content h1 {
    font-size: var(--text-xl);
  }
  
  .task-title {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
  
  .info-item {
    gap: var(--space-2);
  }
  
  .info-icon {
    width: 32px;
    height: 32px;
  }
}

/* Completed Section Styles */
.completed-section {
  margin-top: var(--space-8);
  border-top: 1px solid var(--gray-200);
  padding-top: var(--space-8);
}

.count-gray {
  background: var(--gray-100);
  color: var(--gray-600);
}

.task-completed {
  background: var(--gray-50);
  border-color: var(--gray-200);
  opacity: 0.8;
}

.task-completed:hover {
  transform: none;
  box-shadow: var(--shadow-sm);
}

.header-completed {
  background: var(--gray-100);
}

.badge-completed {
  background-color: var(--success-100);
  color: var(--success-700);
}

.badge-nominate {
  background-color: var(--warning-100);
  color: var(--warning-800);
}

.badge-gray {
  background-color: var(--gray-200);
  color: var(--gray-600);
}

.icon-completed {
  background: var(--gray-200);
  color: var(--gray-500);
}
</style>
