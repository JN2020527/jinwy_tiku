import RichTextEditor from '@/components/RichTextEditor';
import {
  buildExampleKnowledgeHtml,
  getDraftContentBlocks,
  getEffectiveKnowledgeNodeIds,
  getExampleKnowledgeContent,
  getKnowledgeNodeSelectionError,
  hasRichTextContent,
  isKnowledgeContentKind,
} from '@/features/study-guide/contentType';
import { STRUCTURE_LEVEL_NUMBERS } from '@/features/study-guide/structureModel';
import type {
  ContentBlockKind,
  ExampleKnowledgeContent,
  KnowledgeLeaf,
  KnowledgeTreeNode,
  RegisteredColumn,
  StructureLevel,
  StudyGuideContentBlock,
  StudyGuideDetail,
  StudyGuideStructureNode,
} from '@/services/resourceAssets';
import {
  createOnlineStudyGuide,
  getAssetDetail,
  getResourceAssetContext,
  publishOnlineStudyGuide,
  saveKnowledgeBlock,
  updateFormalStudyGuide,
  updateOnlineStudyGuideDraft,
} from '@/services/resourceAssets';
import type { SubjectLevelCodeRule } from '@/services/subjectColumns';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  EditOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useLocation, useParams, useSearchParams } from '@umijs/max';
import {
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Segmented,
  Select,
  Skeleton,
  Tag,
  TreeSelect,
} from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FlatColumnPrototype, {
  isFlatColumnPrototypeVariant,
} from './FlatColumnPrototype';
import StudyGuideContinuousEditor from './StudyGuideContinuousEditor';
import './index.less';
import { parseCombinationProductionRouteContext } from './routeContext';

interface StructureFormValues {
  source?: 'registered' | 'custom';
  label?: string;
  referenceId?: string;
  knowledgeNodeId?: string;
  temporaryName?: string;
  parentId?: string;
}

interface ContentFormValues {
  kind: ContentBlockKind;
  html?: string;
  knowledgeNodeIds?: string[];
  exampleStemHtml?: string;
  exampleGuideHtml?: string;
  exampleAnswerHtml?: string;
}

const LEVEL_LABELS: Record<StructureLevel, string> = {
  level1: '一级栏目',
  level2: '二级栏目',
  level3: '三级栏目',
  level4: '四级栏目',
};
const CONTENT_KIND_OPTIONS: Array<{
  value: ContentBlockKind;
  label: string;
}> = [
  { value: 'columnContent', label: '栏目内容' },
  { value: 'single', label: '单一类知识' },
  { value: 'method', label: '方法类知识' },
  { value: 'example', label: '例题类知识' },
  { value: 'comprehensive', label: '综合类知识' },
];
const CONTENT_KIND_LABELS = Object.fromEntries(
  CONTENT_KIND_OPTIONS.map((item) => [item.value, item.label]),
) as Record<ContentBlockKind, string>;
let localSequence = 0;
const localId = (prefix: string) => {
  localSequence += 1;
  return `${prefix}-local-${Date.now()}-${localSequence}`;
};

const requiredRichTextRule = (label: string) => ({
  validator: (_: unknown, value?: string) =>
    hasRichTextContent(value)
      ? Promise.resolve()
      : Promise.reject(new Error(`请输入${label}`)),
});

interface KnowledgeTreeSelectOption {
  title: string;
  value: string;
  key: string;
  selectable?: boolean;
  disableCheckbox?: boolean;
  children?: KnowledgeTreeSelectOption[];
}

const toKnowledgeLeafTreeData = (
  nodes: KnowledgeTreeNode[],
): KnowledgeTreeSelectOption[] =>
  nodes.map((node) => {
    const children = node.children?.length
      ? toKnowledgeLeafTreeData(node.children)
      : undefined;
    const isLeaf = !children?.length;
    return {
      title: node.title,
      value: node.key,
      key: node.key,
      selectable: isLeaf,
      disableCheckbox: !isLeaf,
      children,
    };
  });

const filterKnowledgeTreeData = (
  nodes: KnowledgeTreeSelectOption[],
  keyword: string,
): KnowledgeTreeSelectOption[] => {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase();
  if (!normalizedKeyword) return nodes;

  return nodes.flatMap((node) => {
    const children = filterKnowledgeTreeData(
      node.children || [],
      normalizedKeyword,
    );
    if (node.title.toLocaleLowerCase().includes(normalizedKeyword)) {
      return [node];
    }
    return children.length ? [{ ...node, children }] : [];
  });
};

const renderHighlightedTreeTitle = (title: string, keyword: string) => {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase();
  if (!normalizedKeyword) return title;

  const normalizedTitle = title.toLocaleLowerCase();
  const fragments: React.ReactNode[] = [];
  let cursor = 0;
  let matchIndex = normalizedTitle.indexOf(normalizedKeyword, cursor);

  while (matchIndex >= 0) {
    if (matchIndex > cursor) {
      fragments.push(title.slice(cursor, matchIndex));
    }
    const matchEnd = matchIndex + normalizedKeyword.length;
    fragments.push(
      <mark
        className="knowledge-tree-search-highlight"
        key={`${matchIndex}-${matchEnd}`}
      >
        {title.slice(matchIndex, matchEnd)}
      </mark>,
    );
    cursor = matchEnd;
    matchIndex = normalizedTitle.indexOf(normalizedKeyword, cursor);
  }

  if (!fragments.length) return title;
  if (cursor < title.length) fragments.push(title.slice(cursor));
  return fragments;
};

