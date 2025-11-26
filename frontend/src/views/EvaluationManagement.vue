<template>
  <div class="evaluation-management page-container page-container--compact">
    <header class="page-header card">
      <div class="header-text">
        <h1>评估管理</h1>
        <p class="page-subtitle">创建与统筹领导力评估项目，全流程掌握执行进度</p>
      </div>
      <div class="header-actions">
        <button type="button" class="btn btn-secondary" @click="loadEvaluations">
          <MaterialIcon name="refresh" size="sm" />
          刷新数据
        </button>
        <button type="button" class="btn btn-danger" style="background-color: #ef4444; color: white; margin-right: 10px;" @click="showBatchDeleteModal = true">
          <MaterialIcon name="delete" size="sm" />
          批量删除
        </button>
        <button type="button" class="btn btn-primary" @click="showCreateModal = true">
          <MaterialIcon name="plus" size="sm" />
          创建评估
        </button>
      </div>
    </header>

    <section class="page-section">
      <div class="summary-grid">
        <div
          v-for="card in statusSummary"
          :key="card.key"
          class="summary-card card"
          :class="[`summary-card--${card.accent}`, { 'summary-card--muted': card.value === 0 }]"
        >
          <div class="summary-icon">
            <MaterialIcon :name="card.icon" size="lg" />
          </div>
          <div class="summary-content">
            <p class="summary-label">{{ card.label }}</p>
            <h3 class="summary-value">{{ card.value }}</h3>
            <span class="summary-trend" :class="`summary-trend--${card.trendType}`">
              {{ card.trendText }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <section v-if="upcomingEvaluations.length" class="page-section">
      <div class="section-header">
        <div>
          <h2>即将到期的评估</h2>
          <p class="section-subtitle">聚焦临期事项，提前触达并保障按期完成</p>
        </div>
        <span class="section-tag">未来 2 周</span>
      </div>

      <div class="upcoming-grid">
        <div v-for="evaluation in upcomingEvaluations" :key="evaluation.id" class="upcoming-card card">
          <div class="upcoming-card__header">
            <div>
              <h3>{{ evaluation.title || `评估 #${evaluation.id}` }}</h3>
              <p class="upcoming-meta">
                <MaterialIcon name="users" size="sm" />
                {{ evaluation.user?.name || '未知用户' }}
                <span class="divider">·</span>
                {{ evaluation.questionnaireType || '标准问卷' }}
              </p>
            </div>
            <span
              class="countdown-badge"
              :class="{
                'countdown-badge--alert': isPastDue(evaluation),
                'countdown-badge--warning':
                  !isPastDue(evaluation) && getRemainingDays(evaluation.endDate) <= 3
              }"
            >
              {{ formatRelativeDate(evaluation.endDate) }}
            </span>
          </div>

          <div class="upcoming-card__body">
            <div class="meta-row">
              <span class="meta-label">开始时间</span>
              <span class="meta-value">{{ formatDate(evaluation.startDate || evaluation.createdAt) }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">截止时间</span>
              <span class="meta-value">{{ formatDate(evaluation.endDate) }}</span>
            </div>
            <div v-if="evaluation.progress" class="meta-row meta-progress">
              <span class="meta-label">完成度</span>
              <div class="mini-progress">
                <div class="mini-progress__bar">
                  <div
                    class="mini-progress__fill"
                    :style="{ width: getProgressPercentage(evaluation.progress) + '%' }"
                  ></div>
                </div>
                <span class="mini-progress__text">{{ getProgressPercentage(evaluation.progress) }}%</span>
              </div>
            </div>
          </div>

          <div class="upcoming-card__footer">
            <button type="button" class="btn btn-ghost btn-sm" @click="viewEvaluation(evaluation)">
              <MaterialIcon name="view" size="sm" />
              查看详情
            </button>
            <button type="button" class="btn btn-primary btn-sm" @click="shareEvaluation(evaluation)">
              <MaterialIcon name="share" size="sm" />
              分享链接
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="section-header">
        <div>
          <h2>评估列表</h2>
          <p class="section-subtitle">
            {{ listSummaryText }}
            <template v-if="filteredActiveCount">· 进行中 {{ filteredActiveCount }} 项</template>
          </p>
        </div>
      </div>

      <div class="toolbar card">
        <div class="toolbar-header">
          <MaterialIcon name="filter" size="sm" />
          <span>筛选评估</span>
        </div>
        <div class="toolbar-controls">
          <div class="input-with-icon">
            <MaterialIcon name="filter" size="sm" class="input-icon" />
            <select v-model="selectedStatus" class="form-select" @change="filterEvaluations">
              <option value="">所有状态</option>
              <option value="active">进行中</option>
              <option value="completed">已完成</option>
              <option value="draft">草稿</option>
            </select>
          </div>
          <div class="input-with-icon input-with-icon--search">
            <MaterialIcon name="search" size="sm" class="input-icon" />
            <input
              v-model="searchKeyword"
              class="form-input"
              type="search"
              placeholder="搜索评估标题、用户或编号..."
              @input="filterEvaluations"
            >
          </div>
        </div>
      </div>

      <div class="evaluations-container">
        <div v-if="loading" class="loading-state card">
          <div class="loading-spinner"></div>
          <p>正在加载评估...</p>
        </div>

        <div v-else-if="filteredEvaluations.length === 0" class="empty-state card">
          <div class="empty-illustration">
            <MaterialIcon name="evaluations" size="xl" />
          </div>
          <h3>暂无评估</h3>
          <p>{{ emptyStateCopy }}</p>
          <button type="button" class="btn btn-primary btn-sm" @click="showCreateModal = true">
            <MaterialIcon name="plus" size="sm" />
            立即创建
          </button>
        </div>

        <div v-else class="evaluations-grid">
          <div v-for="evaluation in filteredEvaluations" :key="evaluation.id" class="evaluation-card card">
            <div class="card-header">
              <div class="card-title">
                <div class="title-row">
                  <h3>{{ evaluation.title || `评估 #${evaluation.id}` }}</h3>
                  <span class="status-badge badge" :class="getStatusClass(evaluation.status)">
                    {{ getStatusText(evaluation.status) }}
                  </span>
                </div>
                <p class="card-subtitle">
                  <MaterialIcon name="users" size="sm" />
                  {{ evaluation.user?.name || '未知用户' }}
                  <span class="divider">·</span>
                  {{ evaluation.user?.role || '未分配角色' }}
                </p>
              </div>
              <div class="card-stat">
                <span class="stat-label">创建于</span>
                <span class="stat-value">{{ formatDate(evaluation.createdAt) }}</span>
              </div>
            </div>

            <div class="card-body">
              <div class="meta-grid">
                <div class="meta-item">
                  <span class="meta-label">问卷类型</span>
                  <span class="meta-value">{{ evaluation.questionnaireType || '标准问卷' }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">时间范围</span>
                  <span class="meta-value">{{ formatRange(evaluation.startDate, evaluation.endDate) }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">状态</span>
                  <span class="meta-chip" :class="`meta-chip--${evaluation.status}`">
                    {{ getStatusText(evaluation.status) }}
                  </span>
                </div>
              </div>

              <div v-if="evaluation.progress" class="progress-area">
                <div class="progress-label">
                  完成进度
                  <span>{{ evaluation.progress.completed }}/{{ evaluation.progress.total }}</span>
                </div>
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    :style="{ width: getProgressPercentage(evaluation.progress) + '%' }"
                  ></div>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <button type="button" class="btn btn-ghost btn-sm" @click="viewEvaluation(evaluation)">
                <MaterialIcon name="view" size="sm" />
                查看详情
              </button>
              <button type="button" class="btn btn-primary btn-sm" @click="shareEvaluation(evaluation)">
                <MaterialIcon name="share" size="sm" />
                分享链接
              </button>
              <button type="button" class="btn btn-success btn-sm" @click="generateReport(evaluation)">
                <MaterialIcon name="reports" size="sm" />
                生成报告
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 批量删除模态框 -->
    <div v-if="showBatchDeleteModal" class="modal-overlay" @click="closeBatchDeleteModal">
      <div class="modal-content modal-content--small" @click.stop>
        <div class="modal-header">
          <div>
            <h2>批量删除评估</h2>
            <p class="modal-subtitle" style="color: #ef4444;">警告：此操作将删除所选组织下所有用户的评估任务及相关回答，且不可恢复。</p>
          </div>
          <button type="button" class="modal-close" @click="closeBatchDeleteModal">
            <MaterialIcon name="close" size="sm" />
          </button>
        </div>

        <div class="modal-body" style="padding: 1.5rem;">
          <div class="form-group">
            <label>选择要清空的组织</label>
            <select v-model="selectedDeleteOrgId" class="form-select">
              <option value="">请选择公司/组织</option>
              <option v-for="org in organizations" :key="org.id" :value="org.id">
                {{ org.name }}
              </option>
            </select>
          </div>

          <div v-if="selectedDeleteOrgId" class="alert-box" style="background: #fef2f2; border: 1px solid #fecaca; padding: 1rem; border-radius: 6px; margin-top: 1rem; color: #991b1b;">
             <div style="font-weight: bold; margin-bottom: 0.5rem;">即将删除的内容：</div>
             <ul style="padding-left: 1.5rem; margin: 0;">
               <li>该组织下所有用户的评估任务</li>
               <li>所有相关的问卷回答数据</li>
               <li>所有参与者记录</li>
             </ul>
          </div>
        </div>

        <div class="modal-footer" style="padding: 1.5rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
          <button class="btn btn-ghost" @click="closeBatchDeleteModal">取消</button>
          <button
            class="btn btn-danger"
            style="background-color: #ef4444; color: white;"
            :disabled="!selectedDeleteOrgId || isDeleting"
            @click="batchDeleteByOrg"
          >
            {{ isDeleting ? '删除中...' : '确认彻底删除' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showCreateModal" class="modal-overlay" @click="closeCreateModal">
      <div class="modal-content modal-content--medium" @click.stop>
        <div class="modal-header">
          <div>
            <h2>创建新评估</h2>
            <p class="modal-subtitle">完善基础信息后即可发布给相关用户</p>
          </div>
          <button type="button" class="modal-close" @click="closeCreateModal">
            <MaterialIcon name="close" size="sm" />
          </button>
        </div>

        <form class="evaluation-form" @submit.prevent="createEvaluation">
          <div class="form-group">
            <label>评估标题</label>
            <input
              v-model="newEvaluation.title"
              class="form-input"
              required
              placeholder="请输入评估标题"
            >
          </div>

          <!-- 组织一键创建区域 -->
          <div class="org-batch-create card" style="padding: 1rem; margin-bottom: 1rem; background: #f8fafc; border: 1px dashed #cbd5e1;">
            <h4 style="margin-top: 0; margin-bottom: 1rem; font-size: 0.9rem; color: #475569;">按组织一键批量创建</h4>
            <div class="form-group">
              <label>选择组织</label>
              <div style="display: flex; gap: 10px;">
                <select v-model="selectedOrgId" class="form-select">
                  <option value="">请选择公司/组织</option>
                  <option v-for="org in organizations" :key="org.id" :value="org.id">
                    {{ org.name }}
                  </option>
                </select>
                <button 
                  v-if="selectedOrgId" 
                  type="button" 
                  class="btn btn-primary" 
                  :disabled="isBatchCreating || usersInSelectedOrg.length === 0"
                  @click="batchCreateForOrg"
                >
                  {{ isBatchCreating ? '创建中...' : '一键创建' }}
                </button>
              </div>
            </div>
            
            <div v-if="selectedOrgId && orgRoleSummary" style="margin-top: 0.5rem; font-size: 0.8rem; color: #64748b;">
              将为 {{ usersInSelectedOrg.length }} 位用户创建评估：
              <ul style="margin: 0.5rem 0 0 1.2rem; padding: 0;">
                <li v-if="orgRoleSummary['高层领导者']">高层领导者: {{ orgRoleSummary['高层领导者'] }} 人 (分配: 高层领导问卷)</li>
                <li v-if="orgRoleSummary['中层管理者']">中层管理者: {{ orgRoleSummary['中层管理者'] }} 人 (分配: 中层管理问卷)</li>
                <li v-if="orgRoleSummary['基层管理者']">基层管理者: {{ orgRoleSummary['基层管理者'] }} 人 (分配: 基层管理问卷)</li>
                <li v-if="orgRoleSummary['其他']">其他角色: {{ orgRoleSummary['其他'] }} 人 (分配: 基层管理问卷)</li>
              </ul>
            </div>
          </div>

          <div class="form-separator" style="text-align: center; margin: 1rem 0; position: relative;">
            <span style="background: white; padding: 0 10px; color: #94a3b8; font-size: 0.8rem;">或 手动选择</span>
          </div>

          <div class="form-group">
            <label>评估对象 (可多选)</label>
            <div class="user-multiselect">
              <div v-for="user in filteredUsers" :key="user.id" class="user-option">
                <input
                  type="checkbox"
                  :id="`user-${user.id}`"
                  :value="user.id"
                  v-model="newEvaluation.userIds"
                />
                <label :for="`user-${user.id}`">
                  {{ user.name }} 
                  <span v-if="user.organization" style="color: #64748b; font-size: 0.8em;">[{{ user.organization.name }}]</span>
                  ({{ user.role }})
                </label>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>问卷类型</label>
            <select v-model="newEvaluation.questionnaireType" class="form-select" required>
              <option value="">请选择问卷</option>
              <option value="高层领导">高层领导力问卷</option>
              <option value="中层管理">中层管理力问卷</option>
              <option value="基层管理">基层管理力问卷</option>
            </select>
          </div>

          <div class="form-group">
            <label>评估描述</label>
            <textarea
              v-model="newEvaluation.description"
              class="form-textarea"
              rows="3"
              placeholder="请输入评估描述（可选）"
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>开始日期</label>
              <input v-model="newEvaluation.startDate" type="date" class="form-input">
            </div>
            <div class="form-group">
              <label>结束日期</label>
              <input v-model="newEvaluation.endDate" type="date" class="form-input">
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-ghost" @click="closeCreateModal">取消</button>
            <button type="submit" class="btn btn-primary">创建评估</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showDetailsModal" class="modal-overlay" @click="closeDetailsModal">
      <div class="modal-content modal-content--medium" @click.stop>
        <div class="modal-header">
          <div>
            <h2>评估详情</h2>
            <p class="modal-subtitle">{{ currentEvaluation?.title }}</p>
          </div>
          <button type="button" class="modal-close" @click="closeDetailsModal">
            <MaterialIcon name="close" size="sm" />
          </button>
        </div>

        <div class="details-content" style="padding: 1.5rem; overflow-y: auto;">
          <div class="detail-section">
            <h4 style="margin-top: 0;">被评估人</h4>
            <div class="user-card" style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #f8fafc; border-radius: 8px;">
              <div class="avatar" style="width: 40px; height: 40px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #64748b;">
                {{ currentEvaluation?.user?.name?.charAt(0) }}
              </div>
              <div>
                <div style="font-weight: 500;">{{ currentEvaluation?.user?.name }}</div>
                <div style="font-size: 0.85rem; color: #64748b;">{{ currentEvaluation?.user?.role }}</div>
              </div>
            </div>
          </div>

          <div class="detail-section" style="margin-top: 1.5rem;">
            <h4 style="margin-bottom: 10px;">评估进度详情</h4>
            
            <div v-if="!currentEvaluation?.participants || currentEvaluation.participants.length === 0" style="color: #94a3b8; text-align: center; padding: 20px;">
              暂无参与者
            </div>

            <div v-else class="participants-list" style="display: flex; flex-direction: column; gap: 10px;">
              <div 
                v-for="participant in currentEvaluation.participants" 
                :key="participant.id" 
                class="participant-item"
                style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px;"
              >
                <div class="p-info" style="display: flex; align-items: center; gap: 10px;">
                  <span class="relationship-badge" 
                    style="padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 500;"
                    :style="{
                      backgroundColor: participant.relationship === '自评' ? '#dbeafe' : 
                                     participant.relationship === '上级' ? '#fef3c7' : 
                                     participant.relationship === '下级' ? '#dcfce7' : '#f1f5f9',
                      color: participant.relationship === '自评' ? '#1e40af' : 
                             participant.relationship === '上级' ? '#92400e' : 
                             participant.relationship === '下级' ? '#166534' : '#475569'
                    }"
                  >
                    {{ participant.relationship }}
                  </span>
                  <span style="font-weight: 500;">{{ participant.participant?.name || '未知用户' }}</span>
                  <span style="font-size: 0.85rem; color: #94a3b8;">{{ participant.participant?.role }}</span>
                </div>
                
                <div class="p-status">
                  <span 
                    class="status-tag"
                    style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.85rem;"
                    :style="{ color: participant.status === 'completed' ? '#16a34a' : '#f59e0b' }"
                  >
                    <MaterialIcon :name="participant.status === 'completed' ? 'check' : 'time'" size="sm" />
                    {{ participant.status === 'completed' ? '已完成' : '待完成' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer" style="padding: 1.5rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
          <button class="btn btn-primary" @click="closeDetailsModal">关闭</button>
        </div>
      </div>
    </div>

    <div v-if="showShareModal" class="modal-overlay" @click="closeShareModal">
      <div class="modal-content modal-content--medium" @click.stop>
        <div class="modal-header">
          <div>
            <h2>分享评估链接</h2>
            <p class="modal-subtitle">复制链接后发送给参与人员即可填写问卷</p>
          </div>
          <button type="button" class="modal-close" @click="closeShareModal">
            <MaterialIcon name="close" size="sm" />
          </button>
        </div>

        <div class="share-content">
          <div class="share-summary">
            <div class="share-avatar">
              {{ currentEvaluation?.user?.name?.charAt(0) || '评' }}
            </div>
            <div>
              <h3>{{ currentEvaluation?.title || `评估 #${currentEvaluation?.id}` }}</h3>
              <p>评估对象：{{ currentEvaluation?.user?.name }}</p>
            </div>
          </div>

          <div class="link-block">
            <label>评估链接</label>
            <div class="link-input-group">
              <input :value="evaluationLink" class="form-input" readonly>
              <button type="button" class="btn btn-secondary btn-copy" @click="copyLink">
                {{ linkCopied ? '已复制' : '复制链接' }}
              </button>
            </div>
            <p class="link-hint">链接在评估结束前长期有效，支持多人同时填写。</p>
          </div>

          <div class="share-guide card">
            <h4>使用说明</h4>
            <ul>
              <li>通过企业微信、邮件或内部 IM 发送给参与者</li>
              <li>建议提前说明填写截止时间与注意事项</li>
              <li>可随时在此页面查看实时进度</li>
            </ul>
          </div>

          <div class="share-actions">
            <button type="button" class="btn btn-ghost" @click="closeShareModal">关闭</button>
            <button type="button" class="btn btn-primary" @click="sendEmail">
              <MaterialIcon name="share" size="sm" />
              发送邮件
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MaterialIcon from '../components/icons/MaterialIcon.vue'
import apiClient from '../services/api'

const router = useRouter()

interface User {
  id: number
  name: string
  role: string
  email: string
  organization?: {
    id: number
    name: string
  }
}

interface EvaluationProgress {
  total: number
  completed: number
}

interface Evaluation {
  id: number
  userId: number
  title?: string
  description?: string
  status: string
  createdAt: string
  startDate?: string
  endDate?: string
  questionnaireType?: string
  user?: User
  progress?: EvaluationProgress
  participants?: Array<{
    id: number
    relationship: string
    status: string
    participant?: User
  }>
}

interface SummaryCard {
  key: string
  label: string
  value: number
  icon: string
  accent: 'primary' | 'success' | 'neutral' | 'info'
  trendText: string
  trendType: 'positive' | 'neutral' | 'warning'
}

const DAY_IN_MS = 24 * 60 * 60 * 1000
const UPCOMING_WINDOW_DAYS = 14

const EVALUATION_STATUSES = ['active', 'completed', 'draft'] as const
type EvaluationStatus = (typeof EVALUATION_STATUSES)[number]

const isEvaluationStatus = (value: string): value is EvaluationStatus =>
  EVALUATION_STATUSES.includes(value as EvaluationStatus)

const loading = ref(true)
const evaluations = ref<Evaluation[]>([])
const users = ref<User[]>([])
const selectedStatus = ref('')
const searchKeyword = ref('')
const showCreateModal = ref(false)
const showBatchDeleteModal = ref(false)
const selectedOrgId = ref<number | ''>('')
const selectedDeleteOrgId = ref<number | ''>('')
const isBatchCreating = ref(false)
const isDeleting = ref(false)
const showShareModal = ref(false)
const showDetailsModal = ref(false)
const linkCopied = ref(false)
const currentEvaluation = ref<Evaluation | null>(null)

const newEvaluation = ref({
  title: '',
  userIds: [],
  description: '',
  startDate: '',
  endDate: '',
  questionnaireType: ''
})

const organizations = computed(() => {
  const orgMap = new Map<number, string>()
  users.value.forEach(user => {
    if (user.organization) {
      orgMap.set(user.organization.id, user.organization.name)
    }
  })
  return Array.from(orgMap.entries()).map(([id, name]) => ({ id, name }))
})

const usersInSelectedOrg = computed(() => {
  if (!selectedOrgId.value) return []
  return users.value.filter(user => user.organization?.id === selectedOrgId.value)
})

const orgRoleSummary = computed(() => {
  if (!selectedOrgId.value) return null
  
  const summary = {
    '高层领导者': 0,
    '中层管理者': 0,
    '基层管理者': 0,
    '其他': 0
  }
  
  usersInSelectedOrg.value.forEach(user => {
    if (user.role in summary) {
      summary[user.role as keyof typeof summary]++
    } else {
      summary['其他']++
    }
  })
  
  return summary
})

const participantsCount = computed(() => {
  const userIds = new Set<number>()
  evaluations.value.forEach(evaluation => {
    if (evaluation.userId) {
      userIds.add(evaluation.userId)
    }
  })
  return userIds.size
})

const formatDate = (dateString?: string) => {
  if (!dateString) return '未设置'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '未设置'
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const formatRange = (startDate?: string, endDate?: string) => {
  if (startDate && endDate) {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`
  }
  if (startDate) {
    return `${formatDate(startDate)} 起`
  }
  if (endDate) {
    return `截至 ${formatDate(endDate)}`
  }
  return '未设置'
}

const getProgressPercentage = (progress: EvaluationProgress) => {
  if (!progress || progress.total === 0) return 0
  return Math.round((progress.completed / progress.total) * 100)
}

const getRemainingDays = (dateString?: string) => {
  if (!dateString) return Number.POSITIVE_INFINITY
  const target = new Date(dateString)
  if (Number.isNaN(target.getTime())) return Number.POSITIVE_INFINITY
  return Math.ceil((target.getTime() - Date.now()) / DAY_IN_MS)
}

const formatRelativeDate = (dateString?: string) => {
  if (!dateString) return '未设置'
  const remaining = getRemainingDays(dateString)
  if (!Number.isFinite(remaining)) return '未设置'
  if (remaining > 1) return `剩余 ${remaining} 天`
  if (remaining === 1) return '剩余 1 天'
  if (remaining === 0) return '今日截止'
  if (remaining === -1) return '已逾期 1 天'
  return `已逾期 ${Math.abs(remaining)} 天`
}

const isPastDue = (evaluation: Evaluation) => {
  if (!evaluation.endDate) return false
  return new Date(evaluation.endDate).getTime() < Date.now()
}

const statusSummary = computed<SummaryCard[]>(() => {
  const totals: Record<EvaluationStatus, number> = {
    active: 0,
    completed: 0,
    draft: 0
  }

  const progressByStatus: Record<EvaluationStatus, number[]> = {
    active: [],
    completed: [],
    draft: []
  }

  let latestCompletedDate: string | null = null

  evaluations.value.forEach(evaluation => {
    if (!isEvaluationStatus(evaluation.status)) {
      return
    }
    const statusKey = evaluation.status

    totals[statusKey] += 1

    if (evaluation.progress && evaluation.progress.total > 0) {
      progressByStatus[statusKey].push(getProgressPercentage(evaluation.progress))
    }

    if (statusKey === 'completed') {
      const completedDate = evaluation.endDate ?? evaluation.createdAt
      const completedTime = new Date(completedDate).getTime()
      const latestTime = latestCompletedDate ? new Date(latestCompletedDate).getTime() : Number.NEGATIVE_INFINITY

      if (completedTime > latestTime) {
        latestCompletedDate = completedDate
      }
    }
  })

  const average = (values: number[]) =>
    values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0

  const latestCompletedText = latestCompletedDate
    ? `${formatDate(latestCompletedDate)} 完成`
    : '等待最新成果'

  return [
    {
      key: 'active',
      label: '进行中评估',
      value: totals.active,
      icon: 'evaluations',
      accent: 'primary',
      trendText: totals.active ? `平均完成度 ${average(progressByStatus.active)}%` : '等待启动',
      trendType: totals.active ? 'positive' : 'neutral'
    },
    {
      key: 'completed',
      label: '已完成评估',
      value: totals.completed,
      icon: 'check',
      accent: 'success',
      trendText: totals.completed ? latestCompletedText : '尚无历史记录',
      trendType: totals.completed ? 'positive' : 'neutral'
    },
    {
      key: 'draft',
      label: '草稿待发布',
      value: totals.draft,
      icon: 'filter',
      accent: 'neutral',
      trendText: totals.draft ? '建议尽快发布' : '无草稿项目',
      trendType: totals.draft ? 'warning' : 'neutral'
    },
    {
      key: 'participants',
      label: '覆盖用户',
      value: participantsCount.value,
      icon: 'users',
      accent: 'info',
      trendText: evaluations.value.length ? `${evaluations.value.length} 项评估` : '等待创建',
      trendType: evaluations.value.length ? 'positive' : 'neutral'
    }
  ]
})

const upcomingEvaluations = computed(() => {
  const now = Date.now()
  const windowEnd = now + UPCOMING_WINDOW_DAYS * DAY_IN_MS

  return evaluations.value
    .filter(evaluation => {
      if (!evaluation.endDate) return false
      const endTime = new Date(evaluation.endDate).getTime()
      return endTime >= now && endTime <= windowEnd
    })
    .sort((a, b) => {
      const aTime = new Date(a.endDate as string).getTime()
      const bTime = new Date(b.endDate as string).getTime()
      return aTime - bTime
    })
})

const filteredEvaluations = computed(() => {
  let filtered = evaluations.value

  if (selectedStatus.value) {
    filtered = filtered.filter(evaluation => evaluation.status === selectedStatus.value)
  }

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(evaluation => {
      const titleMatch = evaluation.title?.toLowerCase().includes(keyword)
      const userMatch = evaluation.user?.name?.toLowerCase().includes(keyword)
      const idMatch = evaluation.id.toString().includes(keyword)
      return titleMatch || userMatch || idMatch
    })
  }

  return filtered
})

const filteredActiveCount = computed(() =>
  filteredEvaluations.value.filter(evaluation => evaluation.status === 'active').length
)

const listSummaryText = computed(() => {
  if (!evaluations.value.length) return '暂无评估项目'
  if (!selectedStatus.value && !searchKeyword.value) {
    return `共 ${evaluations.value.length} 项评估`
  }
  return `筛选得到 ${filteredEvaluations.value.length} 项结果`
})

const emptyStateCopy = computed(() =>
  selectedStatus.value
    ? '当前筛选条件下暂无评估，请尝试调整条件。'
    : '系统中暂无评估项目，请创建新评估。'
)

const evaluationLink = computed(() => {
  if (!currentEvaluation.value) return ''
  return `${window.location.origin}/questionnaire?evaluationId=${currentEvaluation.value.id}&userId=${currentEvaluation.value.userId}`
})

const getStatusClass = (status: string) => {
  const map: Record<EvaluationStatus, string> = {
    active: 'badge-primary',
    completed: 'badge-success',
    draft: 'badge-gray'
  }
  return map[status as EvaluationStatus] ?? 'badge-gray'
}

const getStatusText = (status: string) => {
  const map: Record<EvaluationStatus, string> = {
    active: '进行中',
    completed: '已完成',
    draft: '草稿'
  }
  return map[status as EvaluationStatus] ?? status
}

const loadEvaluations = async () => {
  loading.value = true
  try {
    const response = await apiClient.get('/evaluations')
    const data = response.data
    evaluations.value = data.map((evaluation: any) => {
      // Calculate progress
      // Filter out nomination tasks from total count as they don't produce evaluation responses
      const totalParticipants = evaluation.participants?.filter((p: any) => p.relationship !== '提名').length || 0
      const uniqueRespondents = new Set(
        evaluation.responses?.map((r: any) => r.respondentId)
      ).size

      return {
        ...evaluation,
        progress: {
          total: totalParticipants,
          completed: uniqueRespondents
        }
      }
    })
  } catch (error) {
    console.error('加载评估失败:', error)
    alert('加载评估失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const loadUsers = async () => {
  try {
    const response = await apiClient.get('/users')
    users.value = response.data
  } catch (error) {
    console.error('加载用户失败:', error)
  }
}

const filteredUsers = computed(() => {
  if (selectedOrgId.value) {
    return users.value.filter(user => user.organization?.id === selectedOrgId.value)
  }
  return users.value
})

const batchCreateForOrg = async () => {
  if (!selectedOrgId.value || !newEvaluation.value.title) {
    alert('请输入评估标题并选择组织');
    return;
  }

  if (!confirm(`确认要为 ${usersInSelectedOrg.value.length} 位用户自动根据层级创建评估吗？`)) {
    return;
  }

  isBatchCreating.value = true;
  const groups = {
    '高层领导者': [] as number[],
    '中层管理者': [] as number[],
    '基层管理者': [] as number[],
    '其他': [] as number[]
  };

  // Group users
  usersInSelectedOrg.value.forEach(user => {
    if (user.role === '高层领导者') groups['高层领导者'].push(user.id);
    else if (user.role === '中层管理者') groups['中层管理者'].push(user.id);
    else if (user.role === '基层管理者') groups['基层管理者'].push(user.id);
    else groups['其他'].push(user.id);
  });

  try {
    const promises = [];
    const orgName = usersInSelectedOrg.value[0]?.organization?.name || '该组织';
    const commonData = {
      title: newEvaluation.value.title,
      description: newEvaluation.value.description || `针对 ${orgName} 的${newEvaluation.value.title}`,
      startDate: newEvaluation.value.startDate || new Date().toISOString(),
      endDate: newEvaluation.value.endDate || new Date(Date.now() + 30 * DAY_IN_MS).toISOString(),
      status: 'active'
    };

    // Send batch requests
    if (groups['高层领导者'].length) {
      promises.push(fetch('/api/evaluations/publish-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...commonData, userIds: groups['高层领导者'], questionnaireType: '高层领导' })
      }));
    }
    if (groups['中层管理者'].length) {
      promises.push(fetch('/api/evaluations/publish-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...commonData, userIds: groups['中层管理者'], questionnaireType: '中层管理' })
      }));
    }
    if (groups['基层管理者'].length) {
      promises.push(fetch('/api/evaluations/publish-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...commonData, userIds: groups['基层管理者'], questionnaireType: '基层管理' })
      }));
    }
    if (groups['其他'].length) {
      // Default to Low level for others
      promises.push(fetch('/api/evaluations/publish-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...commonData, userIds: groups['其他'], questionnaireType: '基层管理' })
      }));
    }

    await Promise.all(promises);
    alert('批量创建成功！');
    closeCreateModal();
    loadEvaluations();
  } catch (error) {
    console.error('批量创建失败:', error);
    alert('部分或全部创建失败，请查看控制台');
  } finally {
    isBatchCreating.value = false;
  }
}

const filterEvaluations = () => {
  // 依赖 computed，函数体可留空用于触发响应式
}

const viewEvaluation = (evaluation: Evaluation) => {
  currentEvaluation.value = evaluation
  showDetailsModal.value = true
}

const closeDetailsModal = () => {
  showDetailsModal.value = false
  currentEvaluation.value = null
}

const shareEvaluation = (evaluation: Evaluation) => {
  currentEvaluation.value = evaluation
  showShareModal.value = true
  linkCopied.value = false
}

const generateReport = async (evaluation: Evaluation) => {
  try {
    const response = await fetch(`/api/reports/generate/personal/${evaluation.userId}`, {
      method: 'POST'
    })
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.report) {
        if (confirm('报告生成成功！是否立即查看？')) {
          router.push(`/report/${data.report.id}`)
        }
      } else {
        throw new Error(data.message || '生成失败')
      }
    } else {
      throw new Error('生成失败')
    }
  } catch (error) {
    console.error('生成报告失败:', error)
    alert('生成报告失败，请稍后重试')
  }
}

const createEvaluation = async () => {
  try {
    const evaluationData = {
      userIds: newEvaluation.value.userIds,
      title: newEvaluation.value.title,
      description: newEvaluation.value.description,
      status: 'active',
      startDate: newEvaluation.value.startDate || new Date().toISOString(),
      endDate:
        newEvaluation.value.endDate || new Date(Date.now() + 30 * DAY_IN_MS).toISOString(),
      questionnaireType: newEvaluation.value.questionnaireType
    }

    const response = await fetch('/api/evaluations/publish-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evaluationData)
    })

    if (response.ok) {
      await response.json()
      alert('评估创建成功！')
      closeCreateModal()
      loadEvaluations()
    } else {
      throw new Error('创建失败')
    }
  } catch (error) {
    console.error('创建评估失败:', error)
    alert('创建评估失败，请稍后重试')
  }
}

const closeCreateModal = () => {
  showCreateModal.value = false
  newEvaluation.value = {
    title: '',
    userIds: [],
    description: '',
    startDate: '',
    endDate: '',
    questionnaireType: ''
  }
}

const closeBatchDeleteModal = () => {
  showBatchDeleteModal.value = false
  selectedDeleteOrgId.value = ''
}

const batchDeleteByOrg = async () => {
  if (!selectedDeleteOrgId.value) return

  if (!confirm('再次确认：您确定要删除该组织下的所有评估数据吗？此操作无法撤销！')) {
    return
  }

  isDeleting.value = true
  try {
    const response = await fetch(`/api/evaluations/organization/${selectedDeleteOrgId.value}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    })

    if (response.ok) {
      const result = await response.json()
      alert(result.message || '删除成功')
      closeBatchDeleteModal()
      loadEvaluations() // 刷新列表
    } else {
      throw new Error('删除请求失败')
    }
  } catch (error) {
    console.error('批量删除失败:', error)
    alert('批量删除失败，请稍后重试')
  } finally {
    isDeleting.value = false
  }
}

const closeShareModal = () => {
  showShareModal.value = false
  currentEvaluation.value = null
  linkCopied.value = false
}

const copyLink = async () => {
  if (!evaluationLink.value) return
  try {
    await navigator.clipboard.writeText(evaluationLink.value)
    linkCopied.value = true
    setTimeout(() => {
      linkCopied.value = false
    }, 2000)
  } catch (error) {
    console.error('复制失败:', error)
    alert('复制失败，请手动复制链接')
  }
}

const sendEmail = () => {
  alert('发送邮件功能开发中...')
}

onMounted(() => {
  loadEvaluations()
  loadUsers()
})
</script>

<style scoped>
.evaluation-management {
  display: flex;
  flex-direction: column;
  gap: var(--space-10);
  padding-bottom: var(--space-12);
}

.card {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-6);
  padding: var(--space-6);
}

.header-text h1 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--gray-900);
  margin: 0 0 var(--space-2) 0;
}

.page-subtitle {
  color: var(--gray-600);
  font-size: var(--text-base);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
}

.summary-card {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-6);
  position: relative;
  overflow: hidden;
  transition: transform var(--transition-normal), box-shadow var(--transition-normal);
}

.summary-card::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.35;
  background: var(--summary-accent, transparent);
  pointer-events: none;
}

