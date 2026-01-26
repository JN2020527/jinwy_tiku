# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **注意**: 完整的项目架构、后端开发命令和 Word 解析流程请参阅根目录的 `../CLAUDE.md`。本文件仅包含前端特有的内容。

## 前端开发命令

```bash
npm run dev          # 启动开发服务器 (http://localhost:8000)
npm run build        # 生产环境构建
npm run format       # 使用 Prettier 格式化代码
```

## 技术栈

- **框架**: Umi Max 4 (React 元框架)
- **UI 库**: Ant Design 5 + Ant Design Pro Components
- **富文本编辑器**: wangEditor 5 (`@wangeditor/editor-for-react`)
- **状态管理**: Umi 内置 model 插件
- **代码质量**: Prettier + ESLint + Husky + lint-staged

## 项目结构

```
src/
├── pages/                 # 页面组件（基于路由）
│   ├── PaperUpload/       # Word 试卷上传工作流
│   │   ├── index.tsx      # 上传页面
│   │   └── Edit/          # 全屏校对页面 (layout: false)
│   ├── QuestionTagging/   # 试题打标功能
│   │   ├── index.tsx      # 主页面（三栏布局）
│   │   └── components/    # FilterPanel, QuestionList, QuestionDetail, TaggingForm
│   └── ContentCenter/     # 产品、学科、标签管理
├── services/              # API 服务层
│   ├── paperUpload.ts     # 试卷上传、解析、提交
│   ├── tagSystem.ts       # 标签分类、知识树
│   └── questionBankTask.ts
├── components/            # 共享组件
│   └── RichTextEditor/    # wangEditor 封装
├── models/                # 全局状态 (Umi data flow)
├── utils/                 # 工具函数
│   └── parseStem.ts       # HTML 内容解析
└── app.tsx                # 运行时配置

config/
├── routes.ts              # 路由定义
└── defaultSettings.ts     # ProLayout 主题设置
```

## 路由配置

路由定义在 `config/routes.ts`，支持：
- 嵌套路由：使用 `routes` 数组
- 隐藏菜单：`hideInMenu: true`
- 全屏页面：`layout: false`（无侧边栏/头部）
- 图标：来自 `@ant-design/icons`

**题库相关路由：**
- `/question-bank/tag-system` - 标签体系管理
- `/question-bank/task` - 题库任务
- `/question-bank/word-upload` - 试卷上传页面
- `/question-bank/word-upload/edit` - 全屏校对页面
- `/question-bank/tagging` - 试题打标页面

## 试题打标功能

### 页面布局

三栏全屏布局 (`layout: false`)：
- **左栏 (25%)**: 筛选面板 + 题目列表（分页）
- **中栏 (50%)**: 题目详情展示（单题/批量模式）
- **右栏 (25%)**: 打标表单（单题/批量模式）

### 键盘快捷键

- `↑/↓` 或 `←/→`: 在题目间导航
- `Ctrl/Cmd + Enter`: 保存当前题目并跳转到下一题

### 工作模式

- **单题模式**: 点击题目查看并单独打标
- **批量模式**: 勾选多题后批量打标（使用 Switch 控制各字段）

### 标签状态

根据以下字段自动计算：知识点、题型、难度、章节
- `untagged`: 未打标
- `partial`: 部分打标
- `complete`: 完成打标

## API 服务层模式

所有 API 调用使用 `@umijs/max` 的 request 工具：

```typescript
import { request } from '@umijs/max';

export async function getKnowledgeTree() {
  return request('/api/tags/knowledge-tree', { method: 'GET' });
}
```

响应格式：`{ success: boolean, message: string, data: T }`

## 重要注意事项

### TypeScript 配置
- `tsconfig.json` 继承自 `.umi/tsconfig.json`（自动生成）
- **不要手动编辑**生成的 tsconfig

### API 代理配置
- `.umirc.ts` 将 `/api` 代理到 `http://localhost:8001`
- 后端默认运行在 8000 端口，需要调整其中之一

### Mock 数据
- 当前已禁用 (`mock: false`)
- 开发新功能时可在页面目录创建 mock 数据（如 `QuestionTagging/mockData.ts`）

### 布局系统
- **标准页面**: 使用 `PageContainer` 组件
- **全屏页面**: 路由配置 `layout: false`
- **三栏页面**: 使用 `Row` 和 `Col` 自定义布局

## 新增前端页面流程

1. 在 `src/pages/[PageName]/index.tsx` 创建组件
2. 在 `config/routes.ts` 添加路由（path, name, icon, component）
3. 如需 API 调用，在 `src/services/` 创建服务文件
4. 复杂页面可创建 `components/` 子目录

**示例结构：**
```
src/pages/QuestionTagging/
├── index.tsx              # 主页面组件
├── components/            # 页面专用组件
│   ├── FilterPanel.tsx
│   ├── QuestionList.tsx
│   ├── QuestionDetail.tsx
│   └── TaggingForm.tsx
├── types.ts               # TypeScript 接口
└── mockData.ts            # 开发用 Mock 数据
```
