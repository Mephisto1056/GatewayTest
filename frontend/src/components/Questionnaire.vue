<template>
  <div class="questionnaire-layout">
    <!-- 顶部导航栏 -->
    <header class="questionnaire-header">
      <div class="header-content">
        <h1 class="logo">领导力评估问卷</h1>
        <nav class="header-nav">
          <router-link to="/dashboard" class="nav-link">
            <MaterialIcon name="dashboard" size="sm" />
            返回管理后台
          </router-link>
        </nav>
      </div>
    </header>

    <div class="questionnaire-main">
      <div class="questionnaire-container">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>正在加载问卷...</p>
        </div>
        
        <div v-if="error" class="error-state">
          <div class="error-icon">⚠️</div>
          <p>{{ error }}</p>
          <button @click="loadQuestionnaire" class="btn btn-primary">重试</button>
        </div>
        
        <div v-if="questionnaire && !loading" class="questionnaire-content">
          <!-- 问卷信息卡片 -->
          <div class="info-card">
            <div class="card-header">
              <h2>评估信息</h2>
            </div>
            <div class="card-body">
              <div class="user-info-grid">
                <div class="form-group">
                  <label>评估对象</label>
                  <p class="form-static-text">{{ targetUser?.name || '加载中...' }}</p>
                </div>
                <div class="form-group">
                  <label>角色</label>
                  <p class="form-static-text">{{ targetUser?.role || '加载中...' }}</p>
                </div>
                <div class="form-group" v-if="!isRelationshipFixed">
                  <label>被测评人与您的关系</label>
                  <select v-model="relationship" required class="form-select">
                    <option value="">请选择</option>
                    <option value="上级">上级</option>
                    <option value="平级">平级</option>
                    <option value="下级">下级</option>
                    <option value="自评">自评</option>
                  </select>
                </div>
                 <div class="form-group" v-else>
                  <label>被测评人与您的关系</label>
                  <p class="form-static-text">{{ relationship }}</p>
                </div>
              </div>
              
              <div class="progress-section">
                <div class="progress-info">
                  <span class="progress-text">总题数: {{ totalQuestions }} | 已完成: {{ completedQuestions }}</span>
                  <span class="progress-percentage">{{ progressPercentage }}%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 自主导向问题 -->
          <div v-if="questionnaire.selfdirected.length > 0" class="question-section">
            <div class="section-header">
              <h2 class="section-title">自主导向评估</h2>
              <span class="section-count">{{ questionnaire.selfdirected.length }}题</span>
            </div>
            <div class="questions-grid">
              <div v-for="(question, index) in questionnaire.selfdirected" :key="question.questionCode" class="question-card">
                <div class="question-header">
                  <span class="question-number">{{ index + 1 }}</span>
                </div>
                <div class="question-content">
                  <p class="question-text">{{ question.questionText }}</p>
                  
                  <!-- 评分选项 -->
                  <div class="rating-options">
                    <label v-for="score in [1, 2, 3, 4, 5]" :key="score" class="rating-option">
                      <input
                        type="radio"
                        :name="`question-${question.questionCode}`"
                        :value="score"
                        v-model="responses[question.questionCode]"
                        @change="updateProgress"
                      >
                      <span class="rating-label">{{ getRatingLabel(score) }}</span>
                      <span class="rating-score">{{ score }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 角色特定问题 -->
          <div v-if="questionnaire.roleSpecific.length > 0" class="question-section">
            <div class="section-header">
              <h2 class="section-title">{{ getRoleSpecificTitle() }}</h2>
              <span class="section-count">{{ questionnaire.roleSpecific.length }}题</span>
            </div>
            <div class="questions-grid">
              <div v-for="(question, index) in questionnaire.roleSpecific" :key="question.questionCode" class="question-card">
                <div class="question-header">
                  <span class="question-number">{{ questionnaire.selfdirected.length + index + 1 }}</span>
                </div>
                <div class="question-content">
                  <p class="question-text">{{ question.questionText }}</p>
                  
                  <!-- 判断是否为开放式问题 -->
                  <!-- 如果是自评，则不显示开放式问题 -->
                  <div v-if="isOpenEndedQuestion(question) && relationship !== '自评'" class="open-question">
                    <textarea
                      v-model="responses[question.questionCode]"
                      placeholder="请详细描述您的观察和建议..."
                      @input="updateProgress"
                      class="form-textarea"
                    ></textarea>
                  </div>
                  <div v-else-if="isOpenEndedQuestion(question) && relationship === '自评'" class="open-question-hidden" style="color: #64748b; font-style: italic; padding: 10px; background: #f8fafc; border-radius: 6px;">
                    <span>(自评环节无需填写此开放式问题)</span>
                  </div>
                  
                  <!-- 评分选项 -->
                  <div v-else class="rating-options">
                    <label v-for="score in [1, 2, 3, 4, 5]" :key="score" class="rating-option">
                      <input
                        type="radio"
                        :name="`question-${question.questionCode}`"
                        :value="score"
                        v-model="responses[question.questionCode]"
                        @change="updateProgress"
                      >
                      <span class="rating-label">{{ getRatingLabel(score) }}</span>
                      <span class="rating-score">{{ score }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 提交区域 -->
          <div class="submit-card">
            <div class="card-body">
              <div v-if="!isFormValid" class="validation-message">
                <MaterialIcon name="warning" size="sm" />
                <span>{{ getValidationMessage() }}</span>
              </div>
              <button
                @click="submitQuestionnaire"
                :disabled="isSubmitting || !isFormValid"
                class="btn btn-primary btn-lg submit-btn"
              >
                <MaterialIcon v-if="isSubmitting" name="loading" size="sm" />
                {{ isSubmitting ? '正在提交...' : '提交问卷' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 提交成功页面 -->
        <div v-if="submitted" class="success-page">
          <div class="success-content">
            <div class="success-icon">
              <MaterialIcon name="check" size="xl" />
            </div>
            <h2>提交成功！</h2>
            <p>感谢您完成此次评估。</p>
            <div v-if="evaluationResult" class="result-preview">
              <h3>本次问卷评估结果</h3>
              <p class="result-note">注：此得分为当前问卷的计算结果（已包含反向计分与相关性修正），最终360度评估报告将综合多方评价。</p>
              <div class="score-summary">
                <div class="score-item">
                  <span class="score-label">总分</span>
                  <span class="score-value">{{ evaluationResult.totalScore.toFixed(1) }} / {{ evaluationResult.maxTotalScore }}</span>
                </div>
                <div class="score-item">
                  <span class="score-label">总体得分率</span>
                  <span class="score-value">{{ evaluationResult.overallPercentage.toFixed(1) }}%</span>
                </div>
              </div>
            </div>
            <button @click="router.push('/user-dashboard')" class="btn btn-primary">返回任务列表</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import apiClient, { submitQuestionnaire as apiSubmitQuestionnaire } from '../services/api';

// 接口定义
interface User {
  id: number;
  name: string;
  role: string;
}

interface Question {
  questionCode: string;
  questionText: string;
  evaluationDimension: string;
  evaluationSubDimension?: string;
  scoringRule?: string;
  relevance?: string;
}

interface Questionnaire {
  selfdirected: Question[];
  roleSpecific: Question[];
}

interface EvaluationResult {
  totalScore: number;
  maxTotalScore: number;
  overallPercentage: number;
  selfdirectedScores: any[];
  roleSpecificScores: any[];
}

// 响应式数据
const route = useRoute();
const router = useRouter();
const questionnaire = ref<Questionnaire | null>(null);
const targetUser = ref<User | null>(null);
const responses = ref<Record<string, number | string>>({});
const relationship = ref<string>('');
const loading = ref(true);
const error = ref<string | null>(null);
const isSubmitting = ref(false);
const submitted = ref(false);
const evaluationResult = ref<EvaluationResult | null>(null);

// 从路由参数获取
const evaluationId = computed(() => parseInt(route.query.evaluationId as string) || 1);
const targetUserId = computed(() => parseInt(route.query.targetUserId as string));
const queryRelationship = computed(() => route.query.relationship as string);

// 计算属性
const isRelationshipFixed = computed(() => !!queryRelationship.value);

const totalQuestions = computed(() => {
  if (!questionnaire.value) return 0;
  return questionnaire.value.selfdirected.length + questionnaire.value.roleSpecific.length;
});

const completedQuestions = computed(() => {
  // 计算已回答的题目数量，如果自评则自动加上开放式问题数量（因为不需要填）
  let count = Object.keys(responses.value).filter(key => {
    const value = responses.value[key];
    return value !== undefined && value !== null && value !== '';
  }).length;

  if (relationship.value === '自评' && questionnaire.value) {
    // 加上开放式问题的数量
    const openQuestions = questionnaire.value.roleSpecific.filter(q => isOpenEndedQuestion(q));
    count += openQuestions.length;
  }

  return count;
});

const progressPercentage = computed(() => {
  if (totalQuestions.value === 0) return 0;
  return Math.round((completedQuestions.value / totalQuestions.value) * 100);
});

// const missingFields = computed(() => {
//   const missing: string[] = [];
//   if (!relationship.value) missing.push('关系选择');
//
//   if (questionnaire.value) {
//     [...questionnaire.value.selfdirected, ...questionnaire.value.roleSpecific].forEach((question, index) => {
//       if (!responses.value[question.questionCode]) {
//         missing.push(`第${index + 1}题`);
//       }
//     });
//   }
//
//   return missing;
// });

const isFormValid = computed(() => {
  if (!relationship.value) return false;
  
  if (questionnaire.value) {
    const allQuestions = [...questionnaire.value.selfdirected, ...questionnaire.value.roleSpecific];
    return allQuestions.every(question => {
      // 如果是自评且为开放式问题，则跳过验证
      if (relationship.value === '自评' && isOpenEndedQuestion(question)) {
        return true;
      }
      const response = responses.value[question.questionCode];
      return response !== undefined && response !== null && response !== '';
    });
  }
  
  return false;
});

// 方法
const getRatingLabel = (score: number): string => {
  const labels = {
    1: '几乎从不',
    2: '很少',
    3: '有时',
    4: '经常',
    5: '几乎总是'
  };
  return labels[score as keyof typeof labels];
};

const getRoleSpecificTitle = (): string => {
  if (!targetUser.value) return '角色专属评估';
  
  const role = targetUser.value.role.toLowerCase();
  if (role.includes('高层') || role.includes('总经理-1')) {
    return '高层领导力评估';
  } else if (role.includes('中层') || role.includes('总经理-2')) {
    return '中层管理力评估';
  } else if (role.includes('基层') || role.includes('一线')) {
    return '基层管理力评估';
  }
  return '角色专属评估';
};

const isOpenEndedQuestion = (question: Question): boolean => {
  // 根据问题内容或标识判断是否为开放式问题
  return question.questionText.includes('请描述') || 
         question.questionText.includes('举例说明') ||
         question.evaluationDimension.includes('开放式');
};

const updateProgress = () => {
  // 进度更新逻辑已在计算属性中处理
};

const getValidationMessage = (): string => {
  if (!relationship.value) {
    return '请选择您与被评估者的关系';
  }
  
  // 计算未回答的题目数量（不包括关系选择）
  let unansweredCount = 0;
  if (questionnaire.value) {
    const allQuestions = [...questionnaire.value.selfdirected, ...questionnaire.value.roleSpecific];
    unansweredCount = allQuestions.filter(question => {
      // 如果是自评且为开放式问题，则视为已回答（不需要回答）
      if (relationship.value === '自评' && isOpenEndedQuestion(question)) {
        return false;
      }
      const response = responses.value[question.questionCode];
      return !response || response === '';
    }).length;
  }
  
  if (unansweredCount > 0) {
    return `还有 ${unansweredCount} 道题目未完成`;
  }
  
  return '';
};

const loadQuestionnaire = async () => {
  try {
    loading.value = true;
    error.value = null;

    // 设置关系（如果URL中有）
    if (queryRelationship.value) {
      relationship.value = queryRelationship.value;
    }

    // 获取目标用户信息
    if (targetUserId.value) {
      try {
        const userResponse = await apiClient.get(`/users/${targetUserId.value}`);
        targetUser.value = userResponse.data;
      } catch (e) {
        console.error('获取目标用户失败', e);
        error.value = '获取评估对象信息失败';
        return;
      }
    } else {
      error.value = '未指定评估对象';
      return;
    }

    if (!targetUser.value) {
       error.value = '未找到评估对象';
       return;
    }

    // 根据用户角色获取问卷
    const role = targetUser.value.role;
    // 使用 apiClient 替换 fetch
    const response = await apiClient.get(`/questionnaires/by-role/${encodeURIComponent(role)}`);
    
    questionnaire.value = response.data;
    
  } catch (e) {
    console.error('加载问卷失败:', e);
    error.value = '加载问卷失败，请稍后重试。';
  } finally {
    loading.value = false;
  }
};

const submitQuestionnaire = async () => {
  if (!isFormValid.value) return;
  
  isSubmitting.value = true;
  
  try {
    // 准备提交数据
    const submissionData = {
      evaluationId: evaluationId.value,
      relationship: relationship.value,
      responses: Object.entries(responses.value).map(([questionCode, value]) => ({
        questionCode,
        score: typeof value === 'number' ? value : undefined,
        openText: typeof value === 'string' ? value : undefined,
      }))
    };

    const response = await apiSubmitQuestionnaire(submissionData);
    const result = response.data;
    
    if (result.success) {
      evaluationResult.value = result.evaluationResult;
      submitted.value = true;
    } else {
      throw new Error(result.message || '提交失败');
    }

  } catch (e) {
    console.error('提交问卷失败:', e);
    alert('提交失败，请检查网络并重试。');
  } finally {
    isSubmitting.value = false;
  }
};

// const resetForm = () => {
//   responses.value = {};
//   relationship.value = '';
//   submitted.value = false;
//   evaluationResult.value = null;
//   loadQuestionnaire();
// };

// 生命周期
onMounted(() => {
  loadQuestionnaire();
});
</script>

<style scoped>
/* 使用Dashboard的布局风格 */
.questionnaire-layout {
  min-height: 100vh;
  background: var(--gray-50);
}

/* 顶部导航栏 - 复用Dashboard样式 */
.questionnaire-header {
  background: white;
  border-bottom: 1px solid var(--gray-200);
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.header-content {
  max-width: var(--app-max-width);
  margin: 0 auto;
  padding: 0 var(--space-6);
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 72px;
}

.logo {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--gray-900);
  margin: 0;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-500));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-nav {
  display: flex;
  gap: var(--space-2);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  text-decoration: none;
  color: var(--gray-600);
  border-radius: var(--radius-lg);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.nav-link:hover {
  background: var(--gray-50);
  color: var(--gray-900);
  transform: translateY(-1px);
}

/* 主内容区域 */
.questionnaire-main {
  max-width: var(--app-max-width);
  margin: 0 auto;
  padding: var(--space-6);
}

.questionnaire-container {
  max-width: 900px;
  margin: 0 auto;
}

/* 加载和错误状态 */
.loading-state {
  text-align: center;
  padding: var(--space-16);
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
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
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  text-align: center;
  padding: var(--space-12);
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--error-200);
}

.error-icon {
  font-size: var(--text-4xl);
  margin-bottom: var(--space-4);
}

/* 信息卡片 */
.info-card {
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  margin-bottom: var(--space-8);
  border: 1px solid var(--gray-100);
}

.card-header {
  padding: var(--space-6);
  border-bottom: 1px solid var(--gray-200);
  background: linear-gradient(135deg, var(--primary-50), var(--primary-100));
}

.card-header h2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--primary-700);
  margin: 0;
}

.card-body {
  padding: var(--space-6);
}

.user-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-6);
  margin-bottom: var(--space-8);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-group label {
  font-weight: var(--font-medium);
  color: var(--gray-700);
  font-size: var(--text-sm);
}

