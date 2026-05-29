import { defineConfig } from '@umijs/max';
import defaultSettings from './config/defaultSettings';
import routes from './config/routes';

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
  // API proxy configuration (used when backend is running)
  // When mock files exist in mock/, mock takes priority over proxy
  proxy: {
    '/api': {
      target: 'http://localhost:8001',
      changeOrigin: true,
    },
  },
});
