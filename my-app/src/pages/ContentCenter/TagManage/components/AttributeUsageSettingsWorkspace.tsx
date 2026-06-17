import type {
  AttributeFilterArea,
  AttributeUsageRule,
  AttributeUsageScene,
  TagCategory,
} from '@/services/tagSystem';
import {
  HolderOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import {
  Button,
  Empty,
  message,
  Modal,
  Space,
  Switch,
  Tag,
  Tooltip,
} from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  onOpenAttributeDefinitions?: () => void;
  onSaveUsageRules: (rules: AttributeUsageRule[]) => Promise<boolean>;
}

interface AttributeUsageRuleRow {
  category: TagCategory;
  rule: AttributeUsageRule;
}

interface DragState {
  ruleId: string;
  scopeKey: string;
}

const FILTER_AREA_LABELS: Record<AttributeFilterArea, string> = {
  primary: '主筛选区',
  more: '更多筛选区',
};

const panelStyle: React.CSSProperties = {
  background: '#fff',
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
  background: '#fcfdff',
  border: '1px solid #edf0f5',
  borderRadius: 6,
  display: 'flex',
  gap: 12,
  justifyContent: 'space-between',
  minHeight: 50,
  padding: '10px 14px',
};

const addableRowStyle: React.CSSProperties = {
  alignItems: 'stretch',
  background: '#fcfdff',
  border: '1px solid #edf0f5',
  borderRadius: 6,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  justifyContent: 'center',
  minHeight: 68,
  padding: '10px 12px',
};

const normalizeFilterArea = (
  rule?: Pick<AttributeUsageRule, 'filterArea'>,
): AttributeFilterArea => (rule?.filterArea === 'primary' ? 'primary' : 'more');

const getUsageRuleKey = (
  rule: Pick<AttributeUsageRule, 'attributeId' | 'scene'>,
) => `${rule.scene}::${rule.attributeId}`;

const isSameSceneAttributeRule = (
  rule: Pick<AttributeUsageRule, 'attributeId' | 'scene'>,
  scene: AttributeUsageScene,
  attributeId: string,
) => rule.scene === scene && rule.attributeId === attributeId;

const normalizeUsageRuleScope = (
  rule: AttributeUsageRule,
): AttributeUsageRule => {
  const sceneMeta = getSceneMeta(rule.scene);

  if (sceneMeta?.usageType !== 'filter') {
    return rule;
  }

  const filterArea = normalizeFilterArea(rule);
  const id = makeUsageRuleId(rule.scene, rule.attributeId, filterArea);

  if (rule.filterArea === filterArea && rule.id === id) {
    return rule;
  }

  return {
    ...rule,
    id,
    filterArea,
  };
};

const canonicalizeUsageRules = (rules: AttributeUsageRule[]) => {
  const ruleIndexes = new Map<string, number>();
  const nextRules: AttributeUsageRule[] = [];

  rules.forEach((rule) => {
    const normalizedRule = normalizeUsageRuleScope(rule);
    const ruleKey = getUsageRuleKey(normalizedRule);
    const currentIndex = ruleIndexes.get(ruleKey);

    if (currentIndex === undefined) {
      ruleIndexes.set(ruleKey, nextRules.length);
      nextRules.push(normalizedRule);
      return;
    }

    nextRules[currentIndex] = normalizedRule;
  });

  return nextRules;
};

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

    return normalizeFilterArea(rule) === filterArea;
  });

  if (!scopedRules.length) {
    return 0;
  }

  return Math.max(...scopedRules.map((rule, index) => rule.sort ?? index)) + 1;
};

const getAddSavingKey = (
  attributeId: string,
  filterArea?: AttributeFilterArea,
) => (filterArea ? `add-${attributeId}-${filterArea}` : `add-${attributeId}`);

const AttributeUsageSettingsWorkspace: React.FC<
  AttributeUsageSettingsWorkspaceProps
