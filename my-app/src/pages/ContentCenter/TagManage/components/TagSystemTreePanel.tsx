import type {
  AttributeUsageRule,
  KnowledgeNode,
  NodeAttributeRelation,
  NodeAttributeTargetType,
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
  Spin,
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
  getParentKey,
  getTreeMoveRequest,
  hasSiblingTreeNodeTitle,
  useTreeSearch,
} from './treeHelpers';
import TreeNodeTitle from './TreeNodeTitle';

export interface TagSystemTreePanelProps {
  /** 树类型：knowledge（知识点树）或 topic（专题树） */
  targetType: NodeAttributeTargetType;
  /** 体系筛选项（如仅中考，或中考+各年级同步语境） */
  contextOptions?: { label: string; value: string }[];
  /** 是否支持同步语境（教材版本 + 学期筛选）；知识点树为 true，专题树为 false */
  supportsSyncContext?: boolean;
  /** 搜索框占位文案 */
  searchPlaceholder?: string;
  /** 行内编辑输入占位文案 */
  nodeNamePlaceholder?: string;
  /** 删除确认弹窗中的节点称谓，如「知识节点」/「节点」 */
  deleteTargetName?: string;
  selectedSubject: string;
  subjectOptions: { label: string; value: string }[];
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

const TagSystemTreePanel: React.FC<TagSystemTreePanelProps> = ({
  targetType,
  contextOptions = KNOWLEDGE_TREE_CONTEXT_OPTIONS,
  supportsSyncContext = false,
  searchPlaceholder = '搜索节点…',
  nodeNamePlaceholder = '请输入节点名称…',
  deleteTargetName = '节点',
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
  const [tree, setTree] = useState<(KnowledgeNode | TextbookChapter)[]>([]);
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [usageRules, setUsageRules] = useState<AttributeUsageRule[]>([]);
  const [nodeRelations, setNodeRelations] = useState<NodeAttributeRelation[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(false);
  const treeRequestIdRef = useRef(0);
  const versionsRequestIdRef = useRef(0);
  const nodeRelationMetaRequestIdRef = useRef(0);
  const treeData = tree as unknown as TreeNodeData[];
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);
  const [arrangeMode, setArrangeMode] = useState(false);
  const isMiddleExamContext = selectedTreeContext === MIDDLE_EXAM_TREE_VALUE;
  const isSyncContext = supportsSyncContext && !isMiddleExamContext;
  const displayTree = useMemo(() => {
    if (!inlineEdit || inlineEdit.mode !== 'add') {
      return treeData;
    }
    return appendTreeNode(
      treeData,
      {
        key: inlineEdit.key,
        title: inlineEdit.initialValue,
      },
      inlineEdit.parentKey,
    );
  }, [inlineEdit, treeData]);
  const treeSearch = useTreeSearch(displayTree);
  const visibleTree = arrangeMode ? displayTree : treeSearch.filteredTreeData;
  const isSearching = Boolean(treeSearch.searchValue.trim());

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

  const fetchTree = useCallback(async () => {
    const requestId = (treeRequestIdRef.current += 1);
    setLoading(true);

    try {
      if (isSyncContext) {
        if (!selectedTextbookVersion) {
          setTree([]);
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
          setTree(
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
        targetType,
      });
      if (treeRequestIdRef.current !== requestId) {
        return;
      }
      if (res.success) {
        setTree(res.data);
      } else {
        message.error(res.message || '获取知识体系失败');
      }
    } catch {
      if (treeRequestIdRef.current === requestId) {
        message.error('获取知识体系失败');
      }
    } finally {
      if (treeRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [
    isSyncContext,
    selectedSemester,
    selectedSubject,
    selectedTextbookVersion,
    selectedTreeContext,
    targetType,
  ]);

  useEffect(() => {
    void fetchTree();
  }, [fetchTree]);

  const fetchNodeRelationMeta = useCallback(async () => {
    const requestId = (nodeRelationMetaRequestIdRef.current += 1);

    try {
      const [categoryRes, usageRuleRes, relationRes] = await Promise.all([
        getTagCategories(),
        getAttributeUsageRules(),
        getNodeAttributeRelations({
          targetType,
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
  }, [selectedSubject, targetType]);

  useEffect(() => {
    void fetchNodeRelationMeta();
  }, [fetchNodeRelationMeta]);

  const displayAttributeIds = useMemo(
    () => getDisplayAttributeIds(usageRules, targetType),
    [usageRules, targetType],
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
          relation.targetType === targetType &&
          relation.subject === selectedSubject,
      )
      .forEach((relation) => {
        map.set(relation.nodeId, [
          ...(map.get(relation.nodeId) || []),
          relation,
        ]);
      });
    return map;
  }, [nodeRelations, selectedSubject, targetType]);

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
    if (treeSearch.inputValue.trim() || treeSearch.searchValue.trim()) {
      treeSearch.resetSearch();
    }

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
    if (treeSearch.inputValue.trim() || treeSearch.searchValue.trim()) {
      treeSearch.resetSearch();
    }

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
      parentKey: getParentKey(node.key, treeData),
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
      content: `确定要删除${deleteTargetName} "${node.title}" 吗？`,
      onOk: async () => {
        const res =
          isSyncContext && selectedTextbookVersion
            ? await deleteTextbookChapter(String(node.key), {
                version: selectedTextbookVersion,
                subject: selectedSubject,
              })
            : await deleteKnowledgeNode(String(node.key), {
                subject: selectedSubject,
                targetType,
              });
        if (res.success) {
          message.success('删除成功');
          fetchTree();
        } else {
          message.error('删除失败');
        }
      },
    });
  };

  const allowDrop = useCallback<NonNullable<TreeProps['allowDrop']>>(
    ({ dragNode, dropNode }) =>
      allowCrossParentTreeDrop(treeData, dragNode.key, dropNode.key),
    [treeData],
  );

  const handleDrop: TreeProps['onDrop'] = async (info) => {
    if (!arrangeMode) return;
    if (isSyncContext && !selectedTextbookVersion) {
      message.warning('请选择教材版本');
      return;
    }

    const moveRequest = getTreeMoveRequest(treeData, info);

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
            targetType,
          });

    if (res.success) {
      message.success('移动成功');
      fetchTree();
    } else {
      message.error(res.message || '移动失败');
    }
  };

  const handleCancelInlineEdit = () => {
    setInlineEdit(null);
  };

  const handleInlineEditSubmit = async (title: string) => {
    if (!inlineEdit) return;
    const nextTitle = title.trim();
    if (!nextTitle) {
      message.warning('请输入节点名称');
      return;
    }
    if (isSyncContext && !selectedTextbookVersion) {
      message.warning('请选择教材版本');
      return;
    }
    if (
      hasSiblingTreeNodeTitle(
        treeData,
        inlineEdit.parentKey,
        nextTitle,
        inlineEdit.mode === 'edit' ? inlineEdit.key : undefined,
      )
    ) {
      message.warning('同级已存在同名节点');
      return;
    }

    setInlineEdit({ ...inlineEdit, saving: true });
    const res =
      isSyncContext && selectedTextbookVersion
        ? inlineEdit.mode === 'add'
          ? await addTextbookChapter({
              title: nextTitle,
              parentId: inlineEdit.parentKey
                ? String(inlineEdit.parentKey)
                : null,
              version: selectedTextbookVersion,
              subject: selectedSubject,
            })
          : await updateTextbookChapter({
              id: String(inlineEdit.key),
              title: nextTitle,
              version: selectedTextbookVersion,
              subject: selectedSubject,
              description: inlineEdit.description,
            })
        : inlineEdit.mode === 'add'
        ? await addKnowledgeNode({
            title: nextTitle,
            parentId: inlineEdit.parentKey
              ? String(inlineEdit.parentKey)
              : null,
            subject: selectedSubject,
            targetType,
          })
        : await updateKnowledgeNode({
            id: String(inlineEdit.key),
            title: nextTitle,
            subject: selectedSubject,
            targetType,
            description: inlineEdit.description,
          });

    if (res.success) {
      message.success(inlineEdit.mode === 'add' ? '添加成功' : '修改成功');
      setInlineEdit(null);
      fetchTree();
    } else {
      message.error(res.message || '保存失败');
      setInlineEdit({ ...inlineEdit, saving: false });
    }
  };

  const treeKey = `${targetType}-${selectedTreeContext}-${
    isSyncContext ? `${selectedSemester}-` : ''
  }${selectedSubject}-${isSyncContext ? selectedTextbookVersion || '' : ''}`;

  return (
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
                  isSyncContext ? ' tag-system-tree-context-filters-sync' : ''
                }`}
              >
                <Select
                  value={selectedTreeContext}
                  onChange={setSelectedTreeContext}
                  className="tag-system-tree-filter-select"
                  options={contextOptions}
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
                name="treeNodeSearch"
                autoComplete="off"
                prefix={
                  <SearchOutlined
                    aria-hidden="true"
                    style={{ color: '#ccc' }}
                  />
                }
                aria-label={searchPlaceholder}
                allowClear
                enterButton="查询"
                placeholder={searchPlaceholder}
                value={treeSearch.inputValue}
                onChange={treeSearch.onSearchInputChange}
                onSearch={treeSearch.submitSearch}
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
      <Spin spinning={loading}>
        {visibleTree.length > 0 ? (
          <Tree
            key={treeKey}
            treeData={visibleTree}
            onExpand={treeSearch.onExpand}
            expandedKeys={treeSearch.expandedKeys}
            autoExpandParent={treeSearch.autoExpandParent}
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
            allowDrop={arrangeMode ? allowDrop : undefined}
            onDrop={arrangeMode ? handleDrop : undefined}
            showLine
            blockNode
            titleRender={(node: TreeNodeData) => (
              <TreeNodeTitle
                nodeData={node}
                searchValue={treeSearch.searchValue}
                inlineEdit={
                  inlineEdit?.key === node.key
                    ? {
                        initialValue: inlineEdit.initialValue,
                        placeholder: nodeNamePlaceholder,
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
            {displayTree.length > 0 && isSearching
              ? '暂无搜索结果'
              : '暂无数据'}
          </div>
        )}
      </Spin>
    </Card>
  );
};

export default TagSystemTreePanel;
