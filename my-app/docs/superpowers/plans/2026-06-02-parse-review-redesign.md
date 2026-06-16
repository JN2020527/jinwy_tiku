# Parse Review Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic QuestionAudit-based parse-review page with a focused left-right layout where editors review AI-generated answers and analysis using rich text editors.

**Architecture:** ParseReview becomes a thin data shell. New ParseReviewWorkspace owns navigation state AND draft editing state (answer/analysis), delegating rendering to three leaf components: QuestionRibbon (pills), QuestionContext (read-only stem+options), AnswerEditor (wangEditor display). Draft state is lifted to the workspace so both the save button and Ctrl+Enter keyboard shortcut can access edited values, and unsaved-changes detection works across question switches.

**Tech Stack:** React 18, Ant Design 5, wangEditor 5 (existing `RichTextEditor` component), LESS modules, Umi Max 4 useRequest.

---

## File Structure

```
src/pages/UploadTask/Stage/
  stages/
    ParseReview.tsx                    ← REWRITE (data layer only)
  workspaces/
    ParseReviewWorkspace.tsx           ← NEW (interaction + draft state layer)
    ParseReviewWorkspace.less          ← NEW (layout styles)
    components/
      QuestionRibbon.tsx               ← NEW (pill navigation)
      QuestionContext.tsx              ← NEW (read-only stem+options)
      AnswerEditor.tsx                 ← NEW (answer+analysis editors, stateless display)
    QuestionAudit.tsx                  ← REVERT variant prop (remove it)
mock/
  uploadTask.ts                        ← MODIFY (update sets parseReviewed)
```

---

## Task 1: Update mock to set parseReviewed on save

**Files:**

- Modify: `mock/uploadTask.ts:898-924`

The current `POST /api/upload-task/parse-review/update` merges the patch but does NOT set `parseReviewed`. We need it to also set `parseReviewed: true` so that saving = reviewed, and `maybeAdvance` kicks in when all questions are saved.

- [ ] **Step 1: Modify the update handler to also set parseReviewed**

In `mock/uploadTask.ts`, find the `'POST /api/upload-task/parse-review/update'` handler (around line 898). Change the merge line from:

```typescript
const merged = { ...q, ...patch };
```

to:

```typescript
const merged = { ...q, ...patch, parseReviewed: true };
```

Also add a `maybeAdvance(taskId, 'parse-review');` call after the success response, right before the existing `ok(res, updated);`:

```typescript
maybeAdvance(taskId, 'parse-review');
ok(res, updated);
```

This makes `maybeAdvance` check if all questions are reviewed after each save, and auto-advance the stage when done.

- [ ] **Step 2: Commit**

```bash
git add mock/uploadTask.ts
git commit -m "feat(mock): set parseReviewed=true on update, auto-advance when all reviewed"
```

---

## Task 2: Create QuestionContext component (read-only stem+options)

**Files:**

- Create: `src/pages/UploadTask/Stage/workspaces/components/QuestionContext.tsx`

This component renders the stem and options as read-only HTML (sanitized). It's the left panel of the workspace.

- [ ] **Step 1: Create the component file**

```tsx
// src/pages/UploadTask/Stage/workspaces/components/QuestionContext.tsx
import React from 'react';
import { sanitizeHtml } from '@/utils/sanitize';
import styles from '../ParseReviewWorkspace.less';

interface QuestionContextProps {
  stem: string;
  options?: string[];
}

const QuestionContext: React.FC<QuestionContextProps> = ({ stem, options }) => (
  <div className={styles.contextPanel}>
    <div className={styles.sectionLabel}>题目</div>
    <div
      className={styles.stemBody}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(stem) }}
    />
    {options && options.length > 0 && (
      <>
        <div className={styles.sectionLabel}>选项</div>
        <div className={styles.optionsList}>
          {options.map((opt, i) => (
            <div key={i} className={styles.optionRow}>
              <span className={styles.optionLetter}>
                {String.fromCharCode(65 + i)}.
              </span>
              <span
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(opt) }}
              />
            </div>
          ))}
        </div>
      </>
    )}
  </div>
);

export default QuestionContext;
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/UploadTask/Stage/workspaces/components/QuestionContext.tsx
git commit -m "feat(upload): add QuestionContext component for read-only stem+options display"
```