.summary-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.summary-card--muted {
  opacity: 0.85;
}

.summary-card--primary {
  --summary-accent: linear-gradient(135deg, rgba(249, 115, 22, 0.18), rgba(249, 115, 22, 0.05));
}

.summary-card--success {
  --summary-accent: linear-gradient(135deg, rgba(34, 197, 94, 0.18), rgba(34, 197, 94, 0.05));
}

.summary-card--neutral {
  --summary-accent: linear-gradient(135deg, rgba(156, 163, 175, 0.16), rgba(229, 231, 235, 0.4));
}

.summary-card--info {
  --summary-accent: linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(59, 130, 246, 0.06));
}

.summary-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.75);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
  position: relative;
  z-index: 1;
}

.summary-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.summary-label {
  font-size: var(--text-sm);
  color: var(--gray-500);
  margin: 0;
}

.summary-value {
  margin: 0;
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--gray-900);
}

.summary-trend {
  font-size: var(--text-xs);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.78);
  font-weight: var(--font-medium);
  width: fit-content;
}

.summary-trend--positive {
  color: var(--success-600);
}

.summary-trend--warning {
  color: var(--warning-600);
}

.summary-trend--neutral {
  color: var(--gray-500);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.section-header h2 {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
}

.section-subtitle {
  margin: var(--space-1) 0 0;
  color: var(--gray-500);
  font-size: var(--text-sm);
}

.section-tag {
  background: var(--gray-100);
  color: var(--gray-600);
  border-radius: var(--radius-full);
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.upcoming-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-4);
}