.form-static-text {
  padding: var(--space-3) var(--space-4);
  background-color: var(--gray-100);
  border-radius: var(--radius-lg);
  color: var(--gray-800);
  font-weight: var(--font-medium);
  border: 1px solid var(--gray-200);
  margin: 0;
}

/* 进度区域 */
.progress-section {
  padding: var(--space-6);
  background: var(--gray-50);
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.progress-text {
  color: var(--gray-600);
  font-size: var(--text-sm);
}

.progress-percentage {
  font-weight: var(--font-bold);
  color: var(--primary-600);
  font-size: var(--text-lg);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--gray-200);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-500), var(--primary-600));
  transition: width var(--transition-normal);
}

/* 问题区域 */
.question-section {
  margin-bottom: var(--space-8);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
  padding: var(--space-6);
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--gray-100);
}

.section-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--gray-900);
  margin: 0;
}

.section-count {
  background: var(--primary-100);
  color: var(--primary-700);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.questions-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.question-card {
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--gray-100);
  transition: all var(--transition-normal);
}

.question-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.question-header {
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--gray-100);
  background: var(--gray-50);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
}

.question-number {
  background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
  color: white;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-bold);
  font-size: var(--text-sm);
  box-shadow: var(--shadow-sm);
}

.question-content {
  padding: var(--space-6);
}

