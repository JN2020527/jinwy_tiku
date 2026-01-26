# 试卷模式实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为试题打标页面添加「试卷模式」，支持以试卷为维度浏览和打标试题。

**Architecture:** 在现有三栏布局基础上，通过 Tab 切换实现试题列表/试卷列表两种模式。试卷模式下左栏显示试卷列表，中间栏增加题号导航组件。复用现有 QuestionDetail 和 TaggingForm 组件。

**Tech Stack:** React, Ant Design Pro Components, TypeScript, Less

---

## Task 1: 新增 Paper 类型定义

**Files:**
- Modify: `src/pages/QuestionTagging/types.ts`
- Test: 手动验证 TypeScript 编译通过

**Step 1: 在 types.ts 中添加 Paper 接口**

在 `types.ts` 文件末尾添加：

```typescript
/**
 * 试卷数据结构
 */
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

**Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误输出

**Step 3: Commit**

```bash
git add src/pages/QuestionTagging/types.ts
git commit -m "feat(types): add Paper interface for paper mode"
```

---

## Task 2: 创建 PaperList 组件

**Files:**
- Create: `src/pages/QuestionTagging/components/PaperList.tsx`
- Create: `src/pages/QuestionTagging/components/PaperList.less`
- Test: 手动验证组件渲染

**Step 1: 创建 PaperList.less 样式文件**

```less
.paperList {
  height: 100%;
  display: flex;
  flex-direction: column;

  .listContainer {
    flex: 1;
    overflow-y: auto;
  }

  .paperItem {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background-color: #fafafa;
    }

    &.active {
      background-color: #e6f7ff;
      border-left: 3px solid #1890ff;
    }

    .paperName {
      font-size: 14px;
      color: #333;
      margin-bottom: 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .progressWrapper {
      display: flex;
      align-items: center;
      gap: 8px;

      .progressBar {
        flex: 1;
        height: 6px;
        background-color: #f0f0f0;
        border-radius: 3px;
        overflow: hidden;

        .progressFill {
          height: 100%;
          background-color: #52c41a;
          border-radius: 3px;
          transition: width 0.3s;
        }
      }

      .progressText {
        font-size: 12px;
        color: #999;
        white-space: nowrap;
      }
    }
  }

  .pagination {
    padding: 12px 16px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    justify-content: center;
  }
}
```

**Step 2: 创建 PaperList.tsx 组件**

```tsx
import React from 'react';
import { Pagination } from 'antd';
import type { Paper } from '../types';
import styles from './PaperList.less';

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

const PaperList: React.FC<PaperListProps> = ({
  papers,
  currentPaperId,
  onPaperClick,
  pagination,
}) => {
  return (
    <div className={styles.paperList}>
      <div className={styles.listContainer}>
        {papers.map((paper) => {
          const progress = paper.questionCount > 0
            ? (paper.taggedCount / paper.questionCount) * 100
            : 0;

          return (
            <div
              key={paper.id}
              className={`${styles.paperItem} ${paper.id === currentPaperId ? styles.active : ''}`}
              onClick={() => onPaperClick(paper.id)}
            >
              <div className={styles.paperName} title={paper.name}>
                {paper.name}
              </div>
              <div className={styles.progressWrapper}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className={styles.progressText}>
                  {paper.taggedCount}/{paper.questionCount}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.pagination}>
        <Pagination
          size="small"
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onChange={pagination.onChange}
          showSizeChanger={false}
        />
      </div>
    </div>
  );
};

export default PaperList;
```

**Step 3: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误输出

**Step 4: Commit**

```bash
git add src/pages/QuestionTagging/components/PaperList.tsx src/pages/QuestionTagging/components/PaperList.less
git commit -m "feat(PaperList): add paper list component with progress bar"
```

---

## Task 3: 创建 PaperQuestionNav 组件

**Files:**
- Create: `src/pages/QuestionTagging/components/PaperQuestionNav.tsx`
- Create: `src/pages/QuestionTagging/components/PaperQuestionNav.less`
- Test: 手动验证组件渲染

**Step 1: 创建 PaperQuestionNav.less 样式文件**

```less
.paperQuestionNav {
  border-top: 1px solid #f0f0f0;
  padding: 16px;
  background-color: #fafafa;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .title {
      font-size: 14px;
      font-weight: 500;
      color: #333;
    }
  }

  .questionGrid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  .questionBlock {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;

    &.untagged {
      background-color: #f0f0f0;
      color: #666;

      &:hover {
        background-color: #e0e0e0;
      }
    }

    &.tagged {
      background-color: #52c41a;
      color: #fff;

      &:hover {
        background-color: #73d13d;
      }
    }

    &.current {
      border-color: #1890ff;
    }

    &.selected {
      border-color: #722ed1;
    }
  }

  .legend {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: #999;

    .legendItem {
      display: flex;
      align-items: center;
      gap: 4px;

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 2px;

        &.tagged {
          background-color: #52c41a;
        }

        &.untagged {
          background-color: #f0f0f0;
        }
      }
    }
  }
}
```

**Step 2: 创建 PaperQuestionNav.tsx 组件**

```tsx
import React from 'react';
import { Checkbox } from 'antd';
import type { Question } from '../types';
import styles from './PaperQuestionNav.less';

