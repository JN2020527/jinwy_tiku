import { useRequest } from '@umijs/max';
import React from 'react';
import {
  getDistributeConfig,
  saveDistributeConfig,
} from '@/services/uploadTask';
import type { DistributeConfig } from '../../types';
import DistributeForm from '../workspaces/DistributeForm';
import type { UploadTask } from '../../types';

const Distribute: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = ({ task, onRefresh, readOnly }) => {
  const { data: config, refresh } = useRequest(
    () => getDistributeConfig(task.id),
    { formatResult: (res: DistributeConfig | null) => res },
  );
  return (
    <DistributeForm
      task={task}
      initial={config ?? null}
      onSave={async (cfg) => {
        await saveDistributeConfig(cfg);
        await refresh();
        onRefresh();
      }}
      readOnly={readOnly}
    />
  );
};

export default Distribute;
