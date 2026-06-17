import type {
  AttributeFilterArea,
  AttributeUsageRule,
  AttributeUsageScene,
  TagCategory,
} from '@/services/tagSystem';
import { Button, Drawer, Empty, Select, Space, Switch, Typography } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { USAGE_SCENE_OPTIONS } from './attributeSettingsConstants';
import {
  isTargetAllowedInScene,
  makeUsageRuleId,
  sortBySort,
} from './attributeSettingsHelpers';

interface AttributeUsageDrawerProps {
  open: boolean;
  category?: TagCategory;
  usageRules: AttributeUsageRule[];
  onClose: () => void;
  onSave: (rules: AttributeUsageRule[]) => Promise<boolean>;
}

const FILTER_AREA_LABELS: Record<AttributeFilterArea, string> = {
  primary: '主筛选区',
  more: '更多筛选区',
};

const FILTER_AREA_OPTIONS = Object.entries(FILTER_AREA_LABELS).map(
  ([value, label]) => ({
    label,
    value: value as AttributeFilterArea,
  }),
);

const isSameSceneAttributeRule = (
  rule: AttributeUsageRule,
  scene: AttributeUsageScene,
  attributeId: string,
) => rule.scene === scene && rule.attributeId === attributeId;

const getRuleForScene = (
  rules: AttributeUsageRule[],
  scene: AttributeUsageScene,
  attributeId: string,
) =>
  sortBySort(
    rules.filter((rule) =>
      isSameSceneAttributeRule(rule, scene, attributeId),
    ),
  )[0];

const getNextSortForScene = (
  rules: AttributeUsageRule[],
  scene: AttributeUsageScene,
) => {
  const sceneRules = rules.filter((rule) => rule.scene === scene);

  if (!sceneRules.length) {
    return 0;
  }

  return (
    Math.max(...sceneRules.map((rule, index) => rule.sort ?? index)) + 1
  );
};