.question-text {
  font-size: var(--text-lg);
  line-height: 1.7;
  color: var(--gray-900);
  margin-bottom: var(--space-6);
  font-weight: var(--font-medium);
}

/* 评分选项 */
.rating-options {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-3);
}

.rating-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-4);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  background: white;
  position: relative;
}

.rating-option:hover {
  border-color: var(--primary-300);
  background: var(--primary-50);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.rating-option input[type="radio"] {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.rating-option input[type="radio"]:checked + .rating-label {
  color: var(--primary-700);
  font-weight: var(--font-bold);
}

.rating-option:has(input[type="radio"]:checked) {
  border-color: var(--primary-500);
  background: var(--primary-100);
  box-shadow: var(--shadow-md);
}

.rating-label {
  font-size: var(--text-sm);
  text-align: center;
  margin-bottom: var(--space-2);
  color: var(--gray-700);
  font-weight: var(--font-medium);
}

.rating-score {
  font-size: var(--text-xs);
  color: var(--gray-500);
  font-weight: var(--font-bold);
}

/* 开放式问题 */
.open-question {
  margin-top: var(--space-4);
}

/* 提交区域 */
.submit-card {
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--gray-100);
  margin-top: var(--space-8);
}

.validation-message {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--warning-50);
  color: var(--warning-700);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-6);
  border: 1px solid var(--warning-200);
}

