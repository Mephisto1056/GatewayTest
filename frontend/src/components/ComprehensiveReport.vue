<template>
  <div class="comprehensive-report">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>正在生成报告...</p>
    </div>

    <div v-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="loadReport" class="retry-btn">重试</button>
    </div>

    <div v-if="report && !loading" class="report-content">
      <!-- 报告头部 -->
      <div class="report-header">
        <h1>组织领导力发展测评</h1>
        <p class="report-subtitle">个人综合报告</p>
        <div class="user-info">
          <p><strong>参与人：</strong>{{ report.userInfo.userName }}</p>
          <p><strong>当前职位：</strong>{{ report.userInfo.userRole }}</p>
          <p><strong>测评日期：</strong>{{ formatDate(report.userInfo.evaluationDate) }}</p>
          <p><strong>评估机构：</strong>讯佰汇组织领导力测评与咨询</p>
        </div>
        <div class="action-buttons">
          <button @click="downloadPDF" class="download-btn">
            <span>📥</span> 下载PDF报告
          </button>
        </div>
      </div>

      <!-- 第一部分：报告说明 -->
      <div class="report-section intro-section">
        <h2 class="section-title">组织领导力测评报告说明</h2>
        <div class="text-block">
          <h3>报告目的</h3>
          <p>本报告是对被测评人的领导力素质的总结，用于帮助被测评人认知并理解自身所具备的优势领域和待发展领域、针对性地制定学习和发展策略。</p>
          
          <h3>阅读者</h3>
          <p>本报告仅限于被测评人本人、被测评人直接上级、人力资源部以及讯佰汇项目顾问使用，用途限于被测评人个体能力的持续发展。任何其它组织或个人未经许可，不得擅自阅读、传播、复制或以其它形式使用本报告中的任何内容。</p>

          <h3>报告的有效性</h3>
          <p>本次测评基于讯佰汇组织领导力模型对管理者的领导力要求，对被测评人的行为进行评价。个人的能力素质是不断发展的，特别是在经历重大事件、经受重大挑战之后，素质的提升会很迅速。因此，请留意这份报告的撰写日期和撰写目的。在完成这份报告三年之后，或该参与者或其工作环境发生了巨大变化，如果仍需用该报告作参考，必须慎重考虑其有效性。</p>
          
          <h3>报告的使用注意</h3>
          <p>当阅读本报告时，应首先将注意力集中在优势领域，思考被测评人未来如何更好的发挥优势领域。如果被测评人的行为与其他反馈信息不一致，请不要否定这些结论，尝试寻找更多的信息进行客观的评价。对于待发展领域，建议参与者在阅读报告后，询问直接上级、内部教练或其他信任的人获取更加具体的发展建议。</p>
        </div>
      </div>

      <!-- 第二部分：模型与维度定义 -->
      <div class="report-section indicators-section">
        <h2 class="section-title">组织领导力模型与维度定义</h2>
        <p class="section-intro">本次领导力测评是基于讯佰汇组织领导力模型的{{ getLeadershipItemsCount() }}项领导力素质。</p>
        <div class="indicators-content">
          <div v-for="(indicator, index) in report.indicatorMeanings" :key="index" class="indicator-item">
            <h3>{{ indicator.dimension }}</h3>
            <p class="indicator-meaning"><strong>指标含义：</strong>{{ indicator.meaning }}</p>
            <div v-if="indicator.subdimensions && indicator.subdimensions.length > 0" class="subdimensions">
              <div class="subdimension-list">
                <div v-for="(sub, sIndex) in indicator.subdimensions" :key="sIndex" class="subdimension-item">
                  <strong>{{ sub.name }}：</strong> {{ sub.description }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 第三部分：组织领导力剖像 (雷达图) -->
      <div class="report-section radar-section">
        <h2 class="section-title">参与者的组织领导力剖像</h2>
        <p class="section-intro">对照讯佰汇组织领导力模型对{{ getRoleTextForProfile() }}的领导力要求，参与者在各个能力维度的得分如下。</p>
        
        <div class="radar-container">
          <div class="radar-chart-wrapper full-width">
            <!-- Use new LCP Component if data exists -->
            <LeadershipCircleProfile
              v-if="report.radarChart.lcpData"
              ref="lcpChartRef"
              :data="report.radarChart.lcpData"
            />
            <!-- Fallback to old chart if no LCP data -->
            <DoubleLayerRadarChart
              v-else
              ref="mainRadarChart"
              :mainData="report.radarChart.combinedMainData"
              :subData="report.radarChart.combinedSubData"
              title="领导力能力全景雷达图"
              height="650px"
            />
          </div>
          
          <!-- 图表说明 -->
          <div class="chart-description">
            <div class="description-item">
              <div class="legend-dot inner-circle"></div>
              <span>内圈：主要能力维度</span>
            </div>
            <div class="description-item">
              <div class="legend-dot outer-circle"></div>
              <span>外圈：子能力维度</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 第四部分：优劣势分析 -->
      <div class="report-section analysis-section">
        <h2 class="section-title">优势领域及待发展领域</h2>
        
        <div class="analysis-content">
          <!-- 优势 -->
          <div class="strengths-section">
            <h3>个人优势领域</h3>
            <div v-if="report.strengthWeaknessAnalysis.strengths.length > 0" class="strength-items">
              <div v-for="(item, index) in report.strengthWeaknessAnalysis.strengths" :key="index" class="strength-item">
                <div class="item-header">
                  <h4>{{ index + 1 }}. {{ item.dimension }}</h4>
                  <span class="score-badge excellent">得分率：{{ item.percentage.toFixed(1) }}%</span>
                </div>
                <p class="item-description">{{ item.description }}</p>
              </div>
            </div>
            <div v-else class="no-data">
              各项能力表现均衡，暂无明显突出的优势领域。
            </div>
          </div>

          <!-- 劣势 -->
          <div class="weaknesses-section">
            <h3>个人待发展领域</h3>
            <p v-if="report.strengthWeaknessAnalysis.weaknesses.length > 0">以下方面存在明显提升空间：</p>
            <div v-if="report.strengthWeaknessAnalysis.weaknesses.length > 0" class="weakness-items">
              <div v-for="(item, index) in report.strengthWeaknessAnalysis.weaknesses" :key="index" class="weakness-item">
                <div class="item-header">
                  <h4>{{ index + 1 }}. {{ item.dimension }}</h4>
                  <span class="score-badge needs-improvement">得分率：{{ item.percentage.toFixed(1) }}%</span>
                </div>
                <p class="item-description">{{ item.description }}</p>
                <div class="improvement-suggestion">
                  <strong>改进建议：</strong> {{ item.improvementSuggestion }}
                </div>
              </div>
            </div>
            <div v-else class="no-data">
              暂无明显待发展领域，建议继续保持现有水平。
            </div>
          </div>
        </div>
      </div>

      <!-- 第五部分：他人评价 (Placeholder if data exists) -->
      <!-- TODO: Add Others Evaluation Section when API supports it -->

      <!-- 第六部分：行动建议 -->
      <div class="report-section recommendations-section">
        <h2 class="section-title">个人能力发展建议</h2>
        <p>建议后续行动计划：</p>
        <div class="recommendations-content">
          <div 
            v-for="(rec, index) in report.actionRecommendations" 
            :key="index" 
            class="recommendation-item"
            :class="`priority-${rec.priority}`"
          >
            <div class="recommendation-header">
              <h3>{{ rec.dimension }}</h3>
              <span class="priority-badge" :class="rec.priority">{{ getPriorityText(rec.priority) }}</span>
            </div>
            
            <div class="recommendation-details">
              <div class="actions">
                <h4>具体行动建议：</h4>
                <ul>
                  <li v-for="(action, aIndex) in rec.actions" :key="aIndex">{{ action }}</li>
                </ul>
              </div>
              
              <div class="timeline-resources">
                <div class="timeline">
                  <strong>建议时间：</strong> {{ rec.timeline }}
                </div>
                <div class="resources">
                  <strong>所需资源：</strong>
                  <div class="resource-tags">
                    <span v-for="(res, rIndex) in rec.resources" :key="rIndex" class="resource-tag">{{ res }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p class="section-footer-text">您可根据自己发展能力项的优先级和公司发展的阶段性需求，选择自己的发展优先级。</p>
      </div>

      <!-- 第七部分：总结 -->
      <div class="report-section summary-section">
        <h2 class="section-title">AI 智能总评</h2>
        <div class="ai-analysis card">
          <div class="analysis-header">
            <span class="ai-icon">🤖</span>
            <h3>AI 深度解读</h3>
          </div>
          <div class="analysis-text">
            {{ report.strengthWeaknessAnalysis.aiAnalysis }}
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="report-actions">
        <button class="action-btn secondary" @click="printReport">
          <MaterialIcon name="print" size="sm" />
          打印报告
        </button>
        <button class="action-btn secondary" @click="shareReport">
          <MaterialIcon name="share" size="sm" />
          分享报告
        </button>
        <button class="action-btn primary" @click="downloadPDF">
          <MaterialIcon name="download" size="sm" />
          下载 PDF
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Comprehensive Report Component - Re-saved to fix dynamic import issues
import { ref, onMounted } from 'vue';
import MaterialIcon from './icons/MaterialIcon.vue';
// import RadarChart from './RadarChart.vue';
// import ComplexRadarChart from './ComplexRadarChart.vue';
import DoubleLayerRadarChart from './DoubleLayerRadarChart.vue';
import LeadershipCircleProfile from './LeadershipCircleProfile.vue'; // Import LCP

// 接口定义
interface RadarChartData {
  dimension: string;
  score: number;
  maxScore: number;
  percentage: number;
}

interface SubDimensionData {
  parentDimension: string;
  subDimension: string;
  score: number;
  maxScore: number;
  percentage: number;
}

interface LCPTrait {
  name: string;
  self: number;
  others: number;
}

interface LCPDimension {
  dimension: string;
  color: string;
  traits: LCPTrait[];
}

interface LCPChartData {
  creative: LCPDimension[];
  reactive: LCPDimension[];
}

interface StrengthWeaknessAnalysis {
  strengths: Array<{
    dimension: string;
    score: number;
    percentage: number;
    description: string;
  }>;
  weaknesses: Array<{
    dimension: string;
    score: number;
    percentage: number;
    description: string;
    improvementSuggestion: string;
  }>;
  aiAnalysis: string;
}

interface IndicatorMeaning {
  dimension: string;
  meaning: string;
  subdimensions?: Array<{
    name: string;
    description: string;
  }>;
}

interface ActionRecommendation {
  priority: 'high' | 'medium' | 'low';
  dimension: string;
  currentScore: number;
  targetScore: number;
  actions: string[];
  timeline: string;
  resources: string[];
}

interface ComprehensiveReport {
  radarChart: {
    selfdirectedData: RadarChartData[];
    roleSpecificData: RadarChartData[];
    combinedMainData: RadarChartData[];
    combinedSubData: SubDimensionData[];
    lcpData?: LCPChartData; // Add optional LCP Data
  };
  strengthWeaknessAnalysis: StrengthWeaknessAnalysis;
  indicatorMeanings: IndicatorMeaning[];
  actionRecommendations: ActionRecommendation[];
  userInfo: {
    userId: number;
    userName: string;
    userRole: string;
    evaluationDate: Date;
    totalScore: number;
    maxTotalScore: number;
    overallPercentage: number;
  };
}

// Props
const props = defineProps<{
  userId?: number;
  reportId?: number;
}>();

// 响应式数据
const report = ref<ComprehensiveReport | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const mainRadarChart = ref<any>(null);
const lcpChartRef = ref<any>(null);

// 辅助方法 (Moved to top)
const formatDate = (dateString: Date | string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
};

const getLeadershipItemsCount = (): string => {
  if (!report.value) return '8';
  const role = report.value.userInfo.userRole;
  if (role.includes('高层') || role.includes('OPS Manager')) return '14';
  if (role.includes('中层') || role.includes('采购经理')) return '13';
  return '8';
};

const getRoleTextForProfile = (): string => {
  if (!report.value) return '管理者';
  const role = report.value.userInfo.userRole;
  if (role.includes('高层') || role.includes('OPS Manager')) return '高层管理者';
  if (role.includes('中层') || role.includes('采购经理')) return '中层管理者';
  return '基层管理者';
};

// const getRoleSpecificTitle = (): string => {
//   if (!report.value) return '角色专属能力';
  
//   const role = report.value.userInfo.userRole.toLowerCase();
//   if (role.includes('高层') || role.includes('总经理-1')) {
//     return '高层领导力';
//   } else if (role.includes('中层') || role.includes('总经理-2')) {
//     return '中层管理力';
//   } else if (role.includes('基层') || role.includes('一线')) {
//     return '基层管理力';
//   }
//   return '角色专属能力';
// };

const getPriorityText = (priority: string): string => {
  const texts = {
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级'
  };
  return texts[priority as keyof typeof texts] || priority;
};

// 数据加载方法
const loadReport = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    let endpoint = '';
    if (props.reportId) {
      endpoint = `/api/reports/${props.reportId}/comprehensive`;
    } else if (props.userId) {
      // 先生成报告，再获取
      const generateResponse = await fetch(`/api/reports/generate/personal/${props.userId}`, {
        method: 'POST'
      });
      
      if (!generateResponse.ok) {
        throw new Error('生成报告失败');
      }
      
      const generateData = await generateResponse.json();
      if (!generateData.success) {
        throw new Error(generateData.message || '生成报告失败');
      }
      
      endpoint = `/api/reports/${generateData.report.id}/comprehensive`;
    } else {
      throw new Error('缺少必要的参数');
    }
    
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error('获取报告失败');
    }
    
    const data = await response.json();
    if (data.success) {
      report.value = data.data.comprehensiveReport;
    } else {
      throw new Error(data.message || '获取报告失败');
    }
    
  } catch (e) {
    console.error('加载报告失败:', e);
    error.value = '加载报告失败，请稍后重试。';
  } finally {
    loading.value = false;
  }
};

