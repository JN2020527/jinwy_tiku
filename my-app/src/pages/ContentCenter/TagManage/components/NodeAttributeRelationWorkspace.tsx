import type {
  NodeAttributeRelation,
  NodeAttributeTargetType,
  TagCategory,
  TextbookVersion,
} from '@/services/tagSystem';
import {
  deleteNodeAttributeRelation,
  getKnowledgeTree,
  getNodeAttributeRelations,
  getTextbookChapters,
  getTextbookVersions,
  setNodeAttributeRelation,
} from '@/services/tagSystem';
import { TagsOutlined } from '@ant-design/icons';
import type { TreeProps } from 'antd';
import { Empty, message, Segmented, Select, Spin, Tree } from 'antd';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import './AttributeTagsPanel.less';
import './TagSystemTreePanel.less';
import TreeNodeTitle from './TreeNodeTitle';
import { SUBJECT_OPTIONS } from './attributeSettingsConstants';
import { getOptionList, sortBySort } from './attributeSettingsHelpers';
import {
  getCheckedNodeKeysForOption,
  getEnabledNodeAttributeCategories,
  getRelationCountsByAttribute,
  getRelationCountsByOption,
  NODE_ATTRIBUTE_TARGET_LABELS,
  NODE_ATTRIBUTE_TARGET_OPTIONS,
} from './nodeAttributeRelationHelpers';
import type { TreeNodeData } from './treeHelpers';
import { useTreeSearch } from './treeHelpers';

interface NodeAttributeRelationWorkspaceProps {
  tagCategories: TagCategory[];
}

interface WorkspaceContextSnapshot {
  targetType: NodeAttributeTargetType;
  grade: string;
  subject: string;
  semester?: string;
  textbookVersion?: string;
  activeAttributeId?: string;
  activeOptionId?: string;
}

interface SaveContextSnapshot {
  targetType: NodeAttributeTargetType;
  grade: string;
  subject: string;
  semester?: string;
  textbookVersion?: string;
  nodeId: string;
  attributeId: string;
  optionId: string;
}

const noopTreeAction = () => {};
const MIDDLE_EXAM_GRADE = 'middleExam';

const GRADE_OPTIONS = [
  { label: '中考', value: MIDDLE_EXAM_GRADE },
  { label: '七年级', value: 'grade7' },
  { label: '八年级', value: 'grade8' },
  { label: '九年级', value: 'grade9' },
];

const SEMESTER_OPTIONS = [
  { label: '上册', value: 'upper' },
  { label: '下册', value: 'lower' },
];

const getOptionLabel = (
  options: { label: string; value: string }[],
  value?: string,
) => options.find((option) => option.value === value)?.label || '';

const filterTextbookChaptersByContext = (
  nodes: TreeNodeData[],
  grade: string,
  semester?: string,
) => {
  const gradeLabel = getOptionLabel(GRADE_OPTIONS, grade);
  const semesterLabel = getOptionLabel(SEMESTER_OPTIONS, semester);

  return nodes.filter((node) => {
    const title = String(node.title || '');
    return (
      title.includes(gradeLabel) &&
      (!semesterLabel || title.includes(semesterLabel))
    );
  });
};

const collectTreeNodeKeys = (
  nodes: TreeNodeData[],
  keys = new Set<string>(),
) => {
  nodes.forEach((node) => {
    keys.add(String(node.key));
    if (node.children?.length) {
      collectTreeNodeKeys(node.children, keys);
    }
  });
  return keys;
};

const NodeAttributeRelationWorkspace: React.FC<
  NodeAttributeRelationWorkspaceProps
