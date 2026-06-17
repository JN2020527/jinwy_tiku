import type { TagCategory } from '@/services/tagSystem';
import { getTagCategories } from '@/services/tagSystem';
import { PageContainer } from '@ant-design/pro-components';
import { message, Spin } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import './Attributes.less';
import NodeAttributeRelationWorkspace from './components/NodeAttributeRelationWorkspace';

const NodeRelationsPage: React.FC = () => {
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTagCategories();
      if (res.success) {
        setTagCategories(res.data);
      } else {
        message.error(res.message || '获取节点关联配置失败');
      }
    } catch {
      message.error('获取节点关联配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <PageContainer className="attribute-tag-page">
      <Spin spinning={loading}>
        <div className="attribute-settings-shell">
          <NodeAttributeRelationWorkspace tagCategories={tagCategories} />
        </div>
      </Spin>
    </PageContainer>
  );
};

export default NodeRelationsPage;
