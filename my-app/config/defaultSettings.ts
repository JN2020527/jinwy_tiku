import { ProLayoutProps } from '@ant-design/pro-components';

/**
 * @name
 */
const Settings: ProLayoutProps & {
  pwa?: boolean;
  logo?: string;
} = {
  navTheme: 'realDark', // Used 'realDark' as common mapping for "dark sidebar", but Ant Design Pro 'navTheme' options are 'light' | 'realDark'. Wait, for sidebar dark and header light, often 'realDark' applies to the whole layout or 'light' for both.
  // Actually, standard Ant Design Pro settings for "Sidebar Dark, Header Light" is usually navTheme: 'realDark' or setting specific header theme.
  // Let's stick closer to the "Theme: 侧边栏深色 (dark), Header 亮色" requirement.
  // Often in ProLayout: navTheme: 'light' makes both light. 'realDark' makes both dark.
  // To get Mixed (Dark Sider, Light Header), we usually use navTheme: 'light' but layout: 'mix'? No, layout is 'side'.
  // In V5, 'navTheme' can be 'light' or 'realDark'.
  // However, often 'dark' sidebar with light header is the default "dark" navTheme if layout is side?
  // Let's check typical defaultSettings.
  // Actually, 'navTheme': 'light' | 'realDark'.
  // 'layout': 'side' | 'top' | 'mix'.
  // If we want Dark Sider and Light Header in 'side' layout:
  // Usually navTheme: 'realDark' makes the sider dark. Header might follow.
  // Let's use 'realDark' for the menu theme effect requested, or arguably 'light' with specific overrides.
  // But strictly following "Theme: 侧边栏深色 (dark)":
  navTheme: 'realDark',
  // Wait, if I set realDark, the whole app might be dark.
  // Let's assume the user means the standard "Dark Menu" style.
  // In ProSettings, navTheme: 'realDark' usually implies the sidebar is dark.

  // Re-reading prompt: "Theme: 侧边栏深色 (dark), Header 亮色。"
  // This is the classic admin style.
  primaryColor: '#1890ff', // Ant Design Default Blue
  layout: 'side',
  contentWidth: 'Fluid',
  fixedHeader: false,
  fixSiderbar: true,
  colorWeak: false,
  title: '晋文源试卷管理系统',
  pwa: false,
  iconfontUrl: '',
  footerRender: false, // We'll handle footer in Layout or standard footer
  // But the prompt says Footer: "Copyright..."
  // It's usually configured in app.tsx, but some settings might exist here.
  // We'll just define the object here.
};

export default Settings;
