import type {
  KnowledgeNode,
  ResourceItem,
  ResourceType,
} from '@/services/tagSystem';
import {
  addResource,
  ATTACHMENT_RESOURCE_TYPES,
  COMPOSED_RESOURCE_TYPES,
  deleteResource,
  getKnowledgeTree,
  getResourceList,
  RESOURCE_TYPE_LABELS,
  updateResource,
} from '@/services/tagSystem';
import {
  DeleteOutlined,
  FilePptOutlined,
  FileZipOutlined,
  InboxOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const SUBJECT_OPTIONS = [
  { label: '语文', value: 'chinese' },
  { label: '数学', value: 'math' },
  { label: '英语', value: 'english' },
  { label: '物理', value: 'physics' },
  { label: '化学', value: 'chemistry' },
  { label: '生物', value: 'biology' },
  { label: '历史', value: 'history' },
  { label: '地理', value: 'geography' },
  { label: '道德与法治', value: 'politics' },
];

const RESOURCE_TYPE_OPTIONS = [
  { label: '全部类型', value: 'all' },
  ...ATTACHMENT_RESOURCE_TYPES.map((type) => ({
    label: RESOURCE_TYPE_LABELS[type],
    value: type,
  })),
  ...COMPOSED_RESOURCE_TYPES.map((type) => ({
    label: `${RESOURCE_TYPE_LABELS[type]}（组合型）`,
    value: type,
  })),
];

const RESOURCE_TYPE_COLORS: Record<ResourceType, string> = {
  courseware: 'blue',
  extension: 'purple',
  studyGuide: 'cyan',
  homework: 'orange',
};

interface ResourceFormValues {
  name: string;
  type: ResourceType;
  fileName?: string;
  nodeId?: string;
}

const buildNodePathMap = (
  nodes: KnowledgeNode[],
  parentPath = '',
  map = new Map<string, string>(),
): Map<string, string> => {
  nodes.forEach((node) => {
    const path = parentPath ? `${parentPath} / ${node.title}` : node.title;
    map.set(node.key, path);
    if (node.children?.length) {
      buildNodePathMap(node.children, path, map);
    }
  });
  return map;
};

const collectLeafCategoryNodes = (nodes: KnowledgeNode[]): KnowledgeNode[] => {
  const leaves: KnowledgeNode[] = [];
  const walk = (list: KnowledgeNode[]) => {
    list.forEach((node) => {
      if (node.children?.length) {
        walk(node.children);
      } else {
        leaves.push(node);
      }
    });
  };
  walk(nodes);
  return leaves;
};

const ResourceCenterPage: React.FC = () => {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [nodePathMap, setNodePathMap] = useState<Map<string, string>>(
    new Map(),
  );
  const [leafNodes, setLeafNodes] = useState<KnowledgeNode[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('math');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [keyword, setKeyword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(
    null,
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [form] = Form.useForm<ResourceFormValues>();
  const requestIdRef = useRef(0);

  const fetchResources = useCallback(async () => {
    const requestId = (requestIdRef.current += 1);
    setLoading(true);
    try {
      const [resourceRes, treeRes] = await Promise.all([
        getResourceList({
          subject: selectedSubject,
          targetType: 'review',
        }),
        getKnowledgeTree({
          subject: selectedSubject,
          targetType: 'review',
        }),
      ]);

      if (requestIdRef.current !== requestId) {
        return;
      }

      if (resourceRes.success) {
        setResources(resourceRes.data);
      } else {
        message.error(resourceRes.message || '获取资源列表失败');
      }

      if (treeRes.success) {
        setNodePathMap(buildNodePathMap(treeRes.data));
        setLeafNodes(collectLeafCategoryNodes(treeRes.data));
      }
    } catch {
      if (requestIdRef.current === requestId) {
        message.error('获取资源列表失败');
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [selectedSubject]);

  useEffect(() => {
    void fetchResources();
  }, [fetchResources]);

  const filteredResources = useMemo(() => {
    const keywordValue = keyword.trim();
    return resources.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) {
        return false;
      }
      if (keywordValue && !item.name.includes(keywordValue)) {
        return false;
      }
      return true;
    });
  }, [keyword, resources, typeFilter]);

  const openCreateModal = () => {
    setEditingResource(null);
    form.resetFields();
    setFormOpen(true);
  };

  const openEditModal = (resource: ResourceItem) => {
    setEditingResource(resource);
    form.setFieldsValue({
      name: resource.name,
      type: resource.type,
      fileName: resource.fileName,
      nodeId: resource.nodeId,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editingResource) {
        const res = await updateResource({
          id: editingResource.id,
          name: values.name,
          type: values.type,
          fileName: values.fileName,
          nodeId: values.nodeId,
          subject: selectedSubject,
          targetType: 'review',
        });
        if (res.success) {
          message.success('资源更新成功');
          setFormOpen(false);
          fetchResources();
        } else {
          message.error(res.message || '资源更新失败');
        }
      } else {
        const res = await addResource({
          name: values.name,
          type: values.type,
          fileName: values.fileName,
          nodeId: values.nodeId || '',
          subject: selectedSubject,
          targetType: 'review',
        });
        if (res.success) {
          message.success('资源上传成功');
          setFormOpen(false);
          fetchResources();
        } else {
          message.error(res.message || '资源上传失败');
        }
      }
    } catch {
      message.error('保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (resource: ResourceItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除资源 "${resource.name}" 吗？删除后从资源中心与复习树中移除。`,
      onOk: async () => {
        const res = await deleteResource(resource.id, {
          subject: selectedSubject,
          targetType: 'review',
        });
        if (res.success) {
          message.success('删除成功');
          fetchResources();
        } else {
          message.error(res.message || '删除失败');
        }
      },
    });
  };

  const columns: ColumnsType<ResourceItem> = [
    {
      title: '资源名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space size={8}>
          {record.type === 'courseware' ? (
            <FilePptOutlined style={{ color: '#1677ff' }} />
          ) : (
            <FileZipOutlined style={{ color: '#722ed1' }} />
          )}
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: ResourceType) => (
        <Tag color={RESOURCE_TYPE_COLORS[type]}>
          {RESOURCE_TYPE_LABELS[type]}
        </Tag>
      ),
    },
    {
      title: '文件',
      dataIndex: 'fileName',
      key: 'fileName',
      width: 200,
      render: (fileName?: string) => fileName || '-',
    },
    {
      title: '所属节点',
      dataIndex: 'nodeId',
      key: 'nodeId',
      render: (nodeId: string) =>
        nodeId && nodePathMap.get(nodeId) ? (
          <span>{nodePathMap.get(nodeId)}</span>
        ) : (
          <Tag>未挂载</Tag>
        ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 120,
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="资源中心">
      <Card variant="borderless">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
            alignItems: 'center',
          }}
        >
          <Select
            value={selectedSubject}
            onChange={setSelectedSubject}
            style={{ width: 140 }}
            options={SUBJECT_OPTIONS}
            aria-label="选择学科"
          />
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 120 }}
            options={RESOURCE_TYPE_OPTIONS}
            aria-label="资源类型"
          />
          <Input
            allowClear
            placeholder="搜索资源名称…"
            prefix={<SearchOutlined style={{ color: '#ccc' }} />}
            style={{ width: 240 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            aria-label="搜索资源"
          />
          <div style={{ flex: 1 }} />
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={openCreateModal}
          >
            上传资源
          </Button>
        </div>

        <Table<ResourceItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filteredResources}
          pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
        />
      </Card>

      <Modal
        title={editingResource ? '编辑资源' : '上传资源'}
        open={formOpen}
        onOk={handleSubmit}
        onCancel={() => setFormOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="name"
            label="资源名称"
            rules={[{ required: true, message: '请输入资源名称' }]}
          >
            <Input placeholder="请输入资源名称" maxLength={40} />
          </Form.Item>
          <Form.Item
            name="type"
            label="资源类型"
            rules={[{ required: true, message: '请选择资源类型' }]}
            extra="学案/作业为组合型资源，由原子化知识块与试题组合生成，原子体系接入前暂不支持创建"
          >
            <Select
              placeholder="请选择资源类型"
              options={[
                ...ATTACHMENT_RESOURCE_TYPES.map((type) => ({
                  label: RESOURCE_TYPE_LABELS[type],
                  value: type,
                })),
                ...COMPOSED_RESOURCE_TYPES.map((type) => ({
                  label: `${RESOURCE_TYPE_LABELS[type]}（组合型）`,
                  value: type,
                  disabled: true,
                })),
              ]}
            />
          </Form.Item>
          <Form.Item name="fileName" label="资源文件">
            <Upload
              maxCount={1}
              beforeUpload={(file) => {
                form.setFieldValue('fileName', file.name);
                return false;
              }}
              onRemove={() => form.setFieldValue('fileName', undefined)}
            >
              <Button icon={<InboxOutlined />}>选择文件</Button>
            </Upload>
          </Form.Item>
          <Form.Item
            name="nodeId"
            label="所属节点"
            extra="上传时可不挂载，之后在复习树中挂载或在此改挂"
          >
            <Select
              allowClear
              placeholder="选择复习树末级节点（可留空）"
              options={leafNodes.map((node) => ({
                label: nodePathMap.get(node.key) || node.title,
                value: node.key,
              }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ResourceCenterPage;