---

## Task 3: Create QuestionRibbon component (pill navigation)

**Files:**

- Create: `src/pages/UploadTask/Stage/workspaces/components/QuestionRibbon.tsx`

Horizontal pill navigation showing all questions with reviewed/pending state.

- [ ] **Step 1: Create the component file**

```tsx
// src/pages/UploadTask/Stage/workspaces/components/QuestionRibbon.tsx
import React from 'react';
import type { TaskQuestion } from '../../../types';
import styles from '../ParseReviewWorkspace.less';

interface QuestionRibbonProps {
  questions: TaskQuestion[];
  currentId: string;
  reviewedCount: number;
  onNavigate: (questionId: string) => void;
}

const QuestionRibbon: React.FC<QuestionRibbonProps> = ({
  questions,
  currentId,
  reviewedCount,
  onNavigate,
}) => (
  <div className={styles.ribbon}>
    <div className={styles.ribbonPills}>
      {questions.map((q) => {
        const active = q.id === currentId;
        const reviewed = q.parseReviewed === true;
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onNavigate(q.id)}
            className={`${styles.pill} ${active ? styles.pillActive : ''} ${
              reviewed ? styles.pillReviewed : ''
            }`}
          >
            <span className={styles.pillLabel}>Q{q.index + 1}</span>
            {reviewed && <span className={styles.pillCheck}>✓</span>}
          </button>
        );
      })}
    </div>
    <div className={styles.ribbonMeta}>
      <span className={styles.ribbonStats}>
        已审 {reviewedCount} / {questions.length}
      </span>
    </div>
  </div>
);

export default QuestionRibbon;
```

Note: `q.index + 1` for 1-based display (Q1, Q2, ...).

- [ ] **Step 2: Commit**

```bash
git add src/pages/UploadTask/Stage/workspaces/components/QuestionRibbon.tsx
git commit -m "feat(upload): add QuestionRibbon horizontal pill navigation"
```

---

## Task 4: Create AnswerEditor component (stateless wangEditor display)

**Files:**

- Create: `src/pages/UploadTask/Stage/workspaces/components/AnswerEditor.tsx`

Right panel with two wangEditor instances (answer + analysis) and a save button. This component is **stateless** — draft values and onChange callbacks are passed from the parent (ParseReviewWorkspace), which owns the state. This lets both the button and Ctrl+Enter access the same edited values.

- [ ] **Step 1: Create the component file**

```tsx
// src/pages/UploadTask/Stage/workspaces/components/AnswerEditor.tsx
import { Button } from 'antd';
import React from 'react';
import RichTextEditor from '@/components/RichTextEditor';
import styles from '../ParseReviewWorkspace.less';

interface AnswerEditorProps {
  answer: string;
  analysis: string;
  hasChanges: boolean;
  saving: boolean;
  readOnly: boolean;
  onAnswerChange: (value: string) => void;
  onAnalysisChange: (value: string) => void;
  onSave: () => void;
}

const AnswerEditor: React.FC<AnswerEditorProps> = ({
  answer,
  analysis,
  hasChanges,
  saving,
  readOnly,
  onAnswerChange,
  onAnalysisChange,
  onSave,
}) => (
  <div className={styles.editorPanel}>
    <div className={styles.editorContent}>
      <div className={styles.editorField}>
        <div className={styles.sectionLabel}>
          答案
          <span className={styles.aiTag}>AI 生成</span>
        </div>
        <div className={styles.editorWrap} style={{ minHeight: 60 }}>
          {readOnly ? (
            <div
              className={styles.readonlyContent}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: answer }}
            />
          ) : (
            <RichTextEditor
              value={answer}
              onChange={onAnswerChange}
              placeholder="输入答案..."
            />
          )}
        </div>
      </div>

      <div className={styles.editorField}>
        <div className={styles.sectionLabel}>
          解析
          <span className={styles.aiTag}>AI 生成</span>
        </div>
        <div className={styles.editorWrap} style={{ minHeight: 200 }}>
          {readOnly ? (
            <div
              className={styles.readonlyContent}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: analysis }}
            />
          ) : (
            <RichTextEditor
              value={analysis}
              onChange={onAnalysisChange}
              placeholder="输入解析..."
            />
          )}
        </div>
      </div>
    </div>

    {!readOnly && (
      <div className={styles.editorToolbar}>
        <span className={styles.toolbarHint}>Ctrl+Enter 保存下一题</span>
        <Button
          type="primary"
          loading={saving}
          disabled={!hasChanges}
          onClick={onSave}
        >
          保存并下一题 →
        </Button>
      </div>
    )}
  </div>
);

export default AnswerEditor;
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/UploadTask/Stage/workspaces/components/AnswerEditor.tsx
git commit -m "feat(upload): add stateless AnswerEditor with wangEditor for answer and analysis"
```

