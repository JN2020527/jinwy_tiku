# 重复检测阶段重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the black-box dedupe stage with a transparent card-based UI showing structured duplicate source info, side-by-side comparison, and unlink capability.

**Architecture:** Extend `TaskQuestion.duplicateOf` from `string` to a structured `DuplicateMatch` object. Rewrite `Dedupe.tsx` as a standalone component with `DedupeSummary` and `DuplicatePairCard` sub-components. Add mock API route for unlinking duplicates.

**Tech Stack:** React 18, Ant Design 5, LESS modules, Umi Max 4 (mock routes via Express). No tests (project has no test framework).

---

### Task 1: Add DuplicateMatch type and update TaskQuestion

**Files:**
- Modify: `src/pages/UploadTask/types.ts:30-33,93-95`

- [ ] **Step 1: Add DuplicateMatch interface after QualityVerdict type**

Open `src/pages/UploadTask/types.ts`. After line 44 (`export type QualityVerdict = ...`), add:

```typescript
export interface DuplicateMatch {
  /** 被重复的原题 ID */
  sourceQuestionId: string;
  /** 来源上传任务/试卷名称 */
  sourceTaskName: string;
  /** 原题在来源任务中的序号 */
  sourceQuestionIndex: number;
  /** 相似度分数 0~100 */
  similarity: number;
  /** 判重依据 */
  reason: 'stem-similar' | 'answer-identical' | 'overall-similar';
  /** 原题题干 HTML（用于并排对比） */
  sourceStem: string;
  /** 原题答案（可选） */
  sourceAnswer?: string;
}
```

- [ ] **Step 2: Change duplicateOf type from string to DuplicateMatch**

On line 95, change:

```typescript
duplicateOf?: string;
```

to:

```typescript
duplicateOf?: DuplicateMatch;
```

- [ ] **Step 3: Verify SystemStatus still compiles**

Run: `cd /Users/jinwenyuan/my-repo/jinwy_tiku/my-app && npx tsc --noEmit --pretty 2>&1 | head -30`

SystemStatus.tsx line 97 does `Q{q.index} → 已关联到 {q.duplicateOf}` — this renders `[object Object]` now, which is fine because Dedupe.tsx will no longer use SystemStatus for the dedupe stage. The truthy check `!!q.duplicateOf` on line 35 still works. SystemStatus still serves parse/tag/publish.

Expected: No compile errors, or only the `[object Object]` rendering in SystemStatus (acceptable, will be unused for dedupe).

- [ ] **Step 4: Commit**

```bash
git add src/pages/UploadTask/types.ts
git commit -m "feat(upload): add DuplicateMatch type and update TaskQuestion.duplicateOf"
```

---

### Task 2: Add unlinkDuplicate service function

**Files:**
- Modify: `src/services/uploadTask.ts` (add after `confirmQualityReject` function, around line 85)

- [ ] **Step 1: Add unlinkDuplicate function**

Open `src/services/uploadTask.ts`. After the `confirmQualityReject` function (after line 85), add:

```typescript
// ----- 重复检测 -----

export async function unlinkDuplicate(
  taskId: string,
  questionId: string,
): Promise<void> {
  return request<ApiResponse<void>>(
    '/api/upload-task/dedupe/unlink',
    { method: 'POST', data: { taskId, questionId } },
  ).then(unwrap);
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/jinwenyuan/my-repo/jinwy_tiku/my-app && npx tsc --noEmit --pretty 2>&1 | head -20`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/uploadTask.ts
git commit -m "feat(upload): add unlinkDuplicate service function"
```

---

### Task 3: Update mock — add SOURCE_TASKS pool and generate structured DuplicateMatch data

**Files:**
- Modify: `mock/uploadTask.ts:403-406` (replace old duplicateOf assignment)

- [ ] **Step 1: Add SOURCE_TASKS constant pool**

Open `mock/uploadTask.ts`. After the `STEM_TEMPLATES` array (after line 79), add:

```typescript
// ===== 重复检测来源任务池 =====

