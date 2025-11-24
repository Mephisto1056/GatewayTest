<template>
  <div class="my-report-page page-container">
    <header class="page-header">
      <div>
        <h1>我的最新评估报告</h1>
        <p v-if="report" class="page-subtitle">
          报告生成于 {{ formatDate(report.generatedAt) }}
        </p>
      </div>
      <router-link to="/user-dashboard" class="btn btn-secondary">
        返回仪表盘
      </router-link>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>正在加载报告...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h2>无法加载报告</h2>
      <p>{{ error }}</p>
    </div>

    <div v-else-if="!report" class="empty-state">
      <div class="empty-icon">📄</div>
      <h2>暂无报告</h2>
      <p>系统尚未生成您的评估报告，请稍后再试。</p>
    </div>

    <div v-else class="report-content">
      <ComprehensiveReport :report-data="report.dataJson" :ai-analysis="report.aiAnalysis" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { getMyLatestReport } from '../services/api';
import ComprehensiveReport from '../components/ComprehensiveReport.vue';

export default defineComponent({
  name: 'MyReport',
  components: { ComprehensiveReport },
  setup() {
    const report = ref<any>(null);
    const loading = ref(true);
    const error = ref<string | null>(null);

    const fetchReport = async () => {
      try {
        loading.value = true;
        error.value = null;
        const response = await getMyLatestReport();
        if (response.data.success) {
          report.value = response.data.report;
        } else {
          error.value = response.data.message;
        }
      } catch (err) {
        console.error('获取报告失败:', err);
        error.value = '网络错误或服务器无法响应，请稍后重试。';
      } finally {
        loading.value = false;
      }
    };

    const formatDate = (dateString?: string) => {
      if (!dateString) return '';
      return new Date(dateString).toLocaleString('zh-CN');
    };

    onMounted(fetchReport);

    return {
      report,
      loading,
      error,
      formatDate,
    };
  },
});
</script>

<style scoped>
.my-report-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--gray-200);
}

.page-header h1 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  margin: 0;
}

.page-subtitle {
  color: var(--gray-600);
  margin-top: var(--space-1);
}

.loading-state, .error-state, .empty-state {
  text-align: center;
  padding: var(--space-12);
  background: var(--gray-50);
  border-radius: var(--radius-xl);
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

.error-icon, .empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}
</style>
