import { getUploadTask } from '@/services/uploadTask';
import { useRequest } from '@umijs/max';
import { Button, Empty, Spin } from 'antd';
import React, { useMemo } from 'react';
import { history, useParams, useSearchParams } from 'umi';
import { STAGE_KEYS, isValidStage } from '../constants';
import type { StageKey, UploadTask } from '../types';
import StageHeader from './StageHeader';
import Dedupe from './stages/Dedupe';
import Distribute from './stages/Distribute';
import Parse from './stages/Parse';
import ParseReview from './stages/ParseReview';
import Publish from './stages/Publish';
import Quality from './stages/Quality';
import Tag from './stages/Tag';
import TagReview from './stages/TagReview';

const renderStage = (
  stage: StageKey,
  task: UploadTask,
  onRefresh: () => void,
  readOnly: boolean,
) => {
  switch (stage) {
    case 'quality':
      return <Quality task={task} onRefresh={onRefresh} readOnly={readOnly} />;
    case 'dedupe':
      return <Dedupe task={task} onRefresh={onRefresh} readOnly={readOnly} />;
    case 'parse':
      return <Parse task={task} onRefresh={onRefresh} readOnly={readOnly} />;
    case 'parse-review':
      return (
        <ParseReview task={task} onRefresh={onRefresh} readOnly={readOnly} />
      );
    case 'tag':
      return <Tag task={task} onRefresh={onRefresh} readOnly={readOnly} />;
    case 'tag-review':
      return (
        <TagReview task={task} onRefresh={onRefresh} readOnly={readOnly} />
      );
    case 'publish':
      return <Publish task={task} onRefresh={onRefresh} readOnly={readOnly} />;
    case 'distribute':
      return (
        <Distribute task={task} onRefresh={onRefresh} readOnly={readOnly} />
      );
  }
};

const StagePage: React.FC = () => {
  const { taskId, stage: rawStage } = useParams<{
    taskId: string;
    stage: string;
  }>();
  const [searchParams] = useSearchParams();

  const {
    data: task,
    loading,
    refresh,
  } = useRequest(() => getUploadTask(taskId!), {
    refreshDeps: [taskId],
    formatResult: (res: UploadTask) => res,
  });

  const readOnly = useMemo(() => {
    if (searchParams.get('readOnly') === '1') return true;
    if (!task || !rawStage || !isValidStage(rawStage)) return false;
    const stageIdx = STAGE_KEYS.indexOf(rawStage);
    const curIdx = STAGE_KEYS.indexOf(task.currentStage);
    return stageIdx !== curIdx;
  }, [searchParams, task, rawStage]);

  if (!rawStage || !isValidStage(rawStage)) {
    return <Empty description="无此阶段" style={{ marginTop: 80 }} />;
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: 120 }}>
        <Spin />
      </div>
    );
  }

  if (!task) {
    return (
      <Empty description="任务不存在" style={{ marginTop: 80 }}>
        <Button
          type="primary"
          onClick={() => history.push('/question-bank/upload')}
        >
          返回任务列表
        </Button>
      </Empty>
    );
  }

  return (
    <div
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}
    >
      <StageHeader task={task} currentStage={rawStage} onRefresh={refresh} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {renderStage(rawStage, task, refresh, readOnly)}
      </div>
    </div>
  );
};

export default StagePage;
