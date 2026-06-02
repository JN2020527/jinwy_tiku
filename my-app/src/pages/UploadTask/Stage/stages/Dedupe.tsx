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
