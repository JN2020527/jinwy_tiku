import { useRequest } from '@umijs/max';
import React, { useMemo } from 'react';
import {
  confirmQualityKeep,
  confirmQualityReject,
  getStageQuestions,
} from '@/services/uploadTask';
import type { TaskQuestion } from '../../types';
import BatchReview from '../workspaces/BatchReview';
import type { UploadTask } from '../../types';

const Quality: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = ({ task, onRefresh, readOnly }) => {
  const { data: questions, refresh } = useRequest(
    () => getStageQuestions(task.id, 'quality'),
    { formatResult: (res: TaskQuestion[]) => res },
  );
  const summary = useMemo(() => {
    const qs = questions ?? [];
    return {
      autoPass: qs.filter((q) => q.qualityVerdict === 'auto-pass').length,
      needReview: qs.filter((q) => q.qualityVerdict === 'mid-need-review')
        .length,
      autoReject: qs.filter((q) => q.qualityVerdict === 'auto-reject').length,
    };
  }, [questions]);

  return (
    <BatchReview
      questions={questions ?? []}
      summary={summary}
      onKeep={async (ids) => {
        await confirmQualityKeep(task.id, ids);
        await refresh();
        onRefresh();
      }}
      onReject={async (ids, reason) => {
        await confirmQualityReject(task.id, ids, reason);
        await refresh();
        onRefresh();
      }}
      readOnly={readOnly}
    />
  );
};

export default Quality;
