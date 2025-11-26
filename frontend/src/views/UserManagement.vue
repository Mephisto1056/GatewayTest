<template>
  <div class="user-management">
    <div class="page-header">
      <h1>用户管理</h1>
      <p class="page-subtitle">管理系统中的所有用户信息</p>
    </div>

    <!-- 操作栏 -->
    <div class="toolbar">
      <div class="filters">
        <select v-model="selectedRole" @change="filterUsers" class="filter-select">
          <option value="">所有角色</option>
          <option value="高层领导者">高层领导者</option>
          <option value="中层管理者">中层管理者</option>
          <option value="基层管理者">基层管理者</option>
        </select>
        
        <input 
          v-model="searchKeyword" 
          @input="filterUsers"
          placeholder="搜索用户姓名或邮箱..." 
          class="search-input"
        >
      </div>
      
      <div class="actions">
        <button
          v-if="selectedUserIds.length > 0"
          @click="batchDeleteUsers"
          class="btn btn-danger"
          style="margin-right: 8px; background-color: #ef4444; color: white; border: none;"
        >
          <MaterialIcon name="delete" size="sm" />
          批量删除 ({{ selectedUserIds.length }})
        </button>
        <button @click="showAddModal = true" class="btn btn-primary">
          <MaterialIcon name="users" size="sm" />
          添加用户
        </button>
        <button @click="showImportModal = true" class="btn btn-secondary">
          <MaterialIcon name="upload" size="sm" />
          批量导入
        </button>
      </div>
    </div>

    <!-- 用户列表 -->
    <div class="users-container">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>正在加载用户...</p>
      </div>
      
      <div v-else-if="filteredUsers.length === 0" class="empty-state">
        <div class="empty-icon">
          <MaterialIcon name="users" size="xl" />
        </div>
        <h3>暂无用户</h3>
        <p>{{ selectedRole ? '当前角色下暂无用户' : '系统中暂无用户' }}</p>
      </div>
      
      <div v-else class="users-table">
        <table>
          <thead>
            <tr>
              <th>
                <input type="checkbox" :checked="isAllSelected" @change="toggleAllSelection">
              </th>
              <th>ID</th>
              <th>姓名</th>
              <th>职务</th>
              <th>公司名</th>
              <th>邮箱</th>
              <th>电话</th>
              <th>角色</th>
              <th>组织ID</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id" class="user-row">
              <td>
                <input type="checkbox" :value="user.id" v-model="selectedUserIds">
              </td>
              <td>{{ user.id }}</td>
              <td class="user-name">
                <div class="name-avatar">
                  <div class="avatar">{{ user.name.charAt(0) }}</div>
                  <span>{{ user.name }}</span>
                </div>
              </td>
              <td>{{ user.position || '-' }}</td>
              <td>{{ user.company || '-' }}</td>
              <td>{{ user.email }}</td>
              <td>{{ user.phone || '-' }}</td>
              <td>
                <span class="role-badge" :class="getRoleClass(user.role)">
                  {{ user.role }}
                </span>
              </td>
              <td>{{ user.organizationId }}</td>
              <td class="actions-cell">
                <button @click="editUser(user)" class="icon-btn icon-btn-sm" title="编辑">
                  <MaterialIcon name="edit" size="sm" />
                </button>
                <button @click="viewEvaluations(user)" class="icon-btn icon-btn-sm" title="查看评估">
                  <MaterialIcon name="reports" size="sm" />
                </button>
                <button @click="deleteUser(user)" class="icon-btn icon-btn-sm" title="删除">
                  <MaterialIcon name="delete" size="sm" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 添加/编辑用户模态框 -->
    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ showAddModal ? '添加用户' : '编辑用户' }}</h2>
          <button @click="closeModal" class="modal-close">✕</button>
        </div>
        
        <form @submit.prevent="saveUser" class="user-form">
          <div class="form-row">
            <div class="form-group">
              <label>姓名 *</label>
              <input 
                v-model="currentUser.name" 
                required 
                placeholder="请输入姓名"
                class="form-input"
              >
            </div>
            
            <div class="form-group">
              <label>邮箱 *</label>
              <input
                v-model="currentUser.email"
                type="email"
                required
                placeholder="请输入邮箱"
                class="form-input"
              >
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>密码 {{ showAddModal ? '*' : '(留空则不修改)' }}</label>
              <input
                v-model="currentUser.password"
                type="password"
                :required="showAddModal"
                placeholder="请输入密码"
                class="form-input"
              >
            </div>
            <div class="form-group">
              <label>职务</label>
              <input 
                v-model="currentUser.position" 
                placeholder="请输入职务"
                class="form-input"
              >
            </div>
            
            <div class="form-group">
              <label>公司名</label>
              <input 
                v-model="currentUser.company" 
                placeholder="请输入公司名"
                class="form-input"
              >
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>电话</label>
              <input 
                v-model="currentUser.phone" 
                placeholder="请输入电话号码"
                class="form-input"
              >
            </div>
            
            <div class="form-group">
              <label>角色 *</label>
              <select v-model="currentUser.role" required class="form-select">
                <option value="">请选择角色</option>
                <option value="高层领导者">高层领导者</option>
                <option value="中层管理者">中层管理者</option>
                <option value="基层管理者">基层管理者</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>组织ID</label>
            <input 
              v-model.number="currentUser.organizationId" 
              type="number"
              placeholder="请输入组织ID（默认为1）"
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

    <!-- 批量导入模态框 -->
    <div v-if="showImportModal" class="modal-overlay" @click="closeImportModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>批量导入用户</h2>
          <button @click="closeImportModal" class="modal-close">✕</button>
        </div>
        
        <div class="import-content">
          <div class="import-instructions">
            <h3>导入说明</h3>
            <p>请上传 CSV 或 Excel 文件，文件应包含以下列（第一行标题）：</p>
            <ul>
              <li><strong>公司</strong> (必填) - 公司名称（用于自动创建组织）</li>
              <li><strong>姓名</strong> (必填) - 用户姓名</li>
              <li><strong>层级</strong> (必填) - 系统角色，请填写：<strong>高层</strong>、<strong>中层</strong> 或 <strong>基层</strong></li>
              <li><strong>邮箱</strong> (必填) - 登录账号，需唯一</li>
              <li><strong>职位</strong> (可选) - 用户的具体职位名称</li>
              <li><strong>手机号</strong> (可选) - 用户的联系电话</li>
            </ul>
            <p class="warning-text">注意：导入完成后系统会自动下载一份结果表格，包含<strong>初始密码</strong>和<strong>导入结果</strong>（成功/失败原因），请务必查看。</p>
          </div>
          
          <div class="file-upload">
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx,.xls,.csv"
              @change="handleFileSelect"
              class="file-input"
            >
            <div class="upload-area" @click="($refs.fileInput as HTMLInputElement)?.click()">
              <div class="upload-icon">
                <MaterialIcon name="upload" size="lg" />
              </div>
              <p>点击选择 Excel 或 CSV 文件</p>
              <p class="upload-hint">支持 .xlsx, .xls 和 .csv 格式</p>
            </div>
          </div>
          
          <div v-if="selectedFile" class="selected-file">
            <span>已选择文件: {{ selectedFile.name }}</span>
            <button @click="clearFile" class="btn-link">清除</button>
          </div>
          
          <div class="import-actions">
            <button @click="closeImportModal" class="btn-secondary">取消</button>
            <button 
              @click="importUsers" 
              :disabled="!selectedFile || importing"
              class="btn-primary"
            >
              {{ importing ? '导入中...' : '开始导入' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import MaterialIcon from '../components/icons/MaterialIcon.vue'
import apiClient from '../services/api'

interface User {
  id?: number
  name: string
  email: string
  password?: string
  phone?: string
  role: string
  organizationId: number
  position?: string
  company?: string
}

// 响应式数据
const loading = ref(true)
const users = ref<User[]>([])
const selectedRole = ref('')
const searchKeyword = ref('')
const selectedUserIds = ref<number[]>([])
const showAddModal = ref(false)
const showEditModal = ref(false)
const showImportModal = ref(false)
const importing = ref(false)
const selectedFile = ref<File | null>(null)
const currentUser = ref<User>({
  name: '',
  email: '',
  password: '',
  phone: '',
  role: '',
  organizationId: 1,
  position: '',
  company: ''
})

// 计算属性
const filteredUsers = computed(() => {
  let filtered = users.value

  // 按角色筛选
  if (selectedRole.value) {
    filtered = filtered.filter(u => u.role === selectedRole.value)
  }

  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(u =>
      u.name.toLowerCase().includes(keyword) ||
      u.email.toLowerCase().includes(keyword)
    )
  }

  return filtered
})

const isAllSelected = computed(() => {
  return filteredUsers.value.length > 0 && selectedUserIds.value.length === filteredUsers.value.length
})

// 方法
const getRoleClass = (role: string) => {
  const classes = {
    '高层领导者': 'role-high',
    '中层管理者': 'role-medium',
    '基层管理者': 'role-low'
  }
  return classes[role as keyof typeof classes] || ''
}

const loadUsers = async () => {
  loading.value = true
  selectedUserIds.value = [] // 重置选择
  try {
    const response = await apiClient.get('/users')
    users.value = response.data
  } catch (error) {
    console.error('加载用户失败:', error)
    alert('加载用户失败，请重试')
  } finally {
    loading.value = false
  }
}

const filterUsers = () => {
  // 筛选功能通过计算属性实现
  selectedUserIds.value = [] // 筛选条件改变时重置选择
}

const toggleAllSelection = () => {
  if (isAllSelected.value) {
    selectedUserIds.value = []
  } else {
    selectedUserIds.value = filteredUsers.value.map(u => u.id!)
  }
}

const batchDeleteUsers = async () => {
  if (selectedUserIds.value.length === 0) return

  if (!confirm(`确定要删除选中的 ${selectedUserIds.value.length} 个用户吗？此操作不可恢复。`)) {
    return
  }

  try {
    // 后端需要支持批量删除接口，或者我们循环调用删除接口
    // 建议后端实现批量删除接口: DELETE /users/batch { ids: [] }
    // 这里假设后端已经实现了批量删除接口
    const response = await apiClient.delete('/users/batch', {
      data: { ids: selectedUserIds.value }
    })

    const result = response.data
    let message = `成功删除 ${result.successCount} 个用户`
    if (result.failCount > 0) {
      message += `，失败 ${result.failCount} 个。\n失败原因：\n${result.errors.join('\n')}`
    }
    alert(message)
    
    loadUsers()
  } catch (error: any) {
    console.error('批量删除失败:', error)
    alert('批量删除失败，请重试')
  }
}

const editUser = (user: User) => {
  currentUser.value = { ...user }
  showEditModal.value = true
}

const viewEvaluations = (user: User) => {
  // 跳转到用户的评估历史页面
  alert(`查看用户 ${user.name} 的评估历史（功能开发中）`)
}

const deleteUser = async (user: User) => {
  if (!confirm(`确定要删除用户 "${user.name}" 吗？`)) {
    return
  }
  
  try {
    await apiClient.delete(`/users/${user.id}`)
    alert('删除成功')
    loadUsers()
  } catch (error) {
    console.error('删除用户失败:', error)
    alert('删除失败，请重试')
  }
}

const saveUser = async () => {
  try {
    const isEdit = showEditModal.value
    
    // 确保organizationId有默认值
    if (!currentUser.value.organizationId) {
      currentUser.value.organizationId = 1
    }
    
    if (isEdit) {
      await apiClient.put(`/users/${currentUser.value.id}`, currentUser.value)
    } else {
      await apiClient.post('/users', currentUser.value)
    }
    
    alert(isEdit ? '保存成功' : '添加成功')
    closeModal()
    loadUsers()
  } catch (error: any) {
    console.error('保存用户失败:', error)
    const message = error.response?.data?.message || error.message || '操作失败，请重试'
    alert(message)
  }
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  currentUser.value = {
    name: '',
    email: '',
    password: '',
    phone: '',
    role: '',
    organizationId: 1,
    position: '',
    company: ''
  }
}

const closeImportModal = () => {
  showImportModal.value = false
  selectedFile.value = null
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0] || null
  }
}

