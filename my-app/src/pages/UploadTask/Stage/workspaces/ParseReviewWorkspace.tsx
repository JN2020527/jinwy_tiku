import { useQuestionNavKeyboard } from '@/hooks/useQuestionNavKeyboard';
import { Modal, message } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

  const navTo = useCallback(
    (offset: number) => {
      if (questions.length === 0) return;
      const idx = questions.findIndex((q) => q.id === currentId);
      if (idx < 0) return;
      const next = idx + offset;
      if (next < 0 || next >= questions.length) return;
      switchToQuestion(questions[next].id);
    },
    [questions, currentId, switchToQuestion],
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
