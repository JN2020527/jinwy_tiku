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

const Parse: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = ({ task, onRefresh, readOnly }) => {
  const { data: questions } = useRequest(
    () => getStageQuestions(task.id, 'parse'),
    { formatResult: (res: TaskQuestion[]) => res },
  );
  return (
    <SystemStatus
      stage="parse"
      stageProgress={task.stageProgress['parse']}
      questions={questions ?? []}
      onAdvance={async () => {
        await advanceSystemStage(task.id, 'parse');
        onRefresh();
      }}
      onNext={() => {
        const next = nextStageOf('parse');
        if (next) history.push(`/question-bank/upload/${task.id}/${next}`);
      }}
      readOnly={readOnly}
    />
  );
};

export default Parse;