const clearFile = () => {
  selectedFile.value = null
  const fileInput = document.querySelector('.file-input') as HTMLInputElement
  if (fileInput) {
    fileInput.value = ''
  }
}

const importUsers = async () => {
  if (!selectedFile.value) return
  
  importing.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    
    const response = await apiClient.post('/users/batch-import', formData, {
      responseType: 'blob'
    })
    
    // 处理返回的 Blob（包含密码的 CSV）
    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-import-result-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    alert('导入成功！含有初始密码的用户表已自动下载，请妥善保管。')
    closeImportModal()
    loadUsers()

  } catch (error: any) {
    console.error('导入用户失败:', error)
    
    let errorMessage = error.message || '导入失败，请重试'
    
    // 如果是 Blob 类型的错误响应，需要转换成文本才能看到具体的错误信息
    if (error.response && error.response.data instanceof Blob) {
      try {
        const text = await error.response.data.text()
        try {
          const json = JSON.parse(text)
          if (json.message) {
            errorMessage = Array.isArray(json.message) ? json.message.join('; ') : json.message
          }
          if (json.error) {
            errorMessage += ` (${json.error})`
          }
        } catch {
          // 如果不是 JSON，直接显示文本
          if (text) errorMessage = text
        }
      } catch (e) {
        console.error('解析错误响应失败:', e)
      }
    }
    
    alert(errorMessage)
  } finally {
    importing.value = false
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.user-management {
  width: 100%;
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: var(--space-8) var(--space-6);
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
  padding: var(--space-6);
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--gray-100);
}