interface PaperQuestionNavProps {
  questions: Question[];
  currentQuestionId: string;
  selectedQuestionIds: string[];
  onQuestionClick: (id: string) => void;
  onSelectionChange: (ids: string[]) => void;
}

const PaperQuestionNav: React.FC<PaperQuestionNavProps> = ({
  questions,
  currentQuestionId,
  selectedQuestionIds,
  onQuestionClick,
  onSelectionChange,
}) => {
  const allSelected = questions.length > 0 && selectedQuestionIds.length === questions.length;
  const indeterminate = selectedQuestionIds.length > 0 && selectedQuestionIds.length < questions.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(questions.map((q) => q.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleBlockClick = (id: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Ctrl+点击：多选切换
      if (selectedQuestionIds.includes(id)) {
        onSelectionChange(selectedQuestionIds.filter((qid) => qid !== id));
      } else {
        onSelectionChange([...selectedQuestionIds, id]);
      }
    } else {
      // 普通点击：单选
      onQuestionClick(id);
    }
  };

  return (
    <div className={styles.paperQuestionNav}>
      <div className={styles.header}>
        <span className={styles.title}>试题导航</span>
        <Checkbox
          checked={allSelected}
          indeterminate={indeterminate}
          onChange={(e) => handleSelectAll(e.target.checked)}
        >
          全选
        </Checkbox>
      </div>
      <div className={styles.questionGrid}>
        {questions.map((question, index) => {
          const isTagged = question.tagStatus === 'complete';
          const isCurrent = question.id === currentQuestionId;
          const isSelected = selectedQuestionIds.includes(question.id);

          const classNames = [
            styles.questionBlock,
            isTagged ? styles.tagged : styles.untagged,
            isCurrent ? styles.current : '',
            isSelected ? styles.selected : '',
          ].filter(Boolean).join(' ');

          return (
            <div
              key={question.id}
              className={classNames}
              onClick={(e) => handleBlockClick(question.id, e)}
              title={`第${index + 1}题 - ${isTagged ? '已打标' : '未打标'}`}
            >
              {index + 1}
            </div>
          );
        })}
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.tagged}`} />
          已打标
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.untagged}`} />
          未打标
        </span>
      </div>
    </div>
  );
};

