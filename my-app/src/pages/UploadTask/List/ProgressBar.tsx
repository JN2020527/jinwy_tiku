import { Tooltip } from 'antd';
import React from 'react';
import { STAGE_KEYS, STAGE_LABELS, STAGE_STATE_COLORS } from '../constants';
import type { StageState, UploadTask } from '../types';
import styles from './ProgressBar.less';

interface ProgressBarProps {
  task: UploadTask;
}

const STATE_LABELS: Record<StageState, string> = {
  pending: '未开始',
  processing: '进行中',
  done: '已完成',
  rejected: '已拒绝',
};

const ProgressBar: React.FC<ProgressBarProps> = ({ task }) => {
  const currentProgress = task.stageProgress[task.currentStage];
  const currentSummary =
    currentProgress?.summary ??
    (currentProgress?.state === 'rejected' ? '已拒绝' : '进行中');

  return (
    <div className={styles.progressBar}>
      <div className={styles.segments}>
        {STAGE_KEYS.map((stage) => {
          const sp = task.stageProgress[stage];
          const state: StageState = sp?.state ?? 'pending';
          return (
            <Tooltip
              key={stage}
              title={`${STAGE_LABELS[stage]} · ${STATE_LABELS[state]}`}
            >
              <div
                className={styles.segment}
                style={{ background: STAGE_STATE_COLORS[state] }}
              />
            </Tooltip>
          );
        })}
      </div>
      <span className={styles.summary}>
        {STAGE_LABELS[task.currentStage]} · {currentSummary}
      </span>
    </div>
  );
};

export default ProgressBar;