.filters {
  display: flex;
  gap: var(--space-4);
  flex: 1;
}

.actions {
  display: flex;
  gap: var(--space-3);
}

.filter-select,
.search-input {
  padding: var(--space-3);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-family: inherit;
  transition: all var(--transition-fast);
  background: white;
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

.users-container {
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--gray-100);
  overflow: hidden;
}

.loading {
  text-align: center;
  padding: var(--space-12);
}

.loading p {
  color: var(--gray-600);
  margin: 0;
  font-size: var(--text-base);
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

.empty-state {
  text-align: center;
  padding: var(--space-12);
}

.empty-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--gray-100), var(--gray-200));
  color: var(--gray-500);
  border-radius: var(--radius-xl);
  margin: 0 auto var(--space-4);
}

.empty-state h3 {
  color: var(--gray-900);
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  margin: 0 0 var(--space-2) 0;
}

.empty-state p {
  color: var(--gray-600);
  margin: 0;
  font-size: var(--text-base);
}

.users-table table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th,
.users-table td {
  padding: var(--space-4);
  text-align: left;
  border-bottom: 1px solid var(--gray-100);
}

.users-table th {
  background: var(--gray-50);
  font-weight: var(--font-semibold);
  color: var(--gray-700);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.user-row {
  transition: background-color var(--transition-fast);
}

.user-row:hover {
  background: var(--gray-50);
}

.user-name {
  font-weight: var(--font-medium);
}

.name-avatar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  flex-shrink: 0;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.actions-cell {
  white-space: nowrap;
}

.actions-cell .icon-btn {
  margin-left: var(--space-1);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: var(--radius-xl);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--gray-200);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-6);
  border-bottom: 1px solid var(--gray-200);
  background: var(--gray-50);
}