export default PaperQuestionNav;
```

**Step 3: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误输出

**Step 4: Commit**

```bash
git add src/pages/QuestionTagging/components/PaperQuestionNav.tsx src/pages/QuestionTagging/components/PaperQuestionNav.less
git commit -m "feat(PaperQuestionNav): add question navigation grid with multi-select support"
```

---

## Task 4: 修改 FilterPanel 支持模式切换

**Files:**
- Modify: `src/pages/QuestionTagging/components/FilterPanel.tsx`
- Test: 手动验证两种模式下的筛选面板

**Step 1: 添加 mode 属性到 FilterPanel**

在 `FilterPanelProps` 接口中添加 `mode` 属性：

```typescript
interface FilterPanelProps {
  mode?: 'question' | 'paper';  // 新增
  onFilterChange: (filters: Partial<FilterParams>) => void;
}
```

**Step 2: 根据 mode 条件渲染关键词搜索**

在 JSX 中，将关键词搜索字段包裹在条件渲染中：

```tsx
{mode !== 'paper' && (
  <ProFormText
    name="keyword"
    label="关键词"
    placeholder="搜索试卷名称或题干"
    fieldProps={{
      allowClear: true,
    }}
  />
)}
```

**Step 3: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误输出

**Step 4: Commit**

```bash
git add src/pages/QuestionTagging/components/FilterPanel.tsx
git commit -m "feat(FilterPanel): add mode prop to hide keyword search in paper mode"
```

---

## Task 5: 主页面添加 viewMode 状态和 Tab 切换

**Files:**
- Modify: `src/pages/QuestionTagging/index.tsx`
- Test: 手动验证 Tab 切换功能

**Step 1: 导入新组件和 Tabs**

在文件顶部添加导入：

```typescript
import { Tabs } from 'antd';
import PaperList from './components/PaperList';
import PaperQuestionNav from './components/PaperQuestionNav';
import type { Paper } from './types';
```

**Step 2: 添加 viewMode 和 currentPaperId 状态**

在现有状态声明后添加：

```typescript
const [viewMode, setViewMode] = useState<'question' | 'paper'>('question');
const [currentPaperId, setCurrentPaperId] = useState<string>('');
```

**Step 3: 添加 papers 聚合计算**

在现有 useMemo 后添加：

```typescript
const papers = useMemo(() => {
  const paperMap = new Map<string, Paper>();
  questions.forEach((q) => {
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

**Step 4: 添加 paperQuestions 计算（当前试卷的试题）**

```typescript
const paperQuestions = useMemo(() => {
  if (!currentPaperId) return [];
  return questions.filter((q) => q.paperId === currentPaperId);
}, [questions, currentPaperId]);
```

**Step 5: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误输出

**Step 6: Commit**

```bash
git add src/pages/QuestionTagging/index.tsx
git commit -m "feat(QuestionTagging): add viewMode state and papers aggregation"
```

---

## Task 6: 主页面实现左栏 Tab 切换和条件渲染

**Files:**
- Modify: `src/pages/QuestionTagging/index.tsx`
- Test: 手动验证左栏切换

**Step 1: 修改左栏标题区为 Tabs**

将左栏的标题部分替换为 Tabs 组件：

```tsx
<Tabs
  activeKey={viewMode}
  onChange={(key) => setViewMode(key as 'question' | 'paper')}
  items={[
    { key: 'question', label: '试题列表' },
    { key: 'paper', label: '试卷列表' },
  ]}
/>
```

**Step 2: 传递 mode 给 FilterPanel**

```tsx
<FilterPanel mode={viewMode} onFilterChange={handleFilterChange} />
```

**Step 3: 条件渲染左栏列表**

```tsx
{viewMode === 'question' ? (
  <QuestionList
    questions={filteredQuestions}
    currentQuestionId={currentQuestionId}
    selectedQuestionIds={selectedQuestionIds}
    onQuestionClick={handleQuestionClick}
    onSelectionChange={handleSelectionChange}
    pagination={{
      current: filters.page || 1,
      pageSize: filters.pageSize || 15,
      total: filteredQuestions.length,
      onChange: (page, pageSize) => {
        setFilters((prev) => ({ ...prev, page, pageSize }));
      },
    }}
  />
) : (
  <PaperList
    papers={papers}
    currentPaperId={currentPaperId}
    onPaperClick={(paperId) => {
      setCurrentPaperId(paperId);
      // 选中试卷后，自动选中第一道题
      const firstQuestion = questions.find((q) => q.paperId === paperId);
      if (firstQuestion) {
        setCurrentQuestionId(firstQuestion.id);
        setSelectedQuestionIds([]);
      }
    }}
    pagination={{
      current: 1,
      pageSize: 15,
      total: papers.length,
      onChange: () => {},
    }}
  />
)}
```

**Step 4: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误输出

**Step 5: Commit**

```bash
git add src/pages/QuestionTagging/index.tsx
git commit -m "feat(QuestionTagging): implement left panel tab switching"
```

---

## Task 7: 主页面实现中间栏条件渲染

**Files:**
- Modify: `src/pages/QuestionTagging/index.tsx`
- Test: 手动验证中间栏布局

**Step 1: 修改中间栏渲染逻辑**

将中间栏内容修改为条件渲染：

```tsx
{viewMode === 'question' ? (
  <QuestionDetail
    question={currentQuestion}
    questions={filteredQuestions}
    selectedQuestions={selectedQuestions}
    isBatchMode={isBatchMode}
    onPrevious={handlePrevious}
    onNext={handleNext}
  />
) : (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <div style={{ flex: 1, overflow: 'auto' }}>
      <QuestionDetail
        question={currentQuestion}
        questions={paperQuestions}
        selectedQuestions={selectedQuestions}
        isBatchMode={isBatchMode}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />
    </div>
    <PaperQuestionNav
      questions={paperQuestions}
      currentQuestionId={currentQuestionId}
      selectedQuestionIds={selectedQuestionIds}
      onQuestionClick={(id) => {
        setCurrentQuestionId(id);
        setSelectedQuestionIds([]);
      }}
      onSelectionChange={setSelectedQuestionIds}
    />
  </div>
)}
```

**Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误输出

**Step 3: Commit**

```bash
git add src/pages/QuestionTagging/index.tsx
git commit -m "feat(QuestionTagging): implement middle panel with question navigation"
```

---

## Task 8: 修复试卷模式下的导航逻辑

**Files:**
- Modify: `src/pages/QuestionTagging/index.tsx`
- Test: 手动验证上下题导航

**Step 1: 修改 handlePrevious 和 handleNext**

更新导航函数以支持试卷模式：

```typescript
const handlePrevious = () => {
  const questionList = viewMode === 'paper' ? paperQuestions : filteredQuestions;
  const currentIndex = questionList.findIndex((q) => q.id === currentQuestionId);
  if (currentIndex > 0) {
    setCurrentQuestionId(questionList[currentIndex - 1].id);
    setSelectedQuestionIds([]);
  }
};

const handleNext = () => {
  const questionList = viewMode === 'paper' ? paperQuestions : filteredQuestions;
  const currentIndex = questionList.findIndex((q) => q.id === currentQuestionId);
  if (currentIndex < questionList.length - 1) {
    setCurrentQuestionId(questionList[currentIndex + 1].id);
    setSelectedQuestionIds([]);
  }
};
```

**Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误输出

**Step 3: Commit**

```bash
git add src/pages/QuestionTagging/index.tsx
git commit -m "fix(QuestionTagging): update navigation to support paper mode"
```

---

## Task 9: 端到端功能验证

**Files:**
- Test: 手动测试完整流程

**Step 1: 启动开发服务器**

Run: `npm run dev`
Expected: 服务器启动成功

**Step 2: 验证试题模式**

1. 打开试题打标页面
2. 确认默认显示「试题列表」Tab
3. 筛选、选择、打标功能正常

**Step 3: 验证试卷模式**

1. 点击「试卷列表」Tab
2. 确认筛选面板隐藏关键词搜索
3. 选择一个试卷，确认中间栏显示题号导航
4. 点击题号方块，确认切换试题
5. Ctrl+点击多选，确认批量模式
6. 使用键盘 ←→ 导航，确认正常

**Step 4: 验证打标后状态更新**

1. 在试卷模式下打标一道题
2. 确认题号方块变为绿色
3. 确认试卷列表进度条更新

**Step 5: Commit（如有修复）**

```bash
git add -A
git commit -m "fix: address issues found during e2e testing"
```

---

## Task 10: 最终代码审查和清理

**Files:**
- Review: 所有修改的文件

**Step 1: 检查代码风格**

Run: `npm run lint`
Expected: 无错误

**Step 2: 检查 TypeScript 类型**

Run: `npx tsc --noEmit`
Expected: 无错误

**Step 3: 清理未使用的导入**

检查并移除任何未使用的导入语句。

**Step 4: 最终 Commit**

```bash
git add -A
git commit -m "chore: code cleanup and lint fixes"
```

---

## 文件变更总结

### 新增文件
- `src/pages/QuestionTagging/components/PaperList.tsx`
- `src/pages/QuestionTagging/components/PaperList.less`
- `src/pages/QuestionTagging/components/PaperQuestionNav.tsx`
- `src/pages/QuestionTagging/components/PaperQuestionNav.less`

### 修改文件
- `src/pages/QuestionTagging/types.ts` - 新增 Paper 接口
- `src/pages/QuestionTagging/index.tsx` - 新增 viewMode 状态、Tab 切换、条件渲染
- `src/pages/QuestionTagging/components/FilterPanel.tsx` - 新增 mode 属性
