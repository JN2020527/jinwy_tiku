import { Alert, Button, Card, List, Modal, Space, Spin, Tag, message } from 'antd';
import React, { useMemo, useState } from 'react';
import {
  STAGE_LABELS,
  nextStageOf,
} from '../../constants';
import { sanitizeHtml } from '@/utils/sanitize';
import type { StageKey, StageProgress, TaskQuestion } from '../../types';

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
    <Space direction="vertical" align="center" size={16} style={{ width: '100%' }}>
      <h3 style={{ margin: 0 }}>{stageLabel} · 系统处理中…</h3>
      <Spin size="large" />
      <div style={{ color: '#6b7280' }}>共 {questions.length} 题待处理</div>
      <Button onClick={handleAdvance} loading={advancing} disabled={readOnly}>
        ⏵ 模拟立即完成（演示）
      </Button>
    </Space>
  );

  const renderDone = () => {
    const nextLabel = nextStage ? STAGE_LABELS[nextStage] : null;
    const nextButtonText =
      nextStage === 'distribute' ? '→ 配置分发渠道' : `→ 进入下一阶段：${nextLabel ?? ''}`;
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <h3 style={{ margin: 0 }}>
          {stageLabel} · <Tag color="success">✓ 已完成</Tag>
        </h3>
        {stageProgress.summary && (
          <div style={{ color: '#374151' }}>{stageProgress.summary}</div>
        )}
        {stageProgress.finishedAt && (
          <div style={{ color: '#6b7280' }}>
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
      </Space>
    );
  };

  const renderPending = () => (
    <div style={{ color: '#6b7280' }}>等待上一阶段完成…</div>
  );

  const renderRejected = () => (
    <Alert
      type="error"
      showIcon
      message={stageProgress.summary || '阶段被拒绝'}
    />
  );

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 16 }}>
      <Card>
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