.submit-btn {
  width: 100%;
  justify-content: center;
}

/* 成功页面 */
.success-page {
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--gray-100);
}

.success-content {
  text-align: center;
  padding: var(--space-12);
}

.success-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--success-500), var(--success-600));
  color: white;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-6);
  box-shadow: var(--shadow-lg);
}

.success-content h2 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--gray-900);
  margin: 0 0 var(--space-4) 0;
}

.success-content p {
  color: var(--gray-600);
  font-size: var(--text-lg);
  margin-bottom: var(--space-8);
}

.result-preview {
  background: var(--gray-50);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  margin: var(--space-8) 0;
  border: 1px solid var(--gray-200);
}

.result-preview h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--gray-900);
  margin: 0 0 var(--space-4) 0;
}

.score-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
}

.score-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-200);
}

.score-label {
  font-weight: var(--font-medium);
  color: var(--gray-700);
}

.score-value {
  font-weight: var(--font-bold);
  color: var(--primary-600);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .questionnaire-main {
    padding: var(--space-4);
  }
  
  .user-info-grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
}

@media (max-width: 768px) {
  .header-content {
    padding: 0 var(--space-4);
  }
  
  .questionnaire-main {
    padding: var(--space-4);
  }
  
  .rating-options {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
  }
  
  .rating-option {
    padding: var(--space-3);
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 0 var(--space-3);
  }
  
  .logo {
    font-size: var(--text-lg);
  }
  
  .nav-link {
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-xs);
  }
  
  .questionnaire-main {
    padding: var(--space-3);
  }
  
  .rating-options {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .question-text {
    font-size: var(--text-base);
  }
}
</style>
