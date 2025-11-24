<template>
  <span 
    class="material-icons" 
    :class="iconClass"
    :style="iconStyle"
  >
    {{ iconName }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  class: ''
})

const iconClass = computed(() => {
  return `icon-${props.size} ${props.class}`
})

const iconStyle = computed(() => {
  const sizeMap = {
    sm: '18px',
    md: '24px', 
    lg: '32px',
    xl: '48px'
  }
  return {
    fontSize: sizeMap[props.size]
  }
})

const iconName = computed(() => {
  const iconMap: Record<string, string> = {
    // 导航图标
    home: 'home',
    dashboard: 'dashboard',
    users: 'people',
    questions: 'quiz',
    evaluations: 'assignment',
    reports: 'analytics',
    
    // 操作图标
    plus: 'add',
    edit: 'edit',
    delete: 'delete',
    view: 'visibility',
    download: 'download',
    share: 'share',
    search: 'search',
    filter: 'filter_list',
    logout: 'logout',
    refresh: 'refresh',
    
    // 状态图标
    check: 'check_circle',
    check_circle: 'check_circle',
    warning: 'warning',
    error: 'error',
    info: 'info',
    loading: 'refresh',
    
    // 数据和图表图标
    summarize: 'summarize',
    trending_up: 'trending_up',
    group: 'group',
    
    // 其他图标
    menu: 'menu',
    close: 'close',
    arrow: 'arrow_forward',
    upload: 'upload',
    settings: 'settings'
  }
  
  return iconMap[props.name] || props.name
})
</script>

<style scoped>
.material-icons {
  font-family: 'Material Icons';
  font-weight: normal;
  font-style: normal;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
  vertical-align: middle;
}

.icon-sm {
  font-size: 18px;
}

.icon-md {
  font-size: 24px;
}

.icon-lg {
  font-size: 32px;
}

.icon-xl {
  font-size: 48px;
}
</style>