---

## Task 5: Create ParseReviewWorkspace (interaction + draft state) + styles

**Files:**

- Create: `src/pages/UploadTask/Stage/workspaces/ParseReviewWorkspace.tsx`
- Create: `src/pages/UploadTask/Stage/workspaces/ParseReviewWorkspace.less`

This is the main workspace that owns the draft state (answer/analysis), current question, keyboard navigation, unsaved-changes protection, and post-save navigation logic. It wires together QuestionRibbon, QuestionContext, and AnswerEditor.

- [ ] **Step 1: Create the workspace component**

```tsx
// src/pages/UploadTask/Stage/workspaces/ParseReviewWorkspace.tsx
import { Modal, message } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuestionNavKeyboard } from '@/hooks/useQuestionNavKeyboard';
import type { TaskQuestion } from '../../types';
import AnswerEditor from './components/AnswerEditor';
import QuestionContext from './components/QuestionContext';
import QuestionRibbon from './components/QuestionRibbon';
import styles from './ParseReviewWorkspace.less';

interface ParseReviewWorkspaceProps {
  questions: TaskQuestion[];
  onSave: (
    q: TaskQuestion,
    patch: { answer: string; analysis: string },
  ) => Promise<void>;
  readOnly: boolean;
}

const ParseReviewWorkspace: React.FC<ParseReviewWorkspaceProps> = ({
  questions,
  onSave,
  readOnly,
}) => {
  const [currentId, setCurrentId] = useState<string>(questions[0]?.id ?? '');
  const [draftAnswer, setDraftAnswer] = useState('');
  const [draftAnalysis, setDraftAnalysis] = useState('');
  const [saving, setSaving] = useState(false);

  const current = useMemo(
    () => questions.find((q) => q.id === currentId) ?? null,
    [questions, currentId],
  );

  const reviewedCount = useMemo(
    () => questions.filter((q) => q.parseReviewed).length,
    [questions],
  );

  // Sync draft when current question changes
  useEffect(() => {
    if (current) {
      setDraftAnswer(current.answer ?? '');
      setDraftAnalysis(current.analysis ?? '');
    }
  }, [current]);

  const hasChanges = useMemo(() => {
    if (!current) return false;
    return (
      draftAnswer !== (current.answer ?? '') ||
      draftAnalysis !== (current.analysis ?? '')
    );
  }, [current, draftAnswer, draftAnalysis]);

  const allReviewed = useMemo(
    () =>
      questions.length > 0 && questions.every((q) => q.parseReviewed === true),
    [questions],
  );

  // Navigate to next unreviewed question, wrapping around
  const jumpToNextUnreviewed = useCallback(() => {
    const idx = questions.findIndex((q) => q.id === currentId);
    // Search from current+1 to end, then from 0 to current
    for (let offset = 1; offset < questions.length; offset++) {
      const candidate = questions[(idx + offset) % questions.length];
      if (!candidate.parseReviewed) {
        setCurrentId(candidate.id);
        return;
      }
    }
    // All reviewed — stay on current
  }, [questions, currentId]);

  const doSave = useCallback(async () => {
    if (!current || saving) return;
    setSaving(true);
    try {
      await onSave(current, {
        answer: draftAnswer,
        analysis: draftAnalysis,
      });
      message.success('已保存');
      // After save, jump to next unreviewed
      jumpToNextUnreviewed();
    } catch (e) {
      message.error((e as Error).message || '保存失败');
    } finally {
      setSaving(false);
    }
  }, [
    current,
    saving,
    draftAnswer,
    draftAnalysis,
    onSave,
    jumpToNextUnreviewed,
  ]);

  const navTo = useCallback(
    (offset: number) => {
      if (questions.length === 0) return;
      const idx = questions.findIndex((q) => q.id === currentId);
      if (idx < 0) return;
      const next = idx + offset;
      if (next < 0 || next >= questions.length) return;
      switchToQuestion(questions[next].id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions, currentId, hasChanges, draftAnswer, draftAnalysis, current],
  );

  // Unsaved changes protection before switching
  const switchToQuestion = useCallback(
    (targetId: string) => {
      if (!hasChanges) {
        setCurrentId(targetId);
        return;
      }
      Modal.confirm({
        title: '当前题目有未保存的修改',
        content: '是否保存后再切换？',
        okText: '保存',
        cancelText: '不保存',
        onOk: async () => {
          await doSave();
          setCurrentId(targetId);
        },
        onCancel: () => {
          setCurrentId(targetId);
        },
      });
    },
    [hasChanges, doSave],
  );

  const handleRibbonNavigate = useCallback(
    (questionId: string) => {
      switchToQuestion(questionId);
    },
    [switchToQuestion],
  );

  useQuestionNavKeyboard({
    enabled: !readOnly,
    onPrev: () => navTo(-1),
    onNext: () => navTo(+1),
    onSaveNext: async () => {
      await doSave();
    },
  });

  if (questions.length === 0) {
    return <div className={styles.emptyState}>暂无题目数据</div>;
  }

  // Already-reviewed questions show read-only editors
  const isCurrentReviewed = current?.parseReviewed === true;
  const editorReadOnly = readOnly || isCurrentReviewed;

  return (
    <div className={styles.workspace}>
      <QuestionRibbon
        questions={questions}
        currentId={currentId}
        reviewedCount={reviewedCount}
        onNavigate={handleRibbonNavigate}
      />
      <div className={styles.mainBody}>
        {current ? (
          <>
            <QuestionContext stem={current.stem} options={current.options} />
            <AnswerEditor
              key={currentId}
              answer={draftAnswer}
              analysis={draftAnalysis}
              hasChanges={hasChanges}
              saving={saving}
              readOnly={editorReadOnly}
              onAnswerChange={setDraftAnswer}
              onAnalysisChange={setDraftAnalysis}
              onSave={doSave}
            />
          </>
        ) : (
          <div className={styles.emptyState}>请选择题目</div>
        )}
      </div>
      <div className={styles.bottomBar}>
        {allReviewed
          ? '✓ 全部审核完成，即将进入下一阶段'
          : '↑↓ 切题 · Ctrl+Enter 保存下一题'}
      </div>
    </div>
  );
};

export default ParseReviewWorkspace;
```

