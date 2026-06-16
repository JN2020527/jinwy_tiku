import { ProLayoutProps } from '@ant-design/pro-components';

/**
 * @name
 */
const Settings: ProLayoutProps & {
  pwa?: boolean;
  logo?: string;
} = {
  navTheme: 'realDark',
  layout: 'side',
  siderWidth: 180, // 收窄左侧菜单宽度（ProLayout 默认 208）
  contentWidth: 'Fluid',
  fixedHeader: false,
  fixSiderbar: true,
  colorWeak: false,
  title: '晋文源试卷管理系统',
  pwa: false,
  iconfontUrl: '',
  footerRender: false,
};

export default Settings;
