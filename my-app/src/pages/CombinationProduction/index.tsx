import RichTextEditor from '@/components/RichTextEditor';
import type {
  KnowledgeBlock,
  KnowledgeLeaf,
  RegisteredColumn,
  StructureLevel,
  StudyGuideContentBlock,
  StudyGuideDetail,
  StudyGuideStructureNode,
} from '@/services/resourceAssets';
import {
  getAssetDetail,
  getKnowledgeBlocks,
  getResourceAssetContext,
  KNOWLEDGE_BLOCK_TYPE_LABELS,
  updateFormalStudyGuide,
} from '@/services/resourceAssets';
import { sanitizeHtml } from '@/utils/sanitize';
import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SaveOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useLocation, useParams, useSearchParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Select,
  Skeleton,
  Space,
  Tag,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import './index.less';
import { parseCombinationProductionRouteContext } from './routeContext';

interface StructureFormValues {
  label: string;
  referenceId?: string;
  parentId?: string;
}

interface BlockFormValues {
  knowledgeBlockId?: string;
  html?: string;
  currentKnowledgeScope?: string[];
}

const LEVEL_LABELS: Record<StructureLevel, string> = {
  level1: '一级栏目',
  level2: '二级分组',
  level3: '三级考点',
  level4: '四级栏目',
};
const LEVEL_COLORS: Record<StructureLevel, string> = {
  level1: 'blue',
  level2: 'cyan',
  level3: 'purple',
  level4: 'geekblue',
};
const NEXT_LEVEL: Partial<Record<StructureLevel, StructureLevel>> = {
  level1: 'level2',
  level2: 'level3',
  level3: 'level4',
};
let localSequence = 0;
const localId = (prefix: string) => {
  localSequence += 1;
  return `${prefix}-local-${Date.now()}-${localSequence}`;
};

const flattenStructure = (
  nodes: StudyGuideStructureNode[],
  parentId?: string,
): Array<StudyGuideStructureNode & { parentId?: string }> =>
  nodes.flatMap((node) => [
    { ...node, parentId },
    ...flattenStructure(node.children, node.id),
  ]);

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

