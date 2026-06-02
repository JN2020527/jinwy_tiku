import { useRequest } from '@umijs/max';
import React from 'react';
import { history } from 'umi';
import {
  advanceSystemStage,
  getStageQuestions,
} from '@/services/uploadTask';
import type { TaskQuestion } from '../../types';
import { nextStageOf } from '../../constants';
import SystemStatus from '../workspaces/SystemStatus';
import type { UploadTask } from '../../types';

const Dedupe: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = ({ task, onRefresh, readOnly }) => {
  const { data: questions } = useRequest(
    () => getStageQuestions(task.id, 'dedupe'),
    { formatResult: (res: TaskQuestion[]) => res },
  );
  return (
    <SystemStatus
      stage="dedupe"
      stageProgress={task.stageProgress['dedupe']}
      questions={questions ?? []}
      onAdvance={async () => {
        await advanceSystemStage(task.id, 'dedupe');
        onRefresh();
      }}
      onNext={() => {
        const next = nextStageOf('dedupe');
        if (next) history.push(`/question-bank/upload/${task.id}/${next}`);
      }}
      readOnly={readOnly}
    />
  );
};

export default Dedupe;