.upcoming-card__header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-6);
  border-bottom: 1px solid var(--gray-200);
}

.upcoming-card__header h3 {
  margin: 0 0 var(--space-2) 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
}

.upcoming-meta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--gray-500);
  margin: 0;
}

.divider {
  margin: 0 var(--space-1);
  color: var(--gray-300);
}

.countdown-badge {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border-radius: var(--radius-full);
  padding: var(--space-1) var(--space-3);
  background: var(--gray-100);
  color: var(--gray-600);
}

.countdown-badge--warning {
  background: rgba(245, 158, 11, 0.18);
  color: var(--warning-600);
}

.countdown-badge--alert {
  background: rgba(239, 68, 68, 0.2);
  color: var(--error-600);
}

.upcoming-card__body {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-sm);
  color: var(--gray-600);
}

.meta-value {
  font-weight: var(--font-medium);
  color: var(--gray-900);
}

.meta-progress .mini-progress {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 60%;
  min-width: 160px;
}

.mini-progress__bar {
  flex: 1;
  height: 6px;
  background: var(--gray-200);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.mini-progress__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-500), var(--primary-600));
  transition: width var(--transition-normal);
}

.mini-progress__text {
  font-size: var(--text-xs);
  color: var(--gray-500);
  font-weight: var(--font-medium);
}