const collectExpandableTreeKeys = (
  nodes: KnowledgeTreeSelectOption[],
): string[] =>
  nodes.flatMap((node) =>
    node.children?.length
      ? [node.key, ...collectExpandableTreeKeys(node.children)]
      : [],
  );

const mapNodes = (
  nodes: StudyGuideStructureNode[],
  updater: (node: StudyGuideStructureNode) => StudyGuideStructureNode,
): StudyGuideStructureNode[] =>
  nodes.map((node) => {
    const updated = updater(node);
    return { ...updated, children: mapNodes(updated.children, updater) };
  });

const removeNode = (
  nodes: StudyGuideStructureNode[],
  nodeId: string,
): StudyGuideStructureNode[] =>
  nodes
    .filter((node) => node.id !== nodeId)
    .map((node) => ({ ...node, children: removeNode(node.children, nodeId) }));

const appendNode = (
  nodes: StudyGuideStructureNode[],
  parentId: string | undefined,
  newNode: StudyGuideStructureNode,
): StudyGuideStructureNode[] => {
  if (!parentId) return [...nodes, newNode];
  return mapNodes(nodes, (node) =>
    node.id === parentId
      ? { ...node, children: [...node.children, newNode] }
      : node,
  );
};

const findNode = (
  nodes: StudyGuideStructureNode[],
  id: string,
): StudyGuideStructureNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return undefined;
};

type ColumnDropPosition = 'before' | 'after' | 'inside';
type ContentDropPosition = 'before' | 'after' | 'append';

const insertNodeRelative = (
  nodes: StudyGuideStructureNode[],
  targetId: string,
  movingNode: StudyGuideStructureNode,
  position: Exclude<ColumnDropPosition, 'inside'>,
): StudyGuideStructureNode[] => {
  const index = nodes.findIndex((node) => node.id === targetId);
  if (index >= 0) {
    const next = [...nodes];
    next.splice(position === 'before' ? index : index + 1, 0, movingNode);
    return next;
  }
  return nodes.map((node) => ({
    ...node,
    children: insertNodeRelative(node.children, targetId, movingNode, position),
  }));
};

const moveStructureNode = (
  nodes: StudyGuideStructureNode[],
  nodeId: string,
  targetId: string,
  position: ColumnDropPosition,
): StudyGuideStructureNode[] => {
  if (nodeId === targetId) return nodes;
  const movingNode = findNode(nodes, nodeId);
  if (!movingNode) return nodes;
  const withoutMovingNode = removeNode(nodes, nodeId);
  return position === 'inside'
    ? appendNode(withoutMovingNode, targetId, movingNode)
    : insertNodeRelative(withoutMovingNode, targetId, movingNode, position);
};

const moveContentBlock = (
  blocks: StudyGuideContentBlock[],
  blockId: string,
  targetNodeId: string,
  targetBlockId: string | undefined,
  position: ContentDropPosition,
): StudyGuideContentBlock[] => {
  const movingBlock = blocks.find((block) => block.id === blockId);
  if (!movingBlock) return blocks;
  const nextMovingBlock = {
    ...movingBlock,
    structureNodeId: targetNodeId,
  };
  const withoutMovingBlock = blocks.filter((block) => block.id !== blockId);
  if (targetBlockId && position !== 'append') {
    const targetIndex = withoutMovingBlock.findIndex(
      (block) => block.id === targetBlockId,
    );
    if (targetIndex >= 0) {
      const next = [...withoutMovingBlock];
      next.splice(
        position === 'before' ? targetIndex : targetIndex + 1,
        0,
        nextMovingBlock,
      );
      return next;
    }
  }
  let lastTargetIndex = -1;
  withoutMovingBlock.forEach((block, index) => {
    if (block.structureNodeId === targetNodeId) lastTargetIndex = index;
  });
  const next = [...withoutMovingBlock];
  next.splice(lastTargetIndex + 1, 0, nextMovingBlock);
  return next;
};

const collectSubtreeIds = (node: StudyGuideStructureNode): string[] => [
  node.id,
  ...node.children.flatMap(collectSubtreeIds),
];

