import { ArrowLeftOutlined } from '@ant-design/icons';
import { history } from 'umi';
import { Button, Steps } from 'antd';
import React from 'react';
import { STAGE_LABELS, STAGE_KEYS } from '../constants';
import type { StageKey, UploadTask } from '../types';
import styles from './StageHeader.less';

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
    <div className={styles.stageHeader}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => history.push('/question-bank/upload')}
      >
        返回
      </Button>
      <div className={styles.taskInfo}>
        <span className={styles.taskName}>{task.name}</span>{' '}
        <span className={styles.taskMeta}>
          {task.subject} · {task.grade} · {task.totalQuestions}题
        </span>
      </div>
      <div className={styles.stepsWrap}>
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
