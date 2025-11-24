<template>
  <div class="question-management">
    <div class="page-header">
      <h1>问题管理</h1>
      <p class="page-subtitle">管理评估问卷中的所有题目</p>
    </div>

    <!-- 筛选和操作栏 -->
    <div class="toolbar">
      <div class="filters">
        <select v-model="selectedCategory" @change="loadQuestions" class="filter-select">
          <option value="">所有类型</option>
          <option value="selfdirected">自主导向</option>
          <option value="highlevel">高层领导</option>
          <option value="mediumlevel">中层管理</option>
          <option value="lowlevel">基层管理</option>
        </select>
        
        <input 
          v-model="searchKeyword" 
          @input="filterQuestions"
          placeholder="搜索题目内容..." 
          class="search-input"
        >
      </div>
      
      <button @click="showAddModal = true" class="btn btn-primary">
        <MaterialIcon name="plus" size="sm" />
        添加题目
      </button>
    </div>

    <!-- 题目列表 -->
    <div class="questions-container">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>正在加载题目...</p>
      </div>
      
      <div v-else-if="filteredQuestions.length === 0" class="empty-state">
        <div class="empty-icon">
          <MaterialIcon name="questions" size="xl" />
        </div>
        <h3>暂无题目</h3>
        <p>{{ selectedCategory ? '当前分类下暂无题目' : '系统中暂无题目' }}</p>
      </div>
      
      <div v-else class="questions-grid">
        <div 
          v-for="question in filteredQuestions" 
          :key="question.id || question.questionCode" 
          class="question-card"
        >
          <div class="question-header">
            <span class="question-code">{{ question.questionCode }}</span>
            <span class="question-category">{{ getCategoryName(question.category) }}</span>
          </div>
          
          <div class="question-content">
            <p class="question-text">{{ question.questionText }}</p>
            <div class="question-meta">
              <span class="meta-item">
                <strong>维度:</strong> {{ question.evaluationDimension }}
              </span>
              <span v-if="question.evaluationSubDimension" class="meta-item">
                <strong>子维度:</strong> {{ question.evaluationSubDimension }}
              </span>
            </div>
          </div>
          
          <div class="question-actions">
            <button @click="editQuestion(question)" class="btn btn-secondary btn-sm">
              <MaterialIcon name="edit" size="sm" />
              编辑
            </button>
            <button @click="deleteQuestion(question)" class="btn btn-danger btn-sm">
              <MaterialIcon name="delete" size="sm" />
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑题目模态框 -->
    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ showAddModal ? '添加题目' : '编辑题目' }}</h2>
          <button @click="closeModal" class="modal-close">✕</button>
        </div>
        
        <form @submit.prevent="saveQuestion" class="question-form">
          <div class="form-group">
            <label>题目类型</label>
            <select v-model="currentQuestion.category" required class="form-select">
              <option value="">请选择类型</option>
              <option value="selfdirected">自主导向</option>
              <option value="highlevel">高层领导</option>
              <option value="mediumlevel">中层管理</option>
              <option value="lowlevel">基层管理</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>题目编号</label>
            <input 
              v-model="currentQuestion.questionCode" 
              required 
              placeholder="如: A01, B01等"
              class="form-input"
            >
          </div>
          
          <div class="form-group">
            <label>题目内容</label>
            <textarea 
              v-model="currentQuestion.questionText" 
              required 
              placeholder="请输入题目内容..."
              rows="3"
              class="form-textarea"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label>评估维度</label>
            <input 
              v-model="currentQuestion.evaluationDimension" 
              required 
              placeholder="如: 心智模式、自我认知等"
              class="form-input"
            >
          </div>
          
          <div class="form-group">
            <label>评估子维度（可选）</label>
            <input 
              v-model="currentQuestion.evaluationSubDimension" 
              placeholder="如: 战略思维、情绪管理等"
              class="form-input"
            >
          </div>
          
          <div class="form-actions">
            <button type="button" @click="closeModal" class="btn-secondary">取消</button>
            <button type="submit" class="btn-primary">
              {{ showAddModal ? '添加' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import MaterialIcon from '../components/icons/MaterialIcon.vue'

interface Question {
  id?: number
  questionCode: string
  questionText: string
  evaluationDimension: string
  evaluationSubDimension?: string
  category: string
}

// 响应式数据
const loading = ref(true)
const questions = ref<Question[]>([])
const selectedCategory = ref('')
const searchKeyword = ref('')
const showAddModal = ref(false)
const showEditModal = ref(false)
const currentQuestion = ref<Question>({
  questionCode: '',
  questionText: '',
  evaluationDimension: '',
  evaluationSubDimension: '',
  category: ''
})

// 计算属性
const filteredQuestions = computed(() => {
  let filtered = questions.value

  // 按类型筛选
  if (selectedCategory.value) {
    filtered = filtered.filter(q => q.category === selectedCategory.value)
  }

  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(q => 
      q.questionText.toLowerCase().includes(keyword) ||
      q.questionCode.toLowerCase().includes(keyword) ||
      q.evaluationDimension.toLowerCase().includes(keyword)
    )
  }

  return filtered
})

// 方法
const getCategoryName = (category: string) => {
  const names = {
    'selfdirected': '自主导向',
    'highlevel': '高层领导',
    'mediumlevel': '中层管理',
    'lowlevel': '基层管理'
  }
  return names[category as keyof typeof names] || category
}

const loadQuestions = async () => {
  loading.value = true
  try {
    const allQuestions: Question[] = []
    
    // 加载自主导向题目
    const selfdirectedResponse = await fetch('/api/questionnaires/selfdirected')
    if (selfdirectedResponse.ok) {
      const selfdirectedQuestions = await selfdirectedResponse.json()
      allQuestions.push(...selfdirectedQuestions.map((q: any) => ({
        ...q,
        category: 'selfdirected'
      })))
    }
    
    // 加载高层题目
    const highlevelResponse = await fetch('/api/questionnaires/highlevel')
    if (highlevelResponse.ok) {
      const highlevelQuestions = await highlevelResponse.json()
      allQuestions.push(...highlevelQuestions.map((q: any) => ({
        ...q,
        category: 'highlevel'
      })))
    }
    
    // 加载中层题目
    const mediumlevelResponse = await fetch('/api/questionnaires/mediumlevel')
    if (mediumlevelResponse.ok) {
      const mediumlevelQuestions = await mediumlevelResponse.json()
      allQuestions.push(...mediumlevelQuestions.map((q: any) => ({
        ...q,
        category: 'mediumlevel'
      })))
    }
    
    // 加载基层题目
    const lowlevelResponse = await fetch('/api/questionnaires/lowlevel')
    if (lowlevelResponse.ok) {
      const lowlevelQuestions = await lowlevelResponse.json()
      allQuestions.push(...lowlevelQuestions.map((q: any) => ({
        ...q,
        category: 'lowlevel'
      })))
    }
    
    questions.value = allQuestions
  } catch (error) {
    console.error('加载题目失败:', error)
    alert('加载题目失败，请重试')
  } finally {
    loading.value = false
  }
}

const filterQuestions = () => {
  // 搜索功能通过计算属性实现，这里不需要额外逻辑
}

const editQuestion = (question: Question) => {
  currentQuestion.value = { ...question }
  showEditModal.value = true
}

const deleteQuestion = async (question: Question) => {
  if (!confirm(`确定要删除题目 "${question.questionCode}" 吗？`)) {
    return
  }
  
  try {
    // 根据类型调用不同的删除API
    const endpoint = `/api/questionnaires/${question.category}/${question.id}`
    const response = await fetch(endpoint, {
      method: 'DELETE'
    })
    
    if (response.ok) {
      alert('删除成功')
      loadQuestions()
    } else {
      throw new Error('删除失败')
    }
  } catch (error) {
    console.error('删除题目失败:', error)
    alert('删除失败，请重试')
  }
}

const saveQuestion = async () => {
  try {
    const isEdit = showEditModal.value
    const endpoint = isEdit 
      ? `/api/questionnaires/${currentQuestion.value.category}/${currentQuestion.value.id}`
      : `/api/questionnaires/${currentQuestion.value.category}`
    
    const method = isEdit ? 'PUT' : 'POST'
    
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(currentQuestion.value)
    })
    
    if (response.ok) {
      alert(isEdit ? '保存成功' : '添加成功')
      closeModal()
      loadQuestions()
    } else {
      throw new Error(isEdit ? '保存失败' : '添加失败')
    }
  } catch (error) {
    console.error('保存题目失败:', error)
    alert('操作失败，请重试')
  }
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  currentQuestion.value = {
    questionCode: '',
    questionText: '',
    evaluationDimension: '',
    evaluationSubDimension: '',
    category: ''
  }
}