.upcoming-card__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-5);
  border-top: 1px solid var(--gray-200);
  background: var(--gray-50);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-5);
}

.toolbar-header {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--gray-600);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.toolbar-controls {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.input-with-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: var(--space-3);
  color: var(--gray-400);
}

.input-with-icon .form-select,
.input-with-icon .form-input {
  padding-left: calc(var(--space-3) * 3);
  min-width: 180px;
}

.input-with-icon--search .form-input {
  min-width: 260px;
}

.evaluations-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.loading-state,
.empty-state {
  padding: var(--space-10);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  text-align: center;
}

.loading-spinner {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  border: 4px solid rgba(249, 115, 22, 0.18);
  border-top-color: var(--primary-500);
  animation: spin 0.8s linear infinite;
}

.empty-illustration {
  width: 88px;
  height: 88px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--gray-100), var(--gray-200));
  color: var(--gray-400);
}

.empty-state h3 {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
}

.empty-state p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--gray-500);
}

.evaluations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-4);
}

.evaluation-card {
  display: flex;
  flex-direction: column;
  transition: transform var(--transition-normal), box-shadow var(--transition-normal);
}

.evaluation-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.card-header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-6);
  border-bottom: 1px solid var(--gray-200);
}

.card-title {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  flex: 1;
}

