import { ArrowLeftOutlined } from '@ant-design/icons';
import { history } from 'umi';
import { Button, Steps, Typography } from 'antd';
import React from 'react';
import { STAGE_LABELS, STAGE_KEYS } from '../constants';
import type { StageKey, UploadTask } from '../types';

const { Text } = Typography;

export interface StageHeaderProps {
  task: UploadTask;
  currentStage: StageKey;
  onRefresh: () => void;
}

const statusOf = (
  task: UploadTask,
  stage: StageKey,
  currentStage: StageKey,
): 'finish' | 'process' | 'error' | 'wait' => {
  const state = task.stageProgress[stage]?.state;
  if (state === 'done') return 'finish';
  if (state === 'rejected') return 'error';
  if (stage === currentStage) return 'process';
  return 'wait';
};

const StageHeader: React.FC<StageHeaderProps> = ({ task, currentStage }) => {
  const currentIdx = STAGE_KEYS.indexOf(currentStage);

  const items = STAGE_KEYS.map((s) => {
    const state = task.stageProgress[s]?.state;
    const clickable = state !== 'pending';
    return {
      title: STAGE_LABELS[s],
      status: statusOf(task, s, currentStage),
      onClick: clickable
        ? () => history.push(`/question-bank/upload/${task.id}/${s}`)
        : undefined,
      style: clickable ? { cursor: 'pointer' } : { cursor: 'not-allowed' },
    };
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 24px',
        borderBottom: '1px solid #f0f0f0',
        background: '#fff',
      }}
    >
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => history.push('/question-bank/upload')}
      >
        返回
      </Button>
      <div style={{ minWidth: 240 }}>
        <strong>{task.name}</strong>{' '}
        <Text type="secondary">
          {task.subject} · {task.grade} · {task.totalQuestions}题
        </Text>
      </div>
      <div style={{ flex: 1 }}>
        <Steps
          current={currentIdx}
          size="small"
          labelPlacement="vertical"
          items={items}
        />
      </div>
    </div>
  );
};

export default StageHeader;
