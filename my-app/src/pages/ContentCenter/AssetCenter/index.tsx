import type {
  AttachmentResourceType,
  ComposedResourceType,
  KnowledgeNode,
  ResourceCarrierType,
  ResourceItem,
  ResourceLifecycleAction,
  ResourceStatus,
  ResourceType,
} from '@/services/tagSystem';
import {
  adjustResourceOwnership,
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
  isComposedResourceType,
  RESOURCE_CARRIER_LABELS,
  RESOURCE_LIFECYCLE_ACTION_LABELS,
  RESOURCE_LIFECYCLE_TRANSITIONS,
  RESOURCE_NAME_CONFLICT_CODE,
  RESOURCE_STATUS_LABELS,
  RESOURCE_TYPE_LABELS,
  transitionResourceLifecycle,
  updateResourceMetadata,
} from '@/services/tagSystem';
import {
  AudioOutlined,
  CloudDownloadOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FormOutlined,
  HistoryOutlined,
  InboxOutlined,
  RollbackOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SwapOutlined,
  UploadOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useSearchParams } from '@umijs/max';
import {
  Alert,
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
  Tooltip,
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
import type { ResourceDetailRequest } from './components/ResourceDetailDrawer';
import ResourceDetailDrawer from './components/ResourceDetailDrawer';
import './index.less';

interface ResourceFormValues {
  name: string;
  type: ResourceType;
  nodeId: string;
  fileList?: UploadFile[];
}

interface OwnershipFormValues {
  targetNodeId: string;
}

interface LifecycleOperation {
  resourceId: string;
  action: ResourceLifecycleAction;
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
  filterTreeSelectData: ReviewTreeSelectNode[];
  ownershipTreeSelectData: ReviewTreeSelectNode[];
}

type ResourceTypeFilter = 'all' | ResourceType;
type ResourceCarrierFilter = 'all' | ResourceCarrierType;
type ResourceStatusFilter = 'all' | ResourceStatus;

const RESOURCE_TYPE_OPTIONS: Array<{
  label: string;
  value: ResourceTypeFilter;
}> = [
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

const RESOURCE_CARRIER_OPTIONS: Array<{
  label: string;
  value: ResourceCarrierFilter;
}> = [
  { label: '全部载体', value: 'all' },
  ...(Object.keys(RESOURCE_CARRIER_LABELS) as ResourceCarrierType[]).map(
    (carrierType) => ({
      label: RESOURCE_CARRIER_LABELS[carrierType],
      value: carrierType,
    }),
  ),
];

const RESOURCE_STATUS_OPTIONS: Array<{
  label: string;
  value: ResourceStatusFilter;
}> = [
  { label: '全部状态', value: 'all' },
  ...(Object.keys(RESOURCE_STATUS_LABELS) as ResourceStatus[]).map(
    (status) => ({
      label: RESOURCE_STATUS_LABELS[status],
      value: status,
    }),
  ),
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
        children: hasChildren ? walk(node.children || [], path) : undefined,
      };
    });

  const disableParentNodes = (
    list: ReviewTreeSelectNode[],
  ): ReviewTreeSelectNode[] =>
    list.map((node) => ({
      ...node,
      disabled: Boolean(node.children?.length),
      children: node.children ? disableParentNodes(node.children) : undefined,
    }));

  const filterTreeSelectData = walk(nodes);
  return {
    nodePathMap,
    leafNodeIds,
    filterTreeSelectData,
    ownershipTreeSelectData: disableParentNodes(filterTreeSelectData),
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

const getLifecycleActionIcon = (action: ResourceLifecycleAction) => {
  if (action === 'list') return <CloudUploadOutlined />;
  if (action === 'unlist') return <CloudDownloadOutlined />;
  if (action === 'restore') return <RollbackOutlined />;
  return <InboxOutlined />;
};

const normalizeUploadChange = (
  event: UploadChangeParam<UploadFile> | UploadFile[],
) => (Array.isArray(event) ? event : event?.fileList?.slice(-1));

interface AssetCenterInitialFilters {
  subject: string;
  nodeId?: string;
}

const ASSET_CENTER_SUBJECTS = new Set(
  SUBJECT_OPTIONS.map((option) => option.value),
);

const getAssetCenterInitialFilters = (
  searchParams: URLSearchParams,
): AssetCenterInitialFilters => {
  const requestedSubject = searchParams.get('subject')?.trim();
  const requestedNodeId = searchParams.get('nodeId')?.trim();
  return {
    subject:
      requestedSubject && ASSET_CENTER_SUBJECTS.has(requestedSubject)
        ? requestedSubject
        : 'math',
    nodeId: requestedNodeId || undefined,
  };
};

const AssetCenterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialFiltersRef = useRef(getAssetCenterInitialFilters(searchParams));
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [reviewTree, setReviewTree] = useState<KnowledgeNode[]>([]);
  const [selectedSubject, setSelectedSubject] = useState(
    initialFiltersRef.current.subject,
  );
  const [typeFilter, setTypeFilter] = useState<ResourceTypeFilter>('all');
  const [carrierFilter, setCarrierFilter] =
    useState<ResourceCarrierFilter>('all');
  const [statusFilter, setStatusFilter] = useState<ResourceStatusFilter>('all');
  const [nodeFilter, setNodeFilter] = useState<string | undefined>(
    initialFiltersRef.current.nodeId,
  );
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(
    null,
  );
  const [ownershipResource, setOwnershipResource] =
    useState<ResourceItem | null>(null);
  const [ownershipOpen, setOwnershipOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ownershipSubmitting, setOwnershipSubmitting] = useState(false);
  const [lifecycleOperation, setLifecycleOperation] =
    useState<LifecycleOperation | null>(null);
  const [detailRequest, setDetailRequest] =
    useState<ResourceDetailRequest | null>(null);
  const [catalogRefreshToken, setCatalogRefreshToken] = useState(0);
  const [form] = Form.useForm<ResourceFormValues>();
  const [ownershipForm] = Form.useForm<OwnershipFormValues>();
  const activeSubjectRef = useRef(selectedSubject);
  const resourceRequestIdRef = useRef(0);
  const treeRequestIdRef = useRef(0);
  const formOperationGenerationRef = useRef(0);
  const ownershipOperationGenerationRef = useRef(0);
  const lifecycleOperationGenerationRef = useRef(0);
  const lifecycleOperationTokenRef = useRef<number | null>(null);
  const detailRequestSequenceRef = useRef(0);

  const selectedFormType = Form.useWatch('type', form);
  const selectedFormNodeId = Form.useWatch('nodeId', form);
  const selectedFormName = Form.useWatch('name', form);

  const reviewTreeMetadata = useMemo(
    () => buildReviewTreeMetadata(reviewTree),
    [reviewTree],
  );

  const isSubjectActive = useCallback(
    (subject: string) => activeSubjectRef.current === subject,
    [],
  );

  const fetchResources = useCallback(async () => {
    const requestSubject = selectedSubject;
    if (activeSubjectRef.current !== requestSubject) return;

    const requestId = (resourceRequestIdRef.current += 1);
    const isCurrentRequest = () =>
      resourceRequestIdRef.current === requestId &&
      activeSubjectRef.current === requestSubject;

    setLoading(true);
    try {
      const response = await getResourceList({
        subject: requestSubject,
        name: keyword.trim() || undefined,
        type: typeFilter === 'all' ? undefined : typeFilter,
        carrierType: carrierFilter === 'all' ? undefined : carrierFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        nodeId: nodeFilter,
      });

      if (!isCurrentRequest()) return;
      if (response.success) {
        setResources(response.data);
      } else {
        setResources([]);
        message.error(response.message || '获取资产列表失败');
      }
    } catch {
      if (isCurrentRequest()) {
        setResources([]);
        message.error('获取资产列表失败');
      }
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }, [
    carrierFilter,
    keyword,
    nodeFilter,
    selectedSubject,
    statusFilter,
    typeFilter,
  ]);

  const fetchReviewTree = useCallback(async () => {
    const requestSubject = selectedSubject;
    if (activeSubjectRef.current !== requestSubject) return;

    const requestId = (treeRequestIdRef.current += 1);
    const isCurrentRequest = () =>
      treeRequestIdRef.current === requestId &&
      activeSubjectRef.current === requestSubject;

    setTreeLoading(true);
    try {
      const response = await getKnowledgeTree({
        subject: requestSubject,
        targetType: 'review',
      });
      if (!isCurrentRequest()) return;
      if (response.success) {
        setReviewTree(response.data);
      } else {
        setReviewTree([]);
        message.error(response.message || '获取复习树失败');
      }
    } catch {
      if (isCurrentRequest()) {
        setReviewTree([]);
        message.error('获取复习树失败');
      }
    } finally {
      if (isCurrentRequest()) setTreeLoading(false);
    }
  }, [selectedSubject]);

  useEffect(() => {
    void fetchResources();
  }, [catalogRefreshToken, fetchResources]);

  useEffect(() => {
    void fetchReviewTree();
  }, [catalogRefreshToken, fetchReviewTree]);

  const hasActiveFilters = Boolean(
    keyword.trim() ||
      typeFilter !== 'all' ||
      carrierFilter !== 'all' ||
      statusFilter !== 'all' ||
      nodeFilter,
  );

  const resetFilters = () => {
    setKeyword('');
    setTypeFilter('all');
    setCarrierFilter('all');
    setStatusFilter('all');
    setNodeFilter(undefined);
  };

  const handleSubjectChange = (subject: string) => {
    if (activeSubjectRef.current === subject) return;

    // 先同步失效旧学科请求与弹窗操作，避免 React 提交新状态前旧回调落库。
    activeSubjectRef.current = subject;
    resourceRequestIdRef.current += 1;
    treeRequestIdRef.current += 1;
    formOperationGenerationRef.current += 1;
    ownershipOperationGenerationRef.current += 1;
    lifecycleOperationGenerationRef.current += 1;
    lifecycleOperationTokenRef.current = null;

    setSelectedSubject(subject);
    setResources([]);
    setReviewTree([]);
    setLoading(false);
    setTreeLoading(false);
    resetFilters();
    setFormOpen(false);
    setEditingResource(null);
    setSubmitting(false);
    form.resetFields();
    setOwnershipOpen(false);
    setOwnershipResource(null);
    setOwnershipSubmitting(false);
    ownershipForm.resetFields();
    setLifecycleOperation(null);
    setDetailRequest(null);
  };

  const closeForm = () => {
    formOperationGenerationRef.current += 1;
    setFormOpen(false);
    setEditingResource(null);
    setSubmitting(false);
    form.resetFields();
  };

  const openCreateModal = () => {
    formOperationGenerationRef.current += 1;
    setEditingResource(null);
    setSubmitting(false);
    form.resetFields();
    setFormOpen(true);
  };

  const openEditModal = (resource: ResourceItem) => {
    formOperationGenerationRef.current += 1;
    setEditingResource(resource);
    setSubmitting(false);
    form.resetFields();
    form.setFieldsValue({
      name: resource.name,
      type: resource.type,
      fileList: undefined,
    });
    setFormOpen(true);
  };

  const openCombinationProduction = (type: ComposedResourceType) => {
    const params = new URLSearchParams({
      type,
      subject: selectedSubject,
    });
    history.push(`/combination-production/new?${params.toString()}`);
  };

  const openCombinationRevision = (resource: ResourceItem) => {
    if (!isComposedResourceType(resource.type)) return;
    const params = new URLSearchParams({
      subject: resource.subject,
      type: resource.type,
    });
    history.push(
      `/combination-production/revision/${encodeURIComponent(
        resource.id,
      )}?${params.toString()}`,
    );
  };

  const closeOwnershipModal = () => {
    ownershipOperationGenerationRef.current += 1;
    setOwnershipOpen(false);
    setOwnershipResource(null);
    setOwnershipSubmitting(false);
    ownershipForm.resetFields();
  };

  const openOwnershipModal = (resource: ResourceItem) => {
    ownershipOperationGenerationRef.current += 1;
    setOwnershipResource(resource);
    setOwnershipSubmitting(false);
    ownershipForm.setFieldsValue({ targetNodeId: resource.nodeId });
    setOwnershipOpen(true);
  };

  const findDuplicatedResourceName = (
    name: string,
    type?: ResourceType,
    nodeId?: string,
  ) => {
    const scopedNodeId = nodeId || editingResource?.nodeId;
    if (!type || !scopedNodeId || !name.trim()) return undefined;
    return resources.find(
      (resource) =>
        resource.id !== editingResource?.id &&
        resource.type === type &&
        resource.nodeId === scopedNodeId &&
        resource.name.trim() === name.trim(),
    );
  };

  const isDuplicatedResourceName = (
    name: string,
    type?: ResourceType,
    nodeId?: string,
  ) => Boolean(findDuplicatedResourceName(name, type, nodeId));

  const openResourceDetail = (
    resource: ResourceItem,
    initialFileList?: UploadFile[],
  ) => {
    detailRequestSequenceRef.current += 1;
    setDetailRequest({
      key: detailRequestSequenceRef.current,
      resource,
      initialFileList: initialFileList?.slice(-1),
    });
  };

  const enterExistingResourceVersionFlow = (
    resource: ResourceItem,
    initialFileList?: UploadFile[],
  ) => {
    closeForm();
    openResourceDetail(resource, initialFileList);
    message.info(
      resource.status === 'archived'
        ? '已定位到同名的已归档资源；上传兼容新版本时将原子恢复为未上架'
        : '已定位到同名逻辑资源，请将文件上传为新版本',
    );
  };

  const duplicatedCreateResource =
    !editingResource && selectedFormName
      ? findDuplicatedResourceName(
          selectedFormName,
          selectedFormType,
          selectedFormNodeId,
        )
      : undefined;

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
    const operationGeneration = (formOperationGenerationRef.current += 1);
    const operationSubject = selectedSubject;
    const operationResource = editingResource;
    const isCurrentOperation = () =>
      formOperationGenerationRef.current === operationGeneration &&
      activeSubjectRef.current === operationSubject;

    let values: ResourceFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    if (!isCurrentOperation()) return;

    if (!operationResource) {
      const duplicatedResource = findDuplicatedResourceName(
        values.name,
        values.type,
        values.nodeId,
      );
      if (duplicatedResource) {
        enterExistingResourceVersionFlow(duplicatedResource, values.fileList);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (operationResource) {
        const response = await updateResourceMetadata({
          id: operationResource.id,
          name: values.name.trim(),
          subject: operationSubject,
        });
        if (!isCurrentOperation()) {
          if (
            response.success &&
            activeSubjectRef.current === operationSubject
          ) {
            setCatalogRefreshToken((current) => current + 1);
          }
          return;
        }
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
          subject: operationSubject,
        });
        if (!isCurrentOperation()) {
          if (
            response.success &&
            activeSubjectRef.current === operationSubject
          ) {
            setCatalogRefreshToken((current) => current + 1);
          }
          return;
        }
        if (!response.success) {
          if (response.code === RESOURCE_NAME_CONFLICT_CODE && response.data) {
            const duplicatedResource = response.data;
            const selectedFiles = values.fileList?.slice(-1);
            Modal.confirm({
              title: '同名内容归入已有资源',
              content:
                duplicatedResource.status === 'archived'
                  ? '该末级节点下已有同类型、同名称的已归档资源。请把本次文件上传为新版本；服务端将在同一次变更中恢复为未上架，不会创建重复资源。'
                  : '该末级节点下已有同类型、同名称资源。为保持一个逻辑资源及完整版本历史，请把本次文件上传为新版本。',
              okText: '进入新增版本',
              cancelText: '返回修改名称',
              onOk: () => {
                if (activeSubjectRef.current !== operationSubject) return;
                enterExistingResourceVersionFlow(
                  duplicatedResource,
                  selectedFiles,
                );
              },
            });
            return;
          }
          message.error(response.message || '附件资源上传失败');
          return;
        }
        message.success('附件资源已创建，并生成 V1');
      }

      closeForm();
      setCatalogRefreshToken((current) => current + 1);
    } catch {
      if (isCurrentOperation()) {
        message.error(
          operationResource ? '资源信息更新失败' : '附件资源上传失败',
        );
      }
    } finally {
      if (isCurrentOperation()) setSubmitting(false);
    }
  };

  const handleOwnershipSubmit = async () => {
    if (!ownershipResource) return;

    const operationGeneration = (ownershipOperationGenerationRef.current += 1);
    const operationSubject = selectedSubject;
    const operationResource = ownershipResource;
    const isCurrentOperation = () =>
      ownershipOperationGenerationRef.current === operationGeneration &&
      activeSubjectRef.current === operationSubject;

    let values: OwnershipFormValues;
    try {
      values = await ownershipForm.validateFields();
    } catch {
      return;
    }
    if (!isCurrentOperation()) return;

    setOwnershipSubmitting(true);
    try {
      const response = await adjustResourceOwnership({
        id: operationResource.id,
        subject: operationSubject,
        targetNodeId: values.targetNodeId,
      });
      if (!isCurrentOperation()) {
        if (response.success && activeSubjectRef.current === operationSubject) {
          setCatalogRefreshToken((current) => current + 1);
        }
        return;
      }
      if (!response.success) {
        const errorMessage = response.message || '资源归属调整失败';
        ownershipForm.setFields([
          { name: 'targetNodeId', errors: [errorMessage] },
        ]);
        message.error(errorMessage);
        return;
      }
      message.success('资源归属已原子调整');
      closeOwnershipModal();
      setCatalogRefreshToken((current) => current + 1);
    } catch {
      if (isCurrentOperation()) message.error('资源归属调整失败');
    } finally {
      if (isCurrentOperation()) setOwnershipSubmitting(false);
    }
  };

  const executeLifecycleAction = async (
    resource: ResourceItem,
    action: ResourceLifecycleAction,
  ) => {
    if (lifecycleOperationTokenRef.current !== null) return;

    const operationGeneration = (lifecycleOperationGenerationRef.current += 1);
    lifecycleOperationTokenRef.current = operationGeneration;
    const operationSubject = selectedSubject;
    const isCurrentOperation = () =>
      lifecycleOperationGenerationRef.current === operationGeneration &&
      activeSubjectRef.current === operationSubject;

    setLifecycleOperation({ resourceId: resource.id, action });
    try {
      const response = await transitionResourceLifecycle({
        id: resource.id,
        subject: operationSubject,
        action,
      });
      if (!isCurrentOperation()) return;
      if (!response.success) {
        message.error(response.message || '资源状态更新失败');
        return;
      }
      message.success(response.message || '资源状态更新成功');
      setCatalogRefreshToken((current) => current + 1);
    } catch {
      if (isCurrentOperation()) message.error('资源状态更新失败');
    } finally {
      if (lifecycleOperationTokenRef.current === operationGeneration) {
        lifecycleOperationTokenRef.current = null;
      }
      if (isCurrentOperation()) setLifecycleOperation(null);
    }
  };

  const handleLifecycleAction = (
    resource: ResourceItem,
    action: ResourceLifecycleAction,
  ) => {
    if (action !== 'archive') {
      void executeLifecycleAction(resource, action);
      return;
    }

    const operationSubject = selectedSubject;
    Modal.confirm({
      title: '确认归档资源',
      content: `归档“${resource.name}”后将停止前台展示和新业务引用；资源身份、节点归属、当前版本与版本历史及已有引用都会保留。`,
      okText: '确认归档',
      onOk: () => {
        if (activeSubjectRef.current !== operationSubject) return;
        void executeLifecycleAction(resource, action);
      },
    });
  };

  const handleDelete = (resource: ResourceItem) => {
    if (!resource.canDelete) {
      message.warning(
        `该资源已有 ${resource.referenceCount} 个业务引用，只能归档，不能彻底删除`,
      );
      return;
    }

    const operationSubject = selectedSubject;
    const executeHardDelete = async () => {
      try {
        const response = await deleteResource(resource.id, {
          subject: operationSubject,
        });
        if (activeSubjectRef.current !== operationSubject) return;
        if (!response.success) {
          message.error(response.message || '资源彻底删除失败');
          return;
        }
        message.success(response.message || '资源已彻底删除');
        setCatalogRefreshToken((current) => current + 1);
      } catch {
        if (activeSubjectRef.current === operationSubject) {
          message.error('资源彻底删除失败');
        }
      }
    };

    Modal.confirm({
      title: '确认彻底删除资源',
      content: `“${resource.name}”当前无业务引用。彻底删除将永久移除资源身份、当前版本与版本历史，且无法恢复。`,
      okText: '彻底删除',
      okButtonProps: { danger: true },
      onOk: () => {
        if (activeSubjectRef.current !== operationSubject) return;
        void executeHardDelete();
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
      title: '当前载体',
      key: 'carrierType',
      width: 110,
      render: (_, resource) =>
        RESOURCE_CARRIER_LABELS[resource.currentVersion.carrierType],
    },
    {
      title: '复习树完整路径',
      dataIndex: 'nodeId',
      key: 'nodeId',
      width: 310,
      render: (nodeId: string) => {
        const nodePath = reviewTreeMetadata.nodePathMap.get(nodeId);
        return nodePath ? (
          <span className="asset-center-node-path" title={nodePath}>
            {nodePath}
          </span>
        ) : (
          <Tag color="error">节点不可用</Tag>
        );
      },
    },
    {
      title: '当前版本',
      key: 'currentVersion',
      width: 96,
      render: (_, resource) => (
        <span className="asset-center-version-summary">
          <strong>V{resource.currentVersion.versionNumber}</strong>
          {resource.pendingVersionCount > 0 && (
            <small>{resource.pendingVersionCount} 个待生效</small>
          )}
        </span>
      ),
    },
    {
      title: '状态与可用性',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      render: (status: ResourceStatus, resource) => (
        <div className="asset-center-status-cell">
          <Tag color={RESOURCE_STATUS_COLORS[status]}>
            {RESOURCE_STATUS_LABELS[status]}
          </Tag>
          <span>
            {resource.isVisible ? '前台可见' : '前台不可见'} ·{' '}
            {resource.canCreateReference ? '可新引用' : '不可新引用'}
          </span>
        </div>
      ),
    },
    {
      title: '业务引用',
      dataIndex: 'referenceCount',
      key: 'referenceCount',
      width: 112,
      render: (referenceCount: number, resource) => (
        <div className="asset-center-reference-cell">
          <strong>{referenceCount}</strong>
          <span>{resource.canDelete ? '可彻底删除' : '需保留'}</span>
        </div>
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
      width: 640,
      render: (_, resource) => {
        const lifecycleActions = Object.keys(
          RESOURCE_LIFECYCLE_TRANSITIONS[resource.status],
        ) as ResourceLifecycleAction[];
        const lifecycleBusy = Boolean(lifecycleOperation);
        const deleteDisabled = !resource.canDelete || lifecycleBusy;
        const deleteTip = lifecycleBusy
          ? '请等待当前生命周期操作完成'
          : resource.canDelete
          ? '仅无业务引用的资源可以彻底删除'
          : `已有 ${resource.referenceCount} 个业务引用，不能彻底删除，请使用归档`;

        return (
          <Space size={0} wrap>
            <Button
              type="link"
              size="small"
              icon={<HistoryOutlined />}
              disabled={lifecycleBusy}
              onClick={() => openResourceDetail(resource)}
            >
              详情 / 版本
            </Button>
            {lifecycleActions.map((action) => (
              <Button
                key={action}
                type="link"
                size="small"
                icon={getLifecycleActionIcon(action)}
                loading={
                  lifecycleOperation?.resourceId === resource.id &&
                  lifecycleOperation.action === action
                }
                disabled={lifecycleBusy}
                onClick={() => handleLifecycleAction(resource, action)}
              >
                {RESOURCE_LIFECYCLE_ACTION_LABELS[action]}
              </Button>
            ))}
            {isComposedResourceType(resource.type) && (
              <Button
                type="link"
                size="small"
                icon={<FormOutlined />}
                disabled={lifecycleBusy}
                onClick={() => openCombinationRevision(resource)}
              >
                发起修订
              </Button>
            )}
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              disabled={lifecycleBusy}
              onClick={() => openEditModal(resource)}
            >
              编辑名称
            </Button>
            <Button
              type="link"
              size="small"
              icon={<SwapOutlined />}
              disabled={lifecycleBusy}
              onClick={() => openOwnershipModal(resource)}
            >
              调整归属
            </Button>
            <Tooltip title={deleteTip}>
              <span>
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={deleteDisabled}
                  onClick={() => handleDelete(resource)}
                >
                  彻底删除
                </Button>
              </span>
            </Tooltip>
          </Space>
        );
      },
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
            <span className="asset-center-context-label">学科目录</span>
            <Select
              value={selectedSubject}
              onChange={handleSubjectChange}
              options={SUBJECT_OPTIONS}
              aria-label="选择资产学科"
              className="asset-center-subject-select"
            />
            <span className="asset-center-context-note">
              当前仅展示一个学科，资源学科继承自所属节点
            </span>
          </div>
          <div className="asset-center-toolbar-actions">
            <div
              className="asset-center-composed-entry"
              aria-label="组合制作快捷入口"
            >
              <span className="asset-center-composed-entry-label">
                <strong>组合制作</strong>
                <small>前往独立模块</small>
              </span>
              <Button
                icon={<FormOutlined />}
                onClick={() => openCombinationProduction('studyGuide')}
              >
                新建学案
              </Button>
              <Button
                icon={<FormOutlined />}
                onClick={() => openCombinationProduction('homework')}
              >
                新建作业
              </Button>
            </div>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={openCreateModal}
            >
              上传附件资源
            </Button>
          </div>
        </div>

        <div className="asset-center-filter-panel">
          <div className="asset-center-filter-heading">
            <strong>目录筛选</strong>
            <span>条件可组合；选择父节点时包含其全部后代资源</span>
          </div>
          <div className="asset-center-filter-controls">
            <Input
              allowClear
              placeholder="搜索资源名称或原始文件名…"
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              aria-label="按名称筛选资产"
              className="asset-center-search"
            />
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              options={RESOURCE_TYPE_OPTIONS}
              aria-label="筛选资源类型"
              className="asset-center-filter-select"
            />
            <Select
              value={carrierFilter}
              onChange={setCarrierFilter}
              options={RESOURCE_CARRIER_OPTIONS}
              aria-label="筛选载体类型"
              className="asset-center-filter-select"
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={RESOURCE_STATUS_OPTIONS}
              aria-label="筛选资源状态"
              className="asset-center-filter-select"
            />
            <TreeSelect
              allowClear
              value={nodeFilter}
              onChange={setNodeFilter}
              placeholder="全部复习树节点"
              treeData={reviewTreeMetadata.filterTreeSelectData}
              treeDefaultExpandAll
              showSearch
              treeNodeFilterProp="title"
              aria-label="筛选复习树节点"
              className="asset-center-node-filter"
              notFoundContent="当前学科暂无复习树节点"
            />
            <Button onClick={resetFilters} disabled={!hasActiveFilters}>
              重置
            </Button>
          </div>
        </div>

        <Table<ResourceItem>
          rowKey="id"
          loading={loading || treeLoading}
          columns={columns}
          dataSource={resources}
          scroll={{ x: 2090 }}
          locale={{ emptyText: '当前筛选条件下暂无资源' }}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 份资源`,
          }}
        />
      </Card>

      <Modal
        title={editingResource ? '编辑资源名称' : '上传附件资源'}
        open={formOpen}
        onOk={handleSubmit}
        onCancel={closeForm}
        okText={
          editingResource
            ? '保存'
            : duplicatedCreateResource
            ? '上传为新版本'
            : '创建资源并生成 V1'
        }
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

          {!editingResource && (
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
                aria-label="选择资源所属复习树节点"
                treeData={reviewTreeMetadata.ownershipTreeSelectData}
                treeDefaultExpandAll
                showSearch
                treeNodeFilterProp="title"
                allowClear={false}
                notFoundContent="当前学科暂无可用复习树节点"
              />
            </Form.Item>
          )}

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
                    editingResource &&
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

          {!editingResource && duplicatedCreateResource && (
            <Alert
              type="warning"
              showIcon
              className="asset-center-same-name-guide"
              message="已存在同名逻辑资源"
              description={
                duplicatedCreateResource.status === 'archived'
                  ? `“${duplicatedCreateResource.name}”已有 ${duplicatedCreateResource.versionCount} 个版本且当前已归档。上传兼容新版本时，服务端会原子恢复为未上架，不会创建重复资源。`
                  : `“${duplicatedCreateResource.name}”已有 ${duplicatedCreateResource.versionCount} 个版本。请保留资源身份、类型与归属，把本次文件作为新版本上传。`
              }
              action={
                <Button
                  size="small"
                  type="primary"
                  onClick={() =>
                    enterExistingResourceVersionFlow(
                      duplicatedCreateResource,
                      form.getFieldValue('fileList'),
                    )
                  }
                >
                  上传为新版本
                </Button>
              }
            />
          )}
        </Form>
      </Modal>

      <Modal
        title="调整资源归属"
        open={ownershipOpen}
        onOk={handleOwnershipSubmit}
        onCancel={closeOwnershipModal}
        okText="确认调整归属"
        cancelText="取消"
        confirmLoading={ownershipSubmitting}
        width={600}
        destroyOnClose
      >
        {ownershipResource && (
          <>
            <div className="asset-center-ownership-summary">
              <span className="asset-center-ownership-label">资源</span>
              <strong>{ownershipResource.name}</strong>
              <span className="asset-center-ownership-label">当前归属</span>
              <span>
                {reviewTreeMetadata.nodePathMap.get(ownershipResource.nodeId) ||
                  '节点不可用'}
              </span>
            </div>

            <div className="asset-center-ownership-guardrail">
              <SafetyCertificateOutlined />
              <div>
                <strong>归属将原子替换</strong>
                <span>
                  仅可选择当前学科的末级节点，确认后不会出现未归属中间状态
                </span>
              </div>
            </div>

            <Form
              form={ownershipForm}
              layout="vertical"
              className="asset-center-resource-form"
            >
              <Form.Item
                name="targetNodeId"
                label="目标末级节点"
                rules={[
                  { required: true, message: '请选择目标末级节点' },
                  {
                    validator: (_, targetNodeId?: string) =>
                      targetNodeId &&
                      reviewTreeMetadata.leafNodeIds.has(targetNodeId)
                        ? Promise.resolve()
                        : Promise.reject(
                            new Error('只能选择当前学科的有效复习树末级节点'),
                          ),
                  },
                ]}
                extra="目标节点存在同类型、同名称资源时，系统将拒绝调整"
              >
                <TreeSelect
                  placeholder="请选择目标末级节点"
                  aria-label="选择目标归属节点"
                  treeData={reviewTreeMetadata.ownershipTreeSelectData}
                  treeDefaultExpandAll
                  showSearch
                  treeNodeFilterProp="title"
                  allowClear={false}
                  notFoundContent="当前学科暂无可用复习树节点"
                />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      <ResourceDetailDrawer
        request={detailRequest}
        nodePath={
          detailRequest
            ? reviewTreeMetadata.nodePathMap.get(detailRequest.resource.nodeId)
            : undefined
        }
        onClose={() => setDetailRequest(null)}
        onStartRevision={openCombinationRevision}
        isSubjectActive={isSubjectActive}
        onResourceChanged={(resource) => {
          if (activeSubjectRef.current === resource.subject) {
            setCatalogRefreshToken((current) => current + 1);
          }
        }}
      />
    </PageContainer>
  );
};

export default AssetCenterPage;
