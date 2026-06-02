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
