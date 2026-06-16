import { history } from '@umijs/max';
import React, { useEffect } from 'react';

const TagManage: React.FC = () => {
  useEffect(() => {
    history.replace('/tag-system/knowledge');
  }, []);

  return null;
};

export default TagManage;
