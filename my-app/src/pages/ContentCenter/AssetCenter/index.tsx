import type {
  AttachmentResourceType,
  KnowledgeNode,
  ResourceCarrierType,
  ResourceItem,
  ResourceStatus,
  ResourceType,
} from '@/services/tagSystem';
import {
  ATTACHMENT_RESOURCE_ACCEPT,
  ATTACHMENT_RESOURCE_TYPES,
  COMPOSED_RESOURCE_TYPES,
  createAttachmentResource,
  deleteResource,
  getDefaultResourceName,
  getKnowledgeTree,
  getResourceList,
  isAttachmentFileCompatible,
  isAttachmentResourceType,
  RESOURCE_CARRIER_LABELS,
  RESOURCE_STATUS_LABELS,
  RESOURCE_TYPE_LABELS,
  updateResourceMetadata,
} from '@/services/tagSystem';
import {
  AudioOutlined,
  DeleteOutlined,
  EditOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  InboxOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  UploadOutlined,
  VideoCameraOutlined,
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
  TreeSelect,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadChangeParam, UploadFile } from 'antd/es/upload/interface';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SUBJECT_OPTIONS } from '../TagManage/components/treeFilterConstants';
import './index.less';

interface ResourceFormValues {
  name: string;
  type: ResourceType;
  nodeId: string;
  fileList?: UploadFile[];
}

interface ReviewTreeSelectNode {
  title: string;
  value: string;
  key: string;
  disabled?: boolean;
  children?: ReviewTreeSelectNode[];
}

interface ReviewTreeMetadata {
  nodePathMap: Map<string, string>;
  leafNodeIds: Set<string>;
  treeSelectData: ReviewTreeSelectNode[];
}

const RESOURCE_TYPE_OPTIONS = [
  { label: '全部类型', value: 'all' },
  ...ATTACHMENT_RESOURCE_TYPES.map((type) => ({
    label: RESOURCE_TYPE_LABELS[type],
    value: type,
  })),
  ...COMPOSED_RESOURCE_TYPES.map((type) => ({
    label: RESOURCE_TYPE_LABELS[type],
    value: type,
  })),
];

const RESOURCE_TYPE_COLORS: Record<ResourceType, string> = {
  courseware: 'blue',
  extension: 'purple',
  studyGuide: 'cyan',
  homework: 'orange',
};

const RESOURCE_STATUS_COLORS: Record<ResourceStatus, string> = {
  unlisted: 'default',
  listed: 'green',
  archived: 'gold',
};

const buildReviewTreeMetadata = (
  nodes: KnowledgeNode[],
): ReviewTreeMetadata => {
  const nodePathMap = new Map<string, string>();
  const leafNodeIds = new Set<string>();

  const walk = (
    list: KnowledgeNode[],
    parentPath = '',
  ): ReviewTreeSelectNode[] =>
    list.map((node) => {
      const path = parentPath ? `${parentPath} / ${node.title}` : node.title;
      const hasChildren = Boolean(node.children?.length);
      nodePathMap.set(node.key, path);
      if (!hasChildren) leafNodeIds.add(node.key);

      return {
        title: node.title,
        value: node.key,
        key: node.key,
        disabled: hasChildren,
        children: hasChildren ? walk(node.children || [], path) : undefined,
      };
    });

  return {
    nodePathMap,
    leafNodeIds,
    treeSelectData: walk(nodes),
  };
};

const getCarrierIcon = (carrierType: ResourceCarrierType) => {
  if (carrierType === 'ppt') return <FilePptOutlined />;
  if (carrierType === 'pdf') return <FilePdfOutlined />;
  if (carrierType === 'audio') return <AudioOutlined />;
  if (carrierType === 'video') return <VideoCameraOutlined />;
  return <FileTextOutlined />;
};

const formatUpdatedAt = (value: string) => value.replace('T', ' ').slice(0, 16);

const normalizeUploadChange = (
  event: UploadChangeParam<UploadFile> | UploadFile[],
) => (Array.isArray(event) ? event : event?.fileList?.slice(-1));

