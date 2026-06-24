import type {
  AttributeUsageRule,
  KnowledgeNode,
  NodeAttributeRelation,
  TagCategory,
  TextbookChapter,
  TextbookVersion,
} from '@/services/tagSystem';
import {
  addKnowledgeNode,
  addTextbookChapter,
  deleteKnowledgeNode,
  deleteTextbookChapter,
  getAttributeUsageRules,
  getKnowledgeTree,
  getNodeAttributeRelations,
  getTagCategories,
  getTextbookChapters,
  getTextbookVersions,
  moveKnowledgeNode,
  moveTextbookChapter,
  updateKnowledgeNode,
  updateTextbookChapter,
} from '@/services/tagSystem';
import { HolderOutlined, SearchOutlined } from '@ant-design/icons';
import type { TreeProps } from 'antd';
import {
  Button,
  Card,
  Input,
  message,
  Modal,
  Select,
  Tag,
  Tooltip,
  Tree,
} from 'antd';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getCategoryMap,
  getDisplayAttributeIds,
  getOptionMap,
} from './nodeAttributeRelationHelpers';
import './TagSystemTreePanel.less';
import {
  getTreeFilterOptionLabel,
  KNOWLEDGE_TREE_CONTEXT_OPTIONS,
  MIDDLE_EXAM_TREE_VALUE,
  SEMESTER_OPTIONS,
} from './treeFilterConstants';
import type { TreeNodeData } from './treeHelpers';
import {
  allowCrossParentTreeDrop,
  appendTreeNode,
  getTreeMoveRequest,
  useTreeSearch,
} from './treeHelpers';
import TreeNodeTitle from './TreeNodeTitle';

interface SelectOption {
  label: string;
  value: string;
}

interface KnowledgeTreePanelProps {
  selectedSubject: string;
  subjectOptions: SelectOption[];
  onSubjectChange: (subject: string) => void;
}

interface InlineEditState {
  key: React.Key;
  mode: 'add' | 'edit';
  parentKey?: React.Key | null;
  initialValue: string;
  description?: string;
  saving?: boolean;
}

const createDraftNodeKey = () => `draft-${Date.now()}`;

const filterTextbookChaptersByContext = (
  nodes: TreeNodeData[],
  treeContext: string,
  semester: string,
) => {
  const gradeLabel = getTreeFilterOptionLabel(
    KNOWLEDGE_TREE_CONTEXT_OPTIONS,
    treeContext,
  );
  const semesterLabel = getTreeFilterOptionLabel(SEMESTER_OPTIONS, semester);

  return nodes.filter((node) => {
    const title = String(node.title || '');
    return (
      title.includes(gradeLabel) &&
      (!semesterLabel || title.includes(semesterLabel))
    );
  });
};

