import type {
  AttributeUsageRule,
  TagCategory,
} from '@/services/tagSystem';
import {
  getAttributeUsageRules,
  getTagCategories,
  updateAttributeUsageRules,
} from '@/services/tagSystem';
import { PageContainer } from '@ant-design/pro-components';
import { message, Spin } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import AttributeUsageSettingsWorkspace from './components/AttributeUsageSettingsWorkspace';
import './Attributes.less';

const TagConfigPage: React.FC = () => {
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [usageRules, setUsageRules] = useState<AttributeUsageRule[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [categoryRes, usageRuleRes] = await Promise.all([
        getTagCategories(),
        getAttributeUsageRules(),
      ]);
      if (categoryRes.success) {
        setTagCategories(categoryRes.data);
      }
      if (usageRuleRes.success) {
        setUsageRules(usageRuleRes.data);
      }
    } catch {
      message.error('获取标签配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveUsageRules = async (rules: AttributeUsageRule[]) => {
    try {
      const res = await updateAttributeUsageRules({ rules });
      if (res.success) {
        message.success('标签配置已保存');
        await fetchData();
        return true;
      }

      message.error(res.message || '标签配置保存失败');
      return false;
    } catch {
      message.error('标签配置保存失败');
      return false;
    }
  };

  return (
    <PageContainer className="attribute-tag-page">
      <Spin spinning={loading}>
        <div className="attribute-settings-shell">
          <AttributeUsageSettingsWorkspace
            tagCategories={tagCategories}
            usageRules={usageRules}
            onSaveUsageRules={handleSaveUsageRules}
          />
        </div>
      </Spin>
    </PageContainer>
  );
};

export default TagConfigPage;