const AssetCenterPage: React.FC = () => {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [reviewTree, setReviewTree] = useState<KnowledgeNode[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('math');
  const [typeFilter, setTypeFilter] = useState<'all' | ResourceType>('all');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<ResourceFormValues>();
  const requestIdRef = useRef(0);

  const selectedFormType = Form.useWatch('type', form);
  const selectedFormNodeId = Form.useWatch('nodeId', form);

  const reviewTreeMetadata = useMemo(
    () => buildReviewTreeMetadata(reviewTree),
    [reviewTree],
  );

  const fetchAssets = useCallback(async () => {
    const requestId = (requestIdRef.current += 1);
    setLoading(true);
    try {
      const [resourceResponse, treeResponse] = await Promise.all([
        getResourceList({ subject: selectedSubject }),
        getKnowledgeTree({
          subject: selectedSubject,
          targetType: 'review',
        }),
      ]);

      if (requestIdRef.current !== requestId) return;

      if (resourceResponse.success) {
        setResources(resourceResponse.data);
      } else {
        setResources([]);
        message.error(resourceResponse.message || '获取资产列表失败');
      }

      if (treeResponse.success) {
        setReviewTree(treeResponse.data);
      } else {
        setReviewTree([]);
        message.error(treeResponse.message || '获取复习树失败');
      }
    } catch {
      if (requestIdRef.current === requestId) {
        setResources([]);
        setReviewTree([]);
        message.error('获取资产中心数据失败');
      }
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, [selectedSubject]);

  useEffect(() => {
    void fetchAssets();
  }, [fetchAssets]);

  const filteredResources = useMemo(() => {
    const normalizedKeyword = keyword.trim();
    return resources.filter((resource) => {
      if (typeFilter !== 'all' && resource.type !== typeFilter) return false;
      if (
        normalizedKeyword &&
        !resource.name.includes(normalizedKeyword) &&
        !resource.currentVersion.originalFileName?.includes(normalizedKeyword)
      ) {
        return false;
      }
      return true;
    });
  }, [keyword, resources, typeFilter]);

  const handleSubjectChange = (subject: string) => {
    setSelectedSubject(subject);
    setResources([]);
    setReviewTree([]);
    setKeyword('');
    setTypeFilter('all');
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingResource(null);
    form.resetFields();
  };

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
      nodeId: resource.nodeId,
      fileList: undefined,
    });
    setFormOpen(true);
  };

  const isDuplicatedResourceName = (
    name: string,
    type?: ResourceType,
    nodeId?: string,
  ) =>
    Boolean(
      type &&
        nodeId &&
        resources.some(
          (resource) =>
            resource.id !== editingResource?.id &&
            resource.type === type &&
            resource.nodeId === nodeId &&
            resource.name.trim() === name.trim(),
        ),
    );

  const handleTypeChange = (type: AttachmentResourceType) => {
    const selectedFile = form.getFieldValue('fileList')?.[0];
    if (selectedFile && !isAttachmentFileCompatible(type, selectedFile.name)) {
      form.setFieldValue('fileList', []);
      message.info('资源类型已切换，请重新选择兼容文件');
    }
  };

  const handleBeforeUpload = (file: UploadFile) => {
    const type = form.getFieldValue('type');
    if (!isAttachmentResourceType(type)) {
      message.warning('请先选择资源类型');
      return Upload.LIST_IGNORE;
    }
    if (!isAttachmentFileCompatible(type, file.name)) {
      message.error(
        type === 'courseware'
          ? '课件仅支持 .ppt 或 .pptx 文件'
          : '拓展包仅支持 .pdf、.mp3 或 .mp4 文件',
      );
      return Upload.LIST_IGNORE;
    }

    form.setFieldValue('name', getDefaultResourceName(file.name));
    return false;
  };

  const handleSubmit = async () => {
    let values: ResourceFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setSubmitting(true);
    try {
      if (editingResource) {
        const response = await updateResourceMetadata({
          id: editingResource.id,
          name: values.name.trim(),
          nodeId: values.nodeId,
          subject: selectedSubject,
        });
        if (!response.success) {
          message.error(response.message || '资源信息更新失败');
          return;
        }
        message.success('资源信息更新成功');
      } else {
        const originalFileName = values.fileList?.[0]?.name;
        if (!isAttachmentResourceType(values.type) || !originalFileName) {
          message.error('请完成附件资源上传信息');
          return;
        }
        const response = await createAttachmentResource({
          name: values.name.trim(),
          type: values.type,
          originalFileName,
          nodeId: values.nodeId,
          subject: selectedSubject,
        });
        if (!response.success) {
          message.error(response.message || '附件资源上传失败');
          return;
        }
        message.success('附件资源已创建，并生成 V1');
      }

      closeForm();
      await fetchAssets();
    } catch {
      message.error(editingResource ? '资源信息更新失败' : '附件资源上传失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (resource: ResourceItem) => {
    Modal.confirm({
      title: '确认删除资源',
      content: `确定要从资产中心删除“${resource.name}”吗？`,
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        const response = await deleteResource(resource.id, {
          subject: selectedSubject,
        });
        if (!response.success) {
          message.error(response.message || '资源删除失败');
          return;
        }
        message.success('资源删除成功');
        await fetchAssets();
      },
    });
  };

  const columns: ColumnsType<ResourceItem> = [
    {
      title: '资源名称',
      dataIndex: 'name',
      key: 'name',
      width: 280,
      render: (name: string, resource) => (
        <div className="asset-center-resource-cell">
          <span
            className={`asset-center-file-icon asset-center-file-icon-${resource.currentVersion.carrierType}`}
          >
            {getCarrierIcon(resource.currentVersion.carrierType)}
          </span>
          <span className="asset-center-resource-copy">
            <span className="asset-center-resource-name">{name}</span>
            <span className="asset-center-original-file-name">
              {resource.currentVersion.originalFileName || '在线组合内容'}
            </span>
          </span>
        </div>
      ),
    },
    {
      title: '资源类型',
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
      title: '载体',
      key: 'carrierType',
      width: 110,
      render: (_, resource) =>
        RESOURCE_CARRIER_LABELS[resource.currentVersion.carrierType],
    },
    {
      title: '当前版本',
      key: 'currentVersion',
      width: 96,
      render: (_, resource) => (
        <span className="asset-center-version-label">
          V{resource.currentVersion.versionNumber}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 96,
      render: (status: ResourceStatus) => (
        <Tag color={RESOURCE_STATUS_COLORS[status]}>
          {RESOURCE_STATUS_LABELS[status]}
        </Tag>
      ),
    },
    {
      title: '所属复习树节点',
      dataIndex: 'nodeId',
      key: 'nodeId',
      width: 280,
      render: (nodeId: string) =>
        reviewTreeMetadata.nodePathMap.get(nodeId) || (
          <Tag color="error">节点不可用</Tag>
        ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 150,
      render: formatUpdatedAt,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 140,
      render: (_, resource) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(resource)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(resource)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const canSelectFile =
    isAttachmentResourceType(selectedFormType) &&
    Boolean(
      selectedFormNodeId &&
        reviewTreeMetadata.leafNodeIds.has(selectedFormNodeId),
    );

  return (
    <PageContainer
      title="资产中心"
      subTitle="统一管理课件、拓展包、学案与作业正式资源"
      className="asset-center-page"
    >
      <Card variant="borderless" className="asset-center-card">
        <div className="asset-center-toolbar">
          <div className="asset-center-context-filter">
            <span className="asset-center-context-label">学科上下文</span>
            <Select
              value={selectedSubject}
              onChange={handleSubjectChange}
              options={SUBJECT_OPTIONS}
              aria-label="选择资产学科"
              className="asset-center-subject-select"
            />
            <span className="asset-center-context-note">
              资源学科继承自所属节点
            </span>
          </div>
          <div className="asset-center-search-filters">
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              options={RESOURCE_TYPE_OPTIONS}
              aria-label="筛选资源类型"
              className="asset-center-type-select"
            />
            <Input
              allowClear
              placeholder="搜索资源名称或原始文件名…"
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              aria-label="搜索资产"
              className="asset-center-search"
            />
          </div>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={openCreateModal}
          >
            上传附件资源
          </Button>
        </div>

        <Table<ResourceItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filteredResources}
          scroll={{ x: 1250 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 份资源`,
          }}
        />
      </Card>

      <Modal
        title={editingResource ? '编辑资源信息' : '上传附件资源'}
        open={formOpen}
        onOk={handleSubmit}
        onCancel={closeForm}
        okText={editingResource ? '保存' : '创建资源并生成 V1'}
        cancelText="取消"
        confirmLoading={submitting}
        width={640}
        destroyOnClose
      >
        {!editingResource && (
          <div className="asset-center-upload-guardrail">
            <SafetyCertificateOutlined />
            <div>
              <strong>单文件强归属上传</strong>
              <span>资源、V1、未上架状态与节点归属将在确认后一次创建</span>
            </div>
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
          className="asset-center-resource-form"
        >
          <Form.Item
            name="type"
            label="资源类型"
            rules={[{ required: true, message: '请选择资源类型' }]}
            extra={
              editingResource
                ? '资源类型创建后不可修改'
                : '附件上传仅支持课件和拓展包；学案、作业由组合制作发布'
            }
          >
            <Select
              placeholder="请选择资源类型"
              disabled={Boolean(editingResource)}
              onChange={handleTypeChange}
              options={(editingResource
                ? [...ATTACHMENT_RESOURCE_TYPES, ...COMPOSED_RESOURCE_TYPES]
                : ATTACHMENT_RESOURCE_TYPES
              ).map((type) => ({
                label: RESOURCE_TYPE_LABELS[type],
                value: type,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="nodeId"
            label="所属复习树节点"
            rules={[
              { required: true, message: '请选择复习树末级节点' },
              {
                validator: (_, nodeId?: string) =>
                  nodeId && reviewTreeMetadata.leafNodeIds.has(nodeId)
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error('请选择当前学科的有效复习树末级节点'),
                      ),
              },
            ]}
            extra="父节点仅用于分类，资源必须归属当前学科的末级节点"
          >
            <TreeSelect
              placeholder="请选择末级节点"
              treeData={reviewTreeMetadata.treeSelectData}
              treeDefaultExpandAll
              showSearch
              treeNodeFilterProp="title"
              allowClear={false}
              notFoundContent="当前学科暂无可用复习树节点"
            />
          </Form.Item>

          {!editingResource && (
            <Form.Item
              name="fileList"
              label="资源文件"
              valuePropName="fileList"
              getValueFromEvent={normalizeUploadChange}
              dependencies={['type', 'nodeId']}
              rules={[
                {
                  validator: (_, fileList?: UploadFile[]) => {
                    const fileName = fileList?.[0]?.name;
                    if (!fileName) {
                      return Promise.reject(new Error('请选择一个资源文件'));
                    }
                    const type = form.getFieldValue('type');
                    if (
                      !isAttachmentResourceType(type) ||
                      !isAttachmentFileCompatible(type, fileName)
                    ) {
                      return Promise.reject(
                        new Error('文件格式与资源类型不兼容'),
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
              extra={
                selectedFormType === 'courseware'
                  ? '课件仅支持 .ppt、.pptx'
                  : selectedFormType === 'extension'
                  ? '拓展包仅支持 .pdf、.mp3、.mp4'
                  : '请先选择资源类型与所属末级节点'
              }
            >
              <Upload.Dragger
                accept={
                  isAttachmentResourceType(selectedFormType)
                    ? ATTACHMENT_RESOURCE_ACCEPT[selectedFormType]
                    : undefined
                }
                beforeUpload={handleBeforeUpload}
                disabled={!canSelectFile}
                maxCount={1}
                multiple={false}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">
                  {canSelectFile
                    ? '点击或拖拽一个文件到此处'
                    : '先选择资源类型与所属末级节点'}
                </p>
                <p className="ant-upload-hint">每次仅创建一份附件资源</p>
              </Upload.Dragger>
            </Form.Item>
          )}

          <Form.Item
            name="name"
            label="资源名称"
            dependencies={['type', 'nodeId']}
            rules={[
              {
                required: true,
                whitespace: true,
                message: '请输入资源名称',
              },
              { max: 40, message: '资源名称不能超过 40 个字符' },
              {
                validator: (_, name?: string) => {
                  if (
                    name?.trim() &&
                    isDuplicatedResourceName(
                      name,
                      form.getFieldValue('type'),
                      form.getFieldValue('nodeId'),
                    )
                  ) {
                    return Promise.reject(
                      new Error('该末级节点下已存在同类型、同名称的资源'),
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
            extra={
              editingResource
                ? '修改资源名称不会改变原始文件名'
                : '选择文件后默认取无扩展名文件名，可在创建前修改'
            }
          >
            <Input placeholder="请输入资源名称" maxLength={40} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default AssetCenterPage;
