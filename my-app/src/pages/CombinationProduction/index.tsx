import RichTextEditor from '@/components/RichTextEditor';
import {
  getKnowledgeNodeSelectionError,
  getSelectedKnowledgeNodeIds,
  isKnowledgeContentKind,
} from '@/features/study-guide/contentType';
import { STRUCTURE_LEVEL_NUMBERS } from '@/features/study-guide/structureModel';
import type {
  ContentBlockKind,
  KnowledgeLeaf,
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
  saveKnowledgeBlock,
  updateFormalStudyGuide,
  updateOnlineStudyGuideDraft,
} from '@/services/resourceAssets';
import {
  ArrowLeftOutlined,
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
  Select,
  Skeleton,
  Tag,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import FlatColumnPrototype, {
  isFlatColumnPrototypeVariant,
} from './FlatColumnPrototype';
import StudyGuideContinuousEditor from './StudyGuideContinuousEditor';
import './index.less';
import { parseCombinationProductionRouteContext } from './routeContext';

interface StructureFormValues {
  label?: string;
  referenceId?: string;
  knowledgeNodeId?: string;
  temporaryName?: string;
  parentId?: string;
}

interface ContentFormValues {
  kind: ContentBlockKind;
  knowledgeNodeId?: string;
  knowledgeNodeIds?: string[];
  html: string;
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
  const selectedContentKind =
    Form.useWatch('kind', contentForm) || 'columnContent';
  const contentEditorLabel =
    selectedContentKind === 'columnContent'
      ? '栏目内容'
      : `${CONTENT_KIND_LABELS[selectedContentKind]}内容`;

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

  const openAddStructure = (level: StructureLevel, parentId?: string) => {
    structureForm.resetFields();
    structureForm.setFieldsValue({ parentId });
    setStructureDrawer({ mode: 'add', level, parentId });
  };

  const openEditStructure = (node: StudyGuideStructureNode) => {
    structureForm.resetFields();
    structureForm.setFieldsValue({
      label: node.label,
      referenceId: node.referenceId,
      knowledgeNodeId: node.knowledgeNodeId,
      temporaryName: node.temporaryName,
    });
    setStructureDrawer({ mode: 'edit', level: node.level, nodeId: node.id });
  };

  const saveStructureDrawer = async () => {
    if (!structureDrawer) return;
    const values = await structureForm.validateFields();
    const levelColumns = columns.filter(
      (column) =>
        column.level === STRUCTURE_LEVEL_NUMBERS[structureDrawer.level],
    );
    const selectedColumn = levelColumns.find(
      (column) => column.id === values.referenceId,
    );
    const selectedLeaf = knowledgeLeaves.find(
      (leaf) => leaf.id === values.knowledgeNodeId,
    );
    const selection = levelColumns.length
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
    setEditingContentBlock(null);
    setContentNode(node);
  };

  const openEditContent = (
    node: StudyGuideStructureNode,
    block: StudyGuideContentBlock,
  ) => {
    contentForm.resetFields();
    contentForm.setFieldsValue({
      kind: block.kind,
      knowledgeNodeId:
        block.kind !== 'columnContent' && block.kind !== 'comprehensive'
          ? block.knowledgeNodeIds[0]
          : undefined,
      knowledgeNodeIds:
        block.kind === 'comprehensive'
          ? block.currentKnowledgeScope || block.knowledgeNodeIds
          : undefined,
      html: block.html,
    });
    setEditingContentBlock(block);
    setContentNode(node);
  };

  const closeContentEditor = () => {
    setContentNode(null);
    setEditingContentBlock(null);
  };

  const saveContent = async () => {
    if (!contentNode) return;
    const values = await contentForm.validateFields();
    const knowledgeNodeIds = getSelectedKnowledgeNodeIds(
      values.kind,
      values.knowledgeNodeId,
      values.knowledgeNodeIds,
    );
    const selectionError = getKnowledgeNodeSelectionError(
      values.kind,
      knowledgeNodeIds,
    );
    if (selectionError) {
      message.error(selectionError);
      return;
    }
    setAddingContent(true);
    try {
      const knowledgeBlockResponse = isKnowledgeContentKind(values.kind)
        ? await saveKnowledgeBlock({
            id: editingContentBlock?.knowledgeBlockId,
            subject,
            type: values.kind,
            html: values.html,
            knowledgeNodeIds,
          })
        : null;
      if (knowledgeBlockResponse && !knowledgeBlockResponse.success) {
        message.error(knowledgeBlockResponse.message);
        return;
      }
      const knowledgeBlock = knowledgeBlockResponse?.data;
      const nextBlock: StudyGuideContentBlock = {
        id: editingContentBlock?.id || localId('sg-block'),
        kind: knowledgeBlock?.type || 'columnContent',
        structureNodeId: contentNode.id,
        html: knowledgeBlock?.html || values.html,
        knowledgeNodeIds: knowledgeBlock?.knowledgeNodeIds || [],
        knowledgeBlockId: knowledgeBlock?.id,
        currentKnowledgeScope:
          knowledgeBlock?.type === 'comprehensive'
            ? knowledgeBlock.knowledgeNodeIds
            : undefined,
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
        message.success(
          knowledgeBlock
            ? `${CONTENT_KIND_LABELS[knowledgeBlock.type]}已更新`
            : '栏目内容已更新，请保存学案后生效',
        );
      } else {
        message.success(
          knowledgeBlock
            ? `${
                CONTENT_KIND_LABELS[knowledgeBlock.type]
              }已关联知识树并添加到当前栏目`
            : '栏目内容已添加到本次编辑，请保存学案后生效',
        );
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

  const saveGuide = async () => {
    const normalizedName = guideName.trim();
    if (!normalizedName) {
      message.error('请输入学案名称');
      return;
    }
    const execute = async () => {
      setSaving(true);
      try {
        const response =
          routeContext.valid && routeContext.mode === 'new'
            ? await createOnlineStudyGuide({
                subject,
                name: normalizedName,
                structure,
                contentBlocks: blocks,
              })
            : guide?.status === 'draft'
            ? await updateOnlineStudyGuideDraft({
                id: guide.id,
                subject,
                name: normalizedName,
                structure,
                contentBlocks: blocks,
              })
            : guide
            ? await updateFormalStudyGuide({
                id: guide.id,
                subject,
                structure,
                contentBlocks: blocks,
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
        const params = new URLSearchParams(searchParams);
        params.set('view', 'preview');
        history.replace(`${location.pathname}?${params.toString()}`);
      } catch {
        message.error('保存失败，当前输入和结构仍保留在页面');
      } finally {
        setSaving(false);
      }
    };
    if (!guide || guide.status === 'draft') {
      await execute();
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
    ? columns.filter(
        (column) => column.level === STRUCTURE_LEVEL_NUMBERS[structureLevel],
      )
    : [];
  const selectedStructureColumn = columns.find(
    (column) => column.id === selectedStructureReferenceId,
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
        prototypeVariant ? (
          <Button key="prototype" disabled>
            原型只读
          </Button>
        ) : editing ? (
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={() => void saveGuide()}
          >
            {isDraftEditor ? '保存学案草稿' : '保存正式学案'}
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
          registeredColumns={columns}
        />
      ) : (
        <StudyGuideContinuousEditor
          readOnly={!editing}
          structure={structure}
          blocks={blocks}
          registeredColumns={columns}
          knowledgeLeaves={knowledgeLeaves}
          onAdd={openAddStructure}
          onEdit={openEditStructure}
          onDelete={deleteStructure}
          onDragMove={(nodeId, targetId, position) =>
            setStructure((current) =>
              moveStructureNode(current, nodeId, targetId, position),
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
        width={680}
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
              onChange={() => {
                contentForm.setFieldsValue({
                  knowledgeNodeId: undefined,
                  knowledgeNodeIds: undefined,
                });
              }}
            />
          </Form.Item>

          {isKnowledgeContentKind(selectedContentKind) ? (
            selectedContentKind === 'comprehensive' ? (
              <Form.Item
                name="knowledgeNodeIds"
                label="关联知识树末级节点"
                extra="综合类知识是一对多关系，至少选择两个末级节点。"
                rules={[
                  {
                    validator: (_, values?: string[]) => {
                      const error = getKnowledgeNodeSelectionError(
                        selectedContentKind,
                        values || [],
                      );
                      return error
                        ? Promise.reject(new Error(error))
                        : Promise.resolve();
                    },
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  showSearch
                  optionFilterProp="label"
                  maxTagCount="responsive"
                  placeholder="请选择两个或以上末级节点"
                  options={knowledgeLeaves.map((leaf) => ({
                    value: leaf.id,
                    label: leaf.path.join(' / '),
                  }))}
                  notFoundContent="当前学科暂无知识树末级节点"
                />
              </Form.Item>
            ) : (
              <Form.Item
                name="knowledgeNodeId"
                label="关联知识树末级节点"
                extra={`${CONTENT_KIND_LABELS[selectedContentKind]}只能关联一个末级节点。`}
                rules={[{ required: true, message: '请选择一个末级节点' }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="请选择末级节点"
                  options={knowledgeLeaves.map((leaf) => ({
                    value: leaf.id,
                    label: leaf.path.join(' / '),
                  }))}
                  notFoundContent="当前学科暂无知识树末级节点"
                />
              </Form.Item>
            )
          ) : null}

          <Form.Item
            name="html"
            label={contentEditorLabel}
            validateTrigger={[]}
            rules={[
              {
                validator: (_, value?: string) => {
                  const text = (value || '')
                    .replace(/<[^>]+>/g, '')
                    .replace(/&nbsp;/g, ' ')
                    .trim();
                  const hasNonTextContent = /<(img|table|math)\b/i.test(
                    value || '',
                  );
                  return text || hasNonTextContent
                    ? Promise.resolve()
                    : Promise.reject(new Error(`请输入${contentEditorLabel}`));
                },
              },
            ]}
          >
            <RichTextEditor
              key={selectedContentKind}
              placeholder={`输入${contentEditorLabel}…`}
            />
          </Form.Item>
        </Form>
      </Drawer>

      <Modal
        title={
          structureDrawer
            ? `${structureDrawer.mode === 'add' ? '添加' : '更换'}${
                LEVEL_LABELS[structureDrawer.level]
              }`
            : '栏目操作'
        }
        open={Boolean(structureDrawer)}
        width={520}
        okText={structureDrawer?.mode === 'add' ? '确认添加' : '确认更换'}
        cancelText="取消"
        onOk={() => void saveStructureDrawer()}
        onCancel={() => setStructureDrawer(null)}
        destroyOnClose
      >
        {structureDrawer && (
          <Form form={structureForm} layout="vertical">
            {referenceOptions.length ? (
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
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="请选择末级节点"
                      options={knowledgeLeaves.map((leaf) => ({
                        value: leaf.id,
                        label: leaf.path.join(' / '),
                      }))}
                      notFoundContent="当前学科暂无知识树末级节点"
                    />
                  </Form.Item>
                )}
              </>
            ) : (
              <Form.Item
                name="temporaryName"
                label={`${LEVEL_LABELS[structureDrawer.level]}名称`}
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: '请输入临时栏目名称',
                  },
                ]}
                extra="当前层级没有注册栏目，可填写仅属于当前学案的临时栏目；不会自动注册到后台。"
              >
                <Input placeholder="请输入临时栏目名称" />
              </Form.Item>
            )}
          </Form>
        )}
      </Modal>
    </PageContainer>
  );
};

export default CombinationProductionPage;
