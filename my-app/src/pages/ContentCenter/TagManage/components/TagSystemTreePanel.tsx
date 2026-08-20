import type {
  AttributeUsageRule,
  KnowledgeNode,
  NodeAttributeRelation,
  NodeAttributeTargetType,
  TagCategory,
  TextbookChapter,
  TextbookVersion,
  TreeMutationResult,
  TreeTargetType,
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
  importKnowledgeTree,
  moveKnowledgeNode,
  moveTextbookChapter,
  updateKnowledgeNode,
  updateTextbookChapter,
} from '@/services/tagSystem';
import {
  ExclamationCircleOutlined,
  HolderOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';
import type { TreeProps } from 'antd';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  message,
  Modal,
  Select,
  Spin,
  Tag,
  Tooltip,
  Tree,
  Upload,
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
import type { ImportRowError } from './treeExcel';
import {
  exportTreeToExcel,
  parseTreeExcelFile,
  treeToImportPayload,
} from './treeExcel';
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
  /** 树类型：knowledge（知识点树）/ topic（专题树）/ review（资源树，保留旧协议值） */
  targetType: TreeTargetType;
  /** 体系筛选项（如仅中考，或中考+各年级同步语境） */
  contextOptions?: { label: string; value: string }[];
  /** 是否支持同步语境（教材版本 + 学期筛选）；知识点树为 true，专题树为 false */
  supportsSyncContext?: boolean;
  /** 是否展示节点属性标签并拉取属性元数据；资源树等不接入属性体系的场景传 false */
  enableAttributeTags?: boolean;
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

interface TreeMutationResponse {
  message?: string;
  data?: unknown;
}

const getTreeMutationResult = (
  response: TreeMutationResponse,
): Partial<TreeMutationResult> | undefined =>
  response.data && typeof response.data === 'object'
    ? (response.data as Partial<TreeMutationResult>)
    : undefined;

const createDraftNodeKey = () => `draft-${Date.now()}`;

const getAssetCenterResourceUrl = (subject: string, nodeId?: string) => {
  const searchParams = new URLSearchParams({ subject });
  if (nodeId) searchParams.set('nodeId', nodeId);
  return `/content/asset-center?${searchParams.toString()}`;
};

const TREE_TYPE_LABELS: Record<TreeTargetType, string> = {
  knowledge: '知识点树',
  topic: '专题树',
  review: '资源树',
};

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
  enableAttributeTags = true,
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
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    tree: TreeNodeData[];
    errors: ImportRowError[];
    nodeCount: number;
    fileName: string;
  } | null>(null);
  const [importSubmitting, setImportSubmitting] = useState(false);
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

  const showResourceTreeResourceGuard = useCallback(
    (
      title: string,
      response: TreeMutationResponse,
      fallbackNodeId?: React.Key,
    ) => {
      const mutationResult = getTreeMutationResult(response);
      const affectedResourceCount = mutationResult?.affectedResourceCount || 0;
      if (targetType !== 'review' || affectedResourceCount <= 0) {
        return false;
      }

      const resourceScopeNodeId =
        mutationResult?.resourceScopeNodeId ||
        (fallbackNodeId === undefined ? undefined : String(fallbackNodeId));
      let guardModal: ReturnType<typeof Modal.confirm>;
      guardModal = Modal.confirm({
        title,
        icon: <ExclamationCircleOutlined />,
        transitionName: '',
        maskTransitionName: '',
        content: (
          <div>
            <p>
              {response.message ||
                `检测到 ${affectedResourceCount} 份相关正式资源，本次操作已停止。`}
            </p>
            <p style={{ marginBottom: 0, color: '#64748b' }}>
              树结构和资源归属均未改变，资源不会被删除或自动解绑。
            </p>
          </div>
        ),
        okText: '查看相关资源',
        cancelText: '留在当前页',
        onOk: () => {
          guardModal.destroy();
          history.push(
            getAssetCenterResourceUrl(selectedSubject, resourceScopeNodeId),
          );
        },
        onCancel: () => guardModal.destroy(),
      });
      return true;
    },
    [selectedSubject, targetType],
  );

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
    if (!enableAttributeTags) {
      return;
    }
    const requestId = (nodeRelationMetaRequestIdRef.current += 1);

    try {
      const [categoryRes, usageRuleRes, relationRes] = await Promise.all([
        getTagCategories(),
        getAttributeUsageRules(),
        getNodeAttributeRelations({
          targetType: targetType as NodeAttributeTargetType,
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
  }, [enableAttributeTags, selectedSubject, targetType]);

  useEffect(() => {
    void fetchNodeRelationMeta();
  }, [fetchNodeRelationMeta]);

  const displayAttributeIds = useMemo(
    () =>
      getDisplayAttributeIds(usageRules, targetType as NodeAttributeTargetType),
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
      if (!enableAttributeTags) {
        return null;
      }
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
    [
      categoryMap,
      displayAttributeIds,
      enableAttributeTags,
      optionMap,
      relationMapByNode,
    ],
  );

  const renderNodeMeta = useCallback(
    (node: TreeNodeData) => {
      if (targetType === 'review') return null;
      return renderNodeRelationMeta(node.key);
    },
    [renderNodeRelationMeta, targetType],
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

  const isImportExportDisabled =
    arrangeMode || isSearching || isSyncContext || loading;

  const subjectLabel =
    subjectOptions.find((option) => option.value === selectedSubject)?.label ||
    selectedSubject;

  const handleExport = async () => {
    if (isImportExportDisabled || treeData.length === 0) return;
    setExporting(true);
    try {
      const filename = `${TREE_TYPE_LABELS[targetType]}_${subjectLabel}_模板.xlsx`;
      await exportTreeToExcel(treeData, filename);
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (file: File) => {
    if (isImportExportDisabled) return;
    setImporting(true);
    try {
      const result = await parseTreeExcelFile(file);
      if (result.tree.length === 0) {
        message.warning('文件中没有可导入的节点数据');
        return;
      }
      setImportPreview({
        tree: result.tree,
        errors: result.errors,
        nodeCount: result.nodeCount,
        fileName: file.name,
      });
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '导入文件解析失败',
      );
    } finally {
      setImporting(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!importPreview) return;
    setImportSubmitting(true);
    try {
      const res = await importKnowledgeTree({
        subject: selectedSubject,
        targetType,
        nodes: treeToImportPayload(importPreview.tree),
      });
      if (res.success) {
        message.success(
          `导入成功，共 ${res.data?.count ?? importPreview.nodeCount} 个节点`,
        );
        setImportPreview(null);
        treeSearch.resetSearch();
        fetchTree();
      } else if (!showResourceTreeResourceGuard('无法清空重建资源树', res)) {
        message.error(res.message || '导入失败');
      }
    } catch {
      message.error('导入失败');
    } finally {
      setImportSubmitting(false);
    }
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
    let deleteModal: ReturnType<typeof Modal.confirm>;
    deleteModal = Modal.confirm({
      title: '确认删除',
      content: `确定要删除${deleteTargetName} "${node.title}" 吗？`,
      transitionName: '',
      maskTransitionName: '',
      onOk: async () => {
        try {
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
          deleteModal.destroy();
          if (res.success) {
            message.success('删除成功');
            fetchTree();
          } else if (
            !showResourceTreeResourceGuard('无法删除资源树节点', res, node.key)
          ) {
            message.error(res.message || '删除失败');
          }
        } catch {
          deleteModal.destroy();
          message.error('删除失败');
        }
      },
      onCancel: () => deleteModal.destroy(),
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

    try {
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
        const affectedResourceCount =
          getTreeMutationResult(res)?.affectedResourceCount || 0;
        message.success(
          targetType === 'review' && affectedResourceCount > 0
            ? `移动成功，${affectedResourceCount} 份资源的目录路径已同步更新`
            : '移动成功',
        );
        fetchTree();
      } else if (
        !showResourceTreeResourceGuard(
          '无法移入该资源树节点',
          res,
          moveRequest.targetId,
        )
      ) {
        message.error(res.message || '移动失败，原结构保持不变');
      }
    } catch {
      message.error('移动保存失败，原结构保持不变，请重新拖拽');
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

    const editSnapshot = inlineEdit;
    setInlineEdit({ ...editSnapshot, saving: true });
    try {
      const res =
        isSyncContext && selectedTextbookVersion
          ? editSnapshot.mode === 'add'
            ? await addTextbookChapter({
                title: nextTitle,
                parentId: editSnapshot.parentKey
                  ? String(editSnapshot.parentKey)
                  : null,
                version: selectedTextbookVersion,
                subject: selectedSubject,
              })
            : await updateTextbookChapter({
                id: String(editSnapshot.key),
                title: nextTitle,
                version: selectedTextbookVersion,
                subject: selectedSubject,
                description: editSnapshot.description,
              })
          : editSnapshot.mode === 'add'
          ? await addKnowledgeNode({
              title: nextTitle,
              parentId: editSnapshot.parentKey
                ? String(editSnapshot.parentKey)
                : null,
              subject: selectedSubject,
              targetType,
            })
          : await updateKnowledgeNode({
              id: String(editSnapshot.key),
              title: nextTitle,
              subject: selectedSubject,
              targetType,
              description: editSnapshot.description,
            });

      if (res.success) {
        message.success(editSnapshot.mode === 'add' ? '添加成功' : '修改成功');
        setInlineEdit(null);
        fetchTree();
      } else {
        if (
          !showResourceTreeResourceGuard(
            editSnapshot.mode === 'add' ? '无法新增子节点' : '无法重命名节点',
            res,
            editSnapshot.parentKey || undefined,
          )
        ) {
          message.error(res.message || '保存失败，请保留当前输入后重试');
        }
        setInlineEdit({ ...editSnapshot, saving: false });
      }
    } catch {
      message.error('保存失败，当前输入已保留，请重试');
      setInlineEdit({ ...editSnapshot, saving: false });
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
                }${
                  targetType === 'review'
                    ? ' tag-system-tree-context-filters-single'
                    : ''
                }`}
              >
                {targetType === 'review' ? null : (
                  <Select
                    value={selectedTreeContext}
                    onChange={setSelectedTreeContext}
                    className="tag-system-tree-filter-select"
                    options={contextOptions}
                    aria-label="选择体系"
                  />
                )}
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
            {arrangeMode || targetType === 'review' ? null : (
              <>
                <Button
                  size="small"
                  onClick={handleExport}
                  loading={exporting}
                  disabled={isImportExportDisabled || treeData.length === 0}
                >
                  导出
                </Button>
                <Upload
                  accept=".xlsx"
                  showUploadList={false}
                  disabled={isImportExportDisabled}
                  beforeUpload={(file) => {
                    void handleImportFile(file as unknown as File);
                    return false;
                  }}
                >
                  <Button
                    size="small"
                    loading={importing}
                    disabled={isImportExportDisabled}
                  >
                    导入
                  </Button>
                </Upload>
              </>
            )}
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
                meta={arrangeMode ? null : renderNodeMeta(node)}
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
          <Empty
            className="tag-system-tree-empty"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              displayTree.length > 0 && isSearching
                ? '没有匹配的资源节点'
                : targetType === 'review'
                ? '当前学科还没有资源节点'
                : '暂无数据'
            }
          >
            {targetType === 'review' && !isSearching && !arrangeMode ? (
              <Button type="primary" onClick={handleAddRoot}>
                新增根节点
              </Button>
            ) : null}
          </Empty>
        )}
      </Spin>
      {importPreview && (
        <Modal
          title="导入预览"
          open
          width={680}
          onCancel={() => {
            if (!importSubmitting) {
              setImportPreview(null);
            }
          }}
          onOk={handleImportSubmit}
          okText="确认导入"
          okButtonProps={{
            disabled: importPreview.errors.length > 0,
            loading: importSubmitting,
          }}
          cancelButtonProps={{ disabled: importSubmitting }}
        >
          <div className="tag-tree-import-preview">
            {importPreview.errors.length > 0 ? (
              <Alert
                type="error"
                showIcon
                message={`发现 ${importPreview.errors.length} 处问题，请修正后重新导入`}
                description={`文件「${importPreview.fileName}」中存在无效行，确认按钮已禁用。`}
              />
            ) : (
              <Alert
                type="warning"
                showIcon
                message={`解析成功，共 ${importPreview.nodeCount} 个节点`}
                description={`文件「${
                  importPreview.fileName
                }」将清空当前${subjectLabel}的${
                  TREE_TYPE_LABELS[targetType]
                }并重建，${
                  targetType === 'review'
                    ? '原有节点将被替换。'
                    : '原有节点及其属性标签将被替换。'
                }`}
              />
            )}
            {importPreview.errors.length > 0 ? (
              <div className="tag-tree-import-errors">
                {importPreview.errors.map((error, index) => (
                  <div key={index} className="tag-tree-import-error-row">
                    第 {error.rowNumber} 行：{error.message}
                  </div>
                ))}
              </div>
            ) : null}
            <div className="tag-tree-import-tree">
              <Tree
                treeData={importPreview.tree}
                defaultExpandAll
                showLine
                blockNode
                height={360}
              />
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};

export default TagSystemTreePanel;