.title-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.title-row h3 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
}

.card-subtitle {
  margin: 0;
  color: var(--gray-500);
  font-size: var(--text-sm);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.card-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-1);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--gray-500);
}

.stat-value {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--gray-900);
}

.card-body {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-4);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.meta-label {
  font-size: var(--text-xs);
  color: var(--gray-500);
  font-weight: var(--font-medium);
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  background: var(--gray-100);
  color: var(--gray-600);
  width: fit-content;
}

.meta-chip--active {
  background: rgba(249, 115, 22, 0.14);
  color: var(--primary-700);
}

.meta-chip--completed {
  background: rgba(34, 197, 94, 0.16);
  color: var(--success-700);
}

.meta-chip--draft {
  background: rgba(148, 163, 184, 0.16);
  color: var(--gray-600);
}

.progress-area {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.progress-label {
  font-size: var(--text-sm);
  color: var(--gray-600);
  display: flex;
  justify-content: space-between;
}

.progress-bar {
  width: 100%;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--gray-200);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-500), var(--primary-600));
  transition: width var(--transition-normal);
}

.card-footer {
  padding: var(--space-5) var(--space-6);
  border-top: 1px solid var(--gray-200);
  background: var(--gray-50);
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(16, 24, 40, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--space-6);
}

.modal-content {
  width: min(620px, 100%);
  max-height: 90vh;
  border-radius: var(--radius-2xl);
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-xl);
}

