import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api', // 假设所有API请求都以/api开头
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器，用于在每个请求中附加Token
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 登录接口
export const login = (username: string, password: string) => {
  return apiClient.post('/auth/login', { email: username, password });
};

// 注册接口
export const register = (name: string, email: string, password: string, position?: string, company?: string) => {
  return apiClient.post('/auth/register', { name, email, password, position, company });
};

// 提交问卷接口
export const submitQuestionnaire = (submissionData: any) => {
  return apiClient.post('/evaluations/submit-questionnaire', submissionData);
};

// 获取我的待办任务接口
export const getMyTasks = (status?: string) => {
  const url = status ? `/evaluations/my-tasks?status=${status}` : '/evaluations/my-tasks';
  return apiClient.get(url);
};

// 获取我的最新报告接口
export const getMyLatestReport = () => {
  return apiClient.get('/reports/my-report/latest');
};

// 其他需要认证的API...

export default apiClient;