> = ({ tagCategories }) => {
  const [targetType, setTargetType] =
    useState<NodeAttributeTargetType>('knowledge');
  const [grade, setGrade] = useState(MIDDLE_EXAM_GRADE);
  const [semester, setSemester] = useState('upper');
  const [subject, setSubject] = useState('math');
  const [activeAttributeId, setActiveAttributeId] = useState<string>();
  const [activeOptionId, setActiveOptionId] = useState<string>();
  const [relations, setRelations] = useState<NodeAttributeRelation[]>([]);
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [textbookVersions, setTextbookVersions] = useState<TextbookVersion[]>(
    [],
  );
  const [textbookVersion, setTextbookVersion] = useState<string>();
  const [loadingTree, setLoadingTree] = useState(false);
  const [loadingRelations, setLoadingRelations] = useState(false);
  const [savingNodeId, setSavingNodeId] = useState<string>();
  const versionsRequestRef = useRef(0);
  const relationsRequestRef = useRef(0);
  const treeRequestRef = useRef(0);
  const savingRequestRef = useRef(0);
  const contextRef = useRef<WorkspaceContextSnapshot>({
    targetType: 'knowledge',
    grade: MIDDLE_EXAM_GRADE,
    subject: 'math',
  });
  const isMiddleExamGrade = grade === MIDDLE_EXAM_GRADE;
  const isSyncPreset = targetType === 'knowledge' && !isMiddleExamGrade;

  const categories = useMemo(
    () => getEnabledNodeAttributeCategories(tagCategories, targetType),
    [tagCategories, targetType],
  );
  const activeCategory = categories.find(
    (category) => category.id === activeAttributeId,
  );
  const options = useMemo(
    () => sortBySort(getOptionList(activeCategory, subject)),
    [activeCategory, subject],
  );
  const activeOption = options.find((option) => option.id === activeOptionId);
  const treeNodeKeySet = useMemo(
    () => collectTreeNodeKeys(treeData),
    [treeData],
  );
  const contextRelations = useMemo(
    () => relations.filter((relation) => treeNodeKeySet.has(relation.nodeId)),
    [relations, treeNodeKeySet],
  );
  const relationCountsByAttribute = useMemo(
    () => getRelationCountsByAttribute(contextRelations),
    [contextRelations],
  );
  const relationCountsByOption = useMemo(
    () =>
      activeAttributeId
        ? getRelationCountsByOption(contextRelations, activeAttributeId)
        : new Map<string, number>(),
    [activeAttributeId, contextRelations],
  );
  const checkedKeys = useMemo(
    () =>
      activeAttributeId && activeOptionId
        ? getCheckedNodeKeysForOption(
            contextRelations,
            activeAttributeId,
            activeOptionId,
          )
        : [],
    [activeAttributeId, activeOptionId, contextRelations],
  );
  const treeSearch = useTreeSearch(treeData);

  useEffect(() => {
    contextRef.current = {
      targetType,
      grade,
      subject,
      semester,
      textbookVersion,
      activeAttributeId,
      activeOptionId,
    };
  }, [
    activeAttributeId,
    activeOptionId,
    grade,
    semester,
    subject,
    targetType,
    textbookVersion,
  ]);

  const isSaveContextCurrent = useCallback((snapshot: SaveContextSnapshot) => {
    const current = contextRef.current;

    return (
      current.targetType === snapshot.targetType &&
      current.grade === snapshot.grade &&
      current.subject === snapshot.subject &&
      (snapshot.grade === MIDDLE_EXAM_GRADE ||
        (current.semester === snapshot.semester &&
          current.textbookVersion === snapshot.textbookVersion)) &&
      current.activeAttributeId === snapshot.attributeId &&
      current.activeOptionId === snapshot.optionId
    );
  }, []);

  useEffect(() => {
    if (targetType === 'topic' && !isMiddleExamGrade) {
      setGrade(MIDDLE_EXAM_GRADE);
    }
  }, [isMiddleExamGrade, targetType]);

  useEffect(() => {
    if (!categories.length) {
      setActiveAttributeId(undefined);
      return;
    }

    if (
      !activeAttributeId ||
      !categories.some((category) => category.id === activeAttributeId)
    ) {
      setActiveAttributeId(categories[0].id);
    }
  }, [activeAttributeId, categories]);

  useEffect(() => {
    if (!options.length) {
      setActiveOptionId(undefined);
      return;
    }

    if (
      !activeOptionId ||
      !options.some((option) => option.id === activeOptionId)
    ) {
      setActiveOptionId(options[0].id);
    }
  }, [activeOptionId, options]);

  useEffect(() => {
    const requestId = versionsRequestRef.current + 1;
    versionsRequestRef.current = requestId;

    if (!isSyncPreset) {
      setTextbookVersion(undefined);
      return;
    }

    const isCurrentKnowledgeRequest = () =>
      versionsRequestRef.current === requestId &&
      contextRef.current.targetType === 'knowledge' &&
      contextRef.current.grade !== MIDDLE_EXAM_GRADE;

    const fetchVersions = async () => {
      try {
        const res = await getTextbookVersions();
        if (!isCurrentKnowledgeRequest()) {
          return;
        }

        if (!res.success) {
          message.error(res.message || '获取教材版本失败');
          return;
        }

        setTextbookVersions(res.data);
        if (!res.data.length) {
          setTextbookVersion(undefined);
          return;
        }

        setTextbookVersion((current) =>
          current && res.data.some((version) => version.value === current)
            ? current
            : res.data[0].value,
        );
      } catch {
        if (isCurrentKnowledgeRequest()) {
          message.error('获取教材版本失败');
        }
      }
    };

    fetchVersions();
  }, [isSyncPreset]);

  const fetchRelations = useCallback(async () => {
    const requestId = relationsRequestRef.current + 1;
    relationsRequestRef.current = requestId;
    setLoadingRelations(true);
    try {
      const res = await getNodeAttributeRelations({ targetType, subject });
      if (relationsRequestRef.current !== requestId) {
        return;
      }

      if (!res.success) {
        message.error(res.message || '获取节点关联失败');
        return;
      }

      setRelations(res.data);
    } catch {
      if (relationsRequestRef.current === requestId) {
        message.error('获取节点关联失败');
      }
    } finally {
      if (relationsRequestRef.current === requestId) {
        setLoadingRelations(false);
      }
    }
  }, [subject, targetType]);

  useEffect(() => {
    fetchRelations();
  }, [fetchRelations]);

  const fetchTree = useCallback(async () => {
    const requestId = treeRequestRef.current + 1;
    treeRequestRef.current = requestId;
    setLoadingTree(true);
    try {
      if (targetType === 'knowledge') {
        if (isMiddleExamGrade) {
          const res = await getKnowledgeTree({ subject });
          if (treeRequestRef.current !== requestId) {
            return;
          }

          if (!res.success) {
            message.error(res.message || '获取知识点节点失败');
            return;
          }

          setTreeData(res.data as unknown as TreeNodeData[]);
          return;
        }

        if (!textbookVersion) {
          if (treeRequestRef.current === requestId) {
            setTreeData([]);
          }
          return;
        }

        const res = await getTextbookChapters(textbookVersion, subject);
        if (treeRequestRef.current !== requestId) {
          return;
        }

        if (!res.success) {
          message.error(res.message || '获取知识点节点失败');
          return;
        }

        setTreeData(
          filterTextbookChaptersByContext(
            res.data as unknown as TreeNodeData[],
            grade,
            semester,
          ),
        );
        return;
      }

      const res = await getKnowledgeTree({ subject });
      if (treeRequestRef.current !== requestId) {
        return;
      }

      if (!res.success) {
        message.error(res.message || '获取专题节点失败');
        return;
      }

      setTreeData(res.data as unknown as TreeNodeData[]);
    } catch {
      if (treeRequestRef.current === requestId) {
        message.error('获取节点树失败');
      }
    } finally {
      if (treeRequestRef.current === requestId) {
        setLoadingTree(false);
      }
    }
  }, [
    grade,
    isMiddleExamGrade,
    semester,
    subject,
    targetType,
    textbookVersion,
  ]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const handleCheck: TreeProps['onCheck'] = async (nextChecked, info) => {
    if (!activeAttributeId || !activeOptionId || !activeOption) return;

    const nodeId = String(info.node.key);
    const saveContext: SaveContextSnapshot = {
      targetType,
      grade,
      subject,
      semester,
      textbookVersion,
      nodeId,
      attributeId: activeAttributeId,
      optionId: activeOptionId,
    };
    const nextCheckedKeys = Array.isArray(nextChecked)
      ? nextChecked
      : nextChecked.checked;
    const checked = nextCheckedKeys.map(String).includes(nodeId);

    if (checked && activeOption.status === 'disabled') {
      message.warning('停用枚举值不可新增关联');
      return;
    }

    const saveRequestId = savingRequestRef.current + 1;
    savingRequestRef.current = saveRequestId;
    setSavingNodeId(nodeId);
    try {
      if (checked) {
        const res = await setNodeAttributeRelation({
          targetType: saveContext.targetType,
          subject: saveContext.subject,
          nodeId: saveContext.nodeId,
          attributeId: saveContext.attributeId,
          optionId: saveContext.optionId,
        });
        if (!res.success) {
          if (isSaveContextCurrent(saveContext)) {
            message.error(res.message || '节点关联保存失败');
          }
          return;
        }
        if (!isSaveContextCurrent(saveContext)) {
          return;
        }
        setRelations((current) => [
          ...current.filter(
            (relation) =>
              !(
                relation.targetType === saveContext.targetType &&
                relation.subject === saveContext.subject &&
                relation.nodeId === saveContext.nodeId &&
                relation.attributeId === saveContext.attributeId
              ),
          ),
          res.data,
        ]);
        message.success('节点关联已保存');
        return;
      }

      const res = await deleteNodeAttributeRelation({
        targetType: saveContext.targetType,
        subject: saveContext.subject,
        nodeId: saveContext.nodeId,
        attributeId: saveContext.attributeId,
      });
      if (!res.success) {
        if (isSaveContextCurrent(saveContext)) {
          message.error(res.message || '节点关联取消失败');
        }
        return;
      }
      if (!isSaveContextCurrent(saveContext)) {
        return;
      }
      setRelations((current) =>
        current.filter(
          (relation) =>
            !(
              relation.targetType === saveContext.targetType &&
              relation.subject === saveContext.subject &&
              relation.nodeId === saveContext.nodeId &&
              relation.attributeId === saveContext.attributeId
            ),
        ),
      );
      message.success('节点关联已取消');
    } catch {
      if (isSaveContextCurrent(saveContext)) {
        message.error('节点关联保存失败');
      }
    } finally {
      if (savingRequestRef.current === saveRequestId) {
        setSavingNodeId(undefined);
      }
    }
  };

  const activeTargetLabel = NODE_ATTRIBUTE_TARGET_LABELS[targetType];
  const treeLoading = loadingTree || loadingRelations;

  return (
    <div className="node-attribute-workbench">
      <section className="node-attribute-panel node-attribute-category-panel">
        <div className="attribute-panel-header">
          <div>
            <span className="attribute-panel-title">对象属性</span>
          </div>
        </div>
        <div className="node-attribute-panel-body">
          <div className="node-attribute-target-filter">
            <Segmented
              block
              aria-label="选择关联对象类型"
              options={[...NODE_ATTRIBUTE_TARGET_OPTIONS]}
              value={targetType}
              onChange={(value) =>
                setTargetType(value as NodeAttributeTargetType)
              }
            />
          </div>
          <div className="node-attribute-list">
            {categories.length ? (
              categories.map((category) => {
                const count = relationCountsByAttribute.get(category.id) || 0;
                return (
                  <button
                    key={category.id}
                    type="button"
                    className={`node-attribute-item${
                      category.id === activeAttributeId ? ' active' : ''
                    }`}
                    aria-pressed={category.id === activeAttributeId}
                    onClick={() => setActiveAttributeId(category.id)}
                  >
                    <span className="attribute-category-icon">
                      <TagsOutlined />
                    </span>
                    <span className="node-attribute-item-main">
                      <span className="node-attribute-item-name">
                        {category.name}
                      </span>
                      <span className="node-attribute-item-meta">
                        {count} 个节点
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={`暂无${activeTargetLabel}属性`}
              />
            )}
          </div>
        </div>
      </section>

      <section className="node-attribute-panel node-attribute-option-panel">
        <div className="attribute-panel-header">
          <div>
            <span className="attribute-panel-title">
              {activeCategory?.name || '枚举值'}
            </span>
          </div>
        </div>
        <Spin spinning={loadingRelations}>
          <div className="node-attribute-panel-body">
            <div className="node-attribute-list">
              {options.length ? (
                options.map((option) => {
                  const count = relationCountsByOption.get(option.id) || 0;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`node-attribute-item${
                        option.id === activeOptionId ? ' active' : ''
                      }${option.status === 'disabled' ? ' disabled' : ''}`}
                      aria-pressed={option.id === activeOptionId}
                      onClick={() => setActiveOptionId(option.id)}
                    >
                      <span
                        className="attribute-category-icon"
                        style={{ color: option.color || undefined }}
                      >
                        <TagsOutlined />
                      </span>
                      <span className="node-attribute-item-main">
                        <span className="node-attribute-item-name">
                          {option.name}
                        </span>
                        <span className="node-attribute-item-meta">
                          {count} 个节点
                          {option.status === 'disabled' ? ' · 停用' : ''}
                        </span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无枚举值"
                />
              )}
            </div>
          </div>
        </Spin>
      </section>

      <section className="node-attribute-panel node-attribute-tree-panel">
        <div className="attribute-panel-header">
          <div>
            <span className="attribute-panel-title">节点树</span>
          </div>
        </div>
        <div
          className={`node-attribute-tree-toolbar${
            isSyncPreset ? ' sync' : ''
          }`}
        >
          <Select
            value={grade}
            onChange={setGrade}
            options={
              targetType === 'topic'
                ? GRADE_OPTIONS.filter(
                    (option) => option.value === MIDDLE_EXAM_GRADE,
                  )
                : GRADE_OPTIONS
            }
            aria-label="选择年级"
          />
          {isSyncPreset ? (
            <Select
              value={semester}
              onChange={setSemester}
              options={SEMESTER_OPTIONS}
              aria-label="选择学期"
            />
          ) : null}
          <Select
            value={subject}
            onChange={setSubject}
            options={SUBJECT_OPTIONS}
            aria-label="选择学科"
          />
          {isSyncPreset ? (
            <Select
              value={textbookVersion}
              onChange={setTextbookVersion}
              options={textbookVersions}
              placeholder="教材版本"
              aria-label="选择教材版本"
            />
          ) : null}
        </div>
        <Spin spinning={treeLoading}>
          <div className="node-attribute-panel-body">
            {treeData.length ? (
              <>
                <Tree
                  key={`${targetType}-${grade}-${semester}-${subject}-${
                    textbookVersion || 'middle-exam'
                  }`}
                  treeData={treeData}
                  checkable
                  checkStrictly
                  selectable={false}
                  checkedKeys={checkedKeys}
                  onCheck={handleCheck}
                  onExpand={treeSearch.onExpand}
                  expandedKeys={treeSearch.expandedKeys}
                  autoExpandParent={treeSearch.autoExpandParent}
                  showLine
                  blockNode
                  titleRender={(node: TreeNodeData) => (
                    <TreeNodeTitle
                      nodeData={node}
                      searchValue=""
                      actionsVisible={false}
                      onAddChild={noopTreeAction}
                      onEdit={noopTreeAction}
                      onDelete={noopTreeAction}
                    />
                  )}
                  fieldNames={{
                    title: 'title',
                    key: 'key',
                    children: 'children',
                  }}
                  height={560}
                />
                {savingNodeId ? (
                  <div className="node-attribute-saving">正在保存…</div>
                ) : null}
              </>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={`暂无${activeTargetLabel}节点`}
              />
            )}
          </div>
        </Spin>
      </section>
    </div>
  );
};

export default NodeAttributeRelationWorkspace;
