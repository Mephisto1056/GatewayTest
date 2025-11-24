<template>
  <div class="report-demo page-container">
    <div class="demo-header">
      <h1>报告演示页面</h1>
      <p>这里可以查看和测试生成的报告</p>
    </div>

    <div class="demo-actions">
      <div class="action-card">
        <h3>查看用户报告</h3>
        <p>为指定用户生成并查看完整的评估报告</p>
        <div class="input-group">
          <label>用户ID:</label>
          <input 
            v-model="userId" 
            type="number" 
            placeholder="输入用户ID (例如: 1)"
            class="demo-input"
          >
        </div>
        <button @click="viewUserReport" class="demo-btn primary" :disabled="!userId">
          查看报告
        </button>
      </div>

      <div class="action-card">
        <h3>查看已有报告</h3>
        <p>查看数据库中已存在的报告</p>
        <div class="input-group">
          <label>报告ID:</label>
          <input 
            v-model="reportId" 
            type="number" 
            placeholder="输入报告ID"
            class="demo-input"
          >
        </div>
        <button @click="viewExistingReport" class="demo-btn secondary" :disabled="!reportId">
          查看报告
        </button>
      </div>

      <div class="action-card">
        <h3>快速测试</h3>
        <p>使用默认用户快速查看报告效果</p>
        <button @click="quickTest" class="demo-btn success">
          快速测试 (用户ID: 1)
        </button>
      </div>
    </div>

    <div v-if="showReport" class="report-container">
      <div class="report-header">
        <h2>报告预览</h2>
        <button @click="closeReport" class="close-btn">关闭</button>
      </div>
      <ComprehensiveReport
        :userId="currentUserId || undefined"
        :reportId="currentReportId || undefined"
      />
    </div>

    <div class="demo-info">
      <h3>使用说明</h3>
      <div class="info-grid">
        <div class="info-item">
          <h4>📊 查看报告的方式</h4>
          <ul>
            <li><strong>方式1：</strong>在"数据报告"页面点击"查看完整报告"按钮</li>
            <li><strong>方式2：</strong>直接访问 <code>/report/user/1</code> (用户ID为1)</li>
            <li><strong>方式3：</strong>访问 <code>/report/123</code> (报告ID为123)</li>
            <li><strong>方式4：</strong>使用本页面的演示功能</li>
          </ul>
        </div>

        <div class="info-item">
          <h4>💾 报告存储位置</h4>
          <ul>
            <li><strong>数据库表：</strong><code>reports</code></li>
            <li><strong>JSON数据：</strong><code>data_json</code> 字段</li>
            <li><strong>AI分析：</strong><code>ai_analysis</code> 字段</li>
            <li><strong>PDF文件：</strong><code>file_url</code> 字段（如果生成了PDF）</li>
          </ul>
        </div>

        <div class="info-item">
          <h4>📄 PDF导出功能</h4>
          <ul>
            <li>点击报告页面的"下载PDF报告"按钮</li>
            <li>系统会打开打印预览窗口</li>
            <li>选择"保存为PDF"即可导出</li>
            <li>支持完整的四个部分内容</li>
          </ul>
        </div>

        <div class="info-item">
          <h4>🎯 报告包含内容</h4>
          <ul>
            <li><strong>第一部分：</strong>个人领导力雷达图（条形图展示）</li>
            <li><strong>第二部分：</strong>优劣势分析（AI智能分析）</li>
            <li><strong>第三部分：</strong>指标含义说明（固定模板）</li>
            <li><strong>第四部分：</strong>后续行动建议（个性化建议）</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ComprehensiveReport from '../components/ComprehensiveReport.vue';

const userId = ref<number | null>(null);
const reportId = ref<number | null>(null);
const showReport = ref(false);
const currentUserId = ref<number | null>(null);
const currentReportId = ref<number | null>(null);

const viewUserReport = () => {
  if (!userId.value) return;
  
  currentUserId.value = userId.value;
  currentReportId.value = null;
  showReport.value = true;
};

const viewExistingReport = () => {
  if (!reportId.value) return;
  
  currentUserId.value = null;
  currentReportId.value = reportId.value;
  showReport.value = true;
};

const quickTest = () => {
  currentUserId.value = 1;
  currentReportId.value = null;
  showReport.value = true;
};

const closeReport = () => {
  showReport.value = false;
  currentUserId.value = null;
  currentReportId.value = null;
};
</script>

<style scoped>
.report-demo {
  width: 100%;
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: var(--space-8) var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.demo-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.demo-header h1 {
  color: var(--gray-900);
  margin: 0;
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
}

.demo-header p {
  color: var(--gray-600);
  font-size: var(--text-lg);
  margin: 0;
}

.demo-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-6);
}

.action-card {
  background: white;
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--gray-100);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  transition: box-shadow var(--transition-normal), transform var(--transition-normal);
}

.action-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
}

.action-card h3 {
  color: var(--gray-900);
  margin: 0;
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
}

.action-card p {
  color: var(--gray-600);
  margin: 0;
  line-height: 1.6;
  font-size: var(--text-sm);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.input-group label {
  font-weight: var(--font-medium);
  color: var(--gray-700);
  font-size: var(--text-sm);
}

.demo-input {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.demo-input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
}

.demo-btn {
  width: 100%;
  padding: var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-2);
}

.demo-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.demo-btn.primary {
  background: var(--info-500);
  color: white;
}

.demo-btn.primary:hover:not(:disabled) {
  background: var(--info-600);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.demo-btn.secondary {
  background: var(--gray-700);
  color: white;
}

.demo-btn.secondary:hover:not(:disabled) {
  background: var(--gray-800);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.demo-btn.success {
  background: var(--success-600);
  color: white;
}

.demo-btn.success:hover {
  background: var(--success-600);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.report-container {
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-5);
  background: var(--gray-50);
  border-bottom: 1px solid var(--gray-200);
}

.report-header h2 {
  margin: 0;
  color: var(--gray-900);
  font-size: var(--text-xl);
}

.close-btn {
  padding: var(--space-2) var(--space-3);
  background: var(--error-500);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.close-btn:hover {
  background: var(--error-600);
  transform: translateY(-1px);
}

.demo-info {
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.demo-info h3 {
  color: var(--gray-900);
  margin: 0;
  text-align: center;
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-4);
}

.info-item {
  background: var(--gray-50);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border-left: 4px solid var(--primary-500);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.info-item h4 {
  margin: 0;
  color: var(--gray-900);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.info-item ul {
  margin: 0;
  padding-left: var(--space-5);
  color: var(--gray-700);
  font-size: var(--text-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.info-item code {
  background: var(--gray-200);
  padding: 0.2rem 0.4rem;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}

@media (max-width: 1024px) {
  .demo-actions {
    gap: var(--space-4);
  }
}

@media (max-width: 768px) {
  .demo-actions {
    grid-template-columns: 1fr;
  }

  .action-card {
    padding: var(--space-5);
  }

  .demo-info {
    padding: var(--space-4);
  }
}

@media (max-width: 480px) {
  .demo-actions {
    gap: var(--space-3);
  }

  .action-card {
    padding: var(--space-4);
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>