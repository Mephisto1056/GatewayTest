<template>
  <div class="submit-success-page">
    <div class="success-content">
      <div class="success-icon-wrapper">
        <div class="success-icon">
          <MaterialIcon name="check" size="xl" style="color: white;" />
        </div>
      </div>
      <h2 class="success-title">提交成功</h2>
      <p class="success-message">您的评估问卷已成功提交，感谢您的参与。</p>
      <button @click="router.push('/user-dashboard')" class="btn btn-primary return-btn">返回任务列表</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import MaterialIcon from '../components/icons/MaterialIcon.vue';

const router = useRouter();
</script>

<style scoped>
.submit-success-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f8fafc;
  padding: 20px;
}

.success-content {
  background: white;
  padding: 40px 60px;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  text-align: center;
  max-width: 500px;
  width: 100%;
}

.success-icon-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.success-icon {
  width: 80px;
  height: 80px;
  background-color: #22c55e; /* Green-500 */
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 15px -3px rgba(34, 197, 94, 0.2);
}

.success-title {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
}

.success-message {
  color: #64748b;
  margin-bottom: 32px;
  line-height: 1.5;
}

.return-btn {
  width: 100%;
  justify-content: center;
  padding: 12px 24px;
  font-size: 16px;
}
</style>