.modal-header {
  padding: var(--space-6);
  border-bottom: 1px solid var(--gray-200);
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  align-items: flex-start;
}

.modal-header h2 {
  margin: 0 0 var(--space-2) 0;
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
}

.modal-subtitle {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--gray-500);
}

.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--gray-100);
  border: none;
  border-radius: var(--radius-full);
  padding: var(--space-2);
  cursor: pointer;
}

.modal-close:hover {
  background: var(--gray-200);
}

.evaluation-form {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  overflow-y: auto;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--gray-700);
}

.user-multiselect {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-lg);
  padding: var(--space-2);
  background: var(--gray-50);
}

.user-option {
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.user-option:hover {
  background-color: var(--primary-100);
}

.user-option input {
  margin-right: var(--space-3);
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  font-size: var(--text-sm);
  color: var(--gray-900);
  background: white;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.18);
}

.form-textarea {
  resize: vertical;
  min-height: 88px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

.share-content {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  overflow-y: auto;
}

.share-summary {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}

.share-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--primary-400), var(--primary-600));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-semibold);
  font-size: var(--text-lg);
}

.share-summary h3 {
  margin: 0 0 var(--space-1) 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
}

.share-summary p {
  margin: 0;
  color: var(--gray-500);
  font-size: var(--text-sm);
}