const AttributeUsageDrawer: React.FC<AttributeUsageDrawerProps> = ({
  open,
  category,
  usageRules,
  onClose,
  onSave,
}) => {
  const [localRules, setLocalRules] =
    useState<AttributeUsageRule[]>(usageRules);
  const [saving, setSaving] = useState(false);
  const categoryId = category?.id;
  const drawerStateRef = useRef<{
    categoryId?: string;
    open: boolean;
  }>({
    categoryId,
    open,
  });

  useEffect(() => {
    const previousState = drawerStateRef.current;
    const shouldInitialize =
      open &&
      (!previousState.open || previousState.categoryId !== categoryId);

    if (shouldInitialize) {
      setLocalRules(usageRules);
    }

    drawerStateRef.current = {
      categoryId,
      open,
    };
  }, [categoryId, open, usageRules]);

  const availableScenes = useMemo(
    () =>
      category
        ? USAGE_SCENE_OPTIONS.filter((sceneMeta) =>
            isTargetAllowedInScene(category.target, sceneMeta.scene),
          )
        : [],
    [category],
  );

  const upsertRule = (
    scene: AttributeUsageScene,
    updater: (
      currentRule: AttributeUsageRule | undefined,
      currentRules: AttributeUsageRule[],
    ) => AttributeUsageRule | undefined,
  ) => {
    if (!category) {
      return;
    }

    setLocalRules((currentRules) => {
      const currentRule = getRuleForScene(
        currentRules,
        scene,
        category.id,
      );
      const nextRule = updater(currentRule, currentRules);
      const otherRules = currentRules.filter(
        (rule) => !isSameSceneAttributeRule(rule, scene, category.id),
      );

      if (!nextRule) {
        return otherRules;
      }

      return [...otherRules, nextRule];
    });
  };

  const createRule = (
    scene: AttributeUsageScene,
    currentRules: AttributeUsageRule[],
    filterArea?: AttributeFilterArea,
  ): AttributeUsageRule | undefined => {
    if (!category) {
      return undefined;
    }

    return {
      id: makeUsageRuleId(scene, category.id, filterArea),
      attributeId: category.id,
      scene,
      enabled: true,
      ...(filterArea ? { filterArea } : {}),
      sort: getNextSortForScene(currentRules, scene),
    };
  };

  const getUsageRuleId = (
    scene: AttributeUsageScene,
    filterArea?: AttributeFilterArea,
  ) => {
    if (!category) {
      return '';
    }

    return makeUsageRuleId(scene, category.id, filterArea);
  };

  const handleEnabledChange = (
    scene: AttributeUsageScene,
    enabled: boolean,
    defaultFilterArea?: AttributeFilterArea,
  ) => {
    upsertRule(scene, (currentRule, currentRules) => {
      if (currentRule) {
        const ruleWithoutFilterArea = { ...currentRule };
        delete ruleWithoutFilterArea.filterArea;

        return {
          ...ruleWithoutFilterArea,
          id: getUsageRuleId(scene, defaultFilterArea),
          enabled,
          ...(defaultFilterArea
            ? { filterArea: defaultFilterArea }
            : {}),
        };
      }

      if (!enabled) {
        return undefined;
      }

      return createRule(scene, currentRules, defaultFilterArea);
    });
  };

  const handleRequiredChange = (
    scene: AttributeUsageScene,
    required: boolean,
  ) => {
    upsertRule(scene, (currentRule) =>
      currentRule
        ? {
            ...currentRule,
            required,
          }
        : undefined,
    );
  };

  const handleFilterAreaChange = (
    scene: AttributeUsageScene,
    filterArea: AttributeFilterArea,
  ) => {
    upsertRule(scene, (currentRule, currentRules) =>
      currentRule
        ? {
            ...currentRule,
            id: getUsageRuleId(scene, filterArea),
            filterArea,
          }
        : createRule(scene, currentRules, filterArea),
    );
  };

  const handleSave = async () => {
    if (!category || saving) {
      return;
    }

    setSaving(true);
    try {
      const success = await onSave(localRules);
      if (success) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) {
      return;
    }

    onClose();
  };

  return (
    <Drawer
      closable={!saving}
      destroyOnClose
      extra={
        <Space>
          <Button disabled={saving} onClick={handleClose}>
            取消
          </Button>
          <Button
            disabled={!category || saving}
            loading={saving}
            type="primary"
            onClick={handleSave}
          >
            保存
          </Button>
        </Space>
      }
      maskClosable={!saving}
      open={open}
      title={category ? `配置使用规则：${category.name}` : '配置使用规则'}
      width={560}
      onClose={handleClose}
    >
      {category && availableScenes.length ? (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {availableScenes.map((sceneMeta) => {
            const rule = getRuleForScene(
              localRules,
              sceneMeta.scene,
              category.id,
            );
            const enabled = Boolean(rule?.enabled);
            const filterArea = rule?.filterArea || 'primary';

            return (
              <div
                key={sceneMeta.scene}
                style={{
                  border: '1px solid #edf0f5',
                  borderRadius: 8,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    alignItems: 'flex-start',
                    display: 'flex',
                    gap: 12,
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <Typography.Text strong>
                      {sceneMeta.label}
                    </Typography.Text>
                    <div>
                      <Typography.Text type="secondary">
                        {sceneMeta.description}
                      </Typography.Text>
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    checkedChildren="启用"
                    disabled={saving}
                    unCheckedChildren="停用"
                    onChange={(checked) =>
                      handleEnabledChange(
                        sceneMeta.scene,
                        checked,
                        sceneMeta.usageType === 'filter'
                          ? filterArea
                          : undefined,
                      )
                    }
                  />
                </div>

                {sceneMeta.usageType === 'form' && (
                  <div style={{ marginTop: 12 }}>
                    <Space>
                      <Typography.Text>必填</Typography.Text>
                      <Switch
                        checked={Boolean(rule?.required)}
                        disabled={saving || !enabled}
                        onChange={(checked) =>
                          handleRequiredChange(sceneMeta.scene, checked)
                        }
                      />
                    </Space>
                  </div>
                )}

                {sceneMeta.usageType === 'filter' && (
                  <div style={{ marginTop: 12 }}>
                    <Space direction="vertical" size={6}>
                      <Typography.Text>筛选位置</Typography.Text>
                      <Select
                        disabled={saving || !enabled}
                        options={FILTER_AREA_OPTIONS}
                        style={{ width: 180 }}
                        value={filterArea}
                        onChange={(value) =>
                          handleFilterAreaChange(sceneMeta.scene, value)
                        }
                      />
                    </Space>
                  </div>
                )}
              </div>
            );
          })}
        </Space>
      ) : (
        <Empty description="暂无可配置的使用场景" />
      )}
    </Drawer>
  );
};

export default AttributeUsageDrawer;
