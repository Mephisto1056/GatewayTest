<template>
  <div class="page-container">
    <div class="page-header">
      <h1>数据报告</h1>
      <p class="text-lg text-gray-600">查看、分析和管理所有生成的评估报告。</p>
    </div>

    <!-- 筛选与操作 -->
    <div class="card">
      <div class="card-body">
        <div class="toolbar">
          <div class="filters">
            <select v-model="selectedTimeRange" @change="loadReports" class="form-select">
              <option value="all">全部时间</option>
              <option value="week">最近一周</option>
              <option value="month">最近一月</option>
              <option value="quarter">最近三月</option>
            </select>
            
            <select v-model="selectedRole" @change="filterReports" class="form-select">
              <option value="">所有角色</option>
              <option value="高层领导者">高层领导者</option>
              <option value="中层管理者">中层管理者</option>
              <option value="基层管理者">基层管理者</option>
            </select>
            
            <input 
              v-model="searchKeyword" 
              @input="filterReports"
              placeholder="搜索用户姓名..." 
              class="form-input"
            >
          </div>
          
          <div class="actions">
            <button @click="exportData" class="btn btn-secondary">
              <MaterialIcon name="download" size="sm" />
              导出数据
            </button>
            <button @click="generateSummaryReport" class="btn btn-primary">
              <MaterialIcon name="summarize" size="sm" />
              生成汇总报告
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="stats-grid">
      <div class="card">
        <div class="card-body stat-item">
          <div class="stat-icon bg-primary-100 text-primary-600">
            <MaterialIcon name="summarize" size="lg" />
          </div>
          <div class="stat-content">
            <p class="text-sm text-gray-600">总评估数</p>
            <h3 class="text-3xl font-bold">{{ stats.totalEvaluations }}</h3>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-body stat-item">
          <div class="stat-icon bg-success-100 text-success-600">
            <MaterialIcon name="check_circle" size="lg" />
          </div>
          <div class="stat-content">
            <p class="text-sm text-gray-600">已完成评估</p>
            <h3 class="text-3xl font-bold">{{ stats.completedEvaluations }}</h3>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-body stat-item">
          <div class="stat-icon bg-info-100 text-info-600">
            <MaterialIcon name="trending_up" size="lg" />
          </div>
          <div class="stat-content">
            <p class="text-sm text-gray-600">平均得分率</p>
            <h3 class="text-3xl font-bold">{{ stats.averageScore.toFixed(1) }}%</h3>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-body stat-item">
          <div class="stat-icon bg-warning-100 text-warning-600">
            <MaterialIcon name="group" size="lg" />
          </div>
          <div class="stat-content">
            <p class="text-sm text-gray-600">参与人数</p>
            <h3 class="text-3xl font-bold">{{ stats.participantCount }}</h3>
          </div>
        </div>
      </div>
    </div>

    <!-- 报告列表 -->
    <div class="card">
      <div class="card-body">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p class="text-gray-600">正在加载报告...</p>
        </div>
        
        <div v-else-if="filteredReports.length === 0" class="empty-state">
          <div class="empty-icon">
            <MaterialIcon name="summarize" size="xl" />
          </div>
          <h3 class="text-xl font-semibold">暂无报告</h3>
          <p class="text-gray-600">{{ selectedRole ? '当前角色下暂无报告' : '系统中暂无评估报告' }}</p>
        </div>
        
        <div v-else class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>用户</th>
                <th>角色</th>
                <th>评估时间</th>
                <th>总分</th>
                <th>得分率</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="report in filteredReports" :key="report.id">
                <td>
                  <div class="user-cell">
                    <div class="user-avatar">{{ report.userName.charAt(0) }}</div>
                    <span>{{ report.userName }}</span>
                  </div>
                </td>
                <td>
                  <span class="badge" :class="getRoleClass(report.userRole)">
                    {{ report.userRole }}
                  </span>
                </td>
                <td>{{ formatDate(report.evaluationDate) }}</td>
                <td>
                  <strong class="font-semibold">{{ report.totalScore.toFixed(1) }}</strong>
                  <span class="text-sm text-gray-500">/ {{ report.maxScore }}</span>
                </td>
                <td>
                  <div class="percentage-bar">
                    <div class="percentage-fill" :style="{ width: report.percentage + '%' }"></div>
                    <span class="percentage-text">{{ report.percentage.toFixed(1) }}%</span>
                  </div>
                </td>
                <td>
                  <div class="actions-cell">
                    <button @click="viewDetailReport(report)" class="icon-btn" title="查看详情">
                      <MaterialIcon name="visibility" size="sm" />
                    </button>
                    <button @click="viewComprehensiveReport(report)" class="icon-btn" title="查看完整报告">
                      <MaterialIcon name="summarize" size="sm" />
                    </button>
                    <button @click="downloadReport(report)" class="icon-btn" title="下载报告">
                      <MaterialIcon name="download" size="sm" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 模态框等其他部分保持不变，但需要应用新的样式 -->
    <!-- ... -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import MaterialIcon from '../components/icons/MaterialIcon.vue'
