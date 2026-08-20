import RichTextEditor from '@/components/RichTextEditor';
import type {
  KnowledgeBlock,
  KnowledgeBlockType,
  KnowledgeLeaf,
  KnowledgeTreeNode,
} from '@/services/resourceAssets';
import {
  deleteKnowledgeBlock,
  getKnowledgeBlocks,
  getResourceAssetContext,
  KNOWLEDGE_BLOCK_TYPE_LABELS,
  saveKnowledgeBlock,
} from '@/services/resourceAssets';
import { sanitizeHtml } from '@/utils/sanitize';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  TreeSelect,
} from 'antd';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SUBJECT_OPTIONS } from '../TagManage/components/treeFilterConstants';
import './index.less';

interface KnowledgeBlockFormValues {
  type: KnowledgeBlockType;
  knowledgeNodeIds: string[];
  html: string;
}

interface KnowledgeTreeSelectOption {
  title: string;
  value: string;
  key: string;
  disabled?: boolean;
  children?: KnowledgeTreeSelectOption[];
}

const TYPE_COLORS: Record<KnowledgeBlockType, string> = {
  single: 'blue',
  comprehensive: 'purple',
  method: 'cyan',
  example: 'orange',
};

const toTreeSelectData = (
  nodes: KnowledgeTreeNode[],
): KnowledgeTreeSelectOption[] =>
  nodes.map((node) => ({
    title: node.title,
    value: node.key,
    key: node.key,
    children: node.children?.length
      ? toTreeSelectData(node.children)
      : undefined,
  }));

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const formatDate = (value: string) =>
  DATE_TIME_FORMATTER.format(new Date(value)).replaceAll('/', '-');

