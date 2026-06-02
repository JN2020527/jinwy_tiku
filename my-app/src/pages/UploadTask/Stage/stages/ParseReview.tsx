import { useRequest } from '@umijs/max';
import React from 'react';
import {
  confirmParseReview,
  getStageQuestions,
  regenerateParse,
  updateParsedFields,
} from '@/services/uploadTask';
import type { TaskQuestion } from '../../types';
import QuestionAudit from '../workspaces/QuestionAudit';
import type { UploadTask } from '../../types';

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
    <QuestionAudit
      questions={questions ?? []}
      mode="parse"
      onUpdate={async (q, patch) => {
        await updateParsedFields(task.id, q.id, patch);
        await refresh();
      }}
      onRegenerate={async (q) => {
        await regenerateParse(task.id, q.id);
        await refresh();
      }}
      onConfirm={async (ids) => {
        await confirmParseReview(task.id, ids);
        await refresh();
        onRefresh();
      }}
      readOnly={readOnly}
    />
  );
};

export default ParseReview;