const moveSibling = (
  nodes: StudyGuideStructureNode[],
  nodeId: string,
  direction: 'up' | 'down',
): StudyGuideStructureNode[] => {
  const index = nodes.findIndex((node) => node.id === nodeId);
  if (index >= 0) {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= nodes.length) return nodes;
    const next = [...nodes];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  }
  return nodes.map((node) => ({
    ...node,
    children: moveSibling(node.children, nodeId, direction),
  }));
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
  const [structure, setStructure] = useState<StudyGuideStructureNode[]>([]);
  const [blocks, setBlocks] = useState<StudyGuideContentBlock[]>([]);
  const [columns, setColumns] = useState<RegisteredColumn[]>([]);
  const [knowledgeLeaves, setKnowledgeLeaves] = useState<KnowledgeLeaf[]>([]);
  const [knowledgeBlocks, setKnowledgeBlocks] = useState<KnowledgeBlock[]>([]);
  const [loading, setLoading] = useState(mode === 'revision');
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(searchParams.get('view') === 'edit');

  const [structureDrawer, setStructureDrawer] = useState<{
    mode: 'add' | 'edit' | 'move';
    level: StructureLevel;
    nodeId?: string;
    parentId?: string;
  } | null>(null);
  const [blockDrawer, setBlockDrawer] = useState<{
    mode: 'add' | 'edit';
    block?: StudyGuideContentBlock;
    structureNodeId: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [structureForm] = Form.useForm<StructureFormValues>();
  const [blockForm] = Form.useForm<BlockFormValues>();
  const selectedKnowledgeBlockId = Form.useWatch('knowledgeBlockId', blockForm);

  useEffect(() => {
    if (!routeContext.valid || routeContext.mode !== 'revision') {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      getAssetDetail({
        id: routeContext.resourceId,
        subject: routeContext.subject,
      }),
      getResourceAssetContext({ subject: routeContext.subject }),
      getKnowledgeBlocks({ subject: routeContext.subject }),
    ])
      .then(([assetResponse, contextResponse, blocksResponse]) => {
        if (cancelled) return;
        if (
          !assetResponse.success ||
          assetResponse.data.type !== 'studyGuide' ||
          assetResponse.data.status !== 'formal'
        ) {
          setLoadError('正式学案不存在，或该资产不属于当前学科');
          return;
        }
        const detail = assetResponse.data as StudyGuideDetail;
        setGuide(detail);
        setStructure(detail.structure);
        setBlocks(detail.contentBlocks);

        if (contextResponse.success) {
          setColumns(contextResponse.data.columns);
          setKnowledgeLeaves(contextResponse.data.knowledgeLeaves);
        }
        if (blocksResponse.success) setKnowledgeBlocks(blocksResponse.data);
      })
      .catch(() => setLoadError('正式学案加载失败'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [routeContext]);

  const flatNodes = useMemo(() => flattenStructure(structure), [structure]);
  const nodeMap = useMemo(
    () => new Map(flatNodes.map((node) => [node.id, node])),
    [flatNodes],
  );
  const leafMap = useMemo(
    () => new Map(knowledgeLeaves.map((leaf) => [leaf.id, leaf])),
    [knowledgeLeaves],
  );
  const guideKnowledgeIds = useMemo(
    () =>
      new Set(
        flatNodes
          .filter((node) => node.level === 'level3' && node.referenceId)
          .map((node) => node.referenceId as string),
      ),
    [flatNodes],
  );

  useEffect(() => {
    if (!editing) return;
    setBlocks((current) => {
      let changed = false;
      const next = current.map((block) => {
        if (block.kind !== 'comprehensive') return block;
        const source = knowledgeBlocks.find(
          (item) => item.id === block.knowledgeBlockId,
        );
        const validIntersection = (
          source?.knowledgeNodeIds || block.knowledgeNodeIds
        ).filter((nodeId) => guideKnowledgeIds.has(nodeId));
        const nextScope = (block.currentKnowledgeScope || []).filter((nodeId) =>
          validIntersection.includes(nodeId),
        );
        if (
          validIntersection.join('|') === block.knowledgeNodeIds.join('|') &&
          nextScope.join('|') === (block.currentKnowledgeScope || []).join('|')
        ) {
          return block;
        }
        changed = true;
        return {
          ...block,
          knowledgeNodeIds: validIntersection,
          currentKnowledgeScope: nextScope,
        };
      });
      return changed ? next : current;
    });
  }, [editing, guideKnowledgeIds, knowledgeBlocks]);

  const selectedKnowledgeBlock = knowledgeBlocks.find(
    (item) => item.id === selectedKnowledgeBlockId,
  );
  const comprehensiveIntersection =
    selectedKnowledgeBlock?.knowledgeNodeIds.filter((nodeId) =>
      guideKnowledgeIds.has(nodeId),
    );

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

  const openAddStructure = (level: StructureLevel, parentId?: string) => {
    structureForm.resetFields();
    structureForm.setFieldsValue({ parentId });
    setStructureDrawer({ mode: 'add', level, parentId });
  };

  const openEditStructure = (node: StudyGuideStructureNode) => {
    structureForm.setFieldsValue({
      label: node.label,
      referenceId: node.referenceId,
    });
    setStructureDrawer({ mode: 'edit', level: node.level, nodeId: node.id });
  };

  const openMoveStructure = (node: StudyGuideStructureNode) => {
    const parentId = flatNodes.find(
      (candidate) => candidate.id === node.id,
    )?.parentId;
    structureForm.setFieldsValue({ parentId });
    setStructureDrawer({ mode: 'move', level: node.level, nodeId: node.id });
  };

  const saveStructureDrawer = async () => {
    if (!structureDrawer) return;
    const values = await structureForm.validateFields();
    if (structureDrawer.mode === 'move' && structureDrawer.nodeId) {
      const moving = findNode(structure, structureDrawer.nodeId);
      if (!moving) return;
      const removed = removeNode(structure, moving.id);
      setStructure(appendNode(removed, values.parentId, moving));
      setStructureDrawer(null);
      return;
    }
    if (structureDrawer.mode === 'edit' && structureDrawer.nodeId) {
      setStructure(
        mapNodes(structure, (node) =>
          node.id === structureDrawer.nodeId
            ? {
                ...node,
                label: values.label,
                referenceId: values.referenceId,
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
      label: values.label,
      referenceId: values.referenceId,
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

  const openAddBlock = (structureNodeId: string) => {
    blockForm.resetFields();
    setBlockDrawer({ mode: 'add', structureNodeId });
  };

  const openEditBlock = (block: StudyGuideContentBlock) => {
    blockForm.setFieldsValue({
      knowledgeBlockId: block.knowledgeBlockId,
      html: block.html,
      currentKnowledgeScope: block.currentKnowledgeScope,
    });
    setBlockDrawer({
      mode: 'edit',
      block,
      structureNodeId: block.structureNodeId,
    });
  };

  useEffect(() => {
    if (selectedKnowledgeBlock?.type === 'comprehensive') {
      blockForm.setFieldValue(
        'currentKnowledgeScope',
        comprehensiveIntersection || [],
      );
    }
  }, [blockForm, comprehensiveIntersection, selectedKnowledgeBlock]);

  const saveBlockDrawer = async () => {
    if (!blockDrawer) return;
    const values = await blockForm.validateFields();
    const source = knowledgeBlocks.find(
      (item) => item.id === values.knowledgeBlockId,
    );
    let nextBlock: StudyGuideContentBlock;
    if (blockDrawer.block?.kind === 'columnContent') {
      nextBlock = { ...blockDrawer.block, html: values.html || '' };
    } else {
      if (!source) return;
      nextBlock = {
        id: blockDrawer.block?.id || localId('sg-block'),
        kind: source.type,
        structureNodeId: blockDrawer.structureNodeId,
        knowledgeBlockId: source.id,
        html: source.html,
        knowledgeNodeIds: source.knowledgeNodeIds,
        currentKnowledgeScope:
          source.type === 'comprehensive'
            ? values.currentKnowledgeScope
            : undefined,
      };
    }
    setBlocks((current) =>
      blockDrawer.mode === 'edit'
        ? current.map((block) =>
            block.id === nextBlock.id ? nextBlock : block,
          )
        : [...current, nextBlock],
    );
    setBlockDrawer(null);
  };

  const saveFormal = async () => {
    if (!guide) return;
    const impactTotal =
      guide.mountCount + guide.platformTemplateCount + guide.teacherTaskCount;
    const execute = async () => {
      setSaving(true);
      try {
        const response = await updateFormalStudyGuide({
          id: guide.id,
          subject,
          structure,
          contentBlocks: blocks,
        });
        if (!response.success) {
          message.error(response.message);
          return;
        }
        setGuide(response.data);
        setStructure(response.data.structure);
        setBlocks(response.data.contentBlocks);
        setEditing(false);
        message.success(response.message);
        const params = new URLSearchParams(searchParams);
        params.set('view', 'preview');
        history.replace(`${location.pathname}?${params.toString()}`);
      } catch {
        message.error('保存失败，修改前正式内容保持不变，本次编辑仍保留在页面');
      } finally {
        setSaving(false);
      }
    };
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

  if (routeContext.mode === 'new') {
    const typeLabel =
      routeContext.resourceType === 'studyGuide' ? '学案' : '作业';
    return (
      <PageContainer title={`新建${typeLabel}`} subTitle="加工组合型资产入口">
        <Card className="combination-entry-card">
          <Alert
            type="info"
            showIcon
            message={`“新建${typeLabel}”本期仅保留可见入口`}
            description="点击入口不会创建草稿、不会回流资产中心，也不会进入从零加工流程。完整能力由“加工组合型资产”需求后续承接。"
          />
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() =>
              history.push(
                `/preparation/asset-center?subject=${routeContext.subject}`,
              )
            }
          >
            返回资产中心
          </Button>
        </Card>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer title="正式学案">
        <Card>
          <Skeleton active paragraph={{ rows: 12 }} />
        </Card>
      </PageContainer>
    );
  }

  if (!guide || loadError) {
    return (
      <PageContainer title="正式学案">
        <Card>
          <Empty description={loadError || '正式学案不存在'} />
        </Card>
      </PageContainer>
    );
  }

  const renderNode = (
    node: StudyGuideStructureNode,
    index: number,
    total: number,
  ) => {
    const nodeBlocks = blocks.filter(
      (block) => block.structureNodeId === node.id,
    );
    const nextLevel = NEXT_LEVEL[node.level];
    return (
      <article
        key={node.id}
        className={`combination-node combination-node-${node.level}`}
      >
        <header>
          <div>
            <Tag color={LEVEL_COLORS[node.level]}>
              {LEVEL_LABELS[node.level]}
            </Tag>
            <strong>{node.label}</strong>
          </div>
          {editing && (
            <Space size={2} wrap>
              <Button
                type="text"
                size="small"
                icon={<ArrowUpOutlined />}
                disabled={index === 0}
                onClick={() =>
                  setStructure(moveSibling(structure, node.id, 'up'))
                }
                aria-label={`上移${node.label}`}
              />
              <Button
                type="text"
                size="small"
                icon={<ArrowDownOutlined />}
                disabled={index === total - 1}
                onClick={() =>
                  setStructure(moveSibling(structure, node.id, 'down'))
                }
                aria-label={`下移${node.label}`}
              />
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEditStructure(node)}
              >
                编辑
              </Button>
              {node.level !== 'level1' && (
                <Button
                  type="link"
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={() => openMoveStructure(node)}
                >
                  移动
                </Button>
              )}
              {nextLevel && (
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => openAddStructure(nextLevel, node.id)}
                >
                  添加{LEVEL_LABELS[nextLevel]}
                </Button>
              )}
              {(node.level === 'level2' ||
                node.level === 'level3' ||
                node.level === 'level4') && (
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => openAddBlock(node.id)}
                >
                  引用知识块
                </Button>
              )}
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => deleteStructure(node)}
              >
                删除
              </Button>
            </Space>
          )}
        </header>
        {nodeBlocks.map((block) => (
          <section key={block.id} className="combination-block">
            <div className="combination-block-heading">
              <Tag bordered={false}>
                {block.kind === 'columnContent'
                  ? '栏目内容'
                  : KNOWLEDGE_BLOCK_TYPE_LABELS[block.kind]}
              </Tag>
              {block.kind === 'comprehensive' && (
                <span>
                  本次知识范围：
                  {block.currentKnowledgeScope
                    ?.map((id) => leafMap.get(id)?.title || id)
                    .join('、') || '未设置'}
                </span>
              )}
              {editing && (
                <Space size={2}>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => openEditBlock(block)}
                  >
                    {block.kind === 'columnContent' ? '编辑内容' : '更换引用'}
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    danger
                    onClick={() =>
                      setBlocks((current) =>
                        current.filter((item) => item.id !== block.id),
                      )
                    }
                  >
                    移除
                  </Button>
                </Space>
              )}
            </div>
            <div
              className="rich-content"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.html) }}
            />
          </section>
        ))}
        {node.children.length > 0 && (
          <div className="combination-children">
            {node.children.map((child, childIndex) =>
              renderNode(child, childIndex, node.children.length),
            )}
          </div>
        )}
      </article>
    );
  };

  const renderPreviewNode = (node: StudyGuideStructureNode) => {
    const nodeBlocks = blocks.filter(
      (block) => block.structureNodeId === node.id,
    );
    const heading =
      node.level === 'level1' ? (
        <h2>{node.label}</h2>
      ) : node.level === 'level2' ? (
        <h3>{node.label}</h3>
      ) : node.level === 'level3' ? (
        <h4>{node.label}</h4>
      ) : (
        <h5>{node.label}</h5>
      );
    return (
      <section
        key={node.id}
        className={`study-guide-reading-section study-guide-reading-${node.level}`}
      >
        {heading}
        {nodeBlocks.map((block) => (
          <article key={block.id} className="study-guide-reading-block">
            {block.kind !== 'columnContent' && (
              <div className="study-guide-reading-meta">
                <span>{KNOWLEDGE_BLOCK_TYPE_LABELS[block.kind]}</span>
                {block.kind === 'comprehensive' && (
                  <small>
                    本次知识范围：
                    {block.currentKnowledgeScope
                      ?.map((id) => leafMap.get(id)?.title || id)
                      .join('、') || '未设置'}
                  </small>
                )}
              </div>
            )}
            <div
              className="study-guide-reading-content rich-content"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.html) }}
            />
          </article>
        ))}
        {node.children.map(renderPreviewNode)}
      </section>
    );
  };

  const structureLevel = structureDrawer?.level;
  const structureTargetNode = structureDrawer?.nodeId
    ? flatNodes.find((node) => node.id === structureDrawer.nodeId)
    : undefined;
  const structureParentId =
    structureDrawer?.parentId || structureTargetNode?.parentId;
  let ancestorLevel1Id = structureParentId;
  while (ancestorLevel1Id) {
    const ancestor = nodeMap.get(ancestorLevel1Id);
    if (!ancestor || ancestor.level === 'level1') break;
    ancestorLevel1Id = ancestor.parentId;
  }
  const ancestorLevel1ReferenceId = ancestorLevel1Id
    ? flatNodes.find((node) => node.id === ancestorLevel1Id)?.referenceId
    : undefined;
  const referenceOptions =
    structureLevel === 'level1'
      ? columns.filter((column) => column.level === 1)
      : structureLevel === 'level4'
      ? columns.filter(
          (column) =>
            column.level === 4 && column.parentId === ancestorLevel1ReferenceId,
        )
      : structureLevel === 'level3'
      ? knowledgeLeaves
      : [];
  const parentLevel: Partial<Record<StructureLevel, StructureLevel>> = {
    level2: 'level1',
    level3: 'level2',
    level4: 'level3',
  };
  const getLevel1ReferenceForNode = (nodeId: string) => {
    let current = nodeMap.get(nodeId);
    while (current && current.level !== 'level1' && current.parentId) {
      current = nodeMap.get(current.parentId);
    }
    return current?.level === 'level1' ? current.referenceId : undefined;
  };
  const unfilteredMoveParentOptions = structureLevel
    ? flatNodes.filter((node) => node.level === parentLevel[structureLevel])
    : [];
  const movingLevel4ColumnParentId =
    structureLevel === 'level4' && structureTargetNode?.referenceId
      ? columns.find((column) => column.id === structureTargetNode.referenceId)
          ?.parentId
      : undefined;
  const moveParentOptions = movingLevel4ColumnParentId
    ? unfilteredMoveParentOptions.filter(
        (node) =>
          getLevel1ReferenceForNode(node.id) === movingLevel4ColumnParentId,
      )
    : unfilteredMoveParentOptions;
  const selectedStructureNode = blockDrawer
    ? nodeMap.get(blockDrawer.structureNodeId)
    : undefined;
  let enclosingLevel3ReferenceId =
    selectedStructureNode?.level === 'level3'
      ? selectedStructureNode.referenceId
      : undefined;
  let enclosingNode = selectedStructureNode;
  while (!enclosingLevel3ReferenceId && enclosingNode?.parentId) {
    enclosingNode = nodeMap.get(enclosingNode.parentId);
    if (enclosingNode?.level === 'level3') {
      enclosingLevel3ReferenceId = enclosingNode.referenceId;
    }
  }
  const allowedKnowledgeBlocks = knowledgeBlocks.filter((block) => {
    if (!selectedStructureNode) return false;
    return selectedStructureNode.level === 'level2'
      ? block.type === 'comprehensive'
      : ['single', 'method', 'example'].includes(block.type) &&
          Boolean(
            enclosingLevel3ReferenceId &&
              block.knowledgeNodeIds.includes(enclosingLevel3ReferenceId),
          );
  });

  return (
    <PageContainer
      title={guide.name}
      subTitle={editing ? '正式学案编辑' : '正式学案只读预览'}
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
        editing ? (
          <Button key="cancel" onClick={cancelEdit}>
            放弃本次修改
          </Button>
        ) : null,
        editing ? (
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={() => void saveFormal()}
          >
            保存正式学案
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
      {!editing && (
        <Alert
          type="info"
          showIcon
          icon={<EyeOutlined />}
          message="当前为只读预览"
          description="从知识块详情进入时不会直接修改正式学案；点击“编辑正式学案”后才进入维护状态。"
        />
      )}
      <Card variant="borderless" className="combination-summary">
        <Descriptions
          size="small"
          column={4}
          items={[
            { label: '状态', children: <Tag color="green">正式</Tag> },
            {
              label: '原文件',
              children: guide.originalFileName || '无原始文件',
            },
            { label: '结构位置', children: flatNodes.length },
            { label: '栏目项', children: blocks.length },
          ]}
        />
      </Card>
      {editing ? (
        <>
          <div className="combination-editor-toolbar">
            <div>
              <strong>栏目结构</strong>
              <span>编辑不修改注册栏目定义或源知识块本体</span>
            </div>
            <Button
              icon={<PlusOutlined />}
              onClick={() => openAddStructure('level1')}
            >
              添加一级栏目
            </Button>
          </div>
          <div className="combination-structure">
            {structure.length ? (
              structure.map((node, index) =>
                renderNode(node, index, structure.length),
              )
            ) : (
              <Empty description="当前学案暂无栏目结构" />
            )}
          </div>
        </>
      ) : (
        <div className="study-guide-preview-stage">
          <article className="study-guide-document">
            <header className="study-guide-document-header">
              <span>正式学案</span>
              <h1>{guide.name}</h1>
              <p>{guide.originalFileName || '在线学案'}</p>
            </header>
            {structure.length ? (
              structure.map(renderPreviewNode)
            ) : (
              <Empty description="当前学案暂无正文内容" />
            )}
          </article>
        </div>
      )}

      <Drawer
        title={
          structureDrawer
            ? `${
                structureDrawer.mode === 'add'
                  ? '添加'
                  : structureDrawer.mode === 'edit'
                  ? '编辑'
                  : '移动'
              }${LEVEL_LABELS[structureDrawer.level]}`
            : '编辑结构'
        }
        open={Boolean(structureDrawer)}
        width={520}
        onClose={() => setStructureDrawer(null)}
        extra={
          <Button type="primary" onClick={() => void saveStructureDrawer()}>
            应用到本次编辑
          </Button>
        }
        destroyOnClose
      >
        {structureDrawer && (
          <Form form={structureForm} layout="vertical">
            {structureDrawer.mode === 'move' ? (
              <Form.Item
                name="parentId"
                label="新的上级结构"
                rules={[
                  {
                    required: structureDrawer.level !== 'level1',
                    message: '请选择新的上级结构',
                  },
                ]}
              >
                <Select
                  options={moveParentOptions.map((node) => ({
                    value: node.id,
                    label: `${LEVEL_LABELS[node.level]} · ${node.label}`,
                  }))}
                />
              </Form.Item>
            ) : structureDrawer.level === 'level2' ? (
              <Form.Item
                name="label"
                label="分组名称"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: '请输入二级分组名称',
                  },
                ]}
              >
                <Input placeholder="二级分组属于当前学案，可重复命名" />
              </Form.Item>
            ) : (
              <>
                <Form.Item
                  name="referenceId"
                  label={LEVEL_LABELS[structureDrawer.level]}
                  rules={[{ required: true, message: '请选择结构对象' }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={referenceOptions.map((item) => ({
                      value: item.id,
                      label: 'name' in item ? item.name : item.path.join(' / '),
                    }))}
                    onChange={(value) => {
                      const option = referenceOptions.find(
                        (item) => item.id === value,
                      );
                      structureForm.setFieldValue(
                        'label',
                        option
                          ? 'name' in option
                            ? option.name
                            : option.title
                          : '',
                      );
                    }}
                  />
                </Form.Item>
                <Form.Item name="label" hidden>
                  <Input />
                </Form.Item>
              </>
            )}
          </Form>
        )}
      </Drawer>

      <Drawer
        title={
          blockDrawer?.mode === 'add'
            ? '引用知识块'
            : blockDrawer?.block?.kind === 'columnContent'
            ? '编辑栏目内容'
            : '更换知识块引用'
        }
        open={Boolean(blockDrawer)}
        width={700}
        onClose={() => setBlockDrawer(null)}
        extra={
          <Button type="primary" onClick={() => void saveBlockDrawer()}>
            应用到本次编辑
          </Button>
        }
        destroyOnClose
      >
        {blockDrawer?.block?.kind === 'columnContent' ? (
          <Form form={blockForm} layout="vertical">
            <Form.Item
              name="html"
              label="栏目原生内容"
              rules={[
                { required: true, whitespace: true, message: '请输入内容' },
              ]}
            >
              <RichTextEditor />
            </Form.Item>
          </Form>
        ) : (
          <Form form={blockForm} layout="vertical">
            <Form.Item
              name="knowledgeBlockId"
              label="知识块"
              rules={[{ required: true, message: '请选择知识块' }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={allowedKnowledgeBlocks.map((block) => ({
                  value: block.id,
                  label: `${
                    KNOWLEDGE_BLOCK_TYPE_LABELS[block.type]
                  } · ${block.html.replace(/<[^>]+>/g, '').slice(0, 42)}`,
                }))}
              />
            </Form.Item>
            {selectedKnowledgeBlock?.type === 'comprehensive' && (
              <Form.Item
                name="currentKnowledgeScope"
                label="本次知识范围"
                rules={[{ required: true, message: '至少选择一个本次知识点' }]}
                extra="只显示“源知识块关联且本学案实际涉及的三级考点”交集，默认全选"
              >
                <Checkbox.Group
                  options={(comprehensiveIntersection || []).map((id) => ({
                    value: id,
                    label: leafMap.get(id)?.title || id,
                  }))}
                />
              </Form.Item>
            )}
            {selectedKnowledgeBlock && (
              <Card size="small" title="源知识块当前内容">
                <div
                  className="rich-content"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(selectedKnowledgeBlock.html),
                  }}
                />
              </Card>
            )}
          </Form>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default CombinationProductionPage;
