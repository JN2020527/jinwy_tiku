import { advanceSystemStage, getStageQuestions } from '@/services/uploadTask';
import { useRequest } from '@umijs/max';
import React from 'react';
import { history } from 'umi';
import { nextStageOf } from '../../constants';
import type { TaskQuestion, UploadTask } from '../../types';
import SystemStatus from '../workspaces/SystemStatus';

const Tag: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = ({ task, onRefresh, readOnly }) => {
  const { data: questions } = useRequest(
    () => getStageQuestions(task.id, 'tag'),
    { formatResult: (res: TaskQuestion[]) => res },
  );
  return (
    <SystemStatus
      stage="tag"
      stageProgress={task.stageProgress['tag']}
      questions={questions ?? []}
      onAdvance={async () => {
        await advanceSystemStage(task.id, 'tag');
        onRefresh();
      }}
      onNext={() => {
        const next = nextStageOf('tag');
        if (next) history.push(`/question-bank/upload/${task.id}/${next}`);
      }}
      readOnly={readOnly}
    />
  );
};

export default Tag;
