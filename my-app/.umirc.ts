import { defineConfig } from '@umijs/max';
import defaultSettings from './config/defaultSettings';
import routes from './config/routes';

export default defineConfig({
  antd: {
    theme: {
      token: {
        colorPrimary: '#2563eb',
        colorSuccess: '#16a34a',
        colorWarning: '#d97706',
        colorError: '#dc2626',
        colorInfo: '#2563eb',
        borderRadius: 6,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif",
        fontSize: 14,
        colorBgContainer: '#ffffff',
        colorBgLayout: '#f8fafc',
        colorBorderSecondary: '#e2e8f0',
        colorText: '#1e293b',
        colorTextSecondary: '#64748b',
        controlHeight: 36,
      },
      components: {
        Table: {
          headerBg: '#f8fafc',
          headerColor: '#475569',
          rowHoverBg: '#f1f5f9',
          borderColor: '#e2e8f0',
        },
        Card: {
          paddingLG: 20,
        },
        Steps: {
          colorPrimary: '#2563eb',
        },
      },
    },
  },
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: '资产中心',
    ...defaultSettings,
  },
  routes,
  npmClient: 'npm',
  esbuildMinifyIIFE: true,
  // API proxy configuration (used when backend is running)
  // When mock files exist in mock/, mock takes priority over proxy
  proxy: {
    '/api': {
      target: 'http://localhost:8001',
      changeOrigin: true,
    },
  },
});
