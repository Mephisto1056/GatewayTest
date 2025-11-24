<template>
  <div class="dashboard-layout">
    <!-- 顶部导航栏 -->
    <header class="dashboard-header">
      <div class="header-content layout-container">
        <h1 class="logo">领导力评估管理系统</h1>
        <div class="user-menu" ref="userMenu">
          <div class="user-info" @click="toggleDropdown">
            <span class="user-name">Admin</span>
            <MaterialIcon name="arrow_drop_down" />
          </div>
          <div class="dropdown-menu" v-if="showDropdown">
            <a href="#" @click.prevent="logout" class="dropdown-item">Log Out</a>
          </div>
        </div>
      </div>
    </header>

    <div class="dashboard-main layout-container">
      <!-- 侧边栏导航 -->
      <aside class="dashboard-sidebar">
        <nav class="sidebar-nav">
          <router-link
            to="/dashboard/overview"
            class="sidebar-link"
            :class="{ active: $route.path === '/dashboard/overview' }"
          >
            <MaterialIcon name="dashboard" size="sm" />
            <span class="sidebar-text">概览</span>
          </router-link>
          
          <router-link
            to="/dashboard/questions"
            class="sidebar-link"
            :class="{ active: $route.path === '/dashboard/questions' }"
          >
            <MaterialIcon name="questions" size="sm" />
            <span class="sidebar-text">问题管理</span>
          </router-link>
          
          <router-link
            to="/dashboard/users"
            class="sidebar-link"
            :class="{ active: $route.path === '/dashboard/users' }"
          >
            <MaterialIcon name="users" size="sm" />
            <span class="sidebar-text">用户管理</span>
          </router-link>
          
          <router-link
            to="/dashboard/evaluations"
            class="sidebar-link"
            :class="{ active: $route.path === '/dashboard/evaluations' }"
          >
            <MaterialIcon name="evaluations" size="sm" />
            <span class="sidebar-text">评估管理</span>
          </router-link>
          
          <router-link
            to="/dashboard/reports"
            class="sidebar-link"
            :class="{ active: $route.path === '/dashboard/reports' }"
          >
            <MaterialIcon name="reports" size="sm" />
            <span class="sidebar-text">数据报告</span>
          </router-link>
        </nav>
      </aside>

      <!-- 主内容区域 -->
      <main class="dashboard-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import MaterialIcon from '../components/icons/MaterialIcon.vue'
import { useRouter } from 'vue-router'
import { ref, onMounted, onUnmounted } from 'vue'

const router = useRouter()
const showDropdown = ref(false)
const userMenu = ref<HTMLElement | null>(null)

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const handleClickOutside = (event: MouseEvent) => {
  if (userMenu.value && !userMenu.value.contains(event.target as Node)) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const logout = () => {
  // Clear user session/token
  localStorage.removeItem('token');
  // Redirect to login page
  router.push('/login');
}
</script>

<style scoped>
.dashboard-layout {
  min-height: 100vh;
  background: var(--gray-50);
}

.dashboard-header {
  background: white;
  border-bottom: 1px solid var(--gray-200);
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 72px;
  width: 100%;
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

.nav-link.active {
  background: var(--primary-50);
  color: var(--primary-700);
  border-color: var(--primary-200);
}

.dashboard-main {
  display: flex;
  width: 100%;
  min-height: calc(100vh - 72px);
  gap: var(--space-6);
  padding: var(--space-6) 0;
}

.dashboard-sidebar {
  width: 260px;
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  padding: var(--space-6);
  height: fit-content;
  position: sticky;
  top: calc(72px + var(--space-6));
  flex-shrink: 0;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  text-decoration: none;
  color: var(--gray-600);
  border-radius: var(--radius-lg);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.sidebar-link:hover {
  background: var(--gray-50);
  color: var(--gray-900);
  transform: translateX(4px);
  border-color: var(--gray-200);
}

.sidebar-link.active {
  background: linear-gradient(135deg, var(--primary-50), var(--primary-100));
  color: var(--primary-700);
  border-color: var(--primary-200);
  box-shadow: var(--shadow-sm);
}

.sidebar-text {
  font-size: var(--text-sm);
}

.dashboard-content {
  flex: 1;
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  padding: var(--space-8);
  min-height: calc(100vh - 144px);
  display: flex;
  flex-direction: column;
}

.user-menu {
  position: relative;
  cursor: pointer;
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-lg);
  transition: background-color var(--transition-fast);
}

.user-info:hover {
  background-color: var(--gray-100);
}

.user-name {
  font-weight: var(--font-medium);
  color: var(--gray-700);
}

.dropdown-menu {
  position: absolute;
  right: 0;
  top: calc(100% + var(--space-2));
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  min-width: 160px;
  z-index: var(--z-dropdown);
  padding: var(--space-2);
}

.dropdown-item {
  display: block;
  padding: var(--space-3) var(--space-4);
  color: var(--gray-700);
  text-decoration: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  transition: background-color var(--transition-fast);
}

.dropdown-item:hover {
  background-color: var(--gray-100);
  color: var(--gray-900);
}

@media (max-width: 1024px) {
  .dashboard-main {
    gap: var(--space-4);
    padding: var(--space-4) 0;
  }
  
  .dashboard-sidebar {
    width: 240px;
  }
}

@media (max-width: 768px) {
  .logo {
    font-size: var(--text-lg);
  }
  
  .dashboard-main {
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-4) 0;
  }
  
  .dashboard-sidebar {
    width: 100%;
    position: static;
    padding: var(--space-4);
  }
  
  .sidebar-nav {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--space-2);
  }
  
  .sidebar-link {
    justify-content: center;
    padding: var(--space-3);
    text-align: center;
  }
  
  .sidebar-text {
    font-size: var(--text-xs);
  }
  
  .dashboard-content {
    padding: var(--space-4);
    min-height: auto;
  }
}

@media (max-width: 480px) {
  .header-nav {
    gap: var(--space-1);
  }
  
  .nav-link {
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-xs);
  }
  
  .logo {
    font-size: var(--text-base);
  }
  
  .dashboard-main {
    padding: var(--space-3) 0;
    gap: var(--space-3);
  }
  
  .dashboard-sidebar {
    padding: var(--space-3);
  }
  
  .sidebar-nav {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
  }
  
  .sidebar-link {
    padding: var(--space-2);
    flex-direction: column;
    gap: var(--space-1);
  }
  
  .dashboard-content {
    padding: var(--space-3);
  }
}
</style>
