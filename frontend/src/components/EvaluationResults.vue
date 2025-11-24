<template>
  <div class="results-container">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>正在计算评估结果...</p>
    </div>

    <div v-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="loadResults" class="retry-btn">重试</button>
    </div>

    <div v-if="results && !loading" class="results-content">
      <!-- 结果头部 -->
      <div class="results-header">
        <h1>评估结果报告</h1>
        <div class="user-info">
          <h2>{{ results.userName || '未知用户' }}</h2>
          <p class="role">{{ results.userRole }}</p>
          <p class="evaluation-date">评估时间: {{ formatDate(results.evaluationDate) }}</p>
        </div>
      </div>

      <!-- 总体得分概览 -->
      <div class="score-overview">
        <div class="overall-score">
          <div class="score-circle">
            <svg viewBox="0 0 100 100" class="circular-progress">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e6e6e6"
                stroke-width="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#28a745"
                stroke-width="8"
                stroke-linecap="round"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="circumference - (results.overallPercentage / 100) * circumference"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div class="score-text">
              <span class="percentage">{{ results.overallPercentage.toFixed(1) }}%</span>
              <span class="label">总体得分</span>
            </div>
          </div>
          <div class="score-details">
            <p><strong>总分:</strong> {{ results.totalScore.toFixed(1) }} / {{ results.maxTotalScore }}</p>
            <p><strong>评估类型:</strong> {{ is360Degree ? '360度评估' : '单次评估' }}</p>
          </div>
        </div>
      </div>

      <!-- 维度得分详情 -->
      <div class="dimensions-section">
        <h3>自主导向能力评估</h3>
        <div class="dimensions-grid">
          <div
            v-for="dimension in results.selfdirectedScores"
            :key="dimension.dimension"
            class="dimension-card"
          >
            <div class="dimension-header">
              <h4>{{ dimension.dimension }}</h4>
              <span class="dimension-score">{{ dimension.percentage.toFixed(1) }}%</span>
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: dimension.percentage + '%' }"
              ></div>
            </div>
            <div class="dimension-details">
              <p>得分: {{ dimension.totalScore.toFixed(1) }} / {{ dimension.maxScore }}</p>
              <p>题目数: {{ dimension.questionScores.length }}</p>
            </div>
            
            <!-- 问题详情（可展开） -->
            <div class="question-details" v-if="expandedDimensions.has(dimension.dimension)">
              <div
                v-for="question in dimension.questionScores"
                :key="question.questionCode"
                class="question-score"
              >
                <div class="question-info">
                  <span class="question-code">{{ question.questionCode }}</span>
                  <span class="original-score">原始: {{ question.originalScore }}</span>
                  <span class="final-score">最终: {{ question.finalScore.toFixed(1) }}</span>
                </div>
                <div class="question-flags">
                  <span v-if="question.isReversed" class="flag reversed">反向计分</span>
                  <span v-if="question.relevanceApplied" class="flag relevance">相关性调整</span>
                </div>
              </div>
            </div>
            
            <button
              @click="toggleDimension(dimension.dimension)"
              class="toggle-details"
            >
              {{ expandedDimensions.has(dimension.dimension) ? '收起详情' : '展开详情' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 角色特定能力评估 -->
      <div class="dimensions-section">
        <h3>{{ getRoleSpecificTitle() }}</h3>
        <div class="dimensions-grid">
          <div
            v-for="dimension in results.roleSpecificScores"
            :key="dimension.dimension"
            class="dimension-card"
          >
            <div class="dimension-header">
              <h4>{{ dimension.dimension }}</h4>
              <span class="dimension-score">{{ dimension.percentage.toFixed(1) }}%</span>
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill role-specific"
                :style="{ width: dimension.percentage + '%' }"
              ></div>
            </div>
            <div class="dimension-details">
              <p>得分: {{ dimension.totalScore.toFixed(1) }} / {{ dimension.maxScore }}</p>
              <p>题目数: {{ dimension.questionScores.length }}</p>
            </div>
            
            <!-- 问题详情（可展开） -->
            <div class="question-details" v-if="expandedDimensions.has(dimension.dimension)">
              <div
                v-for="question in dimension.questionScores"
                :key="question.questionCode"
                class="question-score"
              >
                <div class="question-info">
                  <span class="question-code">{{ question.questionCode }}</span>
                  <span class="original-score">原始: {{ question.originalScore }}</span>
                  <span class="final-score">最终: {{ question.finalScore.toFixed(1) }}</span>
                </div>
                <div class="question-flags">
                  <span v-if="question.isReversed" class="flag reversed">反向计分</span>
                  <span v-if="question.relevanceApplied" class="flag relevance">
                    相关性调整 ({{ question.relevantQuestionCode }})
                  </span>
                </div>
              </div>
            </div>
            
            <button
              @click="toggleDimension(dimension.dimension)"
              class="toggle-details"
            >
              {{ expandedDimensions.has(dimension.dimension) ? '收起详情' : '展开详情' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 360度评估权重信息 -->
      <div v-if="is360Degree && weightInfo" class="weight-info-section">
        <h3>360度评估权重分布</h3>
        <div class="weight-chart">
          <div
            v-for="(weight, relationship) in weightInfo"
            :key="relationship"
            class="weight-item"
          >
            <div class="weight-label">{{ relationship }}</div>
            <div class="weight-bar">
              <div
                class="weight-fill"
                :style="{ width: (weight * 100) + '%' }"
              ></div>
            </div>
            <div class="weight-percentage">{{ (weight * 100) }}%</div>
          </div>
        </div>
      </div>

      <!-- 建议和改进方向 -->
      <div class="recommendations-section">
        <h3>发展建议</h3>
        <div class="recommendations">
          <div
            v-for="recommendation in getRecommendations()"
            :key="recommendation.area"
            class="recommendation-card"
          >
            <h4>{{ recommendation.area }}</h4>
            <p class="recommendation-text">{{ recommendation.suggestion }}</p>
            <div class="recommendation-priority" :class="recommendation.priority">
              {{ getPriorityText(recommendation.priority) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="actions-section">
        <button @click="exportResults" class="action-btn export">导出报告</button>
        <button @click="shareResults" class="action-btn share">分享结果</button>
        <button @click="newEvaluation" class="action-btn new">新建评估</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

// 接口定义
interface QuestionScore {
  questionCode: string;
  originalScore: number;
  finalScore: number;
  isReversed: boolean;
  relevanceApplied: boolean;
  relevantQuestionCode?: string;
}

interface DimensionScore {
  dimension: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  questionScores: QuestionScore[];
}

interface EvaluationResults {
  userId: number;
  userName?: string;
  userRole: string;
  evaluationDate?: string;
  selfdirectedScores: DimensionScore[];
  roleSpecificScores: DimensionScore[];
  totalScore: number;
  maxTotalScore: number;
  overallPercentage: number;
}

interface Recommendation {
  area: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

// Props
const props = defineProps<{
  evaluationId?: number;
  userId?: number;
  is360Degree?: boolean;
}>();

// 响应式数据
const results = ref<EvaluationResults | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const expandedDimensions = ref<Set<string>>(new Set());
const weightInfo = ref<Record<string, number> | null>(null);

// 计算属性
const circumference = computed(() => 2 * Math.PI * 45);

const is360Degree = computed(() => props.is360Degree || false);

// 方法
const formatDate = (dateString?: string): string => {
  if (!dateString) return new Date().toLocaleDateString('zh-CN');
  return new Date(dateString).toLocaleDateString('zh-CN');
};

const getRoleSpecificTitle = (): string => {
  if (!results.value) return '角色专属能力评估';
  
  const role = results.value.userRole.toLowerCase();
  if (role.includes('高层') || role.includes('总经理-1')) {
    return '高层领导力评估';
  } else if (role.includes('中层') || role.includes('总经理-2')) {
    return '中层管理力评估';
  } else if (role.includes('基层') || role.includes('一线')) {
    return '基层管理力评估';
  }
  return '角色专属能力评估';
};

const toggleDimension = (dimension: string) => {
  if (expandedDimensions.value.has(dimension)) {
    expandedDimensions.value.delete(dimension);
  } else {
    expandedDimensions.value.add(dimension);
  }
};

const getRecommendations = (): Recommendation[] => {
  if (!results.value) return [];
  
  const recommendations: Recommendation[] = [];
  
  // 基于得分生成建议
  const allDimensions = [...results.value.selfdirectedScores, ...results.value.roleSpecificScores];
  
  allDimensions.forEach(dimension => {
    if (dimension.percentage < 60) {
      recommendations.push({
        area: dimension.dimension,
        suggestion: `在${dimension.dimension}方面需要重点提升。建议通过培训、实践和反馈来加强相关能力。`,
        priority: 'high'
      });
    } else if (dimension.percentage < 80) {
      recommendations.push({
        area: dimension.dimension,
        suggestion: `${dimension.dimension}表现良好，可以通过进一步的实践和学习来达到优秀水平。`,
        priority: 'medium'
      });
    }
  });
  
  // 如果没有需要改进的维度，给出保持建议
  if (recommendations.length === 0) {
    recommendations.push({
      area: '整体表现',
      suggestion: '各项能力表现优秀，建议继续保持并寻求更高层次的挑战和发展机会。',
      priority: 'low'
    });
  }
  
  return recommendations;
};

const getPriorityText = (priority: string): string => {
  const texts = {
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级'
  };
  return texts[priority as keyof typeof texts] || priority;
};

const loadResults = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    let endpoint = '';
    if (is360Degree.value && props.evaluationId) {
      endpoint = `/api/evaluations/${props.evaluationId}/calculate-360`;
    } else if (props.evaluationId) {
      endpoint = `/api/evaluations/${props.evaluationId}/results`;
    } else {
      throw new Error('缺少必要的参数');
    }
    
    const response = await fetch(endpoint, {
      method: is360Degree.value ? 'POST' : 'GET'
    });
    
    if (!response.ok) {
      throw new Error('获取结果失败');
    }
    
    const data = await response.json();
    
    if (data.success) {
      results.value = data.result;
      
      // 如果是360度评估，设置权重信息
      if (is360Degree.value) {
        setWeightInfo(results.value?.userRole);
      }
    } else {
      throw new Error(data.message || '获取结果失败');
    }
    
  } catch (e) {
    console.error('加载结果失败:', e);
    error.value = '加载结果失败，请稍后重试。';
  } finally {
    loading.value = false;
  }
};

const setWeightInfo = (userRole?: string) => {
  if (!userRole) return;
  
  const role = userRole.toLowerCase();
  if (role.includes('高层') || role.includes('总经理-1')) {
    weightInfo.value = { '上级': 0.5, '平级': 0.3, '下级': 0.2 };
  } else if (role.includes('中层') || role.includes('总经理-2')) {
    weightInfo.value = { '上级': 0.4, '平级': 0.4, '下级': 0.2 };
  } else if (role.includes('基层') || role.includes('一线')) {
    weightInfo.value = { '上级': 0.3, '平级': 0.3, '下级': 0.4 };
  }
};

const exportResults = () => {
  // 实现导出功能
  alert('导出功能开发中...');
};

const shareResults = () => {
  // 实现分享功能
  alert('分享功能开发中...');
};

const newEvaluation = () => {
  // 跳转到新评估页面
  window.location.href = '/questionnaire';
};

// 生命周期
onMounted(() => {
  loadResults();
});
</script>

<style scoped>
.results-container {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8f9fa;
  min-height: 100vh;
}

.loading {
  text-align: center;
  padding: 4rem 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e3e3e3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  text-align: center;
  padding: 2rem;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  color: #721c24;
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.results-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.results-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
}

.results-header h1 {
  margin: 0 0 1rem 0;
  font-size: 2.5rem;
  font-weight: 600;
}

.user-info h2 {
  margin: 0.5rem 0;
  font-size: 1.8rem;
}

.role {
  font-size: 1.2rem;
  opacity: 0.9;
  margin: 0.5rem 0;
}

.evaluation-date {
  opacity: 0.8;
  margin: 0.5rem 0;
}

.score-overview {
  padding: 3rem 2rem;
  text-align: center;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.overall-score {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3rem;
  flex-wrap: wrap;
}

.score-circle {
  position: relative;
  width: 200px;
  height: 200px;
}

.circular-progress {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.score-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.percentage {
  display: block;
  font-size: 2.5rem;
  font-weight: bold;
  color: #28a745;
}

.label {
  display: block;
  font-size: 1rem;
  color: #6c757d;
  margin-top: 0.5rem;
}

.score-details {
  text-align: left;
}

.score-details p {
  margin: 0.5rem 0;
  font-size: 1.1rem;
}

.dimensions-section {
  padding: 2rem;
  border-bottom: 1px solid #e9ecef;
}

.dimensions-section h3 {
  color: #495057;
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.dimensions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

.dimension-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #dee2e6;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.dimension-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.dimension-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.dimension-header h4 {
  margin: 0;
  color: #495057;
  font-size: 1.2rem;
}

.dimension-score {
  font-size: 1.5rem;
  font-weight: bold;
  color: #007bff;
}

.progress-bar {
  width: 100%;
  height: 12px;
  background: #e9ecef;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
  transition: width 0.3s ease;
}

.progress-fill.role-specific {
  background: linear-gradient(90deg, #007bff 0%, #6610f2 100%);
}

.dimension-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.dimension-details p {
  margin: 0;
  font-size: 0.9rem;
  color: #6c757d;
}

.question-details {
  margin: 1rem 0;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.question-score {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f8f9fa;
}

.question-score:last-child {
  border-bottom: none;
}

.question-info {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.question-code {
  font-weight: bold;
  color: #495057;
}

.original-score, .final-score {
  font-size: 0.9rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.original-score {
  background: #e9ecef;
  color: #6c757d;
}

.final-score {
  background: #d4edda;
  color: #155724;
}

.question-flags {
  display: flex;
  gap: 0.5rem;
}

.flag {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
}

.flag.reversed {
  background: #fff3cd;
  color: #856404;
}

.flag.relevance {
  background: #d1ecf1;
  color: #0c5460;
}

.toggle-details {
  width: 100%;
  padding: 0.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.toggle-details:hover {
  background: #0056b3;
}

.weight-info-section {
  padding: 2rem;
  background: #f8f9fa;
}

.weight-info-section h3 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #495057;
}

.weight-chart {
  max-width: 600px;
  margin: 0 auto;
}

.weight-item {
  display: grid;
  grid-template-columns: 100px 1fr 60px;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}

.weight-label {
  font-weight: 500;
  color: #495057;
}

.weight-bar {
  height: 20px;
  background: #e9ecef;
  border-radius: 10px;
  overflow: hidden;
}

.weight-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffc107 0%, #fd7e14 100%);
  transition: width 0.3s ease;
}

.weight-percentage {
  text-align: right;
  font-weight: bold;
  color: #495057;
}

.recommendations-section {
  padding: 2rem;
}

.recommendations-section h3 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #495057;
}

.recommendations {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.recommendation-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  border-left: 4px solid #007bff;
}

.recommendation-card h4 {
  margin: 0 0 1rem 0;
  color: #495057;
}

.recommendation-text {
  margin: 0 0 1rem 0;
  line-height: 1.6;
  color: #6c757d;
}

.recommendation-priority {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  display: inline-block;
}

.recommendation-priority.high {
  background: #f8d7da;
  color: #721c24;
}

.recommendation-priority.medium {
  background: #fff3cd;
  color: #856404;
}

.recommendation-priority.low {
  background: #d4edda;
  color: #155724;
}

.actions-section {
  padding: 2rem;
  text-align: center;
  background: #f8f9fa;
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.action-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.action-btn.export {
  background: #28a745;
  color: white;
}

.action-btn.share {
  background: #17a2b8;
  color: white;
}

.action-btn.new {
  background: #007bff;
  color: white;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .results-container {
    margin: 1rem;
    padding: 1rem;
  }
  
  .overall-score {
    flex-direction: column;
    gap: 2rem;
  }
  
  .dimensions-grid {
    grid-template-columns: 1fr;
  }
  
  .actions-section {
    flex-direction: column;
    align-items: center;
  }
  
  .action-btn {
    width: 200px;
  }
}
</style>