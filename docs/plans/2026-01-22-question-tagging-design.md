# 试题打标功能设计方案

**日期**: 2026-01-22
**功能**: 晋文源题库 - 试题打标
**类型**: 前端原型实现

## 功能概述

在晋文源题库下新增"试题打标"菜单，用于对已录入系统的试题进行批量标签标注。这是一个独立的标注工具，支持单个试题打标和批量打标两种模式。

## 核心需求

- **功能定位**: 批量标注工具，用于给已有试题打标签
- **标注工作流**: 混合模式，同时支持逐个标注和批量标注
- **标注内容**: 知识点、题型、难度、教材章节
- **试题来源**: 所有试题，支持条件筛选
- **筛选条件**: 科目、试卷、标签状态、关键词搜索
- **页面布局**: 左右分栏布局
- **实现范围**: 仅前端原型，使用 Mock 数据

## 整体架构

### 路由配置

在 `config/routes.ts` 中的"晋文源题库"菜单下新增路由：

```typescript
{
  path: '/question-bank/tagging',
  name: '试题打标',
  icon: 'TagsOutlined',
  component: './QuestionTagging',
}
```

### 页面结构

创建新页面 `src/pages/QuestionTagging/index.tsx`，采用左右分栏布局：
- 使用 Ant Design 的 `Layout.Sider` 和 `Layout.Content` 组件
- 左侧固定宽度（600-700px），右侧自适应
- 左侧包含：筛选条件区 + 试题列表区
- 右侧包含：标签表单

### 组件拆分

```
QuestionTagging/
├── index.tsx              # 主页面，管理整体布局和状态
├── components/
│   ├── FilterPanel.tsx    # 筛选条件面板
│   ├── QuestionList.tsx   # 试题列表（卡片形式，支持多选）
│   └── TaggingForm.tsx    # 标签表单
├── services.ts            # API 服务（使用 mock 数据）
└── mockData.ts            # Mock 数据
```

### 状态管理

使用 React Hooks 管理状态：
- `selectedQuestions`: 当前选中的试题 ID 列表
- `currentQuestion`: 当前查看的试题详情
- `filters`: 筛选条件
- `questionList`: 试题列表数据

## 详细设计

### 1. 筛选面板 (FilterPanel.tsx)

筛选条件包含四个部分：

1. **科目筛选**: 下拉选择框（Select），从科目列表中选择
2. **试卷筛选**: 级联选择器（Cascader），先选科目再选具体试卷
3. **标签状态**: 单选按钮组（Radio.Group）
   - 全部
   - 已完整打标（所有标签都有）
   - 部分打标（至少有一个标签）
   - 未打标（所有标签都为空）
4. **关键词搜索**: 搜索框（Input.Search），支持搜索题干内容

布局采用 `Form` 组件，每个筛选项占一行，点击"查询"按钮触发筛选。

### 2. 试题列表 (QuestionList.tsx)

**卡片布局**

- 使用 `Card` 组件展示每道试题，垂直排列
- 每个卡片包含：
  - **卡片头部**: 复选框 + 题号 + 题型标签（Tag）+ 标签状态图标
  - **卡片内容**: 完整的题干内容（支持富文本、图片、公式渲染）
  - **卡片底部**: 已有标签的快速预览（知识点、难度等，用 Tag 展示）
- 点击卡片高亮选中，右侧显示标签表单
- 卡片之间有适当间距（16px），提供良好的视觉分隔

**批量操作工具栏**

当选中多个试题时，列表顶部显示固定工具栏：
- 显示已选数量："已选择 X 道试题"
- "批量打标"按钮：点击后右侧切换为批量打标模式
- "取消选择"按钮：清空所有选择

**分页**

底部使用 `Pagination` 组件，每页显示 10-15 条（因为卡片占用空间较大）

### 3. 标签表单 (TaggingForm.tsx)

右侧根据选择情况显示不同的表单模式：

**模式一：单个试题打标**（选中1道试题时）

- 顶部显示当前操作的试题信息：题号 + 题型
- 标签表单：
  - **知识点**: 树形选择器（TreeSelect），支持多选
  - **题型**: 树形选择器（TreeSelect），单选
  - **难度**: 单选按钮组（Radio.Group）- 简单/中等/困难
  - **教材章节**: 级联选择器（Cascader），支持多选
- 表单采用垂直布局，标签清晰
- 修改后自动保存，显示保存状态（保存中/已保存）

