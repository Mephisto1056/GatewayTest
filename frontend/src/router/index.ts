import { createRouter, createWebHistory } from 'vue-router';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/questionnaire',
    name: 'Questionnaire',
    component: () => import('../components/Questionnaire.vue'),
    meta: { requiresAuth: true, roles: ['user', '高层领导者', '中层管理者', '基层管理者'] },
  },
  {
    path: '/report/user/:userId',
    name: 'UserReport',
    component: () => import('../components/ComprehensiveReport.vue'),
    props: (route: any) => ({ userId: parseInt(route.params.userId as string) }),
    meta: { requiresAuth: true, roles: ['user', '高层领导者', '中层管理者', '基层管理者'] },
  },
  {
    path: '/report/:reportId',
    name: 'ReportView',
    component: () => import('../components/ComprehensiveReport.vue'),
    props: (route: any) => ({ reportId: parseInt(route.params.reportId as string) }),
    meta: { requiresAuth: true, roles: ['admin'] },
  },
  {
    path: '/dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
    children: [
      {
        path: '',
        name: 'DashboardOverview',
        component: () => import('../views/DashboardOverview.vue'),
      },
      {
        path: 'overview',
        redirect: '/dashboard',
      },
      {
        path: 'questions',
        name: 'QuestionManagement',
        component: () => import('../views/QuestionManagement.vue'),
      },
      {
        path: 'users',
        name: 'UserManagement',
        component: () => import('../views/UserManagement.vue'),
      },
      {
        path: 'evaluations',
        name: 'EvaluationManagement',
        component: () => import('../views/EvaluationManagement.vue'),
      },
      {
        path: 'reports',
        name: 'DataReports',
        component: () => import('../views/DataReports.vue'),
      },
      {
        path: 'report-demo',
        name: 'ReportDemo',
        component: () => import('../views/ReportDemo.vue'),
      },
    ],
  },
  // Add a user-specific dashboard
  {
    path: '/user-dashboard',
    name: 'UserDashboard',
    component: () => import('../views/UserDashboard.vue'),
    meta: { requiresAuth: true, roles: ['user', '高层领导者', '中层管理者', '基层管理者'] },
  },
  {
    path: '/my-report',
    name: 'MyReport',
    component: () => import('../views/MyReport.vue'),
    meta: { requiresAuth: true, roles: ['user', '高层领导者', '中层管理者', '基层管理者'] },
  },
  {
    path: '/lcp-test',
    name: 'LCPTest',
    component: () => import('../views/LCPTestView.vue'),
  },
  {
    path: '/evaluation/:evaluationId/nominate',
    name: 'NominateEvaluators',
    component: () => import('../views/NominateEvaluators.vue'),
    meta: { requiresAuth: true, roles: ['user', '高层领导者', '中层管理者', '基层管理者'] },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('access_token');
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  if (requiresAuth && !token) {
    return next('/login');
  }

  if (token) {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) {
        throw new Error('Invalid token format');
      }
      
      // Properly decode Base64 URL-safe string with UTF-8 characters
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const tokenPayload = JSON.parse(jsonPayload);
      if (typeof tokenPayload.role !== 'string') {
        throw new Error('Invalid role in token');
      }
      const userRole: string = tokenPayload.role;
      const requiredRoles = to.meta.roles as string[] | undefined;

      if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(userRole)) {
        // Redirect based on role if trying to access an unauthorized page
        if (userRole === 'admin') {
          return next('/dashboard');
        } else {
          return next('/user-dashboard');
        }
      }
    } catch (e) {
      // Invalid token, clear it and redirect to login
      localStorage.removeItem('access_token');
      return next('/login');
    }
  }

  next();
});

export default router;
