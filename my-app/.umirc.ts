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
});