const CombinationProductionPage: React.FC = () => {
  const { resourceId } = useParams<'resourceId'>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const mode = location.pathname.includes('/revision') ? 'revision' : 'new';
  const routeContext = useMemo(
    () =>
      parseCombinationProductionRouteContext({
        mode,
        subject: searchParams.get('subject'),
        type: searchParams.get('type'),
        resourceId,
      }),
    [mode, resourceId, searchParams],
  );
  const subject = routeContext.valid ? routeContext.subject : '';
  const [guide, setGuide] = useState<StudyGuideDetail | null>(null);
  const [guideName, setGuideName] = useState('');
  const [structure, setStructure] = useState<StudyGuideStructureNode[]>([]);
  const [blocks, setBlocks] = useState<StudyGuideContentBlock[]>([]);
  const [columns, setColumns] = useState<RegisteredColumn[]>([]);
  const [levelCodeRules, setLevelCodeRules] = useState<SubjectLevelCodeRule[]>(
    [],
  );
  const [knowledgeTree, setKnowledgeTree] = useState<KnowledgeTreeNode[]>([]);
  const [knowledgeLeaves, setKnowledgeLeaves] = useState<KnowledgeLeaf[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(
    mode === 'new' || searchParams.get('view') === 'edit',
  );

  const [structureDrawer, setStructureDrawer] = useState<{
    mode: 'add' | 'edit';
    level: StructureLevel;
    nodeId?: string;
    parentId?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingContent, setAddingContent] = useState(false);
  const [knowledgeTreeSearch, setKnowledgeTreeSearch] = useState('');
  const [knowledgeTreeExpandedKeys, setKnowledgeTreeExpandedKeys] = useState<
    string[]
  >([]);
  const [structureForm] = Form.useForm<StructureFormValues>();
  const [contentForm] = Form.useForm<ContentFormValues>();
  const [contentNode, setContentNode] =
    useState<StudyGuideStructureNode | null>(null);
  const [editingContentBlock, setEditingContentBlock] =
    useState<StudyGuideContentBlock | null>(null);
  const selectedStructureReferenceId = Form.useWatch(
    'referenceId',
    structureForm,
  );
  const selectedStructureSource =
    Form.useWatch('source', structureForm) || 'registered';
  const selectedContentKind =
    Form.useWatch('kind', contentForm) || 'columnContent';
  const knowledgeLeafTreeData = useMemo(
    () => toKnowledgeLeafTreeData(knowledgeTree),
    [knowledgeTree],
  );
  const filteredKnowledgeLeafTreeData = useMemo(
    () => filterKnowledgeTreeData(knowledgeLeafTreeData, knowledgeTreeSearch),
    [knowledgeLeafTreeData, knowledgeTreeSearch],
  );
  const visibleKnowledgeTreeExpandedKeys = useMemo(
    () =>
      knowledgeTreeSearch.trim()
        ? collectExpandableTreeKeys(filteredKnowledgeLeafTreeData)
        : knowledgeTreeExpandedKeys,
    [
      filteredKnowledgeLeafTreeData,
      knowledgeTreeExpandedKeys,
      knowledgeTreeSearch,
    ],
  );
  const contentEditorLabel =
    selectedContentKind === 'columnContent'
      ? '栏目内容'
      : `${CONTENT_KIND_LABELS[selectedContentKind]}内容`;
  const inheritedKnowledgeLeaf = contentNode?.knowledgeNodeId
    ? knowledgeLeaves.find((leaf) => leaf.id === contentNode.knowledgeNodeId)
    : undefined;
  const inheritsKnowledgeNode = Boolean(
    inheritedKnowledgeLeaf && isKnowledgeContentKind(selectedContentKind),
  );
  const refreshEditorContext = useCallback(async () => {
    if (!subject) return;
    try {
      const response = await getResourceAssetContext({ subject });
      if (!response.success) {
        message.error(response.message || '学案上下文加载失败');
        return;
      }
      setColumns(response.data.columns);
      setLevelCodeRules(response.data.levelCodeRules);
      setKnowledgeTree(response.data.knowledgeTree);
      setKnowledgeLeaves(response.data.knowledgeLeaves);
    } catch {
      message.error('学案上下文加载失败');
    }
  }, [subject]);

  useEffect(() => {
    if (!structureDrawer && !contentNode) return;
    void refreshEditorContext();
  }, [contentNode, refreshEditorContext, structureDrawer]);

  useEffect(() => {
    const handleWindowFocus = () => void refreshEditorContext();
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [refreshEditorContext]);

  useEffect(() => {
    if (!routeContext.valid) {
      setLoading(false);
      return;
    }
    if (routeContext.resourceType !== 'studyGuide') {
      setLoadError('作业请使用加工作业页面创建');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    const contextPromise = getResourceAssetContext({
      subject: routeContext.subject,
    });
    if (routeContext.mode === 'new') {
      void contextPromise
        .then((contextResponse) => {
          if (cancelled) return;
          if (!contextResponse.success) {
            setLoadError(contextResponse.message || '学案上下文加载失败');
            return;
          }
          setColumns(contextResponse.data.columns);
          setLevelCodeRules(contextResponse.data.levelCodeRules);
          setKnowledgeTree(contextResponse.data.knowledgeTree);
          setKnowledgeLeaves(contextResponse.data.knowledgeLeaves);
          setGuideName('');
          setStructure([]);
          setBlocks([]);
          setEditing(true);
        })
        .catch(() => setLoadError('学案上下文加载失败'))
        .finally(() => !cancelled && setLoading(false));
      return () => {
        cancelled = true;
      };
    }
    void Promise.all([
      getAssetDetail({
        id: routeContext.resourceId,
        subject: routeContext.subject,
      }),
      contextPromise,
    ])
      .then(([assetResponse, contextResponse]) => {
        if (cancelled) return;
        if (
          !assetResponse.success ||
          assetResponse.data.type !== 'studyGuide'
        ) {
          setLoadError('学案不存在，或该资产不属于当前学科');
          return;
        }
        const detail = assetResponse.data as StudyGuideDetail;
        setGuide(detail);
        setGuideName(detail.name);
        setStructure(detail.structure);
        setBlocks(detail.contentBlocks);
        if (detail.status === 'draft') setEditing(true);

        if (contextResponse.success) {
          setColumns(contextResponse.data.columns);
          setLevelCodeRules(contextResponse.data.levelCodeRules);
          setKnowledgeTree(contextResponse.data.knowledgeTree);
          setKnowledgeLeaves(contextResponse.data.knowledgeLeaves);
        }
      })
      .catch(() => setLoadError('学案加载失败'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [routeContext]);

  const enterEdit = () => {
    setEditing(true);
    const params = new URLSearchParams(searchParams);
    params.set('view', 'edit');
    history.replace(`${location.pathname}?${params.toString()}`);
  };

  const cancelEdit = () => {
    if (!guide) return;
    setStructure(guide.structure);
    setBlocks(guide.contentBlocks);
    setEditing(false);
    const params = new URLSearchParams(searchParams);
    params.set('view', 'preview');
    history.replace(`${location.pathname}?${params.toString()}`);
  };

  const getStructureReferenceOptions = (level: StructureLevel) =>
    columns.filter((column) =>
      column.applicableLevels.includes(STRUCTURE_LEVEL_NUMBERS[level]),
    );

  const openAddStructure = (level: StructureLevel, parentId?: string) => {
    const hasRegisteredOptions = getStructureReferenceOptions(level).length > 0;
    setKnowledgeTreeSearch('');
    setKnowledgeTreeExpandedKeys([]);
    structureForm.resetFields();
    structureForm.setFieldsValue({
      parentId,
      source: hasRegisteredOptions ? 'registered' : 'custom',
    });
    setStructureDrawer({ mode: 'add', level, parentId });
  };

  const openEditStructure = (node: StudyGuideStructureNode) => {
    setKnowledgeTreeSearch('');
    setKnowledgeTreeExpandedKeys([]);
    structureForm.resetFields();
    structureForm.setFieldsValue({
      source: node.referenceId ? 'registered' : 'custom',
      label: node.label,
      referenceId: node.referenceId,
      knowledgeNodeId: node.knowledgeNodeId,
      temporaryName: node.temporaryName,
    });
    setStructureDrawer({
      mode: 'edit',
      level: node.level,
      nodeId: node.id,
    });
  };

  const saveStructureDrawer = async () => {
    if (!structureDrawer) return;
    const values = await structureForm.validateFields();
    const levelColumns = getStructureReferenceOptions(structureDrawer.level);
    const useRegisteredColumn =
      values.source === 'registered' && levelColumns.length > 0;
    const selectedColumn = useRegisteredColumn
      ? levelColumns.find((column) => column.id === values.referenceId)
      : undefined;
    const selectedLeaf = knowledgeLeaves.find(
      (leaf) => leaf.id === values.knowledgeNodeId,
    );
    const selection = useRegisteredColumn
      ? {
          label:
            selectedColumn?.dataSource === 'knowledgeTree'
              ? selectedLeaf?.title || ''
              : selectedColumn?.name || '',
          referenceId: values.referenceId,
          knowledgeNodeId:
            selectedColumn?.dataSource === 'knowledgeTree'
              ? values.knowledgeNodeId
              : undefined,
          temporaryName: undefined,
        }
      : {
          label: (values.temporaryName || '').trim(),
          referenceId: undefined,
          knowledgeNodeId: undefined,
          temporaryName: (values.temporaryName || '').trim(),
        };
    if (structureDrawer.mode === 'edit' && structureDrawer.nodeId) {
      setStructure(
        mapNodes(structure, (node) =>
          node.id === structureDrawer.nodeId
            ? {
                ...node,
                ...selection,
              }
            : node,
        ),
      );
      setStructureDrawer(null);
      return;
    }
    const newNode: StudyGuideStructureNode = {
      id: localId('sg-node'),
      level: structureDrawer.level,
      ...selection,
      children: [],
    };
    setStructure(appendNode(structure, structureDrawer.parentId, newNode));
    setStructureDrawer(null);
  };

  const deleteStructure = (node: StudyGuideStructureNode) => {
    const subtreeIds = new Set(collectSubtreeIds(node));
    const affectedBlocks = blocks.filter((block) =>
      subtreeIds.has(block.structureNodeId),
    );
    Modal.confirm({
      title: `删除${LEVEL_LABELS[node.level]}“${node.label}”？`,
      content: `该结构下有 ${node.children.length} 个直接子结构、${affectedBlocks.length} 个栏目项，将一起从本次编辑中移除。源知识块和知识树关系不会被修改。`,
      okText: '确认删除',
      okButtonProps: { danger: true },
      onOk: () => {
        setStructure(removeNode(structure, node.id));
        setBlocks((current) =>
          current.filter((block) => !subtreeIds.has(block.structureNodeId)),
        );
      },
    });
  };

  const openAddContent = (node: StudyGuideStructureNode) => {
    contentForm.resetFields();
    contentForm.setFieldsValue({ kind: 'columnContent' });
    setKnowledgeTreeSearch('');
    setEditingContentBlock(null);
    setContentNode(node);
  };

  const openEditContent = (
    node: StudyGuideStructureNode,
    block: StudyGuideContentBlock,
  ) => {
    const exampleContent =
      block.kind === 'example' ? getExampleKnowledgeContent(block) : undefined;
    contentForm.resetFields();
    contentForm.setFieldsValue({
      kind: block.kind,
      html: block.html,
      knowledgeNodeIds:
        block.kind === 'comprehensive'
          ? block.currentKnowledgeScope || block.knowledgeNodeIds
          : undefined,
      exampleStemHtml: exampleContent?.stemHtml,
      exampleGuideHtml: exampleContent?.guideHtml,
      exampleAnswerHtml: exampleContent?.answerHtml,
    });
    setKnowledgeTreeSearch('');
    setEditingContentBlock(block);
    setContentNode(node);
  };

  const closeContentEditor = () => {
    setKnowledgeTreeSearch('');
    setContentNode(null);
    setEditingContentBlock(null);
  };

  const saveContent = async () => {
    if (!contentNode) return;
    const values = await contentForm.validateFields();
    setAddingContent(true);
    try {
      const exampleContent: ExampleKnowledgeContent | undefined =
        values.kind === 'example'
          ? {
              stemHtml: values.exampleStemHtml || '',
              guideHtml: values.exampleGuideHtml || '',
              answerHtml: values.exampleAnswerHtml || '',
            }
          : undefined;
      const nextBlock: StudyGuideContentBlock = {
        id: editingContentBlock?.id || localId('sg-block'),
        kind: values.kind,
        structureNodeId: contentNode.id,
        html: exampleContent
          ? buildExampleKnowledgeHtml(exampleContent)
          : values.html || '',
        ...(exampleContent ? { exampleContent } : {}),
        knowledgeNodeIds:
          values.kind === 'comprehensive' ? values.knowledgeNodeIds || [] : [],
        knowledgeBlockId: editingContentBlock?.knowledgeBlockId,
        currentKnowledgeScope: undefined,
      };
      setBlocks((current) =>
        editingContentBlock
          ? current.map((block) =>
              block.id === editingContentBlock.id ? nextBlock : block,
            )
          : [...current, nextBlock],
      );
      closeContentEditor();
      if (editingContentBlock) {
        message.success('内容已更新，请保存学案后写入知识点关系');
      } else {
        message.success('内容已添加，请保存学案后写入知识点关系');
      }
    } catch {
      message.error(
        editingContentBlock
          ? '内容更新失败，请稍后重试'
          : '内容添加失败，请稍后重试',
      );
    } finally {
      setAddingContent(false);
    }
  };

  const deleteContent = (block: StudyGuideContentBlock) => {
    Modal.confirm({
      title: '删除这项内容？',
      content:
        block.kind === 'columnContent'
          ? '该栏目内容将从本次编辑中移除。'
          : '该引用项将从本次学案中移除，源知识块不会被删除。',
      okText: '确认删除',
      okButtonProps: { danger: true },
      onOk: () => {
        setBlocks((current) =>
          current.filter((currentBlock) => currentBlock.id !== block.id),
        );
      },
    });
  };

  const saveGuide = async (targetStatus: 'draft' | 'formal') => {
    const normalizedName = guideName.trim();
    if (!normalizedName) {
      message.error('请输入学案名称');
      return;
    }
    const execute = async () => {
      setSaving(true);
      try {
        let nextBlocks = getDraftContentBlocks(blocks);
        if (targetStatus === 'formal') {
          const materializedBlocks: StudyGuideContentBlock[] = [];
          for (const block of blocks) {
            if (!isKnowledgeContentKind(block.kind)) {
              materializedBlocks.push(block);
              continue;
            }
            const ownerNode = findNode(structure, block.structureNodeId);
            const knowledgeNodeIds = getEffectiveKnowledgeNodeIds(
              block.kind,
              ownerNode?.knowledgeNodeId,
              undefined,
              block.knowledgeNodeIds,
            );
            const selectionError = getKnowledgeNodeSelectionError(
              block.kind,
              knowledgeNodeIds,
            );
            if (selectionError) {
              throw new Error(
                block.kind === 'comprehensive'
                  ? '综合类知识至少需要手动选择两个末级知识点'
                  : `“${ownerNode?.label || '未命名栏目'}”未关联考点，无法发布${
                      CONTENT_KIND_LABELS[block.kind]
                    }`,
              );
            }
            const knowledgeBlockResponse = await saveKnowledgeBlock({
              id: block.knowledgeBlockId,
              subject,
              type: block.kind,
              html: block.html,
              exampleContent: block.exampleContent,
              knowledgeNodeIds,
            });
            if (!knowledgeBlockResponse.success) {
              throw new Error(knowledgeBlockResponse.message);
            }
            materializedBlocks.push({
              ...block,
              html: knowledgeBlockResponse.data.html,
              exampleContent: knowledgeBlockResponse.data.exampleContent,
              knowledgeNodeIds: knowledgeBlockResponse.data.knowledgeNodeIds,
              knowledgeBlockId: knowledgeBlockResponse.data.id,
              currentKnowledgeScope:
                block.kind === 'comprehensive'
                  ? knowledgeBlockResponse.data.knowledgeNodeIds
                  : undefined,
            });
          }
          nextBlocks = materializedBlocks;
        }
        const response =
          targetStatus === 'draft' && routeContext.mode === 'new'
            ? await createOnlineStudyGuide({
                subject,
                name: normalizedName,
                structure,
                contentBlocks: nextBlocks,
              })
            : targetStatus === 'draft' && guide?.status === 'draft'
            ? await updateOnlineStudyGuideDraft({
                id: guide.id,
                subject,
                name: normalizedName,
                structure,
                contentBlocks: nextBlocks,
              })
            : targetStatus === 'formal' && guide?.status === 'formal'
            ? await updateFormalStudyGuide({
                id: guide.id,
                subject,
                structure,
                contentBlocks: nextBlocks,
              })
            : targetStatus === 'formal'
            ? await publishOnlineStudyGuide({
                id: guide?.id,
                subject,
                name: normalizedName,
                structure,
                contentBlocks: nextBlocks,
              })
            : null;
        if (!response) return;
        if (!response.success) {
          message.error(response.message);
          return;
        }
        setGuide(response.data);
        setGuideName(response.data.name);
        setStructure(response.data.structure);
        setBlocks(response.data.contentBlocks);
        message.success(response.message);
        if (response.data.status === 'draft') {
          setEditing(true);
          if (routeContext.valid && routeContext.mode === 'new') {
            history.replace(
              `/combination-production/revision/${response.data.id}?subject=${subject}&type=studyGuide&view=edit`,
            );
          }
          return;
        }
        setEditing(false);
        if (routeContext.mode === 'new') {
          history.replace(
            `/combination-production/revision/${response.data.id}?subject=${subject}&type=studyGuide&view=preview`,
          );
          return;
        }
        const params = new URLSearchParams(searchParams);
        params.set('view', 'preview');
        history.replace(`${location.pathname}?${params.toString()}`);
      } catch (error) {
        message.error(
          error instanceof Error
            ? error.message
            : '保存失败，当前输入和结构仍保留在页面',
        );
      } finally {
        setSaving(false);
      }
    };
    if (targetStatus === 'draft') {
      await execute();
      return;
    }
    if (!guide || guide.status === 'draft') {
      Modal.confirm({
        title: '发布为正式学案？',
        content: '发布后将创建正式知识块并写入知识点关系，学案状态将变为正式。',
        okText: '确认发布',
        onOk: execute,
      });
      return;
    }
    const impactTotal =
      guide.mountCount + guide.platformTemplateCount + guide.teacherTaskCount;
    if (impactTotal) {
      Modal.confirm({
        title: '保存将影响正在使用的正式学案',
        width: 560,
        content: (
          <div className="combination-impact-grid">
            <div>
              <strong>{guide.mountCount}</strong>
              <span>资源节点挂载</span>
            </div>
            <div>
              <strong>{guide.platformTemplateCount}</strong>
              <span>平台模板</span>
            </div>
            <div>
              <strong>{guide.teacherTaskCount}</strong>
              <span>教师任务</span>
            </div>
          </div>
        ),
        okText: '确认保存',
        onOk: execute,
      });
      return;
    }
    await execute();
  };

  if (!routeContext.valid) {
    return (
      <PageContainer title="组合编辑器">
        <Card>
          <Empty description={routeContext.error}>
            <Button onClick={() => history.push('/preparation/asset-center')}>
              返回资产中心
            </Button>
          </Empty>
        </Card>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer title="学案在线编辑">
        <Card>
          <Skeleton active paragraph={{ rows: 12 }} />
        </Card>
      </PageContainer>
    );
  }

  if (loadError || (routeContext.mode === 'revision' && !guide)) {
    return (
      <PageContainer title="学案在线编辑">
        <Card>
          <Empty description={loadError || '学案不存在'} />
        </Card>
      </PageContainer>
    );
  }

  const structureLevel = structureDrawer?.level;
  const referenceOptions = structureLevel
    ? getStructureReferenceOptions(structureLevel)
    : [];
  const selectedStructureColumn = columns.find(
    (column) =>
      selectedStructureSource === 'registered' &&
      column.id === selectedStructureReferenceId,
  );
  const isDraftEditor =
    routeContext.mode === 'new' || guide?.status === 'draft';
  const requestedPrototypeVariant = searchParams.get('variant')?.toUpperCase();
  const prototypeVariant =
    process.env.NODE_ENV !== 'production' &&
    isFlatColumnPrototypeVariant(requestedPrototypeVariant)
      ? requestedPrototypeVariant
      : null;

  return (
    <PageContainer
      title={
        isDraftEditor ? (
          <Input
            className="combination-title-input"
            value={guideName}
            onChange={(event) => setGuideName(event.target.value)}
            placeholder="请输入学案名称"
            maxLength={60}
            variant="borderless"
            aria-label="学案名称"
          />
        ) : (
          guideName
        )
      }
      subTitle={
        <Tag
          className="combination-status-tag"
          color={isDraftEditor ? 'gold' : 'green'}
        >
          {isDraftEditor ? '草稿' : '正式'}
        </Tag>
      }
      className="combination-production-page"
      extra={[
        <Button
          key="back"
          icon={<ArrowLeftOutlined />}
          onClick={() =>
            history.push(`/preparation/asset-center?subject=${subject}`)
          }
        >
          返回资产中心
        </Button>,
        editing && !isDraftEditor && !prototypeVariant ? (
          <Button key="cancel" onClick={cancelEdit}>
            放弃本次修改
          </Button>
        ) : null,
        editing && isDraftEditor && !prototypeVariant ? (
          <Button
            key="save-draft"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={() => void saveGuide('draft')}
          >
            保存学案草稿
          </Button>
        ) : null,
        prototypeVariant ? (
          <Button key="prototype" disabled>
            原型只读
          </Button>
        ) : editing ? (
          <Button
            key="save"
            type="primary"
            icon={isDraftEditor ? <CheckCircleOutlined /> : <SaveOutlined />}
            loading={saving}
            onClick={() => void saveGuide('formal')}
          >
            {isDraftEditor ? '发布为正式学案' : '保存正式学案'}
          </Button>
        ) : (
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            onClick={enterEdit}
          >
            编辑正式学案
          </Button>
        ),
      ]}
    >
      {editing && prototypeVariant ? (
        <FlatColumnPrototype
          variant={prototypeVariant}
          structure={structure}
          blocks={blocks}
          levelCodeRules={levelCodeRules}
        />
      ) : (
        <StudyGuideContinuousEditor
          readOnly={!editing}
          structure={structure}
          blocks={blocks}
          levelCodeRules={levelCodeRules}
          onAdd={openAddStructure}
          onEdit={openEditStructure}
          onDelete={deleteStructure}
          onDragMove={(nodeId, targetId, position) =>
            setStructure((current) =>
              moveStructureNode(current, nodeId, targetId, position),
            )
          }
          onDragMoveContent={(blockId, targetNodeId, targetBlockId, position) =>
            setBlocks((current) =>
              moveContentBlock(
                current,
                blockId,
                targetNodeId,
                targetBlockId,
                position,
              ),
            )
          }
          onAddContent={openAddContent}
          onEditContent={openEditContent}
          onDeleteContent={deleteContent}
        />
      )}

      <Drawer
        title={
          contentNode
            ? `${editingContentBlock ? '编辑内容' : '添加内容'} · ${
                contentNode.label
              }`
            : '内容编辑'
        }
        open={Boolean(contentNode)}
        width={selectedContentKind === 'example' ? 760 : 680}
        onClose={closeContentEditor}
        extra={
          <Button
            type="primary"
            loading={addingContent}
            onClick={() => void saveContent()}
          >
            {editingContentBlock ? '保存修改' : '添加到栏目'}
          </Button>
        }
        destroyOnClose
      >
        <Form form={contentForm} layout="vertical">
          <Form.Item
            name="kind"
            label="内容类型"
            rules={[{ required: true, message: '请选择内容类型' }]}
          >
            <Select
              options={CONTENT_KIND_OPTIONS}
              onChange={(kind: ContentBlockKind) => {
                if (kind !== 'comprehensive') {
                  contentForm.setFieldValue('knowledgeNodeIds', undefined);
                }
                setKnowledgeTreeSearch('');
              }}
            />
          </Form.Item>

          {selectedContentKind === 'comprehensive' ? (
            <Form.Item
              name="knowledgeNodeIds"
              label="知识点"
              rules={[
                {
                  validator: (_, value?: string[]) =>
                    (value?.length || 0) >= 2
                      ? Promise.resolve()
                      : Promise.reject(new Error('请至少选择两个末级知识点')),
                },
              ]}
            >
              <TreeSelect
                treeData={filteredKnowledgeLeafTreeData}
                treeCheckable
                showCheckedStrategy={TreeSelect.SHOW_CHILD}
                maxTagCount="responsive"
                treeTitleRender={(node) =>
                  renderHighlightedTreeTitle(
                    String(node.title),
                    knowledgeTreeSearch,
                  )
                }
                treeExpandedKeys={visibleKnowledgeTreeExpandedKeys}
                onTreeExpand={(keys) =>
                  setKnowledgeTreeExpandedKeys(keys.map(String))
                }
                popupRender={(menu) => (
                  <div className="knowledge-tree-select-popup">
                    <Input.Search
                      allowClear
                      value={knowledgeTreeSearch}
                      placeholder="搜索知识点"
                      onChange={(event) =>
                        setKnowledgeTreeSearch(event.target.value)
                      }
                    />
                    {menu}
                  </div>
                )}
                treeLine={{ showLeafIcon: false }}
                treeExpandAction="click"
                placeholder="请选择末级知识点"
                notFoundContent={
                  knowledgeTreeSearch.trim()
                    ? '未找到匹配知识点'
                    : '当前学科暂无知识树末级节点'
                }
              />
            </Form.Item>
          ) : isKnowledgeContentKind(selectedContentKind) ? (
            <Form.Item label="知识点关系">
              {inheritsKnowledgeNode ? (
                <>
                  <Tag color="blue">{inheritedKnowledgeLeaf?.title}</Tag>
                  <span className="combination-inherited-knowledge-hint">
                    保存学案时随当前考点自动关联
                  </span>
                </>
              ) : (
                <>
                  <Tag color="gold">当前栏目未关联考点</Tag>
                  <span className="combination-inherited-knowledge-hint">
                    保存前请将内容移动到考点栏目
                  </span>
                </>
              )}
            </Form.Item>
          ) : null}

          {selectedContentKind === 'example' ? (
            <div className="combination-example-editor-fields">
              <Form.Item
                name="exampleStemHtml"
                label="试题内容"
                validateTrigger={[]}
                rules={[requiredRichTextRule('试题内容')]}
              >
                <RichTextEditor
                  placeholder="输入试题内容…"
                  editorHeight={200}
                />
              </Form.Item>
              <Form.Item
                name="exampleGuideHtml"
                label="思路点拨"
                validateTrigger={[]}
                rules={[requiredRichTextRule('思路点拨')]}
              >
                <RichTextEditor
                  placeholder="输入思路点拨…"
                  editorHeight={200}
                />
              </Form.Item>
              <Form.Item
                name="exampleAnswerHtml"
                label="试题答案"
                validateTrigger={[]}
                rules={[requiredRichTextRule('试题答案')]}
              >
                <RichTextEditor
                  placeholder="输入试题答案…"
                  editorHeight={200}
                />
              </Form.Item>
            </div>
          ) : (
            <Form.Item
              name="html"
              label={contentEditorLabel}
              validateTrigger={[]}
              rules={[requiredRichTextRule(contentEditorLabel)]}
            >
              <RichTextEditor
                key={selectedContentKind}
                placeholder={`输入${contentEditorLabel}…`}
              />
            </Form.Item>
          )}
        </Form>
      </Drawer>

      <Modal
        title={
          structureDrawer
            ? `${structureDrawer.mode === 'add' ? '添加' : '编辑'}${
                LEVEL_LABELS[structureDrawer.level]
              }`
            : '栏目操作'
        }
        open={Boolean(structureDrawer)}
        width={520}
        okText={structureDrawer?.mode === 'add' ? '确认添加' : '确认保存'}
        cancelText="取消"
        onOk={() => void saveStructureDrawer()}
        onCancel={() => setStructureDrawer(null)}
        destroyOnClose
      >
        {structureDrawer && (
          <Form form={structureForm} layout="vertical">
            {referenceOptions.length > 0 && (
              <Form.Item name="source" label="栏目来源">
                <Segmented
                  block
                  options={[
                    { label: '注册栏目', value: 'registered' },
                    { label: '自定义栏目', value: 'custom' },
                  ]}
                  onChange={(value) => {
                    structureForm.setFieldValue(
                      'source',
                      value as 'registered' | 'custom',
                    );
                  }}
                />
              </Form.Item>
            )}
            {referenceOptions.length > 0 &&
            selectedStructureSource === 'registered' ? (
              <>
                <Form.Item
                  name="referenceId"
                  label={LEVEL_LABELS[structureDrawer.level]}
                  rules={[{ required: true, message: '请选择注册栏目' }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={referenceOptions.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                    onChange={() => {
                      structureForm.setFieldValue('knowledgeNodeId', undefined);
                      setKnowledgeTreeSearch('');
                    }}
                  />
                </Form.Item>
                {selectedStructureColumn?.dataSource === 'knowledgeTree' && (
                  <Form.Item
                    name="knowledgeNodeId"
                    label="知识树末级节点"
                    rules={[
                      { required: true, message: '请选择知识树末级节点' },
                    ]}
                  >
                    <TreeSelect
                      treeData={filteredKnowledgeLeafTreeData}
                      treeTitleRender={(node) =>
                        renderHighlightedTreeTitle(
                          String(node.title),
                          knowledgeTreeSearch,
                        )
                      }
                      treeExpandedKeys={visibleKnowledgeTreeExpandedKeys}
                      onTreeExpand={(keys) =>
                        setKnowledgeTreeExpandedKeys(keys.map(String))
                      }
                      popupRender={(menu) => (
                        <div className="knowledge-tree-select-popup">
                          <Input.Search
                            allowClear
                            value={knowledgeTreeSearch}
                            placeholder="搜索知识点"
                            onChange={(event) =>
                              setKnowledgeTreeSearch(event.target.value)
                            }
                          />
                          {menu}
                        </div>
                      )}
                      treeLine={{ showLeafIcon: false }}
                      treeExpandAction="click"
                      placeholder="请选择末级节点"
                      onChange={() => setKnowledgeTreeSearch('')}
                      notFoundContent={
                        knowledgeTreeSearch.trim()
                          ? '未找到匹配知识点'
                          : '当前学科暂无知识树末级节点'
                      }
                    />
                  </Form.Item>
                )}
              </>
            ) : (
              <Form.Item
                name="temporaryName"
                label="自定义栏目名称"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: '请输入自定义栏目名称',
                  },
                ]}
                extra="仅在当前学案中使用，不会加入栏目维护。"
              >
                <Input
                  placeholder="请输入自定义栏目名称"
                  maxLength={60}
                  showCount
                />
              </Form.Item>
            )}
          </Form>
        )}
      </Modal>
    </PageContainer>
  );
};

export default CombinationProductionPage;