onMounted(() => {
  loadQuestions()
})
</script>

<style scoped>
.question-management {
  width: 100%;
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

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-8);
  gap: var(--space-4);
}

.filters {
  display: flex;
  gap: var(--space-4);
  flex: 1;
}

.filter-select,
.search-input {
  padding: var(--space-3);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-family: inherit;
  transition: all var(--transition-fast);
}

.filter-select:focus,
.search-input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
}

.filter-select {
  min-width: 150px;
}

.search-input {
  flex: 1;
  max-width: 300px;
}

/* 使用设计系统中的按钮样式 */
.btn-primary,
.btn-secondary,
.btn-danger {
  /* 基础样式已在设计系统中定义 */
}

.btn-sm {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-xs);
}

.btn-icon {
  font-size: 1rem;
}

.loading {
  text-align: center;
  padding: var(--space-16) 0;
}

.loading .spinner {
  margin: 0 auto var(--space-4);
}

.loading p {
  color: var(--gray-600);
  font-size: var(--text-sm);
}

.empty-state {
  text-align: center;
  padding: 4rem 0;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  color: #333;
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: #666;
  margin: 0;
}

.questions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
}

.question-card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.2s;
}

.question-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.question-code {
  font-weight: 600;
  color: #1976d2;
  font-size: 1.1rem;
}

.question-category {
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.question-text {
  color: #333;
  line-height: 1.5;
  margin: 0 0 1rem 0;
}

.question-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1rem;
}

.meta-item {
  font-size: 0.85rem;
  color: #666;
}

.question-actions {
  display: flex;
  gap: 0.5rem;
}

.question-actions .btn-secondary,
.question-actions .btn-danger {
  padding: 0.375rem 0.75rem;
  font-size: 0.8rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
  color: #333;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.question-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filters {
    flex-direction: column;
  }
  
  .questions-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .question-actions {
    flex-direction: column;
  }
  
  .modal-content {
    width: 95%;
    margin: 1rem;
  }
}
</style>