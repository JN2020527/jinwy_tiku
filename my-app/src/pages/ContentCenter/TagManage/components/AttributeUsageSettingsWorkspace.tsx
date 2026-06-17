import type {
  AttributeFilterArea,
  AttributeUsageRule,
  AttributeUsageScene,
  TagCategory,
} from '@/services/tagSystem';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { Button, Empty, Select, Space, Switch, Tag, message } from 'antd';
import React, { useMemo, useState } from 'react';
import {
  ATTRIBUTE_TARGET_LABELS,
  USAGE_SCENE_GROUPS,
} from './attributeSettingsConstants';
import {
  getSceneMeta,
  isTargetAllowedInScene,
  makeUsageRuleId,
  reorder,
  sortBySort,
} from './attributeSettingsHelpers';

interface AttributeUsageSettingsWorkspaceProps {
  tagCategories: TagCategory[];
  usageRules: AttributeUsageRule[];
  onSaveUsageRules: (rules: AttributeUsageRule[]) => Promise<boolean>;
}

interface AttributeUsageRuleRow {
  category: TagCategory;
  rule: AttributeUsageRule;
}

const FILTER_AREA_LABELS: Record<AttributeFilterArea, string> = {
  primary: '主筛选区',
  more: '更多筛选区',
};

const FILTER_AREA_OPTIONS: {
  label: string;
  value: AttributeFilterArea;
}[] = [
  { label: FILTER_AREA_LABELS.primary, value: 'primary' },
  { label: FILTER_AREA_LABELS.more, value: 'more' },
];

const panelStyle: React.CSSProperties = {
  background: '#fafbfc',
  border: '1px solid #edf0f5',
  borderRadius: 8,
  minHeight: 460,
  padding: 16,
};

const panelHeaderStyle: React.CSSProperties = {
  borderBottom: '1px solid #edf0f5',
  marginBottom: 16,
  paddingBottom: 12,
};

const panelTitleStyle: React.CSSProperties = {
  color: '#1f2a37',
  fontSize: 16,
  fontWeight: 600,
  lineHeight: '24px',
  margin: 0,
};

const metaTextStyle: React.CSSProperties = {
  color: '#667085',
  fontSize: 13,
  lineHeight: '20px',
  margin: '4px 0 0',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 18,
};

const sectionTitleStyle: React.CSSProperties = {
  color: '#344054',
  fontSize: 14,
  fontWeight: 600,
  lineHeight: '22px',
  margin: '0 0 10px',
};

const rowStyle: React.CSSProperties = {
  alignItems: 'center',
  background: '#fff',
  border: '1px solid #edf0f5',
  borderRadius: 8,
  display: 'flex',
  gap: 12,
  justifyContent: 'space-between',
  minHeight: 72,
  padding: '12px 14px',
};

const addableRowStyle: React.CSSProperties = {
  alignItems: 'center',
  background: '#fff',
  border: '1px solid #edf0f5',
  borderRadius: 8,
  display: 'flex',
  gap: 12,
  justifyContent: 'space-between',
  minHeight: 60,
  padding: '10px 12px',
};

const getFilterArea = (rule: AttributeUsageRule): AttributeFilterArea =>
  rule.filterArea === 'primary' ? 'primary' : 'more';

const getNextSort = (
  rules: AttributeUsageRule[],
  scene: AttributeUsageScene,
  filterArea?: AttributeFilterArea,
) => {
  const scopedRules = rules.filter((rule) => {
    if (rule.scene !== scene) {
      return false;
    }

    if (!filterArea) {
      return true;
    }

    return getFilterArea(rule) === filterArea;
  });

  if (!scopedRules.length) {
    return 0;
  }

  return Math.max(...scopedRules.map((rule, index) => rule.sort ?? index)) + 1;
};

const getRuleStatusText = (category: TagCategory) =>
  category.status === 'disabled' ? '已停用' : '已启用';

const AttributeUsageSettingsWorkspace: React.FC<
  AttributeUsageSettingsWorkspaceProps