const KnowledgeBlocksPage: React.FC = () => {
  const [form] = Form.useForm<KnowledgeBlockFormValues>();
  const [selectedSubject, setSelectedSubject] = useState('math');
  const [blocks, setBlocks] = useState<KnowledgeBlock[]>([]);
  const [knowledgeTree, setKnowledgeTree] = useState<KnowledgeTreeNode[]>([]);
  const [knowledgeLeaves, setKnowledgeLeaves] = useState<KnowledgeLeaf[]>([]);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<KnowledgeBlockType | ''>('');
  const [nodeFilter, setNodeFilter] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<KnowledgeBlock | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<KnowledgeBlock | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef(0);
  const subjectRef = useRef(selectedSubject);
  const selectedType = Form.useWatch('type', form);

  const loadContext = useCallback(async (subject: string) => {
    const response = await getResourceAssetContext({ subject });
    if (subject !== subjectRef.current || !response.success) return;
    setKnowledgeTree(response.data.knowledgeTree);
    setKnowledgeLeaves(response.data.knowledgeLeaves);
  }, []);

  const loadBlocks = useCallback(async () => {
    const subject = selectedSubject;
    const requestId = (requestIdRef.current += 1);
    setLoading(true);
    try {
      const response = await getKnowledgeBlocks({
        subject,
        keyword: keyword.trim() || undefined,
        type: typeFilter || undefined,
        knowledgeNodeId: nodeFilter,
      });
      if (requestId !== requestIdRef.current || subject !== subjectRef.current)
        return;
      if (!response.success) {
        message.error(response.message || '知识块加载失败');
        return;
      }
      setBlocks(response.data);
    } catch {
      if (requestId === requestIdRef.current) message.error('知识块加载失败');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [keyword, nodeFilter, selectedSubject, typeFilter]);

  useEffect(() => {
    void loadContext(selectedSubject);
  }, [loadContext, selectedSubject]);

  useEffect(() => {
    void loadBlocks();
  }, [loadBlocks]);

  const leafMap = useMemo(
    () => new Map(knowledgeLeaves.map((leaf) => [leaf.id, leaf])),
    [knowledgeLeaves],
  );
  const leafTreeData = useMemo(() => {
    const disableParents = (
      nodes: ReturnType<typeof toTreeSelectData>,
    ): ReturnType<typeof toTreeSelectData> =>
      nodes.map((node) => ({
        ...node,
        disabled: Boolean(node.children?.length),
        children: node.children ? disableParents(node.children) : undefined,
      }));
    return disableParents(toTreeSelectData(knowledgeTree));
  }, [knowledgeTree]);

  const changeSubject = (subject: string) => {
    requestIdRef.current += 1;
    subjectRef.current = subject;
    setSelectedSubject(subject);
    setKeyword('');
    setTypeFilter('');
    setNodeFilter(undefined);
    setBlocks([]);
    setKnowledgeTree([]);
    setKnowledgeLeaves([]);
    setFormOpen(false);
    setDetail(null);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: 'single', knowledgeNodeIds: [], html: '' });
    setFormOpen(true);
  };

  const openEdit = (block: KnowledgeBlock) => {
    setEditing(block);
    form.setFieldsValue({
      type: block.type,
      knowledgeNodeIds: block.knowledgeNodeIds,
      html: block.html,
    });
    setFormOpen(true);
  };

  useEffect(() => {
    if (!formOpen || selectedType === 'comprehensive') return;
    const current = form.getFieldValue('knowledgeNodeIds') || [];
    if (current.length > 1)
      form.setFieldValue('knowledgeNodeIds', current.slice(0, 1));
  }, [form, formOpen, selectedType]);

  const executeSave = async (values: KnowledgeBlockFormValues) => {
    setSubmitting(true);
    try {
      const response = await saveKnowledgeBlock({
        id: editing?.id,
        subject: selectedSubject,
        type: values.type,
        html: values.html,
        knowledgeNodeIds: values.knowledgeNodeIds,
      });
      if (!response.success) {
        message.error(response.message);
        return;
      }
      message.success(response.message);
      setFormOpen(false);
      setEditing(null);
      await loadBlocks();
    } catch {
      message.error('知识块保存失败，当前输入已保留');
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async () => {
    let values: KnowledgeBlockFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    if (editing?.referenceStudyGuides.length) {
      Modal.confirm({
        title: '修改将影响引用学案',
        content: `该知识块被 ${editing.referenceStudyGuides.length} 份学案引用。保存后这些学案将按同一知识块 ID 读取最新内容和类型，不生成版本。`,
        okText: '确认修改',
        onOk: () => executeSave(values),
      });
      return;
    }
    await executeSave(values);
  };

  const remove = (block: KnowledgeBlock) => {
    if (block.referenceStudyGuides.length) {
      Modal.warning({
        title: '知识块正在被引用，不能删除',
        content: (
          <div className="knowledge-reference-list">
            <p>
              共 {block.referenceStudyGuides.length}{' '}
              份引用学案，请先在学案维护中移除引用：
            </p>
            {block.referenceStudyGuides.map((guide) => (
              <Button
                key={guide.id}
                type="link"
                onClick={() =>
                  history.push(
                    `/combination-production/revision/${guide.id}?subject=${selectedSubject}&type=studyGuide&view=preview`,
                  )
                }
              >
                {guide.name}
              </Button>
            ))}
          </div>
        ),
      });
      return;
    }
    Modal.confirm({
      title: '确认删除知识块？',
      content: '删除后不保留内容快照，也不会从学案级联移除引用。',
      okButtonProps: { danger: true },
      okText: '确认删除',
      onOk: async () => {
        const response = await deleteKnowledgeBlock({
          id: block.id,
          subject: selectedSubject,
        });
        if (!response.success) throw new Error(response.message);
        message.success(response.message);
        await loadBlocks();
      },
    });
  };

  return (
    <PageContainer
      title="知识块"
      subTitle="独立维护可复用的知识原子资产"
      className="knowledge-blocks-page"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建知识块
        </Button>
      }
    >
      <Card variant="borderless" className="knowledge-blocks-card">
        <div className="knowledge-blocks-context">
          <div>
            <span>当前学科</span>
            <Select
              value={selectedSubject}
              options={SUBJECT_OPTIONS}
              onChange={changeSubject}
              aria-label="选择知识块学科"
            />
            <small>新建知识块继承并锁定当前学科</small>
          </div>
          <div className="knowledge-blocks-filters">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              name="knowledgeBlockKeyword"
              autoComplete="off"
              aria-label="搜索知识块完整内容"
              placeholder="搜索完整富文本内容…"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              aria-label="筛选知识块类型"
              options={[
                { value: '', label: '全部类型' },
                ...Object.entries(KNOWLEDGE_BLOCK_TYPE_LABELS).map(
                  ([value, label]) => ({ value, label }),
                ),
              ]}
            />
            <TreeSelect
              allowClear
              showSearch
              aria-label="按知识树节点筛选知识块"
              treeNodeFilterProp="title"
              value={nodeFilter}
              onChange={setNodeFilter}
              treeData={toTreeSelectData(knowledgeTree)}
              treeDefaultExpandAll
              placeholder="全部知识树节点…"
            />
          </div>
        </div>

        <Spin spinning={loading}>
          {blocks.length ? (
            <div className="knowledge-block-list">
              {blocks.map((block) => (
                <article key={block.id} className="knowledge-block-row">
                  <div className="knowledge-block-meta">
                    <Tag color={TYPE_COLORS[block.type]}>
                      {KNOWLEDGE_BLOCK_TYPE_LABELS[block.type]}
                    </Tag>
                    <span>
                      {block.knowledgeNodeIds
                        .map((id) => leafMap.get(id)?.title || id)
                        .join('、')}
                    </span>
                    <span>{block.referenceStudyGuides.length} 份学案引用</span>
                    <time>{formatDate(block.updatedAt)}</time>
                  </div>
                  <div
                    className="knowledge-block-rich rich-content"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(block.html),
                    }}
                  />
                  <div className="knowledge-block-actions">
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => setDetail(block)}
                    >
                      详情
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openEdit(block)}
                    >
                      编辑
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(block)}
                    >
                      删除
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty description="当前筛选条件下暂无知识块">
              <Button type="primary" onClick={openCreate}>
                新建知识块
              </Button>
            </Empty>
          )}
        </Spin>
      </Card>

      <Drawer
        title={editing ? '编辑知识块' : '新建知识块'}
        open={formOpen}
        width={720}
        onClose={() => !submitting && setFormOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setFormOpen(false)} disabled={submitting}>
              取消
            </Button>
            <Button
              type="primary"
              loading={submitting}
              onClick={() => void submit()}
            >
              保存知识块
            </Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          message={`学科已锁定：${
            SUBJECT_OPTIONS.find((item) => item.value === selectedSubject)
              ?.label
          }`}
          description="知识块保存成功后直接正式；没有名称、草稿或版本。"
        />
        <Form form={form} layout="vertical" className="knowledge-block-form">
          <Form.Item
            name="type"
            label="知识类型"
            rules={[{ required: true, message: '请选择知识类型' }]}
          >
            <Select
              options={Object.entries(KNOWLEDGE_BLOCK_TYPE_LABELS).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </Form.Item>
          <Form.Item
            name="knowledgeNodeIds"
            label="关联末级知识点"
            rules={[
              { required: true, message: '请选择末级知识点' },
              {
                validator: (_, values?: string[]) =>
                  selectedType === 'comprehensive' ||
                  (values?.length || 0) === 1
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error('单一、方法、例题类只能关联一个末级节点'),
                      ),
              },
            ]}
            extra={
              selectedType === 'comprehensive'
                ? '综合类至少关联一个，可关联多个'
                : '当前类型必须且只能关联一个末级节点'
            }
          >
            <TreeSelect
              treeData={leafTreeData}
              treeDefaultExpandAll
              treeCheckable
              multiple
              showCheckedStrategy={TreeSelect.SHOW_CHILD}
              showSearch
              treeNodeFilterProp="title"
              placeholder="请选择当前学科末级知识点…"
              onChange={(values: string[]) => {
                if (selectedType !== 'comprehensive' && values.length > 1) {
                  form.setFieldValue('knowledgeNodeIds', values.slice(-1));
                }
              }}
            />
          </Form.Item>
          <Form.Item
            name="html"
            label="知识块内容"
            rules={[
              { required: true, whitespace: true, message: '请输入知识块内容' },
            ]}
          >
            <RichTextEditor placeholder="输入完整知识内容，可包含表格、图片和公式…" />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title="知识块详情"
        open={Boolean(detail)}
        width={660}
        onClose={() => setDetail(null)}
        destroyOnClose
      >
        {detail && (
          <>
            <Descriptions
              column={1}
              size="small"
              items={[
                {
                  label: '知识类型',
                  children: (
                    <Tag color={TYPE_COLORS[detail.type]}>
                      {KNOWLEDGE_BLOCK_TYPE_LABELS[detail.type]}
                    </Tag>
                  ),
                },
                {
                  label: '关联知识点',
                  children: detail.knowledgeNodeIds
                    .map((id) => leafMap.get(id)?.path.join(' / ') || id)
                    .join('；'),
                },
                {
                  label: '引用学案',
                  children: `${detail.referenceStudyGuides.length} 份`,
                },
                { label: '创建时间', children: formatDate(detail.createdAt) },
                { label: '更新时间', children: formatDate(detail.updatedAt) },
              ]}
            />
            <Card
              size="small"
              title="完整内容"
              className="knowledge-detail-content"
            >
              <div
                className="rich-content"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(detail.html) }}
              />
            </Card>
            <Card
              size="small"
              title="引用学案"
              className="knowledge-detail-references"
            >
              {detail.referenceStudyGuides.length ? (
                detail.referenceStudyGuides.map((guide) => (
                  <Button
                    key={guide.id}
                    type="link"
                    onClick={() =>
                      history.push(
                        `/combination-production/revision/${guide.id}?subject=${selectedSubject}&type=studyGuide&view=preview`,
                      )
                    }
                  >
                    {guide.name} · 只读预览
                  </Button>
                ))
              ) : (
                <span>暂无引用学案</span>
              )}
            </Card>
          </>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default KnowledgeBlocksPage;