import ComprehensiveReport from '../components/ComprehensiveReport.vue'

interface DimensionScore {
  name: string
  score: number
  maxScore: number
  percentage: number
}

interface Report {
  id: number
  userId?: number
  userName: string
  userRole: string
  evaluationDate: string
  totalScore: number
  maxScore: number
  percentage: number
  dimensionScores: DimensionScore[]
}

// 响应式数据
const loading = ref(true)
const reports = ref<Report[]>([])
const selectedTimeRange = ref('all')
const selectedRole = ref('')
const searchKeyword = ref('')
const showDetailModal = ref(false)
const showComprehensiveModal = ref(false)
const currentReport = ref<Report | null>(null)
const currentReportId = ref<number | null>(null)

const stats = ref({
  totalEvaluations: 0,
  completedEvaluations: 0,
  averageScore: 0,
  participantCount: 0
})

// 计算属性
const filteredReports = computed(() => {
  let filtered = reports.value

  // 按角色筛选
  if (selectedRole.value) {
    filtered = filtered.filter(r => r.userRole === selectedRole.value)
  }

  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(r => 
      r.userName.toLowerCase().includes(keyword)
    )
  }

  return filtered
})

// 方法
const getRoleClass = (role: string) => {
  const classes = {
    '高层领导者': 'badge-success',
    '中层管理者': 'badge-warning',
    '基层管理者': 'badge-primary'
  }
  return classes[role as keyof typeof classes] || 'badge-gray'
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const loadReports = async () => {
  loading.value = true
  try {
    const response = await fetch('/api/reports')
    if (!response.ok) throw new Error('加载失败')
    
    const data = await response.json()
    
    reports.value = data.map((report: any) => {
      const info = report.dataJson?.userInfo || {}
      const radar = report.dataJson?.radarChart || {}
      
      // 尝试从雷达图数据中提取维度得分
      const dimensions = [
        ...(radar.selfdirectedData || []),
        ...(radar.roleSpecificData || [])
      ].map((d: any) => ({
        name: d.dimension,
        score: 0, // 简化处理，后端未直接存储绝对分值
        maxScore: 100,
        percentage: d.percentage
      }))

      return {
        id: report.id,
        userId: report.userId,
        userName: info.userName || report.user?.name || '未知用户',
        userRole: info.userRole || report.user?.role || '未知角色',
        evaluationDate: info.evaluationDate || report.generatedAt,
        totalScore: info.overallPercentage || 0, // 这里暂时用百分比代替总分
        maxScore: 100,
        percentage: info.overallPercentage || 0,
        dimensionScores: dimensions
      }
    })
    
    // 更新统计数据
    const total = reports.value.length
    stats.value = {
      totalEvaluations: total,
      completedEvaluations: total, // 已生成报告的即为已完成
      averageScore: total > 0 ? reports.value.reduce((sum, r) => sum + r.percentage, 0) / total : 0,
      participantCount: new Set(reports.value.map(r => r.userId)).size
    }
    
  } catch (error) {
    console.error('加载报告失败:', error)
    alert('加载报告失败，请重试')
  } finally {
    loading.value = false
  }
}

const filterReports = () => {
  // 筛选功能通过计算属性实现
}

const viewDetailReport = (report: Report) => {
  currentReport.value = report
  showDetailModal.value = true
}

const viewComprehensiveReport = async (report: Report) => {
  try {
    // 如果报告已存在，直接显示
    if (report.id) {
      currentReportId.value = report.id
      showComprehensiveModal.value = true
      return
    }

    // 否则先生成报告
    const response = await fetch(`/api/reports/generate/personal/${report.userId}`, {
      method: 'POST'
    })
    
    if (!response.ok) {
      throw new Error('生成报告失败')
    }
    
    const data = await response.json()
    if (data.success) {
      currentReportId.value = data.report.id
      showComprehensiveModal.value = true
    } else {
      alert(data.message || '生成报告失败')
    }
  } catch (error) {
    console.error('查看完整报告失败:', error)
    alert('查看完整报告失败，请重试')
  }
}

const closeComprehensiveModal = () => {
  showComprehensiveModal.value = false
  currentReportId.value = null
}

const downloadReport = (report: Report) => {
  // 实现下载报告功能
  alert(`下载 ${report.userName} 的评估报告（功能开发中）`)
}

const shareReport = (report: Report) => {
  // 实现分享报告功能
  alert(`分享 ${report.userName} 的评估报告（功能开发中）`)
}

const exportData = () => {
  // 实现数据导出功能
  alert('导出数据功能开发中...')
}

const generateSummaryReport = () => {
  // 实现生成汇总报告功能
  alert('生成汇总报告功能开发中...')
}

const closeDetailModal = () => {
  showDetailModal.value = false
  currentReport.value = null
}

const getStrengths = (report: Report) => {
  // 获取优势领域（得分率>70%的维度）
  return report.dimensionScores
    .filter(d => d.percentage > 70)
    .map(d => `${d.name}表现优秀，得分率达到${d.percentage.toFixed(1)}%`)
}

const getImprovements = (report: Report) => {
  // 获取改进建议（得分率<60%的维度）
  return report.dimensionScores
    .filter(d => d.percentage < 60)
    .map(d => `建议加强${d.name}方面的能力提升，当前得分率为${d.percentage.toFixed(1)}%`)
}

onMounted(() => {
  loadReports()
})
</script>

<style scoped>
/* 使用 design-system.css 的样式，这里只放特定于此页面的微调 */
.page-container {
  width: 100%;
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: var(--space-8) var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.page-header {
  margin-bottom: var(--space-2);
}

.page-header h1 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--gray-900);
  margin: 0 0 var(--space-2) 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.filters {
  display: flex;
  gap: var(--space-4);
  flex: 1;
  min-width: 300px;
}

.actions {
  display: flex;
  gap: var(--space-3);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-5);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.stat-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
}

.loading-state, .empty-state {
  text-align: center;
  padding: var(--space-12) 0;
  color: var(--gray-500);
}

.empty-icon {
  margin: 0 auto var(--space-4);
  color: var(--gray-400);
}

.table-responsive {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: var(--space-4);
  text-align: left;
  border-bottom: 1px solid var(--gray-200);
  white-space: nowrap;
}

.data-table th {
  background-color: var(--gray-50);
  font-weight: var(--font-semibold);
  color: var(--gray-600);
  font-size: var(--text-sm);
}

.data-table tbody tr:hover {
  background-color: var(--gray-50);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--primary-500);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
}

.percentage-bar {
  position: relative;
  width: 100px;
  height: 18px;
  background: var(--gray-200);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.percentage-fill {
  height: 100%;
  background: var(--success-500);
  transition: width 0.3s;
}

.percentage-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px;
  font-weight: var(--font-bold);
  color: var(--gray-800);
  mix-blend-mode: screen;
}

.actions-cell {
  display: flex;
  gap: var(--space-2);
}
</style>