Key design decisions:

- **Draft state is in workspace**, not in AnswerEditor — both button and Ctrl+Enter access `draftAnswer`/`draftAnalysis`
- **`switchToQuestion`** implements unsaved-changes protection via `Modal.confirm`
- **`jumpToNextUnreviewed`** navigates to the next question where `parseReviewed !== true`, wrapping around
- **`key={currentId}`** on AnswerEditor ensures a clean mount when switching questions (draft is already synced via the effect)
- **Already-reviewed questions** get `editorReadOnly=true` so editors can see but not re-edit

- [ ] **Step 2: Create the LESS styles**

```less
// src/pages/UploadTask/Stage/workspaces/ParseReviewWorkspace.less
@import '../../styles/variables.less';

.workspace {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: @color-bg;
}

/* ── Ribbon navigation ── */

.ribbon {
  background: @color-bg-container;
  border-bottom: 1px solid @color-border;
  padding: @space-md @space-lg;
  flex-shrink: 0;
}

.ribbonPills {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid @color-border;
  border-radius: @radius-lg;
  background: @color-bg-container;
  cursor: pointer;
  font-size: @font-size-sm;
  font-weight: @font-weight-medium;
  color: @color-text;
  white-space: nowrap;
  transition: background @transition-fast, border-color @transition-fast;
  flex-shrink: 0;

  &:hover {
    border-color: @color-primary-border;
    background: @color-primary-light;
  }
}

.pillActive {
  border-color: @color-primary;
  background: @color-primary-light;
  color: @color-primary;
  font-weight: @font-weight-semibold;
}

.pillReviewed {
  border-color: @color-success-border;

  &.pillActive {
    border-color: @color-success;
  }
}

.pillLabel {
  line-height: 1;
}

.pillCheck {
  color: @color-success;
  font-size: 11px;
  font-weight: @font-weight-semibold;
}

.ribbonMeta {
  margin-top: @space-sm;
  font-size: @font-size-xs;
  color: @color-text-secondary;
}

.ribbonStats {
  color: @color-text-secondary;
}

/* ── Main body (left-right split) ── */

.mainBody {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

/* ── Left: context (read-only stem+options) ── */

.contextPanel {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: @space-lg @space-xl;
  background: @color-bg-container;
  border-right: 1px solid @color-border;
}

.sectionLabel {
  font-size: @font-size-xs;
  font-weight: @font-weight-semibold;
  color: @color-text-secondary;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: @space-sm;
  display: flex;
  align-items: center;
  gap: @space-sm;
}

.stemBody {
  font-size: @font-size-base;
  line-height: 1.8;
  color: @color-text;
  margin-bottom: @space-lg;
}

.optionsList {
  display: flex;
  flex-direction: column;
  gap: @space-xs;
}

.optionRow {
  display: flex;
  align-items: flex-start;
  gap: @space-sm;
  line-height: 1.8;
  font-size: @font-size-base;
}

.optionLetter {
  font-weight: @font-weight-semibold;
  color: @color-text-secondary;
  flex-shrink: 0;
  min-width: 20px;
}

/* ── Right: editor panel ── */

.editorPanel {
  width: 440px;
  background: @color-bg-container;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.editorContent {
  flex: 1;
  overflow-y: auto;
  padding: @space-lg;
}

.editorField {
  margin-bottom: @space-lg;
}

.editorWrap {
  border: 1px solid @color-border;
  border-radius: @radius-md;
  overflow: hidden;
}

.readonlyContent {
  padding: @space-sm @space-md;
  font-size: @font-size-base;
  line-height: 1.7;
  color: @color-text;
}

.aiTag {
  font-size: 10px;
  font-weight: @font-weight-medium;
  color: @color-success;
  background: @color-success-light;
  padding: 1px 6px;
  border-radius: @radius-sm;
  text-transform: none;
  letter-spacing: 0;
}

.editorToolbar {
  padding: @space-md @space-lg;
  border-top: 1px solid @color-border-light;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbarHint {
  font-size: @font-size-xs;
  color: @color-text-tertiary;
}

/* ── Bottom bar ── */

.bottomBar {
  flex-shrink: 0;
  background: @color-bg-container;
  border-top: 1px solid @color-border;
  padding: @space-sm @space-lg;
  text-align: center;
  font-size: @font-size-xs;
  color: @color-text-tertiary;
}

/* ── Empty state ── */

.emptyState {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: @color-text-tertiary;
  font-size: @font-size-base;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/UploadTask/Stage/workspaces/ParseReviewWorkspace.tsx src/pages/UploadTask/Stage/workspaces/ParseReviewWorkspace.less
git commit -m "feat(upload): add ParseReviewWorkspace with draft state, unsaved protection, and auto-nav"
```