const SOURCE_TASKS = [
  { id: 'src-task-1', name: '2024年河南省中考数学试卷' },
  { id: 'src-task-2', name: '2024年山西省中考数学试卷' },
  { id: 'src-task-3', name: '2024年河北省中考数学试卷' },
];
```

- [ ] **Step 2: Replace old duplicateOf assignment with structured data**

Find lines 403-406:

```typescript
      // 重复检测产物：已过 dedupe 的任务，index=3 的题打 duplicateOf
      if (passedDedupe && i === 3) {
        base.duplicateOf = 'other-task-q-id';
      }
```

Replace with:

```typescript
      // 重复检测产物：已过 dedupe 的任务，给 index 3 和 5 生成结构化重复对
      if (passedDedupe && i === 3) {
        base.duplicateOf = {
          sourceQuestionId: `${SOURCE_TASKS[0].id}-q-3`,
          sourceTaskName: SOURCE_TASKS[0].name,
          sourceQuestionIndex: 3,
          similarity: 96.3,
          reason: 'stem-similar',
          sourceStem: STEM_TEMPLATES[2],
          sourceAnswer: '<p>本题考查函数极值，最小值为 -4。</p>',
        };
      }
      if (passedDedupe && i === 5) {
        base.duplicateOf = {
          sourceQuestionId: `${SOURCE_TASKS[1].id}-q-5`,
          sourceTaskName: SOURCE_TASKS[1].name,
          sourceQuestionIndex: 5,
          similarity: 88.1,
          reason: 'answer-identical',
          sourceStem: STEM_TEMPLATES[4],
          sourceAnswer: '<p>干路电流为 0.3A。</p>',
        };
      }
```

- [ ] **Step 3: Verify mock compiles**

Run: `cd /Users/jinwenyuan/my-repo/jinwy_tiku/my-app && npx tsc --noEmit --pretty 2>&1 | head -20`

Expected: No errors (mock/ts files are type-checked).

- [ ] **Step 4: Commit**

```bash
git add mock/uploadTask.ts
git commit -m "feat(upload): add SOURCE_TASKS pool and generate structured DuplicateMatch seed data"
```

---

### Task 4: Add unlink mock route

**Files:**
- Modify: `mock/uploadTask.ts` (add route after `'POST /api/upload-task/advance'` route, around line 1018)

- [ ] **Step 1: Add dedupe unlink route**

Open `mock/uploadTask.ts`. Find the `'POST /api/upload-task/advance'` route handler. After its closing `},` (around line 1018), before the `// ----- 渠道分发 -----` comment, add:

```typescript
  // ----- 重复检测解除 -----

  'POST /api/upload-task/dedupe/unlink': (req: Request, res: Response) => {
    const { taskId, questionId } = req.body ?? {};
    if (!taskId || !questionId) {
      fail(res, 'taskId 与 questionId 必填');
      return;
    }
    const list = questions[taskId];
    if (!list) {
      fail(res, '任务不存在', 404);
      return;
    }
    let found = false;
    questions[taskId] = list.map((q) => {
      if (q.id !== questionId) return q;
      found = true;
      const { duplicateOf: _, ...rest } = q;
      return rest as TaskQuestion;
    });
    if (!found) {
      fail(res, '题目不存在', 404);
      return;
    }
    // 更新阶段 summary
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const updatedSummary = genStageSummary('dedupe', questions[taskId]);
      const updatedProgress = {
        ...task.stageProgress,
        dedupe: { ...task.stageProgress.dedupe, summary: updatedSummary },
      };
      tasks = tasks.map((t) =>
        t.id === taskId
          ? { ...t, stageProgress: updatedProgress, updatedAt: now() }
          : t,
      );
    }
    ok(res, undefined);
  },
```

