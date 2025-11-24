<template>
  <div class="login-container">
    <div class="login-box">
      <h2>Login</h2>
      <form @submit.prevent="handleLogin">
        <div class="input-group">
          <label for="username">Username</label>
          <input type="text" id="username" v-model="username" required />
        </div>
        <div class="input-group">
          <label for="password">Password</label>
          <input type="password" id="password" v-model="password" required />
        </div>
        <button type="submit" class="login-button">Login</button>
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      </form>
      <p class="switch-link">
        Don't have an account? <router-link to="/register">Register here</router-link>
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../services/api';

export default defineComponent({
  name: 'Login',
  setup() {
    const username = ref('');
    const password = ref('');
    const errorMessage = ref('');
    const router = useRouter();

    const handleLogin = async () => {
      try {
        const response = await login(username.value, password.value);
        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);
        
        // Decode token to get user role
        const base64Url = access_token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const tokenPayload = JSON.parse(jsonPayload);
        
        if (tokenPayload.role === 'admin') {
          router.push('/dashboard');
        } else {
          router.push('/user-dashboard'); // Or wherever user should be redirected
        }
      } catch (error) {
        errorMessage.value = 'Invalid username or password';
        console.error('Login failed:', error);
      }
    };

    return {
      username,
      password,
      handleLogin,
      errorMessage,
    };
  },
});
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--gray-50), var(--primary-50));
  padding: var(--space-4);
}

.login-box {
  background: white;
  padding: var(--space-8);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  width: 100%;
  max-width: 400px;
  border: 1px solid var(--gray-100);
}

h2 {
  text-align: center;
  margin-bottom: var(--space-8);
  color: var(--gray-900);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
}

.input-group {
  margin-bottom: var(--space-6);
}

.input-group label {
  display: block;
  margin-bottom: var(--space-2);
  color: var(--gray-700);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
}

.input-group input {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-family: inherit;
  transition: all var(--transition-fast);
  box-sizing: border-box;
}

.input-group input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
}

.login-button {
  width: 100%;
  padding: var(--space-4);
  background: var(--primary-600);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  font-family: inherit;
  transition: all var(--transition-fast);
}

.login-button:hover {
  background: var(--primary-700);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.login-button:active {
  transform: translateY(0);
}

.error-message {
  color: var(--error-600);
  text-align: center;
  margin-top: var(--space-4);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  padding: var(--space-3);
  background: var(--error-50);
  border: 1px solid var(--error-200);
  border-radius: var(--radius-md);
}

.switch-link {
  text-align: center;
  margin-top: var(--space-4);
  font-size: var(--text-sm);
}

.switch-link a {
  color: var(--primary-600);
  text-decoration: none;
  font-weight: var(--font-medium);
}

.switch-link a:hover {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .login-container {
    padding: var(--space-3);
  }
  
  .login-box {
    padding: var(--space-6);
  }
  
  h2 {
    font-size: var(--text-xl);
    margin-bottom: var(--space-6);
  }
}
</style>
