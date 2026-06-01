import { Tooltip, Typography } from 'antd';
import React from 'react';
import {
  STAGE_KEYS,
  STAGE_LABELS,
  STAGE_STATE_COLORS,
} from '../constants';
import type { StageState, UploadTask } from '../types';

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
    <div style={{ minWidth: 220 }}>
      <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
        {STAGE_KEYS.map((stage) => {
          const sp = task.stageProgress[stage];
          const state: StageState = sp?.state ?? 'pending';
          return (
            <Tooltip
              key={stage}
              title={`${STAGE_LABELS[stage]} · ${STATE_LABELS[state]}`}
            >
              <div
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: STAGE_STATE_COLORS[state],
                }}
              />
            </Tooltip>
          );
        })}
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {STAGE_LABELS[task.currentStage]} · {currentSummary}
      </Typography.Text>
    </div>
  );
};

export default ProgressBar;
