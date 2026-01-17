import { defineConfig } from '@umijs/max';
import routes from './config/routes';
import defaultSettings from './config/defaultSettings';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: '晋文源试卷管理系统',
    ...defaultSettings,
  },
  routes,
  npmClient: 'npm',
  // 配置代理，将API请求转发到后端服务器
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
  // 禁用mock，使用真实后端API
  mock: false,
});