- [ ] **Step 2: Verify mock compiles**

Run: `cd /Users/jinwenyuan/my-repo/jinwy_tiku/my-app && npx tsc --noEmit --pretty 2>&1 | head -20`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add mock/uploadTask.ts
git commit -m "feat(upload): add dedupe unlink mock route"
```

---

### Task 5: Create DedupeSummary component

**Files:**
- Create: `src/pages/UploadTask/Stage/stages/dedupe/DedupeSummary.tsx`

- [ ] **Step 1: Create the dedupe subdirectory**

Run: `mkdir -p /Users/jinwenyuan/my-repo/jinwy_tiku/my-app/src/pages/UploadTask/Stage/stages/dedupe`

- [ ] **Step 2: Write DedupeSummary.tsx**

```tsx
import React from 'react';
import styles from './dedupe.less';

export interface DedupeSummaryProps {
  total: number;
  duplicateCount: number;
}

const DedupeSummary: React.FC<DedupeSummaryProps> = ({
  total,
  duplicateCount,
}) => {
  const independentCount = total - duplicateCount;

  return (
    <div className={styles.summary}>
      {duplicateCount === 0 ? (
        <span>共 {total} 题 · 未发现重复题</span>
      ) : (
        <span>
          共 {total} 题 ·{' '}
          <span className={styles.summaryIndependent}>
            {independentCount} 道独立
          </span>{' '}
          ·{' '}
          <span className={styles.summaryDuplicate}>
            {duplicateCount} 道重复
          </span>
        </span>
      )}
    </div>
  );
};

export default DedupeSummary;
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/UploadTask/Stage/stages/dedupe/DedupeSummary.tsx
git commit -m "feat(upload): add DedupeSummary component"
```

---

### Task 6: Create DuplicatePairCard component

**Files:**
- Create: `src/pages/UploadTask/Stage/stages/dedupe/DuplicatePairCard.tsx`

- [ ] **Step 1: Write DuplicatePairCard.tsx**

```tsx
import { Button, Card, Popconfirm } from 'antd';
import React, { useState } from 'react';
import { sanitizeHtml } from '@/utils/sanitize';
import type { TaskQuestion } from '../../types';
import styles from './dedupe.less';

export interface DuplicatePairCardProps {
  question: TaskQuestion;
  onUnlink: (questionId: string) => Promise<void>;
  readOnly: boolean;
}

const REASON_LABELS: Record<string, string> = {
  'stem-similar': '题干相似',
  'answer-identical': '答案相同',
  'overall-similar': '整体相似',
};

const similarityColor = (score: number): string => {
  if (score >= 95) return styles.simHigh;
  if (score >= 80) return styles.simMedium;
  return styles.simLow;
};

