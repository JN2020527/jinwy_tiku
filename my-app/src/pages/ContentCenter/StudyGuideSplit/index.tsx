import RichTextEditor from '@/components/RichTextEditor';
import type {
  ContentBlockKind,
  StudyGuideContentBlock,
  StudyGuideDetail,
  StudyGuideStructureNode,
} from '@/services/resourceAssets';
import {
  finalizeStudyGuideDraft,
  getAssetDetail,
  KNOWLEDGE_BLOCK_TYPE_LABELS,
  updateStudyGuideDraft,
} from '@/services/resourceAssets';
import { sanitizeHtml } from '@/utils/sanitize';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FileDoneOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useParams, useSearchParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Empty,
  message,
  Modal,
  Skeleton,
  Space,
  Tag,
  Tree,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import './index.less';

const KIND_LABELS: Record<ContentBlockKind, string> = {
  columnContent: '栏目内容',
  ...KNOWLEDGE_BLOCK_TYPE_LABELS,
};

const toTreeData = (nodes: StudyGuideStructureNode[]): DataNode[] =>
  nodes.map((node) => ({
    key: node.id,
    title: (
      <span className="split-tree-title">
        <Tag bordered={false}>{node.level.replace('level', '')}级</Tag>
        {node.label}
      </span>
    ),
    children: toTreeData(node.children),
  }));

const flattenNodes = (nodes: StudyGuideStructureNode[]) =>
  nodes.flatMap((node): StudyGuideStructureNode[] => [
    node,
    ...flattenNodes(node.children),
  ]);

