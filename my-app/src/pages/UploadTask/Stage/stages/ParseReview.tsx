import { getStageQuestions, updateParsedFields } from '@/services/uploadTask';
import { useRequest } from '@umijs/max';
import React from 'react';
import type { TaskQuestion, UploadTask } from '../../types';
import ParseReviewWorkspace from '../workspaces/ParseReviewWorkspace';

const ParseReview: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = ({ task, onRefresh, readOnly }) => {
  const { data: questions, refresh } = useRequest(
    () => getStageQuestions(task.id, 'parse-review'),
    { formatResult: (res: TaskQuestion[]) => res },
  );

  return (
    <ParseReviewWorkspace
      questions={questions ?? []}
      readOnly={readOnly}
      onSave={async (q, patch) => {
        await updateParsedFields(task.id, q.id, {
          answer: patch.answer,
          analysis: patch.analysis,
        });
        await refresh();
        onRefresh();
      }}
    />
  );
};

export default ParseReview;