.link-block label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--gray-700);
  margin-bottom: var(--space-2);
}

.link-input-group {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.link-hint {
  margin: var(--space-2) 0 0;
  font-size: var(--text-xs);
  color: var(--gray-500);
}

.btn-copy {
  white-space: nowrap;
}

.share-guide {
  padding: var(--space-5);
}

.share-guide h4 {
  margin: 0 0 var(--space-3) 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--gray-800);
}

.share-guide ul {
  margin: 0;
  padding-left: var(--space-5);
  color: var(--gray-600);
  font-size: var(--text-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.share-actions {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  align-items: center;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1024px) {
  .summary-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }

  .toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .toolbar-controls {
    width: 100%;
  }

  .input-with-icon .form-select,
  .input-with-icon .form-input {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .upcoming-card__header,
  .upcoming-card__body,
  .upcoming-card__footer {
    padding: var(--space-5);
  }

  .card-header,
  .card-body,
  .card-footer {
    padding: var(--space-5);
  }

  .meta-grid {
    grid-template-columns: 1fr;
  }

  .share-actions {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 480px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .toolbar {
    padding: var(--space-4);
  }

  .modal-content {
    width: 100%;
  }

  .modal-header,
  .evaluation-form,
  .share-content {
    padding: var(--space-5);
  }

  .link-input-group {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