**模式二：批量打标**（选中多道试题时）

- 顶部显示："正在为 X 道试题批量打标"
- 显示相同的标签表单结构
- 每个字段增加复选框："应用此标签"（默认不勾选）
- 增加策略选择：
  - "追加模式"：在原有标签基础上添加
  - "覆盖模式"：完全替换原有标签
- 底部"应用"按钮，点击后批量保存

**未选中状态**

- 显示提示信息："请从左侧选择试题进行打标"
- 可以显示一些操作指引

## 数据结构

### 试题数据结构

```typescript
interface Question {
  id: string;
  number: string;           // 题号
  type: string;             // 题型
  stem: string;             // 题干（HTML）
  options?: string[];       // 选项
  answer?: string;          // 答案
  analysis?: string;        // 解析
  paperId?: string;         // 所属试卷ID
  paperName?: string;       // 试卷名称
  subject: string;          // 科目

  // 标签信息
  knowledgePoints?: string[];  // 知识点ID数组
  questionType?: string;       // 题型ID
  difficulty?: 'easy' | 'medium' | 'hard';
  chapters?: string[];         // 教材章节ID数组

  // 标签状态
  tagStatus: 'untagged' | 'partial' | 'complete';
}
```

### 筛选条件

```typescript
interface FilterParams {
  subject?: string;
  paperId?: string;
  tagStatus?: 'all' | 'complete' | 'partial' | 'untagged';
  keyword?: string;
  page: number;
  pageSize: number;
}
```

## 交互流程

### 1. 页面初始化
- 加载筛选条件的选项数据（科目列表、试卷列表、知识点树、题型树等）
- 默认加载第一页试题列表

### 2. 筛选操作
- 用户修改筛选条件 → 触发查询 → 重新加载试题列表 → 重置分页到第1页

### 3. 选择试题
- 单击卡片 → 高亮该卡片 → 右侧显示该试题的标签表单（回显已有标签）
- 勾选复选框 → 加入选中列表 → 更新批量操作工具栏

### 4. 单个打标
- 修改表单任意字段 → 自动触发保存 → 显示保存状态 → 更新列表中的标签状态图标

### 5. 批量打标
- 选中多个试题 → 点击"批量打标" → 右侧切换为批量模式 → 填写标签 → 点击"应用" → 批量保存 → 更新所有相关试题的标签状态

## 实现细节

### Mock 数据准备

在 `src/pages/QuestionTagging/mockData.ts` 中准备：
- Mock 试题列表（10-20条示例数据）
- Mock 科目列表
- Mock 试卷列表
- Mock 知识点树
- Mock 题型树
- Mock 教材章节树

### 关键实现要点

**1. 自动保存防抖**
- 使用 `lodash.debounce` 或自定义 hook
- 表单修改后延迟 500ms 自动保存
- 避免频繁触发保存请求

**2. 富文本渲染**
- 题干、选项、答案、解析都可能包含 HTML
- 使用 `dangerouslySetInnerHTML` 或安全的 HTML 渲染组件
- 支持图片、公式的正常显示

**3. 状态同步**
- 保存成功后，更新列表中对应试题的标签状态
- 批量保存后，更新所有相关试题的状态
- 使用 `useState` + `useEffect` 管理状态同步

**4. 用户体验优化**
- 保存时显示 loading 状态
- 保存成功显示 `message.success`
- 保存失败显示 `message.error` 并允许重试
- 切换试题时，如果有未保存的修改，给出提示

**5. 样式建议**
- 左侧宽度：600-700px，右侧自适应
- 卡片间距：16px
- 选中卡片：蓝色边框高亮
- 标签状态图标：使用不同颜色区分（绿色=完整，橙色=部分，灰色=未打标）

## 开发顺序

1. 先搭建页面框架和布局
2. 实现筛选面板和试题列表（使用 mock 数据）
3. 实现单个试题打标功能
4. 实现批量打标功能
5. 优化交互和样式

## 技术栈

- **框架**: Umi Max 4 + React
- **UI 组件**: Ant Design + Ant Design Pro Components
- **状态管理**: React Hooks (useState, useEffect)
- **数据**: Mock 数据（前端原型）

## 后续扩展

当需要对接后端时，只需：
1. 将 mock 数据替换为真实 API 调用
2. 在 `services.ts` 中实现真实的 API 请求
3. 处理 loading 和 error 状态
4. 添加错误处理和重试机制
