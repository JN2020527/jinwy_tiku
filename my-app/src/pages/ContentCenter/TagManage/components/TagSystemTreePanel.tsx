import type {
  AttributeUsageRule,
  KnowledgeNode,
  NodeAttributeRelation,
  NodeAttributeTargetType,
  ResourceItem,
  ResourceType,
  TagCategory,
  TextbookChapter,
  TextbookVersion,
  TreeTargetType,
} from '@/services/tagSystem';
import {
  addKnowledgeNode,
  addTextbookChapter,
  deleteKnowledgeNode,
  deleteResource,
  deleteTextbookChapter,
  getAttributeUsageRules,
  getKnowledgeTree,
  getNodeAttributeRelations,
  getResourceList,
  getTagCategories,
  getTextbookChapters,
  getTextbookVersions,
  importKnowledgeTree,
  moveKnowledgeNode,
  moveTextbookChapter,
  RESOURCE_TYPE_LABELS,
  updateKnowledgeNode,
  updateResource,
  updateTextbookChapter,
} from '@/services/tagSystem';
import {
  FileDoneOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileZipOutlined,
  HolderOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { TreeProps } from 'antd';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  List,
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
  /** 树类型：knowledge（知识点树）/ topic（专题树）/ review（复习树） */
  targetType: TreeTargetType;
  /** 体系筛选项（如仅中考，或中考+各年级同步语境） */
  contextOptions?: { label: string; value: string }[];
  /** 是否支持同步语境（教材版本 + 学期筛选）；知识点树为 true，专题树为 false */
  supportsSyncContext?: boolean;
  /** 是否展示节点属性标签并拉取属性元数据；复习树等不接入属性体系的场景传 false */
  enableAttributeTags?: boolean;
  /** 是否启用资源挂载能力（复习树）：树中展示资源叶子、支持从资源中心选择资源挂载/改挂 */
  enableResources?: boolean;
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
  enableAttributeTags = true,
  enableResources = false,
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
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [selectedNodeKey, setSelectedNodeKey] = useState<React.Key>();
  const [mountOpen, setMountOpen] = useState<boolean>(false);
  const [mountSelectedKeys, setMountSelectedKeys] = useState<React.Key[]>([]);
  const [mounting, setMounting] = useState<boolean>(false);
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(
    null,
  );
  const [resourceEditForm] = Form.useForm<{
    name: string;
    type: ResourceType;
    nodeId?: string;
  }>();
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

  /** 把资源叶子合并到对应分类节点下（仅资源模式） */
  const mergeResourcesIntoTree = useCallback(
    (nodes: TreeNodeData[]): TreeNodeData[] => {
      if (!enableResources || resources.length === 0) {
        return nodes;
      }
      return nodes.map((node) => {
        const nodeResources = resources.filter(
          (item) => item.nodeId === String(node.key),
        );
        const resourceChildren = nodeResources.map((item) => ({
          key: `res:${item.id}`,
          title: item.name,
          nodeType: 'resource' as const,
          resourceType: item.type,
          fileName: item.fileName,
          updatedAt: item.updatedAt,
        }));
        const children = mergeResourcesIntoTree(node.children || []);
        if (resourceChildren.length) {
          children.push(...resourceChildren);
        }
        return { ...node, children: children.length ? children : undefined };
      });
    },
    [enableResources, resources],
  );

  const displayTree = useMemo(() => {
    const baseTree =
      !inlineEdit || inlineEdit.mode !== 'add'
        ? treeData
        : appendTreeNode(
            treeData,
            {
              key: inlineEdit.key,
              title: inlineEdit.initialValue,
            },
            inlineEdit.parentKey,
          );
    return mergeResourcesIntoTree(baseTree);
  }, [inlineEdit, mergeResourcesIntoTree, treeData]);
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

      if (enableResources) {
        const resourceRes = await getResourceList({
          subject: selectedSubject,
          targetType,
        });
        if (treeRequestIdRef.current !== requestId) {
          return;
        }
        if (resourceRes.success) {
          setResources(resourceRes.data);
        }
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
    enableResources,
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
      const treeLabel = targetType === 'knowledge' ? '知识点树' : '专题树';
      const filename = `${treeLabel}_${subjectLabel}_模板.xlsx`;
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
      } else {
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

  const isResourceNode = (node: TreeNodeData) =>
    node.nodeType === 'resource' || String(node.key).startsWith('res:');

  const renderResourceTypeTag = (type?: string) => {
    const resourceType = type as ResourceType | undefined;
    const colors: Record<string, string> = {
      courseware: 'blue',
      extension: 'purple',
      studyGuide: 'cyan',
      homework: 'orange',
    };
    const labels: Record<string, string> = RESOURCE_TYPE_LABELS as Record<
      string,
      string
    >;
    return (
      <Tag
        className="tag-tree-node-resource-tag"
        color={colors[resourceType || 'courseware']}
      >
        {labels[resourceType || 'courseware'] || '资源'}
      </Tag>
    );
  };

  const renderResourceTypeIcon = (type?: string) => {
    const props = { className: 'tag-tree-node-resource-icon' };
    switch (type) {
      case 'extension':
        return <FileZipOutlined {...props} />;
      case 'studyGuide':
        return <FileTextOutlined {...props} />;
      case 'homework':
        return <FileDoneOutlined {...props} />;
      default:
        return <FilePptOutlined {...props} />;
    }
  };

  const findResourceByNodeKey = (key: React.Key) => {
    const resourceId = String(key).replace(/^res:/, '');
    return resources.find((item) => item.id === resourceId);
  };

  const handleEdit = (node: TreeNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isResourceNode(node)) {
      const resource = findResourceByNodeKey(node.key);
      if (!resource) return;
      setEditingResource(resource);
      resourceEditForm.setFieldsValue({
        name: resource.name,
        type: resource.type,
        nodeId: resource.nodeId,
      });
      setMountOpen(true);
      return;
    }
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
    if (isResourceNode(node)) {
      const resource = findResourceByNodeKey(node.key);
      if (!resource) return;
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除资源 "${resource.name}" 吗？删除后从资源中心与复习树中移除。`,
        onOk: async () => {
          const res = await deleteResource(resource.id, {
            subject: selectedSubject,
            targetType,
          });
          if (res.success) {
            message.success('删除成功');
            fetchTree();
          } else {
            message.error(res.message || '删除失败');
          }
        },
      });
      return;
    }
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

  // --- Resource mount / edit handlers ---

  const collectLeafCategoryNodes = useCallback(
    (nodes: TreeNodeData[]): TreeNodeData[] => {
      const leaves: TreeNodeData[] = [];
      const walk = (list: TreeNodeData[]) => {
        list.forEach((node) => {
          if (node.nodeType === 'resource') {
            return;
          }
          if (node.children?.length) {
            walk(node.children);
          } else {
            leaves.push(node);
          }
        });
      };
      walk(nodes);
      return leaves;
    },
    [],
  );

  const leafCategoryNodes = useMemo(
    () => collectLeafCategoryNodes(treeData),
    [collectLeafCategoryNodes, treeData],
  );

  const handleOpenMount = () => {
    if (!selectedNodeKey) {
      message.warning('请先在左侧树中选择要挂载资源的末级节点');
      return;
    }
    setMountSelectedKeys([]);
    setEditingResource(null);
    resourceEditForm.resetFields();
    setMountOpen(true);
  };

  const handleMountSubmit = async () => {
    if (!selectedNodeKey) {
      message.warning('请先选择要挂载资源的节点');
      return;
    }
    if (mountSelectedKeys.length === 0) {
      message.warning('请先勾选要挂载的资源');
      return;
    }
    setMounting(true);
    try {
      for (const key of mountSelectedKeys) {
        const resource = findResourceByNodeKey(key);
        if (!resource) continue;
        const res = await updateResource({
          id: resource.id,
          nodeId: String(selectedNodeKey),
          subject: selectedSubject,
          targetType,
        });
        if (!res.success) {
          message.error(res.message || `挂载 "${resource.name}" 失败`);
          return;
        }
      }
      message.success('挂载成功');
      setMountOpen(false);
      fetchTree();
    } catch {
      message.error('挂载失败');
    } finally {
      setMounting(false);
    }
  };

  const handleResourceEditSubmit = async () => {
    if (!editingResource) return;
    const values = await resourceEditForm.validateFields();
    setMounting(true);
    try {
      const res = await updateResource({
        id: editingResource.id,
        name: values.name,
        type: values.type,
        nodeId: values.nodeId || '',
        subject: selectedSubject,
        targetType,
      });
      if (res.success) {
        message.success('资源更新成功');
        setEditingResource(null);
        setMountOpen(false);
        fetchTree();
      } else {
        message.error(res.message || '资源更新失败');
      }
    } catch {
      message.error('保存失败');
    } finally {
      setMounting(false);
    }
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
            {enableResources && !arrangeMode ? (
              <Button size="small" onClick={handleOpenMount}>
                挂载资源
              </Button>
            ) : null}
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
            onSelect={(keys) => setSelectedNodeKey(keys[0])}
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
            titleRender={(node: TreeNodeData) =>
              isResourceNode(node) ? (
                <TreeNodeTitle
                  nodeData={node}
                  searchValue={treeSearch.searchValue}
                  className="tag-tree-node-resource"
                  actionsVisible={!arrangeMode}
                  showAddChild={false}
                  leadingIcon={renderResourceTypeIcon(node.resourceType)}
                  meta={
                    <>
                      {renderResourceTypeTag(node.resourceType)}
                      {node.updatedAt ? (
                        <span className="tag-tree-node-resource-time">
                          {node.updatedAt}
                        </span>
                      ) : null}
                    </>
                  }
                  onAddChild={handleAddChild}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ) : (
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
              )
            }
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
                  targetType === 'knowledge' ? '知识点树' : '专题树'
                }并重建，原有节点及其属性标签将被替换。`}
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
      {enableResources ? (
        <Modal
          title={
            editingResource ? `编辑资源：${editingResource.name}` : '挂载资源'
          }
          open={mountOpen}
          width={640}
          onCancel={() => {
            if (!mounting) {
              setMountOpen(false);
              setEditingResource(null);
            }
          }}
          onOk={editingResource ? handleResourceEditSubmit : handleMountSubmit}
          okText={editingResource ? '保存' : '挂载到当前节点'}
          okButtonProps={{ loading: mounting }}
          cancelButtonProps={{ disabled: mounting }}
          destroyOnClose
        >
          {editingResource ? (
            <Form
              form={resourceEditForm}
              layout="vertical"
              style={{ marginTop: 12 }}
            >
              <Form.Item
                name="name"
                label="资源名称"
                rules={[{ required: true, message: '请输入资源名称' }]}
              >
                <Input maxLength={40} />
              </Form.Item>
              <Form.Item
                name="type"
                label="资源类型"
                rules={[{ required: true, message: '请选择资源类型' }]}
                extra="学案/作业为组合型资源，原子体系接入前暂不支持"
              >
                <Select
                  options={[
                    { label: '课件', value: 'courseware' },
                    { label: '拓展包', value: 'extension' },
                    {
                      label: '学案（组合型）',
                      value: 'studyGuide',
                      disabled: true,
                    },
                    {
                      label: '作业（组合型）',
                      value: 'homework',
                      disabled: true,
                    },
                  ]}
                />
              </Form.Item>
              <Form.Item name="nodeId" label="所属节点" extra="清空即解除挂载">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="选择复习树末级节点"
                  options={leafCategoryNodes.map((node) => ({
                    label: String(node.title),
                    value: String(node.key),
                  }))}
                />
              </Form.Item>
            </Form>
          ) : (
            <>
              <Alert
                type="info"
                showIcon
                message="从资源中心选择资源挂载到当前选中节点"
                description="勾选未挂载的资源进行挂载；已挂载的资源可勾选以改挂到当前节点。上传资源请到「资源中心」。"
                style={{ marginBottom: 12 }}
              />
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                <List
                  size="small"
                  dataSource={resources}
                  locale={{ emptyText: '资源中心暂无资源' }}
                  renderItem={(item) => (
                    <List.Item
                      key={item.id}
                      style={{ paddingInline: 4 }}
                      extra={
                        item.nodeId ? (
                          <Tag color="green">已挂载</Tag>
                        ) : (
                          <Tag>未挂载</Tag>
                        )
                      }
                    >
                      <Checkbox
                        checked={mountSelectedKeys.includes(`res:${item.id}`)}
                        onChange={(e) =>
                          setMountSelectedKeys((keys) =>
                            e.target.checked
                              ? [...keys, `res:${item.id}`]
                              : keys.filter((k) => k !== `res:${item.id}`),
                          )
                        }
                      >
                        {renderResourceTypeIcon(item.type)}
                        <span style={{ marginRight: 8 }}>{item.name}</span>
                        {renderResourceTypeTag(item.type)}
                      </Checkbox>
                    </List.Item>
                  )}
                />
              </div>
            </>
          )}
        </Modal>
      ) : null}
    </Card>
  );
};

export default TagSystemTreePanel;
