import React from 'react';
import type { UploadTask } from '../../types';

const Tag: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = () => null;

export default Tag;