---

## Task 6: Rewrite ParseReview.tsx (data layer)

**Files:**

- Rewrite: `src/pages/UploadTask/Stage/stages/ParseReview.tsx`

Replace QuestionAudit usage with ParseReviewWorkspace. Only call `getStageQuestions` and `updateParsedFields`. No regenerate, no confirm.

- [ ] **Step 1: Rewrite the component**

```tsx
// src/pages/UploadTask/Stage/stages/ParseReview.tsx
import { useRequest } from '@umijs/max';
import React from 'react';
import { getStageQuestions, updateParsedFields } from '@/services/uploadTask';
import type { TaskQuestion } from '../../types';
import type { UploadTask } from '../../types';
import ParseReviewWorkspace from '../workspaces/ParseReviewWorkspace';

const ParseReview: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = ({ task, onRefresh, readOnly }) => {
  const { data: questions, refresh } = useRequest(
    () => getStageQuestions(task.id, 'parse-review'),
    { formatResult: (res: TaskQuestion[]) => res },
  );

  return (
    <ParseReviewWorkspace
      questions={questions ?? []}
      readOnly={readOnly}
      onSave={async (q, patch) => {
        await updateParsedFields(task.id, q.id, {
          answer: patch.answer,
          analysis: patch.analysis,
        });
        await refresh();
        onRefresh();
      }}
    />
  );
};

export default ParseReview;
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/UploadTask/Stage/stages/ParseReview.tsx
git commit -m "feat(upload): rewrite ParseReview to use ParseReviewWorkspace"
```

