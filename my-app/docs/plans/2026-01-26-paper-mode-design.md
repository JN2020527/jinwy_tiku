# 试题打标页面「试卷模式」设计方案

## 概述

为试题打标页面添加「试卷模式」，支持以试卷为维度浏览和打标试题。用户可在左栏通过 Tab 切换「试题列表」和「试卷列表」两种模式。

## 布局设计

### 模式切换

左栏顶部标题区改为 Tabs 组件：

```
┌─────────────────────────────┐
│  [试题列表]  [试卷列表]      │  ← Tabs 组件
├─────────────────────────────┤
│  筛选面板（根据模式变化）     │
├─────────────────────────────┤
│  列表内容（试题或试卷）       │
└─────────────────────────────┘
```

### 试卷模式三栏布局

```
┌─────────────┬──────────────────────────┬─────────────┐
│  左栏 25%   │      中间栏 50%           │  右栏 25%   │
│             │                          │             │
│ ┌─────────┐ │ ┌──────────────────────┐ │ ┌─────────┐ │
│ │筛选面板 │ │ │                      │ │ │         │ │
│ │学科+状态│ │ │   试题详情（上部）    │ │ │ 打标    │ │
│ ├─────────┤ │ │   题干、答案、解析    │ │ │ 表单    │ │
│ │         │ │ │                      │ │ │         │ │
│ │ 试卷    │ │ ├──────────────────────┤ │ │ (复用)  │ │
│ │ 列表    │ │ │ 题号导航（下部）      │ │ │         │ │
│ │         │ │ │ [1][2][3][4][5][6]   │ │ │         │ │
│ │         │ │ │ [7][8][9][10]...     │ │ │         │ │
│ │         │ │ │ ■绿色=已打标 □灰色=未 │ │ │         │ │
│ └─────────┘ │ └──────────────────────┘ │ └─────────┘ │
└─────────────┴──────────────────────────┴─────────────┘
```

### 题号方块设计

- 尺寸：约 32x32px 的小方块
- 内容：显示题号（1、2、3...）
- 颜色状态：
  - 绿色背景 = `complete`（已完成打标）
  - 灰色背景 = `untagged` 或 `partial`（未打标/部分打标）
  - 蓝色边框 = 当前选中的题目
- 交互：点击方块切换到对应题目，支持 Ctrl+点击多选

## 数据结构

### 新增 Paper 接口

```typescript
// types.ts 新增
export interface Paper {
  id: string;
  name: string;           // 试卷名称
  subject: string;        // 学科
  questionCount: number;  // 题目总数
  taggedCount: number;    // 已打标数量
  year?: string;
  region?: string;
}
```

### 主页面新增状态

```typescript
// index.tsx 新增状态
const [viewMode, setViewMode] = useState<'question' | 'paper'>('question');
const [currentPaperId, setCurrentPaperId] = useState<string>('');
```

### 试卷数据聚合

试卷列表从现有 questions 数据中聚合生成（后续可改为 API 调用）：

```typescript
const papers = useMemo(() => {
  const paperMap = new Map<string, Paper>();
  questions.forEach(q => {
    if (!q.paperId) return;
    if (!paperMap.has(q.paperId)) {
      paperMap.set(q.paperId, {
        id: q.paperId,
        name: q.paperName || '',
        subject: q.subject,
        questionCount: 0,
        taggedCount: 0,
      });
    }
    const paper = paperMap.get(q.paperId)!;
    paper.questionCount++;
    if (q.tagStatus === 'complete') paper.taggedCount++;
  });
  return Array.from(paperMap.values());
}, [questions]);
```

## 组件设计

### 新增组件

| 组件 | 文件 | 职责 |
|------|------|------|
| `PaperList` | `components/PaperList.tsx` | 试卷列表，显示试卷名称、进度条 |
| `PaperQuestionNav` | `components/PaperQuestionNav.tsx` | 题号方块导航，显示在中间栏底部 |

### PaperList 组件

```tsx
interface PaperListProps {
  papers: Paper[];
  currentPaperId: string;
  onPaperClick: (paperId: string) => void;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}
```

列表项展示：
```
┌────────────────────────────────┐
│ 2023年高考数学全国卷I          │  ← 试卷名称
│ ████████░░ 8/10               │  ← 进度条 + 数字
└────────────────────────────────┘
```

- 当前选中项：蓝色左边框 + 浅蓝背景
- 进度条：绿色表示已打标比例

### PaperQuestionNav 组件

```tsx
interface PaperQuestionNavProps {
  questions: Question[];
  currentQuestionId: string;
  selectedQuestionIds: string[];
  onQuestionClick: (id: string) => void;
  onSelectionChange: (ids: string[]) => void;
}
```

方块布局：
```
┌──────────────────────────────────────┐
│  试题导航                    全选 ☐  │
├──────────────────────────────────────┤
│  [1] [2] [3] [4] [5] [6] [7] [8]    │
│  [9] [10][11][12]                    │
│                                      │
│  ● 已打标  ○ 未打标                  │
└──────────────────────────────────────┘
```

- 方块使用 flex 布局，自动换行
- 支持点击选中、Ctrl+点击多选
- 底部图例说明颜色含义

### 组件复用

| 现有组件 | 复用方式 |
|----------|----------|
| `FilterPanel` | 新增 `mode` 属性，试卷模式下隐藏关键词搜索 |
| `QuestionDetail` | 完全复用，无需修改 |
| `TaggingForm` | 完全复用，无需修改 |

## 主页面条件渲染

```tsx
// 左栏标题区
<Tabs activeKey={viewMode} onChange={setViewMode}>
  <Tabs.TabPane tab="试题列表" key="question" />
  <Tabs.TabPane tab="试卷列表" key="paper" />
</Tabs>

// 左栏内容
{viewMode === 'question' ? (
  <QuestionList ... />
) : (
  <PaperList ... />
)}

// 中间栏
{viewMode === 'question' ? (
  <QuestionDetail ... />
) : (
  <>
    <QuestionDetail ... />        {/* 上部：试题详情 */}
    <PaperQuestionNav ... />      {/* 下部：题号导航 */}
  </>
)}
```

## 交互流程

### 试卷模式完整流程

1. 切换到试卷模式：点击「试卷列表」Tab
2. 筛选试卷：选择学科、标签状态
3. 选择试卷：点击试卷项，加载该试卷下所有试题
4. 浏览试题：中间栏上部显示详情，下部题号导航
5. 切换试题：点击题号方块，或使用键盘 ←→ 导航
6. 打标操作：右侧表单打标，保存后方块变绿
7. 批量打标：Ctrl+点击多选题号，右侧切换为批量模式

### 键盘快捷键（复用现有）

| 快捷键 | 功能 |
|--------|------|
| `←` `→` | 上一题 / 下一题 |
| `↑` `↓` | 上一题 / 下一题 |
| `Ctrl+Enter` | 保存并下一题 |

## 文件变更清单

### 新增文件

- `src/pages/QuestionTagging/components/PaperList.tsx`
- `src/pages/QuestionTagging/components/PaperList.less`
- `src/pages/QuestionTagging/components/PaperQuestionNav.tsx`
- `src/pages/QuestionTagging/components/PaperQuestionNav.less`

### 修改文件

- `src/pages/QuestionTagging/types.ts` - 新增 Paper 接口
- `src/pages/QuestionTagging/index.tsx` - 新增 viewMode 状态、Tab 切换、条件渲染
- `src/pages/QuestionTagging/components/FilterPanel.tsx` - 新增 mode 属性