const StudyGuideSplitPage: React.FC = () => {
  const { draftId } = useParams<'draftId'>();
  const [searchParams] = useSearchParams();
  const subject = searchParams.get('subject') || 'math';
  const [draft, setDraft] = useState<StudyGuideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [editingBlock, setEditingBlock] =
    useState<StudyGuideContentBlock | null>(null);
  const [editingHtml, setEditingHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [hasUnsavedEdit, setHasUnsavedEdit] = useState(false);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    if (!draftId) {
      setLoadError('缺少学案草稿 ID');
      setLoading(false);
      return () => {
        activeRef.current = false;
      };
    }
    void getAssetDetail({ id: draftId, subject })
      .then((response) => {
        if (!activeRef.current) return;
        if (!response.success || response.data.type !== 'studyGuide') {
          setLoadError(response.message || '学案草稿不存在');
          return;
        }
        const detail = response.data as StudyGuideDetail;
        if (detail.status !== 'draft') {
          history.replace(
            `/combination-production/revision/${detail.id}?subject=${subject}&type=studyGuide&view=preview`,
          );
          return;
        }
        setDraft(detail);
        setSelectedNodeId(detail.structure[0]?.id);
      })
      .catch(() => setLoadError('学案草稿加载失败'))
      .finally(() => activeRef.current && setLoading(false));
    return () => {
      activeRef.current = false;
    };
  }, [draftId, subject]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedEdit) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [hasUnsavedEdit]);

  const nodeMap = useMemo(
    () =>
      new Map(
        flattenNodes(draft?.structure || []).map((node) => [node.id, node]),
      ),
    [draft?.structure],
  );
  const filteredBlocks = useMemo(
    () =>
      (draft?.contentBlocks || []).filter(
        (block) => !selectedNodeId || block.structureNodeId === selectedNodeId,
      ),
    [draft?.contentBlocks, selectedNodeId],
  );

  const saveBlocks = async (blocks: StudyGuideContentBlock[]) => {
    if (!draft) return false;
    setSaving(true);
    try {
      const response = await updateStudyGuideDraft({
        id: draft.id,
        subject,
        contentBlocks: blocks,
      });
      if (!response.success) {
        message.error(response.message);
        return false;
      }
      setDraft(response.data);
      setHasUnsavedEdit(false);
      message.success({ content: '草稿已自动保存', key: 'draft-autosave' });
      return true;
    } catch {
      message.error('自动保存失败，页面调整已保留，请重试');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (block: StudyGuideContentBlock) => {
    setEditingBlock(block);
    setEditingHtml(block.html);
    setHasUnsavedEdit(false);
  };

  const submitEdit = async () => {
    if (!draft || !editingBlock) return;
    const nextBlocks = draft.contentBlocks.map((block) =>
      block.id === editingBlock.id ? { ...block, html: editingHtml } : block,
    );
    setHasUnsavedEdit(true);
    if (await saveBlocks(nextBlocks)) setEditingBlock(null);
  };

  const deleteBlock = (block: StudyGuideContentBlock) => {
    if (!draft) return;
    Modal.confirm({
      title: `删除${KIND_LABELS[block.kind]}？`,
      content:
        '将删除整个内容块并自动清理因此变空的局部结构；不能撤销，但不会修改已入库知识块或知识树。',
      okText: '确认删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        const nextBlocks = draft.contentBlocks.filter(
          (candidate) => candidate.id !== block.id,
        );
        if (!(await saveBlocks(nextBlocks))) throw new Error('自动保存失败');
      },
    });
  };

  const finalize = async () => {
    if (!draft) return;
    setFinalizing(true);
    try {
      const response = await finalizeStudyGuideDraft({
        id: draft.id,
        subject,
      });
      if (!response.success) {
        message.error(response.message);
        return;
      }
      message.success(response.message);
      history.replace(
        `/combination-production/revision/${draft.id}?subject=${subject}&type=studyGuide&view=preview`,
      );
    } catch {
      message.error('最终保存失败，草稿及自动保存内容保持不变');
    } finally {
      setFinalizing(false);
    }
  };

  const returnToList = () => {
    if (hasUnsavedEdit) {
      Modal.confirm({
        title: '当前编辑尚未保存',
        content: '离开后，本次未保存内容将丢失。',
        okText: '仍要离开',
        onOk: () =>
          history.push(`/preparation/asset-center?subject=${subject}`),
      });
      return;
    }
    history.push(`/preparation/asset-center?subject=${subject}`);
  };

  if (loading) {
    return (
      <PageContainer title="成品学案拆分结果">
        <Card>
          <Skeleton active paragraph={{ rows: 10 }} />
        </Card>
      </PageContainer>
    );
  }

  if (!draft || loadError) {
    return (
      <PageContainer title="成品学案拆分结果">
        <Card>
          <Empty description={loadError || '学案草稿不存在'}>
            <Button onClick={returnToList}>返回资产中心</Button>
          </Empty>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={draft.name}
      subTitle="成品学案拆分结果"
      className="study-guide-split-page"
      extra={[
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={returnToList}>
          返回资产中心
        </Button>,
        <Button
          key="final"
          type="primary"
          icon={<FileDoneOutlined />}
          loading={finalizing}
          disabled={saving}
          onClick={() => void finalize()}
        >
          最终保存为正式学案
        </Button>,
      ]}
    >
      <Alert
        type="info"
        showIcon
        message="草稿只允许编辑或删除内容块"
        description="栏目结构、内容块位置、知识类型和知识树关系来自原 Word，本页不提供新增、移动、排序或跨栏目调整。每次内容修改都会自动保存。"
      />
      <div className="split-statusbar">
        <span>
          <CheckCircleOutlined /> 原文件：{draft.originalFileName}
        </span>
        <span className={saving ? 'is-saving' : ''}>
          <SaveOutlined /> {saving ? '正在自动保存…' : '已自动保存'}
        </span>
        <span>内容块 {draft.contentBlocks.length} 个</span>
        <span>已跳过试题型栏目 {draft.skippedColumns.length} 个</span>
      </div>

      <div className="split-workspace">
        <Card title="拆分结构" className="split-tree-card" variant="borderless">
          <Tree
            treeData={toTreeData(draft.structure)}
            selectedKeys={selectedNodeId ? [selectedNodeId] : []}
            onSelect={(keys) =>
              setSelectedNodeId(keys[0] ? String(keys[0]) : undefined)
            }
            defaultExpandAll
            showLine
            blockNode
          />
        </Card>
        <Card
          title={
            selectedNodeId
              ? nodeMap.get(selectedNodeId)?.label || '内容块'
              : '全部内容块'
          }
          extra={
            <Button type="link" onClick={() => setSelectedNodeId(undefined)}>
              查看全部
            </Button>
          }
          className="split-content-card"
          variant="borderless"
        >
          {filteredBlocks.length ? (
            <div className="split-block-list">
              {filteredBlocks.map((block, index) => (
                <article key={block.id} className="split-content-block">
                  <header>
                    <Space>
                      <span className="split-block-order">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <Tag
                        color={
                          block.kind === 'columnContent' ? 'default' : 'blue'
                        }
                      >
                        {KIND_LABELS[block.kind]}
                      </Tag>
                      {block.knowledgeNodeIds.length > 0 && (
                        <span>
                          {block.knowledgeNodeIds.length} 个知识点关系
                        </span>
                      )}
                    </Space>
                    <Space size={4}>
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(block)}
                      >
                        编辑内容
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => deleteBlock(block)}
                      >
                        删除
                      </Button>
                    </Space>
                  </header>
                  <div
                    className="rich-content"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(block.html),
                    }}
                  />
                </article>
              ))}
            </div>
          ) : (
            <Empty description="当前结构位置没有保留内容块" />
          )}
        </Card>
      </div>

      <Modal
        title={
          editingBlock ? `编辑${KIND_LABELS[editingBlock.kind]}` : '编辑内容块'
        }
        open={Boolean(editingBlock)}
        onCancel={() => {
          setEditingBlock(null);
          setHasUnsavedEdit(false);
        }}
        onOk={() => void submitEdit()}
        okText="保存内容"
        confirmLoading={saving}
        width={880}
        destroyOnClose
      >
        <RichTextEditor
          value={editingHtml}
          onChange={(value) => {
            setEditingHtml(value);
            setHasUnsavedEdit(true);
          }}
          placeholder="编辑完整内容块"
          style={{ marginTop: 16 }}
        />
      </Modal>
    </PageContainer>
  );
};

export default StudyGuideSplitPage;