const DuplicatePairCard: React.FC<DuplicatePairCardProps> = ({
  question,
  onUnlink,
  readOnly,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const dup = question.duplicateOf;

  if (!dup) return null;

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      await onUnlink(question.id);
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <Card
      size="small"
      className={styles.pairCard}
      title={
        <div
          className={styles.pairHeader}
          onClick={() => setExpanded(!expanded)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded);
          }}
        >
          <span className={styles.pairHeaderLeft}>
            <span className={`${styles.similarity} ${similarityColor(dup.similarity)}`}>
              相似度 {dup.similarity.toFixed(1)}%
            </span>
            <span className={styles.reason}>
              · {REASON_LABELS[dup.reason] ?? dup.reason}
            </span>
          </span>
          <span className={styles.pairHeaderRight}>
            来源：{dup.sourceTaskName} · Q{dup.sourceQuestionIndex}
          </span>
          <span className={styles.expandIcon}>{expanded ? '▲' : '▼'}</span>
        </div>
      }
    >
      {expanded && (
        <>
          <div className={styles.comparison}>
            <div className={styles.comparisonLeft}>
              <div className={styles.comparisonLabel}>当前题 Q{question.index}</div>
              <div
                className={styles.stemContent}
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(question.stem),
                }}
              />
              {question.answer && (
                <div className={styles.answerBlock}>
                  <div className={styles.answerLabel}>答案</div>
                  <div
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(
                        typeof question.answer === 'string' &&
                        question.answer.startsWith('<')
                          ? question.answer
                          : `<p>${question.answer}</p>`,
                      ),
                    }}
                  />
                </div>
              )}
            </div>
            <div className={styles.comparisonRight}>
              <div className={styles.comparisonLabel}>
                原题 · {dup.sourceTaskName} Q{dup.sourceQuestionIndex}
              </div>
              <div
                className={styles.stemContent}
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(dup.sourceStem),
                }}
              />
              {dup.sourceAnswer && (
                <div className={styles.answerBlock}>
                  <div className={styles.answerLabel}>答案</div>
                  <div
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(dup.sourceAnswer),
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          {!readOnly && (
            <div className={styles.pairActions}>
              <Popconfirm
                title="确定解除重复标记？该题将作为独立题进入后续流程。"
                onConfirm={handleUnlink}
                okText="确定解除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button
                  danger
                  size="small"
                  loading={unlinking}
                  disabled={unlinking}
                >
                  解除重复
                </Button>
              </Popconfirm>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default DuplicatePairCard;
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/UploadTask/Stage/stages/dedupe/DuplicatePairCard.tsx
git commit -m "feat(upload): add DuplicatePairCard component with side-by-side comparison"
```

---

### Task 7: Create dedupe.less styles

**Files:**
- Create: `src/pages/UploadTask/Stage/stages/dedupe/dedupe.less`

- [ ] **Step 1: Write dedupe.less**

```less
@import '../../../styles/variables.less';

// ===== Summary =====

.summary {
  font-size: @font-size-base;
  color: @color-text-secondary;
  padding: @space-sm 0;
}

.summaryIndependent {
  color: @color-success;
  font-weight: @font-weight-medium;
}

.summaryDuplicate {
  color: @color-error;
  font-weight: @font-weight-medium;
}

// ===== Pair Card =====

.pairCard {
  border-radius: @radius-lg;
  box-shadow: @shadow-sm;
  margin-bottom: @space-md;

  :global(.ant-card-head) {
    min-height: auto;
    padding: 0 @space-md;
    border-bottom: 1px solid @color-border-light;
  }

  :global(.ant-card-body) {
    padding: 0;
  }
}

.pairHeader {
  display: flex;
  align-items: center;
  gap: @space-sm;
  padding: @space-sm 0;
  cursor: pointer;
  user-select: none;
}

.pairHeaderLeft {
  display: flex;
  align-items: center;
  gap: @space-xs;
  flex-shrink: 0;
}

.pairHeaderRight {
  flex: 1;
  font-size: @font-size-xs;
  color: @color-text-tertiary;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expandIcon {
  font-size: 10px;
  color: @color-text-tertiary;
  flex-shrink: 0;
  margin-left: @space-xs;
}

.similarity {
  font-size: @font-size-sm;
  font-weight: @font-weight-semibold;
  padding: 1px @space-sm;
  border-radius: @radius-sm;
}

.simHigh {
  color: @color-error;
  background: @color-error-light;
}

.simMedium {
  color: @color-warning;
  background: @color-warning-light;
}

.simLow {
  color: #ca8a04;
  background: #fefce8;
}

.reason {
  font-size: @font-size-sm;
  color: @color-text-secondary;
}

// ===== Comparison =====

.comparison {
  display: flex;
  gap: 1px;
  background: @color-border-light;
}

.comparisonLeft {
  flex: 1;
  background: @color-success-light;
  padding: @space-md;
}

.comparisonRight {
  flex: 1;
  background: @color-primary-light;
  padding: @space-md;
}

.comparisonLabel {
  font-size: @font-size-xs;
  font-weight: @font-weight-medium;
  color: @color-primary;
  margin-bottom: @space-sm;

  .comparisonLeft & {
    color: @color-success;
  }
}

.stemContent {
  font-size: @font-size-sm;
  line-height: 1.7;
  color: @color-text;

  img {
    max-width: 100%;
    height: auto;
  }

  math {
    font-size: 1.1em;
  }
}

.answerBlock {
  margin-top: @space-md;
  padding-top: @space-sm;
  border-top: 1px dashed @color-border;
}

.answerLabel {
  font-size: @font-size-xs;
  color: @color-text-tertiary;
  margin-bottom: @space-xs;
  font-weight: @font-weight-medium;
}

// ===== Pair Actions =====

.pairActions {
  display: flex;
  justify-content: flex-end;
  padding: @space-sm @space-md;
  background: @color-bg;
}

// ===== Main Dedupe Container =====

.dedupeContainer {
  max-width: 800px;
  margin: 48px auto;
  padding: @space-lg;
}

.dedupeCard {
  border-radius: @radius-lg;
  box-shadow: @shadow-sm;
}

.processing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: @space-lg;
  padding: @space-xl 0;
}

.processingTitle {
  font-size: 16px;
  font-weight: @font-weight-semibold;
  color: @color-text;
  margin: 0;
}

.processingCount {
  color: @color-text-secondary;
  font-size: @font-size-sm;
}

.done {
  display: flex;
  flex-direction: column;
  gap: @space-lg;
}

.doneHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.doneTitle {
  font-size: 16px;
  font-weight: @font-weight-semibold;
  color: @color-text;
  margin: 0;
  display: flex;
  align-items: center;
  gap: @space-sm;
}

.doneTime {
  color: @color-text-secondary;
  font-size: @font-size-sm;
}

.pending {
  color: @color-text-secondary;
  padding: @space-xl 0;
  text-align: center;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/UploadTask/Stage/stages/dedupe/dedupe.less
git commit -m "feat(upload): add dedupe LESS module styles"
```

---

### Task 8: Rewrite Dedupe.tsx as standalone component

**Files:**
- Modify: `src/pages/UploadTask/Stage/stages/Dedupe.tsx`

- [ ] **Step 1: Replace Dedupe.tsx entirely**

Replace the entire content of `src/pages/UploadTask/Stage/stages/Dedupe.tsx` with:

```tsx
import { Alert, Button, Card, Spin, Tag, message } from 'antd';
import { history } from '@umijs/max';
import React, { useCallback, useMemo, useState } from 'react';
import { useRequest } from '@umijs/max';
import {
  STAGE_LABELS,
  nextStageOf,
} from '../../constants';
import { getStageQuestions, advanceSystemStage, unlinkDuplicate } from '@/services/uploadTask';
import type { TaskQuestion } from '../../types';
import DedupeSummary from './dedupe/DedupeSummary';
import DuplicatePairCard from './dedupe/DuplicatePairCard';
import styles from './dedupe.less';

interface DedupeProps {
  task: {
    id: string;
    stageProgress: Record<string, { state: string; summary?: string; finishedAt?: string }>;
  };
  onRefresh: () => void;
  readOnly?: boolean;
}

const Dedupe: React.FC<DedupeProps> = ({ task, onRefresh, readOnly = false }) => {
  const [advancing, setAdvancing] = useState(false);

  const { data: questions = [], refresh: refreshQuestions } = useRequest(
    () => getStageQuestions(task.id, 'dedupe'),
    { formatResult: (res: TaskQuestion[]) => res },
  );

  const stageProgress = task.stageProgress['dedupe'];
  const nextState = stageProgress?.state ?? 'pending';

  const duplicates = useMemo(
    () => questions.filter((q): q is TaskQuestion & { duplicateOf: NonNullable<TaskQuestion['duplicateOf']> } => !!q.duplicateOf),
    [questions],
  );

  const handleAdvance = useCallback(async () => {
    setAdvancing(true);
    try {
      await advanceSystemStage(task.id, 'dedupe');
      message.success('已推进');
      onRefresh();
    } catch (e) {
      message.error((e as Error).message || '推进失败');
    } finally {
      setAdvancing(false);
    }
  }, [task.id, onRefresh]);

  const handleUnlink = useCallback(
    async (questionId: string) => {
      try {
        await unlinkDuplicate(task.id, questionId);
        message.success('已解除重复标记');
        refreshQuestions();
        onRefresh();
      } catch (e) {
        message.error((e as Error).message || '解除失败');
      }
    },
    [task.id, refreshQuestions, onRefresh],
  );

  const handleNext = useCallback(() => {
    const next = nextStageOf('dedupe');
    if (next) history.push(`/question-bank/upload/${task.id}/${next}`);
  }, [task.id]);

  const nextStage = nextStageOf('dedupe');
  const nextLabel = nextStage ? STAGE_LABELS[nextStage] : null;
  const nextButtonText = `→ 进入下一阶段：${nextLabel ?? ''}`;

  // --- Render by state ---

  if (nextState === 'pending') {
    return (
      <div className={styles.dedupeContainer}>
        <Card className={styles.dedupeCard}>
          <div className={styles.pending}>等待上一阶段完成…</div>
        </Card>
      </div>
    );
  }

  if (nextState === 'processing') {
    return (
      <div className={styles.dedupeContainer}>
        <Card className={styles.dedupeCard}>
          <div className={styles.processing}>
            <h3 className={styles.processingTitle}>重复检测 · 系统处理中…</h3>
            <Spin size="large" />
            <div className={styles.processingCount}>
              共 {questions.length} 题待处理
            </div>
            <Button
              onClick={handleAdvance}
              loading={advancing}
              disabled={readOnly}
            >
              ⏵ 模拟立即完成（演示）
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (nextState === 'rejected') {
    return (
      <div className={styles.dedupeContainer}>
        <Card className={styles.dedupeCard}>
          <Alert
            type="error"
            showIcon
            message={stageProgress?.summary || '阶段被拒绝'}
          />
        </Card>
      </div>
    );
  }

  // done
  return (
    <div className={styles.dedupeContainer}>
      <Card className={styles.dedupeCard}>
        <div className={styles.done}>
          <div className={styles.doneHeader}>
            <h3 className={styles.doneTitle}>
              重复检测 <Tag color="success">✓ 已完成</Tag>
            </h3>
            {stageProgress?.finishedAt && (
              <div className={styles.doneTime}>
                完成时间 {stageProgress.finishedAt}
              </div>
            )}
          </div>

          <DedupeSummary
            total={questions.length}
            duplicateCount={duplicates.length}
          />

          {duplicates.length > 0 &&
            duplicates.map((q) => (
              <DuplicatePairCard
                key={q.id}
                question={q}
                onUnlink={handleUnlink}
                readOnly={readOnly}
              />
            ))}

          {nextStage && (
            <Button type="primary" onClick={handleNext} disabled={readOnly}>
              {nextButtonText}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Dedupe;
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/jinwenyuan/my-repo/jinwy_tiku/my-app && npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: No errors. If there are import path issues (this is a worktree, source lives in main repo), the paths above are relative to the main repo source tree — the implementing agent works in the main repo checkout.

- [ ] **Step 3: Commit**

```bash
git add src/pages/UploadTask/Stage/stages/Dedupe.tsx
git commit -m "feat(upload): rewrite Dedupe as standalone component with card-based duplicate display"
```

---

### Task 9: Update SystemStatus to remove dedupe-specific code

**Files:**
- Modify: `src/pages/UploadTask/Stage/workspaces/SystemStatus.tsx:80-102`
- Modify: `src/pages/UploadTask/Stage/workspaces/SystemStatus.tsx:11-12`
- Modify: `src/pages/UploadTask/Stage/workspaces/SystemStatus.tsx:34-37`

- [ ] **Step 1: Remove dedupe from SystemStatusProps stage type**

On line 12, change:

```typescript
  stage: 'dedupe' | 'parse' | 'tag' | 'publish';
```

to:

```typescript
  stage: 'parse' | 'tag' | 'publish';
```

- [ ] **Step 2: Remove dedupe-specific imports and state**

Remove `useState` from the import if it's only used for `previewQ`. Remove the `previewQ` state (line 29) and the `duplicates` useMemo (lines 34-37). Remove `Modal` from the antd import. Remove the `sanitizeHtml` import. Remove `useMemo` from the React import if it's only used for `duplicates`.

Specifically, on line 1, change:

```typescript
import { Alert, Button, Card, List, Modal, Space, Spin, Tag, message } from 'antd';
```

to:

```typescript
import { Alert, Button, Card, Spin, Tag, message } from 'antd';
```

On line 2, change:

```typescript
import React, { useMemo, useState } from 'react';
```

to:

```typescript
import React, { useState } from 'react';
```

Remove line 7 (`import { sanitizeHtml } from '@/utils/sanitize';`).

Remove line 8 type import of `TaskQuestion` if it's no longer used (check: `previewQ` was `TaskQuestion | null`, now removed — so yes, remove `TaskQuestion` from the import):

```typescript
import type { StageKey, StageProgress, TaskQuestion } from '../../types';
```

becomes:

```typescript
import type { StageKey, StageProgress } from '../../types';
```

Remove lines 29-30 (`const [previewQ, setPreviewQ] = useState<TaskQuestion | null>(null);`).

Remove lines 34-37 (the `duplicates` useMemo).

- [ ] **Step 3: Remove dedupe-specific render block**

Remove lines 80-102 (the entire `{stage === 'dedupe' && duplicates.length > 0 && (...)}` block including the Card with List and the Modal at the bottom).

Remove lines 134-148 (the Modal component).

- [ ] **Step 4: Verify compilation**

Run: `cd /Users/jinwenyuan/my-repo/jinwy_tiku/my-app && npx tsc --noEmit --pretty 2>&1 | head -20`

Expected: No errors. Dedupe.tsx no longer uses SystemStatus, and SystemStatus no longer has any dedupe code.

- [ ] **Step 5: Commit**

```bash
git add src/pages/UploadTask/Stage/workspaces/SystemStatus.tsx
git commit -m "refactor(upload): remove dedupe-specific code from SystemStatus"
```

---

### Task 10: Smoke test — run dev server and verify

**Files:** None (verification only)

- [ ] **Step 1: Start dev server**

Run: `cd /Users/jinwenyuan/my-repo/jinwy_tiku/my-app && npm run dev`

Wait for "Compiled successfully" or similar output.

- [ ] **Step 2: Verify dedupe stage displays correctly**

Open a browser to an upload task that has passed the dedupe stage (any task with `currentStage` beyond `dedupe`). The dedupe stage step should show:
- Stage header with steps
- "重复检测 ✓ 已完成" heading
- Summary: "共 8 题 · 6 道独立 · 2 道重复"
- Two DuplicatePairCards (Q3 and Q5), both collapsed
- Click to expand: side-by-side comparison with green/blue backgrounds
- "解除重复" button with popconfirm

- [ ] **Step 3: Verify unlink works**

Click "解除重复" on one card → confirm → card should disappear, summary updates to "7 道独立 · 1 道重复".

- [ ] **Step 4: Verify other stages still work**

Navigate to a task at `parse` or `tag` stage — SystemStatus should still render correctly without errors.

- [ ] **Step 5: Final commit with any fixes**

If any issues found during smoke test, fix and commit:

```bash
git add -A
git commit -m "fix(upload): fix smoke test issues in dedupe redesign"
```
