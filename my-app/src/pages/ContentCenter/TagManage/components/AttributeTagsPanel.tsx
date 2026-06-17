import type {
  AttributeUsageRule,
  TagCategory,
} from '@/services/tagSystem';
import { updateAttributeUsageRules } from '@/services/tagSystem';
import { SaveOutlined } from '@ant-design/icons';
import { Button, message, Tabs } from 'antd';
import React, { useEffect, useState } from 'react';
import AttributeDefinitionWorkspace from './AttributeDefinitionWorkspace';
import AttributeUsageSettingsWorkspace from './AttributeUsageSettingsWorkspace';

interface AttributeTagsPanelProps {
  tagCategories: TagCategory[];
  usageRules: AttributeUsageRule[];
  onRefresh: () => void | Promise<void>;
}

const AttributeTagsPanel: React.FC<AttributeTagsPanelProps> = ({
  tagCategories,
  usageRules,
  onRefresh,
}) => {
  const [draftUsageRules, setDraftUsageRules] =
    useState<AttributeUsageRule[]>(usageRules);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    setDraftUsageRules(usageRules);
  }, [usageRules]);

  const handleSaveUsageRules = async () => {
    setSaving(true);
    try {
      const res = await updateAttributeUsageRules({ rules: draftUsageRules });
      if (res.success) {
        message.success('使用设置已保存');
        await onRefresh();
      } else {
        message.error(res.message || '使用设置保存失败');
      }
    } catch {
      message.error('使用设置保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="attribute-settings-shell">
      <Tabs
        items={[
          {
            key: 'definitions',
            label: '属性定义',
            children: (
              <AttributeDefinitionWorkspace
                tagCategories={tagCategories}
                onRefresh={onRefresh}
              />
            ),
          },
          {
            key: 'usage',
            label: '使用设置',
            children: (
              <>
                <div className="attribute-settings-toolbar">
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={saving}
                    onClick={handleSaveUsageRules}
                  >
                    保存
                  </Button>
                </div>
                <AttributeUsageSettingsWorkspace
                  tagCategories={tagCategories}
                  usageRules={draftUsageRules}
                  onChange={setDraftUsageRules}
                  onRefresh={onRefresh}
                />
              </>
            ),
          },
        ]}
      />
    </div>
  );
};

export default AttributeTagsPanel;