> = ({
  tagCategories,
  usageRules,
  onOpenAttributeDefinitions,
  onSaveUsageRules,
}) => {
  const [activeScene, setActiveScene] =
    useState<AttributeUsageScene>('questionListFilter');
  const [savingKey, setSavingKey] = useState<string>();
  const [dragState, setDragState] = useState<DragState>();
  const [dragOverRuleId, setDragOverRuleId] = useState<string>();
  const usageRulesRef = useRef(usageRules);
  const savingKeyRef = useRef<string>();
  const sceneMeta = getSceneMeta(activeScene)!;
  const saving = Boolean(savingKey);

  useEffect(() => {
    usageRulesRef.current = usageRules;
  }, [usageRules]);

  useEffect(() => {
    savingKeyRef.current = savingKey;
  }, [savingKey]);
  const canonicalUsageRules = useMemo(
    () => canonicalizeUsageRules(usageRules),
    [usageRules],
  );
  const sceneRules = canonicalUsageRules.filter(
    (rule) => rule.scene === activeScene,
  );
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

    canonicalUsageRules.forEach((rule) => {
      if (!rule.enabled) {
        return;
      }

      counts.set(rule.scene, (counts.get(rule.scene) || 0) + 1);
    });

    return counts;
  }, [canonicalUsageRules]);

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
    (row) => normalizeFilterArea(row.rule) === 'primary',
  );
  const moreRows = rows.filter(
    (row) => normalizeFilterArea(row.rule) === 'more',
  );

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

  const showActionMessage = (
    content: React.ReactNode,
    type: 'success' | 'info' = 'success',
  ) => {
    message.destroy();
    message.open({
      content,
      type,
    });
  };

  const saveRules = async (
    nextRules: AttributeUsageRule[],
    key: string,
  ): Promise<boolean> => {
    if (savingKeyRef.current) {
      return false;
    }

    savingKeyRef.current = key;
    setSavingKey(key);
    try {
      return await onSaveUsageRules(canonicalizeUsageRules(nextRules));
    } finally {
      savingKeyRef.current = undefined;
      setSavingKey(undefined);
    }
  };

  const handleUndoRemoveRule = async (
    removedRule: AttributeUsageRule,
    category: TagCategory,
  ) => {
    const currentRules = usageRulesRef.current;
    const currentRule = currentRules.find((rule) =>
      isSameSceneAttributeRule(
        rule,
        removedRule.scene,
        removedRule.attributeId,
      ),
    );

    if (currentRule?.enabled) {
      showActionMessage(`“${category.name}”已在当前场景中，无需撤销`, 'info');
      return;
    }

    const nextRules = currentRule
      ? currentRules.map((rule) =>
          isSameSceneAttributeRule(
            rule,
            removedRule.scene,
            removedRule.attributeId,
          )
            ? {
                ...rule,
                enabled: true,
              }
            : rule,
        )
      : [
          ...currentRules,
          {
            ...removedRule,
            enabled: true,
          },
        ];
    const saved = await saveRules(nextRules, `undo-remove-${removedRule.id}`);

    if (saved) {
      const sceneLabel = getSceneMeta(removedRule.scene)?.label || '原场景';
      showActionMessage(`已恢复“${category.name}”到${sceneLabel}`);
    }
  };

  const showRemoveMessage = (
    removedRule: AttributeUsageRule,
    category: TagCategory,
  ) => {
    const sceneLabel = getSceneMeta(removedRule.scene)?.label || '当前场景';

    message.destroy();
    message.open({
      content: (
        <Space size={8}>
          <span>{`已将“${category.name}”移出${sceneLabel}`}</span>
          <Button
            size="small"
            type="link"
            onClick={() => handleUndoRemoveRule(removedRule, category)}
          >
            撤销
          </Button>
        </Space>
      ),
      duration: 6,
      type: 'success',
    });
  };

  const handleAddCategory = async (
    category: TagCategory,
    targetFilterArea?: AttributeFilterArea,
  ) => {
    const filterArea: AttributeFilterArea | undefined = isFilterScene
      ? targetFilterArea || 'more'
      : undefined;
    const saveKey = getAddSavingKey(category.id, filterArea);
    const existingRule = usageRules.find((rule) =>
      isSameSceneAttributeRule(rule, activeScene, category.id),
    );
    const getNextRule = (rule?: AttributeUsageRule): AttributeUsageRule => {
      const nextRule: AttributeUsageRule = {
        ...(rule || {
          attributeId: category.id,
          scene: activeScene,
        }),
        id: makeUsageRuleId(activeScene, category.id, filterArea),
        attributeId: category.id,
        scene: activeScene,
        enabled: true,
        sort: getNextSort(canonicalUsageRules, activeScene, filterArea),
      };

      if (sceneMeta.usageType === 'form') {
        nextRule.required = false;
      } else {
        delete nextRule.required;
      }

      if (filterArea) {
        nextRule.filterArea = filterArea;
      } else {
        delete nextRule.filterArea;
      }

      return nextRule;
    };

    if (existingRule) {
      const saved = await saveRules(
        usageRules.map((rule) =>
          isSameSceneAttributeRule(rule, activeScene, category.id)
            ? getNextRule(rule)
            : rule,
        ),
        saveKey,
      );
      if (saved) {
        showActionMessage(
          filterArea
            ? `已将“${category.name}”加入${FILTER_AREA_LABELS[filterArea]}`
            : `已添加“${category.name}”`,
        );
      }
      return;
    }

    const saved = await saveRules([...usageRules, getNextRule()], saveKey);
    if (saved) {
      showActionMessage(
        filterArea
          ? `已将“${category.name}”加入${FILTER_AREA_LABELS[filterArea]}`
          : `已添加“${category.name}”`,
      );
    }
  };

  const handleConfirmRemoveRule = async (row: AttributeUsageRuleRow) => {
    const saved = await saveRules(
      usageRules.map((item) =>
        isSameSceneAttributeRule(item, row.rule.scene, row.rule.attributeId)
          ? {
              ...item,
              enabled: false,
            }
          : item,
      ),
      `remove-${row.rule.id}`,
    );

    if (saved) {
      showRemoveMessage(row.rule, row.category);
    }
  };

  const handleRemoveRule = (row: AttributeUsageRuleRow) => {
    Modal.confirm({
      cancelText: '取消',
      content: `仅从“${sceneMeta.label}”移出，不删除属性定义。后续仍可从右侧重新加入。`,
      okButtonProps: { danger: true },
      okText: '移出当前场景',
      title: `确认将“${row.category.name}”移出当前场景？`,
      onOk: () => handleConfirmRemoveRule(row),
    });
  };

  const handleRequiredChange = async (
    rule: AttributeUsageRule,
    category: TagCategory,
    required: boolean,
  ) => {
    const targetSceneMeta = getSceneMeta(rule.scene);

    if (targetSceneMeta?.usageType !== 'form') {
      return;
    }

    const saved = await saveRules(
      usageRules.map((item) =>
        isSameSceneAttributeRule(item, rule.scene, rule.attributeId)
          ? {
              ...item,
              required,
            }
          : item,
      ),
      `required-${rule.id}`,
    );

    if (saved) {
      showActionMessage(
        required
          ? `已将“${category.name}”设为必填`
          : `已取消“${category.name}”必填`,
      );
    }
  };

  const handleFilterAreaChange = async (
    rule: AttributeUsageRule,
    category: TagCategory,
    filterArea: AttributeFilterArea,
  ) => {
    if (
      sceneMeta.usageType !== 'filter' ||
      normalizeFilterArea(rule) === filterArea
    ) {
      return;
    }

    const saved = await saveRules(
      usageRules.map((item) =>
        isSameSceneAttributeRule(item, rule.scene, rule.attributeId)
          ? {
              ...item,
              id: makeUsageRuleId(rule.scene, item.attributeId, filterArea),
              filterArea,
              sort: getNextSort(canonicalUsageRules, rule.scene, filterArea),
            }
          : item,
      ),
      `move-${rule.id}-${filterArea}`,
    );

    if (saved) {
      showActionMessage(
        `已将“${category.name}”移动至${FILTER_AREA_LABELS[filterArea]}`,
      );
    }
  };

  const handleReorder = async (
    scopeRows: AttributeUsageRuleRow[],
    fromIndex: number,
    toIndex: number,
    scopeKey: string,
  ) => {
    if (fromIndex === toIndex) {
      return;
    }

    const normalizedRules = reorder(
      scopeRows.map((row) => row.rule),
      fromIndex,
      toIndex,
    ).map((rule, index) => ({
      ...rule,
      sort: index,
    }));
    const normalizedRuleMap = new Map(
      normalizedRules.map((rule) => [getUsageRuleKey(rule), rule] as const),
    );

    const saved = await saveRules(
      usageRules.map(
        (rule) => normalizedRuleMap.get(getUsageRuleKey(rule)) || rule,
      ),
      `reorder-${activeScene}-${scopeKey}-${fromIndex}-${toIndex}`,
    );

    if (saved) {
      const scopeLabel =
        scopeKey === 'primary'
          ? '主筛选区'
          : scopeKey === 'more'
          ? '更多筛选区'
          : '已启用属性';
      showActionMessage(`${scopeLabel}排序已保存`);
    }
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLElement>,
    row: AttributeUsageRuleRow,
    scopeKey: string,
  ) => {
    if (saving) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', row.rule.id);
    setDragState({
      ruleId: row.rule.id,
      scopeKey,
    });
  };

  const handleDragEnd = () => {
    setDragState(undefined);
    setDragOverRuleId(undefined);
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLElement>,
    row: AttributeUsageRuleRow,
    scopeKey: string,
  ) => {
    if (!dragState || dragState.scopeKey !== scopeKey || saving) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    if (dragState.ruleId !== row.rule.id) {
      setDragOverRuleId(row.rule.id);
    }
  };

  const handleDropToIndex = async (
    event: React.DragEvent<HTMLElement>,
    scopeRows: AttributeUsageRuleRow[],
    toIndex: number,
    scopeKey: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const currentDragState = dragState;
    setDragState(undefined);
    setDragOverRuleId(undefined);

    if (!currentDragState || currentDragState.scopeKey !== scopeKey) {
      return;
    }

    const fromIndex = scopeRows.findIndex(
      (row) => row.rule.id === currentDragState.ruleId,
    );

    if (fromIndex < 0 || fromIndex === toIndex) {
      return;
    }

    await handleReorder(scopeRows, fromIndex, toIndex, scopeKey);
  };

  const handleSectionDragOver = (
    event: React.DragEvent<HTMLElement>,
    scopeKey: string,
  ) => {
    if (!dragState || dragState.scopeKey !== scopeKey || saving) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleSectionDrop = (
    event: React.DragEvent<HTMLElement>,
    scopeRows: AttributeUsageRuleRow[],
    scopeKey: string,
  ) => {
    const target = event.target as HTMLElement;

    if (!scopeRows.length || target.closest('.attribute-usage-rule-row')) {
      return;
    }

    void handleDropToIndex(event, scopeRows, scopeRows.length - 1, scopeKey);
  };

  const renderRuleRow = (
    row: AttributeUsageRuleRow,
    index: number,
    scopeRows: AttributeUsageRuleRow[],
    scopeKey: string,
  ) => {
    const filterArea = normalizeFilterArea(row.rule);
    const targetFilterArea: AttributeFilterArea =
      filterArea === 'primary' ? 'more' : 'primary';
    const targetFilterAreaText =
      targetFilterArea === 'primary' ? '移至主筛选' : '移至更多';
    const targetLabel = ATTRIBUTE_TARGET_LABELS[row.category.target];
    const isDragging = dragState?.ruleId === row.rule.id;
    const isDragOver =
      dragOverRuleId === row.rule.id && dragState?.ruleId !== row.rule.id;

    return (
      <div
        key={row.rule.id}
        className={[
          'attribute-usage-rule-row',
          isDragging ? 'dragging' : '',
          isDragOver ? 'drag-over' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={rowStyle}
        onDragLeave={() => {
          if (dragOverRuleId === row.rule.id) {
            setDragOverRuleId(undefined);
          }
        }}
        onDragOver={(event) => handleDragOver(event, row, scopeKey)}
        onDrop={(event) => handleDropToIndex(event, scopeRows, index, scopeKey)}
      >
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            flex: 1,
            gap: 10,
            minWidth: 0,
          }}
        >
          <span className="attribute-usage-row-leading">
            <span
              aria-label={`拖拽排序${row.category.name}`}
              className="attribute-usage-drag-handle"
              draggable={!saving}
              title="拖拽排序"
              onDragEnd={handleDragEnd}
              onDragStart={(event) => handleDragStart(event, row, scopeKey)}
            >
              <HolderOutlined />
            </span>
            <span className="attribute-usage-sort-index">{index + 1}</span>
          </span>
          <div className="attribute-usage-row-main">
            <div
              className="attribute-usage-row-name"
              title={row.category.name}
            >
              {row.category.name}
            </div>
            <Space className="attribute-usage-row-tags" size={6}>
              <Tag>{targetLabel}</Tag>
              {row.category.status === 'disabled' && (
                <Tag color="warning">属性已停用</Tag>
              )}
              {sceneMeta.usageType === 'form' && (
                <Space size={6}>
                  <span style={{ color: '#667085', fontSize: 12 }}>必填</span>
                  <Switch
                    checked={Boolean(row.rule.required)}
                    disabled={saving}
                    size="small"
                    onChange={(checked) =>
                      handleRequiredChange(row.rule, row.category, checked)
                    }
                  />
                </Space>
              )}
            </Space>
          </div>
        </div>

        <Space size={4}>
          {sceneMeta.usageType === 'filter' && (
            <Button
              aria-label={`将${row.category.name}移动至${FILTER_AREA_LABELS[targetFilterArea]}`}
              className="attribute-usage-move-button"
              disabled={saving}
              icon={<SwapOutlined />}
              loading={
                savingKey === `move-${row.rule.id}-${targetFilterArea}`
              }
              size="small"
              title={`移动至${FILTER_AREA_LABELS[targetFilterArea]}`}
              onClick={() =>
                handleFilterAreaChange(
                  row.rule,
                  row.category,
                  targetFilterArea,
                )
              }
            >
              {targetFilterAreaText}
            </Button>
          )}
          <Tooltip title="移出当前场景">
            <span>
              <Button
                aria-label={`将${row.category.name}移出当前场景`}
                danger
                disabled={saving}
                icon={<MinusCircleOutlined />}
                loading={savingKey === `remove-${row.rule.id}`}
                size="small"
                title="移出当前场景"
                type="text"
                onClick={() => handleRemoveRule(row)}
              />
            </span>
          </Tooltip>
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
        <div
          className="attribute-usage-rule-list"
          onDragOver={(event) => handleSectionDragOver(event, scopeKey)}
          onDrop={(event) => handleSectionDrop(event, sectionRows, scopeKey)}
        >
          {sectionRows.map((row, index) =>
            renderRuleRow(row, index, sectionRows, scopeKey),
          )}
        </div>
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
                      <span style={{ display: 'grid', gap: 2 }}>
                        <span>{scene.label}</span>
                        <small
                          style={{
                            fontWeight: 400,
                            lineHeight: '18px',
                            opacity: 0.78,
                          }}
                        >
                          {scene.description}
                        </small>
                      </span>
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
                <div className="attribute-addable-content">
                  <div className="attribute-addable-name" title={category.name}>
                    {category.name}
                  </div>
                  <div className="attribute-addable-meta-row">
                    <span className="attribute-addable-type">
                      {ATTRIBUTE_TARGET_LABELS[category.target]}
                    </span>
                    <Button
                      aria-label={`添加${category.name}`}
                      disabled={saving}
                      icon={<PlusOutlined />}
                      loading={savingKey === getAddSavingKey(category.id)}
                      size="small"
                      title="添加"
                      onClick={() => handleAddCategory(category)}
                    >
                      添加
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </Space>
        ) : (
          <div className="attribute-addable-empty">
            <div className="attribute-addable-empty-title">
              当前场景暂无可添加属性
            </div>
            <Button
              size="small"
              type="link"
              onClick={() => {
                if (onOpenAttributeDefinitions) {
                  onOpenAttributeDefinitions();
                  return;
                }

                showActionMessage('请切换到“属性定义”页签创建属性', 'info');
              }}
            >
              去属性定义创建
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
};

export default AttributeUsageSettingsWorkspace;