.modal-header h2 {
  margin: 0;
  color: var(--gray-900);
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
}

.modal-close {
  background: none;
  border: none;
  font-size: var(--text-xl);
  cursor: pointer;
  color: var(--gray-500);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.modal-close:hover {
  background: var(--gray-200);
  color: var(--gray-700);
}

.user-form {
  padding: var(--space-6);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.form-group {
  margin-bottom: var(--space-6);
}

.form-group label {
  display: block;
  margin-bottom: var(--space-2);
  font-weight: var(--font-medium);
  color: var(--gray-700);
  font-size: var(--text-sm);
}

.form-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  margin-top: var(--space-8);
  padding-top: var(--space-6);
  border-top: 1px solid var(--gray-200);
}

.import-content {
  padding: var(--space-6);
}

.import-instructions {
  margin-bottom: var(--space-8);
  padding: var(--space-5);
  background: var(--info-50);
  border-radius: var(--radius-lg);
  border-left: 4px solid var(--info-500);
}

.import-instructions h3 {
  margin: 0 0 var(--space-3) 0;
  color: var(--gray-900);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.import-instructions p {
  color: var(--gray-700);
  margin: 0 0 var(--space-3) 0;
  font-size: var(--text-sm);
}

.import-instructions ul {
  margin: var(--space-3) 0 0 0;
  padding-left: var(--space-5);
  color: var(--gray-700);
}

.import-instructions li {
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
}

.file-upload {
  margin-bottom: var(--space-4);
}

.file-input {
  display: none;
}

.upload-area {
  border: 2px dashed var(--gray-300);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-normal);
  background: var(--gray-50);
}

.upload-area:hover {
  border-color: var(--primary-500);
  background: var(--primary-50);
}

.upload-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-100), var(--primary-200));
  color: var(--primary-700);
  border-radius: var(--radius-xl);
  margin: 0 auto var(--space-4);
}