// 其他功能方法
// const generatePDF = async () => {
//   try {
//     if (!report.value) {
//       alert('没有报告数据可以导出');
//       return;
//     }

//     // 1. 获取雷达图图片
//     let chartImage = '';
//     // 优先尝试获取 LCP 图表
//     if (lcpChartRef.value) {
//       // @ts-ignore
//       chartImage = await lcpChartRef.value.getChartImage?.() || '';
//     }
//     // 降级到旧版雷达图
//   } catch (e) {
//     console.error('导出PDF失败', e);
//   }
// };
//     else if (mainRadarChart.value) {
//       // @ts-ignore
//       chartImage = mainRadarChart.value.getChartImage?.() || '';
//     }
//
//     // 调用后端生成PDF接口
//     // ... (existing logic)
//   } catch (error) {
//     console.error('PDF生成失败:', error);
//     alert('PDF生成失败，请重试');
//   }
// };

const downloadPDF = async () => {
  try {
    if (!report.value) return;
    
    loading.value = true;
    
    // 获取图表图片
    let chartImage = '';
    
    // 优先尝试获取 LCP 图表
    if (lcpChartRef.value) {
      // @ts-ignore
      chartImage = await lcpChartRef.value.getChartImage?.() || '';
    } 
    // 降级到旧版雷达图
    else if (mainRadarChart.value) {
      // @ts-ignore
      chartImage = mainRadarChart.value.getChartImage?.() || '';
    }
    
    // 调用后端生成PDF接口
    const response = await fetch(`/api/reports/download-with-chart/${report.value.userInfo.userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chartImage
      }),
    });
    
    if (!response.ok) {
      throw new Error('下载PDF失败');
    }
    
    // 处理文件下载
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${report.value.userInfo.userName}_${new Date().getTime()}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
  } catch (error) {
    console.error('下载PDF出错:', error);
    alert('下载PDF失败，请重试');
  } finally {
    loading.value = false;
  }
};

const printReport = () => {
  window.print();
};

const shareReport = () => {
  // 实现分享功能
  alert('分享功能开发中...');
};

// 生命周期
onMounted(() => {
  loadReport();
});
</script>

<style scoped>
.comprehensive-report {
  max-width: 1200px;
  margin: 0 auto;
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

.report-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.report-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
}

.report-header h1 {
  margin: 0 0 1rem 0;
  font-size: 2.5rem;
  font-weight: 600;
}

.user-info h2 {
  margin: 0.5rem 0;
  font-size: 1.8rem;
}

.role {
  font-size: 1.1rem;
  opacity: 0.9;
  margin: 0.5rem 0;
}

.evaluation-date {
  font-size: 0.9rem;
  opacity: 0.8;
  margin: 0.5rem 0 1rem 0;
}

.overall-score {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  padding: 1rem 2rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.overall-score .score {
  display: block;
  font-size: 2rem;
  font-weight: bold;
}

.overall-score .label {
  font-size: 0.9rem;
  opacity: 0.9;
}

.action-buttons {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.download-btn {
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.download-btn:hover {
  background: white;
  color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.download-btn:active {
  transform: translateY(0);
}

.report-section {
  padding: 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 1.5rem 0;
}

.radar-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 1rem;
}

.radar-chart-wrapper {
  text-align: center;
}

.radar-chart-wrapper.full-width {
  width: 100%;
}

.chart-description {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.description-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 14px;
  color: #666;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
}

.legend-dot.inner-circle {
  background: #4F46E5;
  box-shadow: 0 0 0 2px #4F46E5;
}

.legend-dot.outer-circle {
  background: #10B981;
  box-shadow: 0 0 0 2px #10B981;
}

.radar-chart-wrapper h3 {
  margin: 0 0 1rem 0;
  color: #4b5563;
}

.simple-radar-chart {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.radar-bars {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.radar-bar-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bar-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #374151;
  text-align: left;
}

.bar-container {
  position: relative;
  height: 24px;
  background: #f3f4f6;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.bar-fill {
  height: 100%;
  border-radius: 12px;
  transition: width 0.8s ease;
  min-width: 2px;
}

.bar-fill.selfdirected {
  background: linear-gradient(90deg, #4F46E5, #7C3AED);
}

.bar-fill.role-specific {
  background: linear-gradient(90deg, #059669, #10B981);
}

.bar-value {
  position: absolute;
  right: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
  z-index: 1;
}

.analysis-content {
  display: grid;
  gap: 2rem;
}

.ai-analysis {
  background: #f3f4f6;
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #6366f1;
}

.ai-analysis .analysis-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.ai-icon {
  font-size: 1.5rem;
}

.ai-analysis h3 {
  margin: 0;
  color: #374151;
  font-weight: 600;
}

.analysis-text {
  line-height: 1.6;
  color: #4b5563;
}

.strengths-section,
.weaknesses-section {
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 8px;
}

.strengths-section h3,
.weaknesses-section h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem 0;
  color: #374151;
}

.strength-items,
.weakness-items {
  display: grid;
  gap: 1rem;
}

.strength-item,
.weakness-item {
  background: white;
  padding: 1rem;
  border-radius: 6px;
  border-left: 4px solid #10b981;
}

.weakness-item {
  border-left-color: #f59e0b;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.item-header h4 {
  margin: 0;
  color: #374151;
}

.score-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.score-badge.excellent {
  background: #d1fae5;
  color: #065f46;
}

.score-badge.needs-improvement {
  background: #fef3c7;
  color: #92400e;
}

.item-description {
  margin: 0.5rem 0;
  color: #6b7280;
  line-height: 1.5;
}

.improvement-suggestion {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: #fef7cd;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #92400e;
}

.no-data {
  text-align: center;
  color: #6b7280;
  font-style: italic;
  padding: 2rem;
}

.indicators-content {
  display: grid;
  gap: 1.5rem;
}

.indicator-item {
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
}

.indicator-item h3 {
  margin: 0 0 0.5rem 0;
  color: #374151;
}

.indicator-meaning {
  margin: 0 0 1rem 0;
  color: #4b5563;
  line-height: 1.6;
}

.subdimensions h4 {
  margin: 0 0 0.5rem 0;
  color: #374151;
  font-size: 0.9rem;
}

.subdimension-list {
  display: grid;
  gap: 0.5rem;
}

.subdimension-item {
  font-size: 0.9rem;
  color: #6b7280;
  line-height: 1.5;
}

.recommendations-content {
  display: grid;
  gap: 1.5rem;
}

.recommendation-item {
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #6b7280;
}

.recommendation-item.priority-high {
  border-left-color: #dc2626;
}

.recommendation-item.priority-medium {
  border-left-color: #d97706;
}

.recommendation-item.priority-low {
  border-left-color: #059669;
}

.recommendation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.recommendation-header h3 {
  margin: 0;
  color: #374151;
}

.priority-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.priority-badge.high {
  background: #fee2e2;
  color: #991b1b;
}

.priority-badge.medium {
  background: #fef3c7;
  color: #92400e;
}

.priority-badge.low {
  background: #d1fae5;
  color: #065f46;
}

.score-progress {
  margin-bottom: 1rem;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #6b7280;
}

.progress-bar {
  position: relative;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.current-progress {
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s ease;
}

.target-marker {
  position: absolute;
  top: -2px;
  width: 2px;
  height: 12px;
  background: #dc2626;
}

.recommendation-details {
  display: grid;
  gap: 1rem;
}

.actions h4 {
  margin: 0 0 0.5rem 0;
  color: #374151;
  font-size: 0.9rem;
}

.actions ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #4b5563;
}

.actions li {
  margin-bottom: 0.25rem;
  line-height: 1.5;
}

.timeline-resources {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  font-size: 0.9rem;
  color: #6b7280;
}

.timeline,
.resources {
  line-height: 1.5;
}

.resource-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.resource-tag {
  background: #e5e7eb;
  color: #374151;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
}

.report-actions {
  padding: 2rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
  background: #f9fafb;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.primary {
  background: #3b82f6;
  color: white;
}

.action-btn.primary:hover {
  background: #2563eb;
}

.action-btn.secondary {
  background: #e5e7eb;
  color: #374151;
}

.action-btn.secondary:hover {
  background: #d1d5db;
}

@media (max-width: 768px) {
  .comprehensive-report {
    padding: 1rem;
  }
  
  .radar-container {
    grid-template-columns: 1fr;
  }
  
  .timeline-resources {
    grid-template-columns: 1fr;
  }
  
  .report-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .action-btn {
    width: 100%;
    max-width: 200px;
    justify-content: center;
  }
}

@media print {
  .comprehensive-report {
    background: white;
    padding: 0;
  }
  
  .report-actions {
    display: none;
  }
  
  .report-section {
    break-inside: avoid;
  }
}
</style>
