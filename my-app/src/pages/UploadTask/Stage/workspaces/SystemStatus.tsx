import { Alert, Button, Card, List, Modal, Space, Spin, Tag, message } from 'antd';
import React, { useMemo, useState } from 'react';
import {
  STAGE_LABELS,
  nextStageOf,
} from '../../constants';
import { sanitizeHtml } from '@/utils/sanitize';
import type { StageKey, StageProgress, TaskQuestion } from '../../types';
import styles from './SystemStatus.less';

export interface SystemStatusProps {
  stage: 'dedupe' | 'parse' | 'tag' | 'publish';
  stageProgress: StageProgress;
  questions: TaskQuestion[];
  onAdvance: () => Promise<void>;
  onNext: () => void;
  readOnly?: boolean;
}

const SystemStatus: React.FC<SystemStatusProps> = ({
  stage,
  stageProgress,
  questions,
  onAdvance,
  onNext,
  readOnly = false,
}) => {
  const [advancing, setAdvancing] = useState(false);
  const [previewQ, setPreviewQ] = useState<TaskQuestion | null>(null);

  const stageLabel = STAGE_LABELS[stage];
  const nextStage: StageKey | null = nextStageOf(stage);

  const duplicates = useMemo(
    () => questions.filter((q) => !!q.duplicateOf),
    [questions],
  );

  const handleAdvance = async () => {
    setAdvancing(true);
    try {
      await onAdvance();
      message.success('已推进');
    } catch (e) {
      message.error((e as Error).message || '推进失败');
    } finally {
      setAdvancing(false);
    }
  };

  const renderProcessing = () => (
    <div className={styles.processing}>
      <h3 className={styles.processingTitle}>{stageLabel} · 系统处理中…</h3>
      <Spin size="large" />
      <div className={styles.processingCount}>共 {questions.length} 题待处理</div>
      <Button onClick={handleAdvance} loading={advancing} disabled={readOnly}>
        ⏵ 模拟立即完成（演示）
      </Button>
    </div>
  );

  const renderDone = () => {
    const nextLabel = nextStage ? STAGE_LABELS[nextStage] : null;
    const nextButtonText =
      nextStage === 'distribute' ? '→ 配置分发渠道' : `→ 进入下一阶段：${nextLabel ?? ''}`;
    return (
      <div className={styles.done}>
        <h3 className={styles.doneTitle}>
          {stageLabel} <Tag color="success">✓ 已完成</Tag>
        </h3>
        {stageProgress.summary && (
          <div className={styles.doneSummary}>{stageProgress.summary}</div>
        )}
        {stageProgress.finishedAt && (
          <div className={styles.doneTime}>
            完成时间 {stageProgress.finishedAt}
          </div>
        )}

        {stage === 'dedupe' && duplicates.length > 0 && (
          <Card size="small" title={`发现 ${duplicates.length} 道重复题`}>
            <List
              dataSource={duplicates}
              renderItem={(q) => (
                <List.Item
                  actions={[
                    <Button
                      key="view"
                      type="link"
                      size="small"
                      onClick={() => setPreviewQ(q)}
                    >
                      查看原题
                    </Button>,
                  ]}
                >
                  Q{q.index} → 已关联到 {q.duplicateOf}
                </List.Item>
              )}
            />
          </Card>
        )}

        {nextStage && (
          <Button type="primary" onClick={onNext} disabled={readOnly}>
            {nextButtonText}
          </Button>
        )}
      </div>
    );
  };

  const renderPending = () => (
    <div className={styles.pending}>等待上一阶段完成…</div>
  );

  const renderRejected = () => (
    <Alert
      type="error"
      showIcon
      message={stageProgress.summary || '阶段被拒绝'}
    />
  );

  return (
    <div className={styles.systemStatus}>
      <Card className={styles.statusCard}>
        {stageProgress.state === 'processing' && renderProcessing()}
        {stageProgress.state === 'done' && renderDone()}
        {stageProgress.state === 'pending' && renderPending()}
        {stageProgress.state === 'rejected' && renderRejected()}
      </Card>

      <Modal
        title={previewQ ? `Q${previewQ.index} 原题` : ''}
        open={!!previewQ}
        onCancel={() => setPreviewQ(null)}
        footer={null}
        width={720}
      >
        {previewQ && (
          <div
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewQ.stem) }}
          />
        )}
      </Modal>
    </div>
  );
};

export default SystemStatus;