.upload-area p {
  color: var(--gray-700);
  margin: var(--space-2) 0 0 0;
  font-size: var(--text-base);
  font-weight: var(--font-medium);
}

.upload-hint {
  color: var(--gray-500);
  font-size: var(--text-sm);
  margin: var(--space-1) 0 0 0;
}

.selected-file {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  background: var(--success-50);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
  border: 1px solid var(--success-200);
}

.selected-file span {
  color: var(--success-800);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
}

.btn-link {
  background: none;
  border: none;
  color: var(--error-600);
  cursor: pointer;
  text-decoration: underline;
  font-size: var(--text-sm);
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.btn-link:hover {
  color: var(--error-700);
  background: var(--error-50);
}

.import-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  margin-top: var(--space-8);
  padding-top: var(--space-6);
  border-top: 1px solid var(--gray-200);
}

@media (max-width: 1024px) {
  .user-management {
    padding: var(--space-6) var(--space-4);
  }
  
  .toolbar {
    padding: var(--space-4);
  }
}

@media (max-width: 768px) {
  .user-management {
    padding: var(--space-5) var(--space-3);
  }
  
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-4);
    padding: var(--space-4);
  }
  
  .filters {
    flex-direction: column;
    gap: var(--space-3);
  }
  
  .actions {
    justify-content: center;
  }
  
  .users-table {
    overflow-x: auto;
  }
  
  .users-table th,
  .users-table td {
    padding: var(--space-3);
    font-size: var(--text-sm);
  }
  
  .form-row {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
  
  .modal-content {
    width: 95%;
    margin: var(--space-4);
  }
  
  .modal-header,
  .user-form,
  .import-content {
    padding: var(--space-4);
  }
}

@media (max-width: 480px) {
  .user-management {
    padding: var(--space-4) var(--space-3);
  }
  
  .page-header h1 {
    font-size: var(--text-2xl);
  }
  
  .page-subtitle {
    font-size: var(--text-base);
  }
  
  .toolbar {
    padding: var(--space-3);
  }
  
  .actions {
    flex-direction: column;
    gap: var(--space-2);
  }
  
  .upload-area {
    padding: var(--space-6);
  }
  
  .upload-icon {
    width: 48px;
    height: 48px;
  }
}
</style>
