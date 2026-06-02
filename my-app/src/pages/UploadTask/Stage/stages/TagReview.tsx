import { useRequest } from '@umijs/max';
import React from 'react';
import {
  confirmTagReview,
  getStageQuestions,
  regenerateTags,
  updateTags,
} from '@/services/uploadTask';
import type { TaskQuestion } from '../../types';
import QuestionAudit from '../workspaces/QuestionAudit';
import type { UploadTask } from '../../types';

const TagReview: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = ({ task, onRefresh, readOnly }) => {
  const { data: questions, refresh } = useRequest(
    () => getStageQuestions(task.id, 'tag-review'),
    { formatResult: (res: TaskQuestion[]) => res },
  );
  return (
    <QuestionAudit
      questions={questions ?? []}
      mode="tag"
      onUpdate={async (q, patch) => {
        if (patch.tags) await updateTags(task.id, q.id, patch.tags);
        await refresh();
      }}
      onRegenerate={async (q) => {
        await regenerateTags(task.id, q.id);
        await refresh();
      }}
      onConfirm={async (ids) => {
        await confirmTagReview(task.id, ids);
        await refresh();
        onRefresh();
      }}
      readOnly={readOnly}
    />
  );
};

export default TagReview;
