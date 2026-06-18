import type { AttributeUsageRule, TagCategory } from '@/services/tagSystem';
import {
  getAttributeUsageRules,
  getTagCategories,
  updateAttributeUsageRules,
} from '@/services/tagSystem';
import { PageContainer } from '@ant-design/pro-components';
import { history, useLocation } from '@umijs/max';
import { message, Spin, Tabs } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './Attributes.less';
import AttributeUsageSettingsWorkspace from './components/AttributeUsageSettingsWorkspace';
import NodeAttributeRelationWorkspace from './components/NodeAttributeRelationWorkspace';

const ATTRIBUTE_APPLICATION_TABS = ['tag-config', 'node-relations'] as const;

type AttributeApplicationTab = (typeof ATTRIBUTE_APPLICATION_TABS)[number];

const normalizeTab = (value: string | null): AttributeApplicationTab =>
  ATTRIBUTE_APPLICATION_TABS.includes(value as AttributeApplicationTab)
    ? (value as AttributeApplicationTab)
    : 'tag-config';

const AttributeApplicationPage: React.FC = () => {
  const location = useLocation();
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [usageRules, setUsageRules] = useState<AttributeUsageRule[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const activeTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return normalizeTab(params.get('tab'));
  }, [location.search]);

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
      message.error('获取属性应用配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const currentTab = params.get('tab');
    if (currentTab === activeTab) {
      return;
    }
    params.set('tab', activeTab);
    history.replace(`${location.pathname}?${params.toString()}`);
  }, [activeTab, location.pathname, location.search]);

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

  const handleTabChange = (key: string) => {
    const nextTab = normalizeTab(key);
    const params = new URLSearchParams(location.search);
    params.set('tab', nextTab);
    history.push(`${location.pathname}?${params.toString()}`);
  };

  return (
    <PageContainer className="attribute-tag-page">
      <Spin spinning={loading}>
        <Tabs
          className="attribute-application-tabs"
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            {
              key: 'tag-config',
              label: '标签配置',
              children: (
                <div className="attribute-settings-shell">
                  <AttributeUsageSettingsWorkspace
                    tagCategories={tagCategories}
                    usageRules={usageRules}
                    onSaveUsageRules={handleSaveUsageRules}
                  />
                </div>
              ),
            },
            {
              key: 'node-relations',
              label: '节点关联',
              children: (
                <div className="attribute-settings-shell">
                  <NodeAttributeRelationWorkspace
                    tagCategories={tagCategories}
                  />
                </div>
              ),
            },
          ]}
        />
      </Spin>
    </PageContainer>
  );
};

export default AttributeApplicationPage;