> = ({ tagCategories, usageRules, onSaveUsageRules }) => {
  const [activeScene, setActiveScene] =
    useState<AttributeUsageScene>('questionListFilter');
  const [savingKey, setSavingKey] = useState<string>();
  const sceneMeta = getSceneMeta(activeScene)!;
  const saving = Boolean(savingKey);
  const sceneRules = usageRules.filter((rule) => rule.scene === activeScene);
  const enabledRules = sortBySort(sceneRules.filter((rule) => rule.enabled));

  const categoryMap = useMemo(
    () =>
      new Map(
        tagCategories.map((category) => [category.id, category] as const),
      ),
    [tagCategories],
  );

  const enabledSceneCounts = useMemo(() => {
    const counts = new Map<AttributeUsageScene, number>();

    usageRules.forEach((rule) => {
      if (!rule.enabled) {
        return;
      }

      counts.set(rule.scene, (counts.get(rule.scene) || 0) + 1);
    });

    return counts;
  }, [usageRules]);

  const rows = enabledRules
    .map((rule) => {
      const category = categoryMap.get(rule.attributeId);

      if (!category) {
        return undefined;
      }

      return {
        category,
        rule,
      };
    })
    .filter((row): row is AttributeUsageRuleRow => Boolean(row));

  const isFilterScene = sceneMeta.usageType === 'filter';
  const primaryRows = rows.filter(
    (row) => getFilterArea(row.rule) === 'primary',
  );
  const moreRows = rows.filter((row) => getFilterArea(row.rule) === 'more');

  const addableCategories = useMemo(() => {
    const enabledAttributeIds = new Set(
      sceneRules.filter((rule) => rule.enabled).map((rule) => rule.attributeId),
    );

    return sortBySort(
      tagCategories.filter(
        (category) =>
          !enabledAttributeIds.has(category.id) &&
          isTargetAllowedInScene(category.target, activeScene) &&
          category.status !== 'disabled',
      ),
    );
  }, [activeScene, sceneRules, tagCategories]);

  const saveRules = async (nextRules: AttributeUsageRule[], key: string) => {
    if (savingKey) {
      return;
    }

    setSavingKey(key);
    try {
      const ok = await onSaveUsageRules(nextRules);

      if (!ok) {
        message.error('使用设置保存失败');
      }
    } finally {
      setSavingKey(undefined);
    }
  };

  const handleAddCategory = (category: TagCategory) => {
    const filterArea: AttributeFilterArea | undefined = isFilterScene
      ? 'more'
      : undefined;
    const nextRule: AttributeUsageRule = {
      id: makeUsageRuleId(activeScene, category.id, filterArea),
      attributeId: category.id,
      scene: activeScene,
      enabled: true,
      ...(sceneMeta.usageType === 'form' ? { required: false } : {}),
      ...(filterArea ? { filterArea } : {}),
      sort: getNextSort(usageRules, activeScene, filterArea),
    };

    saveRules([...usageRules, nextRule], `add-${category.id}`);
  };

  const handleRemoveRule = (rule: AttributeUsageRule) => {
    saveRules(
      usageRules.map((item) =>
        item.id === rule.id
          ? {
              ...item,
              enabled: false,
            }
          : item,
      ),
      `remove-${rule.id}`,
    );
  };

  const handleRequiredChange = (
    rule: AttributeUsageRule,
    required: boolean,
  ) => {
    const targetSceneMeta = getSceneMeta(rule.scene);

    if (targetSceneMeta?.usageType !== 'form') {
      return;
    }

    saveRules(
      usageRules.map((item) =>
        item.id === rule.id
          ? {
              ...item,
              required,
            }
          : item,
      ),
      `required-${rule.id}`,
    );
  };

  const handleFilterAreaChange = (
    rule: AttributeUsageRule,
    filterArea: AttributeFilterArea,
  ) => {
    if (
      sceneMeta.usageType !== 'filter' ||
      getFilterArea(rule) === filterArea
    ) {
      return;
    }

    saveRules(
      usageRules.map((item) =>
        item.id === rule.id
          ? {
              ...item,
              id: makeUsageRuleId(activeScene, item.attributeId, filterArea),
              filterArea,
              sort: getNextSort(usageRules, activeScene, filterArea),
            }
          : item,
      ),
      `move-${rule.id}-${filterArea}`,
    );
  };

  const handleReorder = (
    scopeRows: AttributeUsageRuleRow[],
    fromIndex: number,
    toIndex: number,
    scopeKey: string,
  ) => {
    const normalizedRules = reorder(
      scopeRows.map((row) => row.rule),
      fromIndex,
      toIndex,
    ).map((rule, index) => ({
      ...rule,
      sort: index,
    }));
    const normalizedRuleMap = new Map(
      normalizedRules.map((rule) => [rule.id, rule] as const),
    );

    saveRules(
      usageRules.map((rule) => normalizedRuleMap.get(rule.id) || rule),
      `reorder-${activeScene}-${scopeKey}-${fromIndex}-${toIndex}`,
    );
  };

  const renderRuleRow = (
    row: AttributeUsageRuleRow,
    index: number,
    scopeRows: AttributeUsageRuleRow[],
    scopeKey: string,
  ) => {
    const filterArea = getFilterArea(row.rule);
    const targetLabel = ATTRIBUTE_TARGET_LABELS[row.category.target];
    const isFirst = index === 0;
    const isLast = index === scopeRows.length - 1;

    return (
      <div
        key={row.rule.id}
        className="attribute-usage-rule-row"
        style={rowStyle}
      >
        <div
          style={{
            alignItems: 'flex-start',
            display: 'flex',
            flex: 1,
            gap: 12,
            minWidth: 0,
          }}
        >
          <span
            style={{
              color: '#667085',
              flex: '0 0 24px',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: '24px',
              textAlign: 'right',
            }}
          >
            {index + 1}
          </span>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: '#1f2a37',
                fontSize: 14,
                fontWeight: 600,
                lineHeight: '22px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={row.category.name}
            >
              {row.category.name}
            </div>
            <Space size={6} style={{ flexWrap: 'wrap', marginTop: 6 }}>
              <Tag>{targetLabel}</Tag>
              <Tag
                color={
                  row.category.status === 'disabled' ? 'default' : 'success'
                }
              >
                {getRuleStatusText(row.category)}
              </Tag>
              {sceneMeta.usageType === 'filter' && (
                <Tag color={filterArea === 'primary' ? 'blue' : 'cyan'}>
                  {FILTER_AREA_LABELS[filterArea]}
                </Tag>
              )}
              {sceneMeta.usageType === 'form' && (
                <Space size={6}>
                  <span style={{ color: '#667085', fontSize: 12 }}>必填</span>
                  <Switch
                    checked={Boolean(row.rule.required)}
                    disabled={saving}
                    size="small"
                    onChange={(checked) =>
                      handleRequiredChange(row.rule, checked)
                    }
                  />
                </Space>
              )}
            </Space>
          </div>
        </div>

        <Space size={4}>
          {sceneMeta.usageType === 'filter' && (
            <Select<AttributeFilterArea>
              aria-label={`调整${row.category.name}筛选区`}
              disabled={saving}
              options={FILTER_AREA_OPTIONS}
              showSearch={false}
              size="small"
              style={{ width: 116 }}
              suffixIcon={<SwapOutlined />}
              value={filterArea}
              onChange={(value) => handleFilterAreaChange(row.rule, value)}
            />
          )}
          <Button
            aria-label={`上移${row.category.name}`}
            disabled={saving || isFirst}
            icon={<ArrowUpOutlined />}
            size="small"
            title="上移"
            type="text"
            onClick={() => handleReorder(scopeRows, index, index - 1, scopeKey)}
          />
          <Button
            aria-label={`下移${row.category.name}`}
            disabled={saving || isLast}
            icon={<ArrowDownOutlined />}
            size="small"
            title="下移"
            type="text"
            onClick={() => handleReorder(scopeRows, index, index + 1, scopeKey)}
          />
          <Button
            aria-label={`移除${row.category.name}`}
            danger
            disabled={saving}
            icon={<DeleteOutlined />}
            loading={savingKey === `remove-${row.rule.id}`}
            size="small"
            title="移除"
            type="text"
            onClick={() => handleRemoveRule(row.rule)}
          />
        </Space>
      </div>
    );
  };

  const renderRuleSection = (
    title: string,
    sectionRows: AttributeUsageRuleRow[],
    scopeKey: string,
  ) => (
    <section style={sectionStyle}>
      <h3 style={sectionTitleStyle}>{title}</h3>
      {sectionRows.length ? (
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          {sectionRows.map((row, index) =>
            renderRuleRow(row, index, sectionRows, scopeKey),
          )}
        </Space>
      ) : (
        <Empty
          description="暂无已启用属性"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </section>
  );

  return (
    <div
      className="attribute-usage-workbench"
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: '220px minmax(0, 1fr) 280px',
      }}
    >
      <aside className="attribute-usage-scene-panel" style={panelStyle}>
        <header style={panelHeaderStyle}>
          <h2 style={panelTitleStyle}>使用设置</h2>
          <p style={metaTextStyle}>按场景配置属性用途</p>
        </header>

        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          {USAGE_SCENE_GROUPS.map((group) => (
            <div key={group.title}>
              <div
                style={{
                  color: '#667085',
                  fontSize: 12,
                  fontWeight: 600,
                  lineHeight: '20px',
                  marginBottom: 8,
                }}
              >
                {group.title}
              </div>
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                {group.scenes.map((scene) => {
                  const active = scene.scene === activeScene;

                  return (
                    <Button
                      key={scene.scene}
                      block
                      className={`attribute-usage-scene${
                        active ? ' active' : ''
                      }`}
                      disabled={saving}
                      aria-label={`切换到${scene.label}`}
                      style={{
                        height: 'auto',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        textAlign: 'left',
                      }}
                      title={scene.label}
                      type={active ? 'primary' : 'default'}
                      onClick={() => setActiveScene(scene.scene)}
                    >
                      <span>{scene.label}</span>
                      <Tag
                        color={active ? 'processing' : 'default'}
                        style={{ marginInlineEnd: 0 }}
                      >
                        {enabledSceneCounts.get(scene.scene) || 0}
                      </Tag>
                    </Button>
                  );
                })}
              </Space>
            </div>
          ))}
        </Space>
      </aside>

      <main className="attribute-usage-main" style={panelStyle}>
        <header style={panelHeaderStyle}>
          <h2 style={panelTitleStyle}>{sceneMeta.label}</h2>
          <p style={metaTextStyle}>{sceneMeta.description}</p>
        </header>

        {isFilterScene ? (
          <>
            {renderRuleSection('主筛选区', primaryRows, 'primary')}
            {renderRuleSection('更多筛选区', moreRows, 'more')}
          </>
        ) : (
          renderRuleSection('已启用属性', rows, 'scene')
        )}
      </main>

      <aside className="attribute-usage-side" style={panelStyle}>
        <header style={panelHeaderStyle}>
          <h2 style={panelTitleStyle}>可添加属性</h2>
          <p style={metaTextStyle}>{sceneMeta.description}</p>
        </header>

        {addableCategories.length ? (
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            {addableCategories.map((category) => (
              <div
                key={category.id}
                className="attribute-addable-row"
                style={addableRowStyle}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      color: '#1f2a37',
                      fontSize: 14,
                      fontWeight: 600,
                      lineHeight: '22px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={category.name}
                  >
                    {category.name}
                  </div>
                  <div
                    style={{
                      color: '#667085',
                      fontSize: 12,
                      lineHeight: '20px',
                      marginTop: 2,
                    }}
                  >
                    {ATTRIBUTE_TARGET_LABELS[category.target]}
                  </div>
                </div>
                <Button
                  aria-label={`添加${category.name}`}
                  disabled={saving}
                  icon={<PlusOutlined />}
                  loading={savingKey === `add-${category.id}`}
                  size="small"
                  title="添加"
                  onClick={() => handleAddCategory(category)}
                >
                  添加
                </Button>
              </div>
            ))}
          </Space>
        ) : (
          <Empty
            description="暂无可添加属性"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </aside>
    </div>
  );
};

export default AttributeUsageSettingsWorkspace;
