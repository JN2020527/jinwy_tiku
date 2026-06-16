import type {
  AttributeControlType,
  AttributeItem,
  AttributeScene,
  AttributeStatus,
  AttributeTarget,
  AttributeValueType,
  TagCategory,
} from '@/services/tagSystem';
import {
  addAttribute,
  addTagCategory,
  deleteAttribute,
  deleteTagCategory,
  updateAttribute,
  updateTagCategory,
} from '@/services/tagSystem';
import {
  DeleteOutlined,
  DragOutlined,
  EditOutlined,
  PlusOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import {
  ModalForm,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import {
  Button,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Space,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import type { InputRef } from 'antd';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import './AttributeTagsPanel.less';

interface AttributeTagsPanelProps {
  tagCategories: TagCategory[];
  selectedGrade: string;
  selectedSubject: string;
  onRefresh: () => void;
}

interface CategoryFormValues {
  name: string;
  code?: string;
  target?: AttributeTarget;
  valueType?: AttributeValueType;
  controlType?: AttributeControlType;
  required?: boolean;
  description?: string;
  contentCompletionEnabled?: boolean;
  contentCompletionRequired?: boolean;
  taggingEnabled?: boolean;
  taggingRequired?: boolean;
  frontDisplayEnabled?: boolean;
  displayVisible?: boolean;
  displayFilterable?: boolean;
  displayName?: string;
}

interface OptionFormValues {
  name: string;
  displayName?: string;
  value?: string;
  color?: string;
  status?: AttributeStatus;
  frontVisible?: boolean;
}

const TARGET_OPTIONS = [
  { label: '试题', value: 'question' },
  { label: '试卷', value: 'paper' },
  { label: '通用', value: 'common' },
];

const VALUE_TYPE_OPTIONS = [
  { label: '文本', value: 'text' },
  { label: '数字', value: 'number' },
  { label: '单选', value: 'single' },
  { label: '多选', value: 'multiple' },
  { label: '树形', value: 'tree' },
];

const CONTROL_TYPE_OPTIONS = [
  { label: '输入框', value: 'input' },
  { label: '下拉选择', value: 'select' },
  { label: '复选框', value: 'checkbox' },
  { label: '单选框', value: 'radio' },
  { label: '星级', value: 'rate' },
  { label: '树选择', value: 'treeSelect' },
];

const STATUS_OPTIONS = [
  { label: '启用', value: 'enabled' },
  { label: '停用', value: 'disabled' },
];

const COLOR_OPTIONS = [
  { label: '默认', value: 'default' },
  { label: '蓝色', value: 'blue' },
  { label: '绿色', value: 'green' },
  { label: '橙色', value: 'orange' },
  { label: '红色', value: 'red' },
  { label: '紫色', value: 'purple' },
  { label: '青色', value: 'cyan' },
  { label: '金色', value: 'gold' },
];

const TARGET_LABELS: Record<string, string> = {
  question: '试题',
  paper: '试卷',
  common: '通用',
};

const VALUE_TYPE_LABELS: Record<string, string> = {
  text: '文本',
  number: '数字',
  single: '单选',
  multiple: '多选',
  tree: '树形',
};

const CONTROL_TYPE_LABELS: Record<string, string> = {
  input: '输入框',
  select: '下拉选择',
  checkbox: '复选框',
  radio: '单选框',
  rate: '星级',
  treeSelect: '树选择',
};

const STATUS_LABELS: Record<string, string> = {
  enabled: '启用',
  disabled: '停用',
};

const SCENE_LABELS: Record<string, string> = {
  contentCompletion: '内容完善',
  tagging: '打标',
  frontDisplay: '前台展示',
};

const normalizeOptionOrder = (tags: AttributeItem[]) =>
  tags.map((tag, index) => ({
    ...tag,
    sort: index,
  }));

const getLabel = (
  map: Record<string, string>,
  value?: string,
  fallback = '未配置',
) => (value ? map[value] || value : fallback);

const getSceneRule = (category: TagCategory, scene: AttributeScene) =>
  category.sceneRules?.find((rule) => rule.scene === scene);

const buildCategoryRulePayload = (values: CategoryFormValues) => {
  const {
    contentCompletionEnabled,
    contentCompletionRequired,
    taggingEnabled,
    taggingRequired,
    frontDisplayEnabled,
    displayVisible,
    displayFilterable,
    displayName,
    ...categoryValues
  } = values;

  return {
    categoryValues,
    ruleValues: {
      sceneRules: [
        {
          scene: 'contentCompletion' as AttributeScene,
          enabled: !!contentCompletionEnabled,
          required: !!contentCompletionRequired,
        },
        {
          scene: 'tagging' as AttributeScene,
          enabled: !!taggingEnabled,
          required: !!taggingRequired,
        },
        {
          scene: 'frontDisplay' as AttributeScene,
          enabled: !!frontDisplayEnabled,
        },
      ],
      displayRule: {
        visible: !!displayVisible,
        filterable: !!displayFilterable,
        displayName: displayName || values.name,
      },
    },
  };
};

const renderBooleanTag = (
  value?: boolean,
  trueText = '是',
  falseText = '否',
) => {
  if (value === undefined) {
    return <Tag>未配置</Tag>;
  }

  return (
    <Tag color={value ? 'green' : 'default'}>
      {value ? trueText : falseText}
    </Tag>
  );
};

const renderStatePill = (
  value?: boolean,
  trueText = '启用',
  falseText = '停用',
) => {
  const stateClass =
    value === undefined ? 'unknown' : value ? 'enabled' : 'disabled';

  return (
    <span className={`attribute-state-pill ${stateClass}`}>
      {value === undefined ? '未配置' : value ? trueText : falseText}
    </span>
  );
};

const renderOptionStatus = (status?: AttributeStatus) =>
  renderStatePill(
    status === undefined ? undefined : status === 'enabled',
    STATUS_LABELS.enabled,
    STATUS_LABELS.disabled,
  );

const getOptionMetaText = (item: AttributeItem) => {
  const name = item.name.trim();
  const displayName = item.displayName?.trim();

  if (displayName && displayName !== name) {
    return `展示名：${displayName}`;
  }

  return '';
};

const AttributeTagsPanel: React.FC<AttributeTagsPanelProps> = ({
  tagCategories,
  selectedGrade,
  selectedSubject,
  onRefresh,
}) => {
  const tagContext = useMemo(
    () => ({
      grade: selectedGrade,
      subject: selectedSubject,
    }),
    [selectedGrade, selectedSubject],
  );

  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [draggingOptionId, setDraggingOptionId] = useState<string>('');
  const [dragOverOptionId, setDragOverOptionId] = useState<string>('');

  const [catModalVisible, setCatModalVisible] = useState<boolean>(false);
  const [catModalType, setCatModalType] = useState<'add' | 'edit'>('add');
  const [currentCategoryId, setCurrentCategoryId] = useState<string>('');
  const [catForm] = Form.useForm();

  const [attrModalVisible, setAttrModalVisible] = useState<boolean>(false);
  const [selectedAttr, setSelectedAttr] = useState<AttributeItem | null>(null);
  const [attrForm] = Form.useForm();
  const [newTagName, setNewTagName] = useState<string>('');
  const [optionCreateVisible, setOptionCreateVisible] =
    useState<boolean>(false);
  const optionCreateInputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (!tagCategories.length) {
      setActiveCategoryId('');
      return;
    }

    const stillExists = tagCategories.some(
      (item) => item.id === activeCategoryId,
    );
    if (!activeCategoryId || !stillExists) {
      setActiveCategoryId(tagCategories[0].id);
    }
  }, [activeCategoryId, tagCategories]);

  const activeCategory = useMemo(
    () => tagCategories.find((item) => item.id === activeCategoryId),
    [activeCategoryId, tagCategories],
  );

  const activeTags = useMemo(
    () => activeCategory?.tags || [],
    [activeCategory?.tags],
  );

  const attributeSceneRules = useMemo(
    () =>
      (activeCategory?.sceneRules || []).filter(
        (rule) => rule.scene !== 'frontDisplay',
      ),
    [activeCategory?.sceneRules],
  );

  const frontDisplaySceneRule = useMemo(
    () =>
      activeCategory?.sceneRules?.find(
        (rule) => rule.scene === 'frontDisplay',
      ),
    [activeCategory?.sceneRules],
  );

  useEffect(() => {
    setNewTagName('');
    setOptionCreateVisible(false);
    setDraggingOptionId('');
    setDragOverOptionId('');
  }, [activeCategoryId]);

  useEffect(() => {
    if (optionCreateVisible) {
      optionCreateInputRef.current?.focus();
    }
  }, [optionCreateVisible]);

  const totalTagCount = useMemo(
    () =>
      tagCategories.reduce(
        (total, category) => total + (category.tags?.length || 0),
        0,
      ),
    [tagCategories],
  );

  const persistOptionOrder = useCallback(
    async (nextTags: AttributeItem[]) => {
      if (!activeCategory) return;

      const payload = {
        ...tagContext,
        ...activeCategory,
        tags: normalizeOptionOrder(nextTags),
      };
      try {
        const res = await updateTagCategory(payload);
        if (res.success) {
          message.success('排序已保存');
          onRefresh();
        } else {
          message.error('排序保存失败');
        }
      } catch {
        message.error('排序保存失败');
      }
    },
    [activeCategory, onRefresh, tagContext],
  );

  const moveOption = useCallback(
    async (sourceId: string, targetId: string) => {
      if (!activeCategory || sourceId === targetId) return;

      const fromIndex = activeTags.findIndex((item) => item.id === sourceId);
      const toIndex = activeTags.findIndex((item) => item.id === targetId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

      const nextTags = [...activeTags];
      const [movedTag] = nextTags.splice(fromIndex, 1);
      nextTags.splice(toIndex, 0, movedTag);
      await persistOptionOrder(nextTags);
    },
    [activeCategory, activeTags, persistOptionOrder],
  );

  const handleOptionDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    item: AttributeItem,
  ) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.id);
    setDraggingOptionId(item.id);
  };

  const handleOptionDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    item: AttributeItem,
  ) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverOptionId(item.id);
  };

  const handleOptionDrop = async (
    event: React.DragEvent<HTMLDivElement>,
    item: AttributeItem,
  ) => {
    event.preventDefault();
    const sourceId =
      draggingOptionId || event.dataTransfer.getData('text/plain');
    setDraggingOptionId('');
    setDragOverOptionId('');
    if (sourceId) {
      await moveOption(sourceId, item.id);
    }
  };

  const handleOptionDragEnd = () => {
    setDraggingOptionId('');
    setDragOverOptionId('');
  };

  const handleAddCategory = () => {
    setCatModalType('add');
    setCurrentCategoryId('');
    catForm.resetFields();
    catForm.setFieldsValue({
      target: 'question',
      valueType: 'single',
      controlType: 'select',
      required: false,
      contentCompletionEnabled: true,
      contentCompletionRequired: false,
      taggingEnabled: true,
      taggingRequired: false,
      frontDisplayEnabled: true,
      displayVisible: true,
      displayFilterable: false,
    });
    setCatModalVisible(true);
  };

  const handleEditCategory = (category: TagCategory) => {
    const contentCompletionRule = getSceneRule(
      category,
      'contentCompletion',
    );
    const taggingRule = getSceneRule(category, 'tagging');
    const frontDisplayRule = getSceneRule(category, 'frontDisplay');

    setCatModalType('edit');
    setCurrentCategoryId(category.id);
    catForm.setFieldsValue({
      name: category.name,
      code: category.code,
      target: category.target,
      valueType: category.valueType,
      controlType: category.controlType,
      required: category.required,
      description: category.description,
      contentCompletionEnabled: contentCompletionRule?.enabled ?? false,
      contentCompletionRequired: contentCompletionRule?.required ?? false,
      taggingEnabled: taggingRule?.enabled ?? false,
      taggingRequired: taggingRule?.required ?? false,
      frontDisplayEnabled: frontDisplayRule?.enabled ?? false,
      displayVisible: category.displayRule?.visible ?? false,
      displayFilterable: category.displayRule?.filterable ?? false,
      displayName: category.displayRule?.displayName || category.name,
    });
    setCatModalVisible(true);
  };

  const handleCatModalFinish = async (values: CategoryFormValues) => {
    const currentCategory = tagCategories.find(
      (item) => item.id === currentCategoryId,
    );
    const { categoryValues, ruleValues } = buildCategoryRulePayload(values);
    const res =
      catModalType === 'add'
        ? await addTagCategory({
            ...categoryValues,
            ...ruleValues,
            ...tagContext,
            tags: [],
          })
        : await updateTagCategory({
            ...tagContext,
            ...currentCategory,
            ...categoryValues,
            ...ruleValues,
            id: currentCategoryId,
            tags: currentCategory?.tags || [],
          });

    if (res.success) {
      message.success(catModalType === 'add' ? '分类添加成功' : '分类更新成功');
      setCatModalVisible(false);
      onRefresh();
      return true;
    }
    return false;
  };

  const handleDeleteCategory = (category: TagCategory) => {
    Modal.confirm({
      title: '确认删除分类',
      content: `确定要删除属性定义 "${category.name}" 及其所有选项吗？`,
      onOk: async () => {
        const res = await deleteTagCategory(category.id, tagContext);
        if (res.success) {
          message.success('删除成功');
          onRefresh();
        } else {
          message.error('删除失败');
        }
      },
    });
  };

  const handleQuickAddAttr = async () => {
    const name = newTagName.trim();
    if (!activeCategory || !name) return;

    const payload = {
      ...tagContext,
      categoryId: activeCategory.id,
      name,
      color: 'default',
      status: 'enabled' as AttributeStatus,
      frontVisible: true,
    };
    const res = await addAttribute(payload);
    if (res.success) {
      message.success('添加成功');
      setNewTagName('');
      setOptionCreateVisible(false);
      onRefresh();
    }
  };

  const handleCancelQuickAddAttr = () => {
    setNewTagName('');
    setOptionCreateVisible(false);
  };

  const handleEditAttr = (item: AttributeItem) => {
    setSelectedAttr(item);
    attrForm.setFieldsValue({
      name: item.name,
      displayName: item.displayName,
      value: item.value,
      color: item.color || 'default',
      status: item.status || 'enabled',
      frontVisible: item.frontVisible ?? true,
    });
    setAttrModalVisible(true);
  };

  const handleAttrModalFinish = async (values: OptionFormValues) => {
    if (!activeCategory || !selectedAttr) return false;

    const payload = {
      ...tagContext,
      ...selectedAttr,
      ...values,
      id: selectedAttr.id,
      categoryId: activeCategory.id,
    };
    const res = await updateAttribute(payload);

    if (res.success) {
      message.success('修改成功');
      setAttrModalVisible(false);
      setSelectedAttr(null);
      onRefresh();
      return true;
    }
    return false;
  };

  const handleDeleteAttr = (item: AttributeItem) => {
    if (!activeCategory) return;

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选项 "${item.name}" 吗？`,
      onOk: async () => {
        const res = await deleteAttribute(
          item.id,
          activeCategory.id,
          tagContext,
        );
        if (res.success) {
          message.success('删除成功');
          onRefresh();
        } else {
          message.error('删除失败');
        }
      },
    });
  };

  return (
    <div className="attribute-tags-panel">
      <aside className="attribute-category-panel">
        <div className="attribute-panel-header">
          <div>
            <div className="attribute-panel-title">属性定义</div>
            <div className="attribute-panel-meta">
              {tagCategories.length} 个定义 / {totalTagCount} 个选项
            </div>
          </div>
          <Tooltip title="新增属性定义">
            <Button
              type="primary"
              shape="circle"
              aria-label="新增属性定义"
              icon={<PlusOutlined />}
              onClick={handleAddCategory}
            />
          </Tooltip>
        </div>

        <div
          className="attribute-category-list"
          role="list"
          aria-label="属性定义列表"
        >
          {tagCategories.length ? (
            tagCategories.map((category) => {
              const active = category.id === activeCategoryId;
              return (
                <div
                  key={category.id}
                  className={
                    active
                      ? 'attribute-category-item active'
                      : 'attribute-category-item'
                  }
                  role="listitem"
                >
                  <button
                    type="button"
                    className="attribute-category-trigger"
                    aria-current={active ? 'true' : undefined}
                    aria-pressed={active}
                    onClick={() => setActiveCategoryId(category.id)}
                  >
                    <span className="attribute-category-icon">
                      <TagsOutlined />
                    </span>
                    <span className="attribute-category-main">
                      <span className="attribute-category-name">
                        {category.name}
                      </span>
                      <span className="attribute-category-count">
                        {category.tags?.length || 0} 个选项
                        {category.code ? ` / ${category.code}` : ''}
                      </span>
                    </span>
                  </button>
                  <Space size={2} className="attribute-category-actions">
                    <Tooltip title="编辑属性定义">
                      <Button
                        type="text"
                        size="small"
                        aria-label={`编辑属性定义 ${category.name}`}
                        icon={<EditOutlined />}
                        onClick={() => handleEditCategory(category)}
                      />
                    </Tooltip>
                    <Tooltip title="删除属性定义">
                      <Button
                        type="text"
                        danger
                        size="small"
                        aria-label={`删除属性定义 ${category.name}`}
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteCategory(category)}
                      />
                    </Tooltip>
                  </Space>
                </div>
              );
            })
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无属性定义"
            />
          )}
        </div>
      </aside>

      <section className="attribute-option-panel" aria-label="属性选项列表">
        {activeCategory ? (
          <>
            <div className="attribute-panel-header">
              <div>
                <div className="attribute-panel-title">选项值</div>
                <div className="attribute-panel-meta">
                  当前属性：{activeCategory.name} / {activeTags.length} 个选项
                  {activeCategory.description
                    ? ` / ${activeCategory.description}`
                    : ''}
                  {' / 前台按当前顺序展示'}
                </div>
              </div>
            </div>

            <div
              className="attribute-option-list"
              role="list"
              aria-label={`${activeCategory.name}选项`}
            >
              <div className="attribute-option-create">
                {optionCreateVisible ? (
                  <Space.Compact className="attribute-tag-create">
                    <Input
                      ref={optionCreateInputRef}
                      aria-label="快速新增属性选项名称"
                      placeholder="输入选项名称"
                      value={newTagName}
                      onChange={(event) => setNewTagName(event.target.value)}
                      onPressEnter={handleQuickAddAttr}
                    />
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleQuickAddAttr}
                      disabled={!newTagName.trim()}
                    >
                      添加
                    </Button>
                    <Button onClick={handleCancelQuickAddAttr}>取消</Button>
                  </Space.Compact>
                ) : (
                  <Button
                    className="attribute-option-create-trigger"
                    icon={<PlusOutlined />}
                    onClick={() => setOptionCreateVisible(true)}
                  >
                    添加选项
                  </Button>
                )}
              </div>

              {activeTags.length ? (
                activeTags.map((item) => {
                  const optionIndex = activeTags.findIndex(
                    (tag) => tag.id === item.id,
                  );
                  const optionMetaText = getOptionMetaText(item);
                  const rowClassName = [
                    'attribute-option-item',
                    draggingOptionId === item.id ? 'dragging' : '',
                    dragOverOptionId === item.id ? 'drag-over' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <div
                      key={item.id}
                      className={rowClassName}
                      role="listitem"
                      draggable
                      onDragStart={(event) =>
                        handleOptionDragStart(event, item)
                      }
                      onDragOver={(event) => handleOptionDragOver(event, item)}
                      onDrop={(event) => handleOptionDrop(event, item)}
                      onDragEnd={handleOptionDragEnd}
                    >
                      <div className="attribute-option-main">
                        <span className="attribute-option-drag">
                          <DragOutlined />
                        </span>
                        <span
                          className="attribute-option-sort"
                          aria-label={`第 ${optionIndex + 1} 项`}
                        >
                          {optionIndex + 1}
                        </span>
                        <span className="attribute-option-content">
                          <span className="attribute-option-name-row">
                            <span className="attribute-option-name">
                              {item.name}
                            </span>
                          </span>
                          {optionMetaText ? (
                            <span className="attribute-option-subtitle">
                              {optionMetaText}
                            </span>
                          ) : null}
                        </span>
                      </div>

                      <span className="attribute-option-status">
                        {renderOptionStatus(item.status)}
                      </span>

                      <Space size={2} className="attribute-option-actions">
                        <Tooltip title="编辑选项">
                          <Button
                            type="text"
                            size="small"
                            aria-label={`编辑选项 ${item.name}`}
                            icon={<EditOutlined />}
                            onClick={() => handleEditAttr(item)}
                          />
                        </Tooltip>
                        <Tooltip title="删除选项">
                          <Button
                            type="text"
                            danger
                            size="small"
                            aria-label={`删除选项 ${item.name}`}
                            icon={<DeleteOutlined />}
                            onClick={() => handleDeleteAttr(item)}
                          />
                        </Tooltip>
                      </Space>
                    </div>
                  );
                })
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无选项"
                />
              )}
            </div>
          </>
        ) : (
          <div className="attribute-workspace-empty">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无属性定义"
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddCategory}
            >
              添加属性定义
            </Button>
          </div>
        )}
      </section>

      <aside className="attribute-rule-panel" aria-label="属性规则">
        {activeCategory ? (
          <>
            <div className="attribute-panel-header">
              <div>
                <div className="attribute-panel-title">属性规则</div>
                <div className="attribute-panel-meta">
                  当前属性：{activeCategory.name}
                </div>
              </div>
              <Tooltip title="编辑规则">
                <Button
                  size="small"
                  aria-label={`编辑规则 ${activeCategory.name}`}
                  icon={<EditOutlined />}
                  onClick={() => handleEditCategory(activeCategory)}
                >
                  编辑规则
                </Button>
              </Tooltip>
            </div>

            <div className="attribute-rule-content">
              <section className="attribute-rule-section">
                <h3>使用场景</h3>
                {attributeSceneRules.length ? (
                  <div className="attribute-scene-list">
                    {attributeSceneRules.map((rule) => (
                      <div className="attribute-scene-item" key={rule.scene}>
                        <span>{getLabel(SCENE_LABELS, rule.scene)}</span>
                        <Space size={4} wrap>
                          {renderStatePill(rule.enabled)}
                          {rule.required !== undefined
                            ? renderBooleanTag(rule.required, '必填', '非必填')
                            : null}
                        </Space>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="attribute-rule-empty">暂无使用场景</div>
                )}
              </section>

              <section className="attribute-rule-section">
                <h3>前台展示配置</h3>
                <dl className="attribute-rule-list">
                  <dt>规则状态</dt>
                  <dd>
                    {renderStatePill(frontDisplaySceneRule?.enabled)}
                  </dd>
                  <dt>展示名称</dt>
                  <dd>{activeCategory.displayRule?.displayName || '未配置'}</dd>
                  <dt>是否展示</dt>
                  <dd>
                    {renderBooleanTag(
                      activeCategory.displayRule?.visible,
                      '展示',
                      '隐藏',
                    )}
                  </dd>
                  <dt>是否可筛选</dt>
                  <dd>
                    {renderBooleanTag(
                      activeCategory.displayRule?.filterable,
                      '可筛选',
                      '不可筛选',
                    )}
                  </dd>
                </dl>
              </section>

              <section className="attribute-rule-section">
                <h3>字段定义</h3>
                <dl className="attribute-rule-list">
                  <dt>属性编码</dt>
                  <dd>{activeCategory.code || '未配置'}</dd>
                  <dt>适用对象</dt>
                  <dd>{getLabel(TARGET_LABELS, activeCategory.target)}</dd>
                  <dt>字段类型</dt>
                  <dd>
                    {getLabel(VALUE_TYPE_LABELS, activeCategory.valueType)}
                  </dd>
                  <dt>控件类型</dt>
                  <dd>
                    {getLabel(CONTROL_TYPE_LABELS, activeCategory.controlType)}
                  </dd>
                  <dt>是否必填</dt>
                  <dd>
                    {renderBooleanTag(
                      activeCategory.required,
                      '必填',
                      '非必填',
                    )}
                  </dd>
                  <dt>描述</dt>
                  <dd>{activeCategory.description || '暂无描述'}</dd>
                </dl>
              </section>
            </div>
          </>
        ) : (
          <div className="attribute-workspace-empty">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="请选择属性定义"
            />
          </div>
        )}
      </aside>

      <ModalForm<CategoryFormValues>
        title={catModalType === 'add' ? '添加属性定义' : '编辑属性定义'}
        open={catModalVisible}
        onOpenChange={(open) => {
          setCatModalVisible(open);
          if (!open) {
            setCurrentCategoryId('');
          }
        }}
        form={catForm}
        onFinish={handleCatModalFinish}
        width={640}
      >
        <Tabs
          className="attribute-definition-tabs"
          defaultActiveKey="basic"
          items={[
            {
              key: 'basic',
              label: '基础信息',
              forceRender: true,
              children: (
                <>
                  <ProFormText
                    name="name"
                    label="属性名称"
                    rules={[{ required: true, message: '请输入属性名称' }]}
                    placeholder="例如：难度、年份、来源"
                  />
                  <ProFormText
                    name="code"
                    label="字段编码"
                    placeholder="例如：difficulty"
                  />
                  <ProFormSelect
                    name="target"
                    label="适用对象"
                    options={TARGET_OPTIONS}
                  />
                  <ProFormSelect
                    name="valueType"
                    label="字段类型"
                    options={VALUE_TYPE_OPTIONS}
                  />
                  <ProFormSelect
                    name="controlType"
                    label="控件类型"
                    options={CONTROL_TYPE_OPTIONS}
                  />
                  <ProFormSwitch
                    name="required"
                    label="是否必填"
                    fieldProps={{
                      checkedChildren: '必填',
                      unCheckedChildren: '非必填',
                    }}
                  />
                  <ProFormTextArea
                    name="description"
                    label="描述"
                    placeholder="说明该属性用于哪些运营场景"
                  />
                </>
              ),
            },
            {
              key: 'scene',
              label: '使用场景',
              forceRender: true,
              children: (
                <>
                  <ProFormSwitch
                    name="contentCompletionEnabled"
                    label="用于内容完善"
                    fieldProps={{
                      checkedChildren: '启用',
                      unCheckedChildren: '停用',
                    }}
                  />
                  <ProFormSwitch
                    name="contentCompletionRequired"
                    label="内容完善必填"
                    fieldProps={{
                      checkedChildren: '必填',
                      unCheckedChildren: '非必填',
                    }}
                  />
                  <ProFormSwitch
                    name="taggingEnabled"
                    label="用于打标"
                    fieldProps={{
                      checkedChildren: '启用',
                      unCheckedChildren: '停用',
                    }}
                  />
                  <ProFormSwitch
                    name="taggingRequired"
                    label="打标必填"
                    fieldProps={{
                      checkedChildren: '必填',
                      unCheckedChildren: '非必填',
                    }}
                  />
                </>
              ),
            },
            {
              key: 'display',
              label: '前台展示',
              forceRender: true,
              children: (
                <>
                  <ProFormSwitch
                    name="frontDisplayEnabled"
                    label="用于前台展示"
                    fieldProps={{
                      checkedChildren: '启用',
                      unCheckedChildren: '停用',
                    }}
                  />
                  <ProFormSwitch
                    name="displayVisible"
                    label="前台展示"
                    fieldProps={{
                      checkedChildren: '展示',
                      unCheckedChildren: '隐藏',
                    }}
                  />
                  <ProFormSwitch
                    name="displayFilterable"
                    label="前台筛选"
                    fieldProps={{
                      checkedChildren: '可筛选',
                      unCheckedChildren: '不可筛选',
                    }}
                  />
                  <ProFormText name="displayName" label="前台展示名称" />
                </>
              ),
            },
          ]}
        />
      </ModalForm>

      <ModalForm<OptionFormValues>
        title="编辑属性选项"
        open={attrModalVisible}
        onOpenChange={(open) => {
          setAttrModalVisible(open);
          if (!open) {
            setSelectedAttr(null);
          }
        }}
        form={attrForm}
        onFinish={handleAttrModalFinish}
        width={520}
      >
        <ProFormText
          name="name"
          label="选项名称"
          rules={[{ required: true, message: '请输入选项名称' }]}
        />
        <ProFormText name="displayName" label="展示名称" />
        <ProFormText name="value" label="取值" />
        <ProFormSelect name="color" label="颜色" options={COLOR_OPTIONS} />
        <ProFormSelect name="status" label="状态" options={STATUS_OPTIONS} />
        <ProFormSwitch
          name="frontVisible"
          label="前台展示"
          fieldProps={{
            checkedChildren: '展示',
            unCheckedChildren: '隐藏',
          }}
        />
      </ModalForm>
    </div>
  );
};

export default AttributeTagsPanel;