const KnowledgeTreePanel: React.FC<KnowledgeTreePanelProps> = ({
  selectedSubject,
  subjectOptions,
  onSubjectChange,
}) => {
  const [selectedTreeContext, setSelectedTreeContext] = useState<string>(
    MIDDLE_EXAM_TREE_VALUE,
  );
  const [selectedSemester, setSelectedSemester] = useState<string>('upper');
  const [textbookVersions, setTextbookVersions] = useState<TextbookVersion[]>(
    [],
  );
  const [selectedTextbookVersion, setSelectedTextbookVersion] =
    useState<string>();
  const [knowledgeTree, setKnowledgeTree] = useState<
    (KnowledgeNode | TextbookChapter)[]
  >([]);
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [usageRules, setUsageRules] = useState<AttributeUsageRule[]>([]);
  const [nodeRelations, setNodeRelations] = useState<NodeAttributeRelation[]>(
    [],
  );
  const treeRequestIdRef = useRef(0);
  const versionsRequestIdRef = useRef(0);
  const nodeRelationMetaRequestIdRef = useRef(0);
  const knowledgeTreeData = knowledgeTree as unknown as TreeNodeData[];
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);
  const [arrangeMode, setArrangeMode] = useState(false);
  const isMiddleExamContext = selectedTreeContext === MIDDLE_EXAM_TREE_VALUE;
  const isSyncContext = !isMiddleExamContext;
  const displayKnowledgeTree = useMemo(() => {
    if (!inlineEdit || inlineEdit.mode !== 'add') {
      return knowledgeTreeData;
    }
    return appendTreeNode(
      knowledgeTreeData,
      {
        key: inlineEdit.key,
        title: inlineEdit.initialValue,
      },
      inlineEdit.parentKey,
    );
  }, [inlineEdit, knowledgeTreeData]);
  const knowledgeSearch = useTreeSearch(displayKnowledgeTree);
  const visibleKnowledgeTree = arrangeMode
    ? displayKnowledgeTree
    : knowledgeSearch.filteredTreeData;
  const isKnowledgeSearching = Boolean(knowledgeSearch.searchValue.trim());

  useEffect(() => {
    const requestId = (versionsRequestIdRef.current += 1);

    if (!isSyncContext) {
      setTextbookVersions([]);
      setSelectedTextbookVersion(undefined);
      return;
    }

    const fetchVersions = async () => {
      try {
        const res = await getTextbookVersions();
        if (versionsRequestIdRef.current !== requestId) {
          return;
        }

        if (!res.success) {
          message.error(res.message || '获取教材版本失败');
          return;
        }

        setTextbookVersions(res.data);
        setSelectedTextbookVersion((current) =>
          current && res.data.some((version) => version.value === current)
            ? current
            : res.data[0]?.value,
        );
      } catch {
        if (versionsRequestIdRef.current === requestId) {
          message.error('获取教材版本失败');
        }
      }
    };

    void fetchVersions();
  }, [isSyncContext]);

  const fetchKnowledgeTree = useCallback(async () => {
    const requestId = (treeRequestIdRef.current += 1);

    try {
      if (isSyncContext) {
        if (!selectedTextbookVersion) {
          setKnowledgeTree([]);
          return;
        }

        const res = await getTextbookChapters(
          selectedTextbookVersion,
          selectedSubject,
        );
        if (treeRequestIdRef.current !== requestId) {
          return;
        }

        if (res.success) {
          setKnowledgeTree(
            filterTextbookChaptersByContext(
              res.data as unknown as TreeNodeData[],
              selectedTreeContext,
              selectedSemester,
            ) as unknown as TextbookChapter[],
          );
        } else {
          message.error(res.message || '获取知识体系失败');
        }
        return;
      }

      const res = await getKnowledgeTree({
        subject: selectedSubject,
        targetType: 'knowledge',
      });
      if (treeRequestIdRef.current !== requestId) {
        return;
      }
      if (res.success) {
        setKnowledgeTree(res.data);
      } else {
        message.error(res.message || '获取知识体系失败');
      }
    } catch {
      if (treeRequestIdRef.current === requestId) {
        message.error('获取知识体系失败');
      }
    }
  }, [
    isSyncContext,
    selectedSemester,
    selectedSubject,
    selectedTextbookVersion,
    selectedTreeContext,
  ]);

  useEffect(() => {
    void fetchKnowledgeTree();
  }, [fetchKnowledgeTree]);

  const fetchNodeRelationMeta = useCallback(async () => {
    const requestId = (nodeRelationMetaRequestIdRef.current += 1);

    try {
      const [categoryRes, usageRuleRes, relationRes] = await Promise.all([
        getTagCategories(),
        getAttributeUsageRules(),
        getNodeAttributeRelations({
          targetType: 'knowledge',
          subject: selectedSubject,
        }),
      ]);

      if (nodeRelationMetaRequestIdRef.current !== requestId) {
        return;
      }

      if (categoryRes.success) {
        setTagCategories(categoryRes.data);
      }
      if (usageRuleRes.success) {
        setUsageRules(usageRuleRes.data);
      }
      if (relationRes.success) {
        setNodeRelations(relationRes.data);
      }
    } catch {
      if (nodeRelationMetaRequestIdRef.current === requestId) {
        message.error('获取知识节点属性失败');
      }
    }
  }, [selectedSubject]);

  useEffect(() => {
    void fetchNodeRelationMeta();
  }, [fetchNodeRelationMeta]);

  const displayAttributeIds = useMemo(
    () => getDisplayAttributeIds(usageRules, 'knowledge'),
    [usageRules],
  );
  const categoryMap = useMemo(
    () => getCategoryMap(tagCategories),
    [tagCategories],
  );
  const optionMap = useMemo(
    () => getOptionMap(tagCategories, selectedSubject),
    [selectedSubject, tagCategories],
  );
  const relationMapByNode = useMemo(() => {
    const map = new Map<string, NodeAttributeRelation[]>();
    nodeRelations
      .filter(
        (relation) =>
          relation.targetType === 'knowledge' &&
          relation.subject === selectedSubject,
      )
      .forEach((relation) => {
        map.set(relation.nodeId, [
          ...(map.get(relation.nodeId) || []),
          relation,
        ]);
      });
    return map;
  }, [nodeRelations, selectedSubject]);

  const renderNodeRelationMeta = useCallback(
    (nodeKey: React.Key) => {
      const relationsForNode = relationMapByNode.get(String(nodeKey)) || [];
      const tags = displayAttributeIds.flatMap((attributeId) => {
        const category = categoryMap.get(attributeId);
        const relation = relationsForNode.find(
          (item) => item.attributeId === attributeId,
        );
        const option = relation ? optionMap.get(relation.optionId) : undefined;

        if (!category || category.status === 'disabled') {
          return [];
        }
        if (!option || option.status === 'disabled') {
          return [];
        }

        return [
          <Tag
            key={`${attributeId}-${option.id}`}
            className="tag-tree-node-tag"
          >
            {option.name}
          </Tag>,
        ];
      });

      return tags.length ? (
        <span className="tag-tree-node-tags">{tags}</span>
      ) : null;
    },
    [categoryMap, displayAttributeIds, optionMap, relationMapByNode],
  );

  const handleAddRoot = () => {
    setInlineEdit({
      key: createDraftNodeKey(),
      mode: 'add',
      parentKey: null,
      initialValue: '',
    });
  };

  const handleToggleArrangeMode = () => {
    setInlineEdit(null);
    setArrangeMode((value) => !value);
  };

  const handleAddChild = (node: TreeNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    setInlineEdit({
      key: createDraftNodeKey(),
      mode: 'add',
      parentKey: node.key,
      initialValue: '',
    });
  };

  const handleEdit = (node: TreeNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    setInlineEdit({
      key: node.key,
      mode: 'edit',
      initialValue: node.title,
      description: node.description,
    });
  };

  const handleDelete = (node: TreeNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSyncContext && !selectedTextbookVersion) {
      message.warning('请选择教材版本');
      return;
    }
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除知识节点 "${node.title}" 吗？`,
      onOk: async () => {
        const res =
          isSyncContext && selectedTextbookVersion
            ? await deleteTextbookChapter(String(node.key), {
                version: selectedTextbookVersion,
                subject: selectedSubject,
              })
            : await deleteKnowledgeNode(String(node.key), {
                subject: selectedSubject,
                targetType: 'knowledge',
              });
        if (res.success) {
          message.success('删除成功');
          fetchKnowledgeTree();
        } else {
          message.error('删除失败');
        }
      },
    });
  };

  const allowKnowledgeDrop = useCallback<NonNullable<TreeProps['allowDrop']>>(
    ({ dragNode, dropNode }) =>
      allowCrossParentTreeDrop(knowledgeTreeData, dragNode.key, dropNode.key),
    [knowledgeTreeData],
  );

  const handleDrop: TreeProps['onDrop'] = async (info) => {
    if (!arrangeMode) return;
    if (isSyncContext && !selectedTextbookVersion) {
      message.warning('请选择教材版本');
      return;
    }

    const moveRequest = getTreeMoveRequest(knowledgeTreeData, info);

    const res =
      isSyncContext && selectedTextbookVersion
        ? await moveTextbookChapter({
            id: String(info.dragNode.key),
            targetId: String(moveRequest.targetId),
            position: moveRequest.position,
            version: selectedTextbookVersion,
            subject: selectedSubject,
          })
        : await moveKnowledgeNode({
            id: String(info.dragNode.key),
            targetId: String(moveRequest.targetId),
            position: moveRequest.position,
            subject: selectedSubject,
            targetType: 'knowledge',
          });

    if (res.success) {
      message.success('移动成功');
      fetchKnowledgeTree();
    } else {
      message.error(res.message || '移动失败');
    }
  };

  const handleCancelInlineEdit = () => {
    setInlineEdit(null);
  };

  const handleInlineEditSubmit = async (title: string) => {
    if (!inlineEdit) return;
    if (!title) {
      message.warning('请输入知识节点名称');
      return;
    }
    if (isSyncContext && !selectedTextbookVersion) {
      message.warning('请选择教材版本');
      return;
    }

    setInlineEdit({ ...inlineEdit, saving: true });
    const res =
      isSyncContext && selectedTextbookVersion
        ? inlineEdit.mode === 'add'
          ? await addTextbookChapter({
              title,
              parentId: inlineEdit.parentKey
                ? String(inlineEdit.parentKey)
                : null,
              version: selectedTextbookVersion,
              subject: selectedSubject,
            })
          : await updateTextbookChapter({
              id: String(inlineEdit.key),
              title,
              version: selectedTextbookVersion,
              subject: selectedSubject,
              description: inlineEdit.description,
            })
        : inlineEdit.mode === 'add'
        ? await addKnowledgeNode({
            title,
            parentId: inlineEdit.parentKey
              ? String(inlineEdit.parentKey)
              : null,
            subject: selectedSubject,
            targetType: 'knowledge',
          })
        : await updateKnowledgeNode({
            id: String(inlineEdit.key),
            title,
            subject: selectedSubject,
            targetType: 'knowledge',
            description: inlineEdit.description,
          });

    if (res.success) {
      message.success(inlineEdit.mode === 'add' ? '添加成功' : '修改成功');
      setInlineEdit(null);
      fetchKnowledgeTree();
    } else {
      message.error(res.message || '保存失败');
      setInlineEdit({ ...inlineEdit, saving: false });
    }
  };

  return (
    <>
      <Card
        className={`tag-system-tree-panel tag-system-tree-panel-no-title${
          arrangeMode ? ' tag-system-tree-panel-arranging' : ''
        }`}
        variant="borderless"
        extra={
          <div className="tag-system-tree-card-extra">
            {arrangeMode ? null : (
              <div className="tag-system-tree-toolbar-filters">
                <div
                  className={`tag-system-tree-context-filters${
                    isSyncContext
                      ? ' tag-system-tree-context-filters-sync'
                      : ''
                  }`}
                >
                  <Select
                    value={selectedTreeContext}
                    onChange={setSelectedTreeContext}
                    className="tag-system-tree-filter-select"
                    options={KNOWLEDGE_TREE_CONTEXT_OPTIONS}
                    aria-label="选择体系"
                  />
                  {isSyncContext ? (
                    <Select
                      value={selectedSemester}
                      onChange={setSelectedSemester}
                      className="tag-system-tree-filter-select"
                      options={SEMESTER_OPTIONS}
                      aria-label="选择学期"
                    />
                  ) : null}
                  <Select
                    value={selectedSubject}
                    onChange={onSubjectChange}
                    className="tag-system-tree-filter-select"
                    options={subjectOptions}
                    aria-label="选择学科"
                  />
                  {isSyncContext ? (
                    <Select
                      value={selectedTextbookVersion}
                      onChange={setSelectedTextbookVersion}
                      className="tag-system-tree-version-select"
                      options={textbookVersions}
                      placeholder="教材版本"
                      aria-label="选择教材版本"
                    />
                  ) : null}
                </div>
                <Input.Search
                  className="tag-system-tree-search"
                  name="knowledgeNodeSearch"
                  autoComplete="off"
                  prefix={
                    <SearchOutlined
                      aria-hidden="true"
                      style={{ color: '#ccc' }}
                    />
                  }
                  aria-label="搜索知识节点"
                  allowClear
                  enterButton="查询"
                  placeholder="搜索知识节点…"
                  value={knowledgeSearch.inputValue}
                  onChange={knowledgeSearch.onSearchInputChange}
                  onSearch={knowledgeSearch.submitSearch}
                />
              </div>
            )}
            <div className="tag-system-tree-actions">
              <Button
                type={arrangeMode ? 'primary' : 'default'}
                size="small"
                onClick={handleToggleArrangeMode}
              >
                {arrangeMode ? '完成整理' : '整理'}
              </Button>
              {arrangeMode ? null : (
                <Button
                  type="primary"
                  size="small"
                  onClick={handleAddRoot}
                  disabled={isSyncContext && !selectedTextbookVersion}
                >
                  添加根节点
                </Button>
              )}
            </div>
          </div>
        }
      >
        {visibleKnowledgeTree.length > 0 ? (
          <Tree
            key={`${selectedTreeContext}-${selectedSemester}-${selectedSubject}-${
              selectedTextbookVersion || 'middle-exam'
            }`}
            treeData={visibleKnowledgeTree}
            onExpand={knowledgeSearch.onExpand}
            expandedKeys={knowledgeSearch.expandedKeys}
            autoExpandParent={knowledgeSearch.autoExpandParent}
            draggable={
              arrangeMode
                ? {
                    icon: (
                      <Tooltip title="拖拽移动">
                        <HolderOutlined className="tag-system-tree-drag-icon" />
                      </Tooltip>
                    ),
                  }
                : undefined
            }
            allowDrop={arrangeMode ? allowKnowledgeDrop : undefined}
            onDrop={arrangeMode ? handleDrop : undefined}
            showLine
            blockNode
            titleRender={(node: TreeNodeData) => (
              <TreeNodeTitle
                nodeData={node}
                searchValue={knowledgeSearch.searchValue}
                inlineEdit={
                  inlineEdit?.key === node.key
                    ? {
                        initialValue: inlineEdit.initialValue,
                        placeholder: '请输入知识节点名称…',
                        saving: inlineEdit.saving,
                        onSubmit: handleInlineEditSubmit,
                        onCancel: handleCancelInlineEdit,
                      }
                    : undefined
                }
                actionsVisible={!arrangeMode}
                meta={renderNodeRelationMeta(node.key)}
                onAddChild={handleAddChild}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
            fieldNames={{
              title: 'title',
              key: 'key',
              children: 'children',
            }}
            height={600}
          />
        ) : (
          <div
            style={{
              padding: 20,
              textAlign: 'center',
              color: '#999',
            }}
          >
            {displayKnowledgeTree.length > 0 && isKnowledgeSearching
              ? '暂无搜索结果'
              : '暂无数据'}
          </div>
        )}
      </Card>
    </>
  );
};

export default KnowledgeTreePanel;