---

## Task 7: Revert variant prop from QuestionAudit

**Files:**

- Modify: `src/pages/UploadTask/Stage/workspaces/QuestionAudit.tsx`
- Modify: `src/pages/UploadTask/Stage/workspaces/QuestionAudit.less`

Remove the `variant` prop and all compact-mode code from QuestionAudit, since it was only used by ParseReview which no longer uses QuestionAudit. Revert to the original three-column layout only.

- [ ] **Step 1: Revert to pre-variant state**

Find the commit before the compact variant was added:

```bash
git log --oneline -10 -- src/pages/UploadTask/Stage/workspaces/QuestionAudit.tsx
```

Look for the commit with message starting with "style(upload): redesign UploadTask pages" — the commit right BEFORE that is the target. Then restore:

```bash
# Replace <pre-variant-hash> with the commit hash found above
git checkout <pre-variant-hash> -- src/pages/UploadTask/Stage/workspaces/QuestionAudit.tsx src/pages/UploadTask/Stage/workspaces/QuestionAudit.less
```

- [ ] **Step 2: Verify TagReview still works**

Quick check that `TagReview.tsx` still passes `mode="tag"` without the `variant` prop (it never passed variant, so no change needed there).

- [ ] **Step 3: Commit**

```bash
git add src/pages/UploadTask/Stage/workspaces/QuestionAudit.tsx src/pages/UploadTask/Stage/workspaces/QuestionAudit.less
git commit -m "revert(upload): remove variant prop from QuestionAudit, restore original layout"
```

---

## Task 8: Verify and clean up

**Files:**

- All files touched in this plan

- [ ] **Step 1: Run format**

```bash
npm run format
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds with no new errors.

- [ ] **Step 3: Start dev server and manually verify**

```bash
npm run dev
```

Open http://localhost:8000/question-bank/upload/task-3/parse-review and verify:

1. Left panel shows stem + options (read-only HTML, sanitized)
2. Right panel shows answer + analysis in wangEditor rich text editors
3. Question ribbon at top with pill navigation
4. "保存并下一题" button saves and navigates to next unreviewed question
5. Saving marks question as reviewed (✓ appears on pill)
6. After all questions saved, stage auto-advances to next stage
7. Ctrl+Enter saves draft edits (not stale values) and navigates
8. ↑↓ arrows navigate between questions with unsaved-changes prompt
9. Clicking a different pill triggers unsaved-changes confirmation
10. Read-only mode (completed stage) shows editors as non-editable, no save button
11. Already-reviewed questions are also read-only within an active stage

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(upload): final cleanup for parse-review redesign"
```
