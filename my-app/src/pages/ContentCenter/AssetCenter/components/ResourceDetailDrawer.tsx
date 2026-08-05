import type {
  AttachmentResourceType,
  ResourceDetail,
  ResourceItem,
  ResourceStatus,
  ResourceVersion,
  ResourceVersionState,
} from '@/services/tagSystem';
import {
  activateResourceVersion,
  ATTACHMENT_RESOURCE_ACCEPT,
  createAttachmentResourceVersion,
  getResourceDetail,
  isAttachmentFileCompatible,
  isAttachmentResourceType,
  isResourceVersionCompatible,
  RESOURCE_CARRIER_LABELS,
  RESOURCE_STATUS_LABELS,
  RESOURCE_TYPE_LABELS,
  RESOURCE_VERSION_STATE_LABELS,
  validateFormalResourceVersionAggregate,
} from '@/services/tagSystem';
import {
  AudioOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  FileAddOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FormOutlined,
  HistoryOutlined,
  InboxOutlined,
  SafetyCertificateOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Empty,
  message,
  Modal,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ResourceOperationTimeline from './ResourceOperationTimeline';
import ResourceVersionPreview from './ResourceVersionPreview';

export interface ResourceDetailRequest {
  key: number;
  resource: ResourceItem;
  initialFileList?: UploadFile[];
}

interface ResourceDetailDrawerProps {
  request: ResourceDetailRequest | null;
  nodePath?: string;
  onClose: () => void;
  onStartRevision: (resource: ResourceItem) => void;
  onResourceChanged: (resource: ResourceItem) => void;
  isSubjectActive: (subject: string) => boolean;
}

export interface ResourceDetailContextIdentity {
  requestKey: number;
  resourceId: string;
  subject: string;
}

interface ActivationConfirmationContext extends ResourceDetailContextIdentity {
  generation: number;
  versionId: string;
}

export const isResourceDetailContextCurrent = (
  current: ResourceDetailContextIdentity | null,
  expected: ResourceDetailContextIdentity,
) =>
  Boolean(
    current &&
      current.requestKey === expected.requestKey &&
      current.resourceId === expected.resourceId &&
      current.subject === expected.subject,
  );

const RESOURCE_STATUS_COLORS: Record<ResourceStatus, string> = {
  unlisted: 'default',
  listed: 'green',
  archived: 'gold',
};

const VERSION_STATE_COLORS: Record<ResourceVersionState, string> = {
  current: 'green',
  pending: 'gold',
  historical: 'default',
};

const formatDateTime = (value: string) =>
  value.replace('T', ' ').replace('Z', '').slice(0, 16);

const getCarrierIcon = (version: ResourceVersion) => {
  if (version.carrierType === 'ppt') return <FilePptOutlined />;
  if (version.carrierType === 'pdf') return <FilePdfOutlined />;
  if (version.carrierType === 'audio') return <AudioOutlined />;
  if (version.carrierType === 'video') return <VideoCameraOutlined />;
  return <FileTextOutlined />;
};

const ResourceDetailDrawer: React.FC<ResourceDetailDrawerProps> = ({
  request,
  nodePath,
  onClose,
  onStartRevision,
  onResourceChanged,
  isSubjectActive,
}) => {
  const [detail, setDetail] = useState<ResourceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFileList, setUploadFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activationVersionId, setActivationVersionId] = useState<string | null>(
    null,
  );
  const [previewVersion, setPreviewVersion] = useState<ResourceVersion | null>(
    null,
  );
  const [previewedVersionIds, setPreviewedVersionIds] = useState<Set<string>>(
    new Set(),
  );
  const requestIdRef = useRef(0);
  const operationGenerationRef = useRef(0);
  const operationTokenRef = useRef<number | null>(null);
  const activeRequestKeyRef = useRef<number | null>(null);
  const activationConfirmationGenerationRef = useRef(0);
  const activationConfirmationRef = useRef<{
    generation: number;
    modal: ReturnType<typeof Modal.confirm>;
  } | null>(null);
  const latestRequestContextRef = useRef<ResourceDetailContextIdentity | null>(
    null,
  );
  const latestDetailRef = useRef<ResourceDetail | null>(null);

  latestRequestContextRef.current = request
    ? {
        requestKey: request.key,
        resourceId: request.resource.id,
        subject: request.resource.subject,
      }
    : null;
  latestDetailRef.current = detail;

  const destroyActivationConfirmation = useCallback(() => {
    activationConfirmationGenerationRef.current += 1;
    const confirmation = activationConfirmationRef.current;
    activationConfirmationRef.current = null;
    confirmation?.modal.destroy();
  }, []);

  const releaseActivationConfirmation = useCallback((generation: number) => {
    if (activationConfirmationRef.current?.generation !== generation) return;
    activationConfirmationRef.current = null;
    activationConfirmationGenerationRef.current += 1;
  }, []);

  const invalidateOperations = useCallback(() => {
    requestIdRef.current += 1;
    operationGenerationRef.current += 1;
    operationTokenRef.current = null;
    activeRequestKeyRef.current = null;
    destroyActivationConfirmation();
  }, [destroyActivationConfirmation]);

  useEffect(() => {
    invalidateOperations();
    const requestId = (requestIdRef.current += 1);
    activeRequestKeyRef.current = request?.key ?? null;
    setDetail(null);
    setLoading(Boolean(request));
    setUploadOpen(false);
    setUploadFileList([]);
    setUploading(false);
    setActivationVersionId(null);
    setPreviewVersion(null);
    setPreviewedVersionIds(new Set());

    if (!request) return invalidateOperations;
    const currentRequest = request;
    const expectedContext: ResourceDetailContextIdentity = {
      requestKey: currentRequest.key,
      resourceId: currentRequest.resource.id,
      subject: currentRequest.resource.subject,
    };
    const isCurrentRequest = () =>
      requestIdRef.current === requestId &&
      activeRequestKeyRef.current === currentRequest.key &&
      isResourceDetailContextCurrent(
        latestRequestContextRef.current,
        expectedContext,
      ) &&
      isSubjectActive(currentRequest.resource.subject);

    void getResourceDetail({
      id: currentRequest.resource.id,
      subject: currentRequest.resource.subject,
    })
      .then((response) => {
        if (!isCurrentRequest()) return;
        if (!response.success) {
          message.error(response.message || '获取资源详情失败');
          return;
        }
        const versionValidation = validateFormalResourceVersionAggregate(
          response.data,
        );
        if (!versionValidation.valid) {
          message.error(`资源版本数据无效：${versionValidation.message}`);
          return;
        }
        setDetail(response.data);
        if (
          currentRequest.initialFileList?.length &&
          isAttachmentResourceType(response.data.type)
        ) {
          setUploadFileList(currentRequest.initialFileList.slice(-1));
          setUploadOpen(true);
        }
      })
      .catch(() => {
        if (isCurrentRequest()) message.error('获取资源详情失败');
      })
      .finally(() => {
        if (isCurrentRequest()) setLoading(false);
      });

    return invalidateOperations;
  }, [invalidateOperations, isSubjectActive, request]);

  const handleClose = () => {
    invalidateOperations();
    setUploadOpen(false);
    setPreviewVersion(null);
    onClose();
  };

  const openUpload = () => {
    if (!detail || !isAttachmentResourceType(detail.type)) return;
    setUploadFileList([]);
    setUploadOpen(true);
  };

  const closeUpload = () => {
    if (uploading) return;
    setUploadOpen(false);
    setUploadFileList([]);
  };

  const beforeVersionUpload: UploadProps['beforeUpload'] = (file) => {
    if (!detail || !isAttachmentResourceType(detail.type)) {
      message.error('仅附件资源支持上传新版本');
      return Upload.LIST_IGNORE;
    }
    if (!isAttachmentFileCompatible(detail.type, file.name)) {
      message.error(
        detail.type === 'courseware'
          ? '课件新版本仅支持 .ppt 或 .pptx 文件'
          : '其他类型新版本仅支持 .pdf、.mp3 或 .mp4 文件',
      );
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const handleVersionUpload = async () => {
    if (!request || !detail || operationTokenRef.current !== null) return;
    const selectedFile = uploadFileList[0];
    if (!selectedFile) {
      message.warning('请选择一个新版本文件');
      return;
    }
    if (
      !isAttachmentResourceType(detail.type) ||
      !isAttachmentFileCompatible(detail.type, selectedFile.name)
    ) {
      message.error('新版本文件格式与资源类型不兼容');
      return;
    }

    const operationGeneration = (operationGenerationRef.current += 1);
    operationTokenRef.current = operationGeneration;
    const operationRequestKey = request.key;
    const operationResourceId = detail.id;
    const operationSubject = detail.subject;
    const previousCurrentVersion = detail.currentVersion.versionNumber;
    const previousStatus = detail.status;
    const isCurrentOperation = () =>
      operationGenerationRef.current === operationGeneration &&
      activeRequestKeyRef.current === operationRequestKey &&
      isSubjectActive(operationSubject);

    setUploading(true);
    try {
      const response = await createAttachmentResourceVersion({
        resourceId: operationResourceId,
        subject: operationSubject,
        originalFileName: selectedFile.name,
      });
      if (!isCurrentOperation()) {
        if (response.success) onResourceChanged(response.data);
        return;
      }
      if (!response.success) {
        message.error(response.message || '新版本上传失败');
        return;
      }
      setDetail(response.data);
      setUploadOpen(false);
      setUploadFileList([]);
      onResourceChanged(response.data);
      const pendingVersion = response.data.versions.find(
        (version) =>
          version.state === 'pending' &&
          version.createdAt === response.data.updatedAt,
      );
      const restoredFromArchive =
        previousStatus === 'archived' && response.data.status === 'unlisted';
      message.success(
        `${
          pendingVersion ? `V${pendingVersion.versionNumber}` : '新版本'
        } 已待生效，当前仍为 V${previousCurrentVersion}${
          restoredFromArchive ? '；资源已原子恢复为未上架' : ''
        }`,
      );
    } catch {
      if (isCurrentOperation()) message.error('新版本上传失败');
    } finally {
      if (operationTokenRef.current === operationGeneration) {
        operationTokenRef.current = null;
      }
      if (isCurrentOperation()) setUploading(false);
    }
  };

  const preview = (version: ResourceVersion) => {
    if (!detail || !isResourceVersionCompatible(detail.type, version)) {
      message.error('该版本文件类型与资源类型不匹配，不能预览或生效');
      return;
    }
    setPreviewedVersionIds((current) => new Set(current).add(version.id));
    setPreviewVersion(version);
  };

  const executeActivation = async (
    version: ResourceVersion,
    confirmationContext: ActivationConfirmationContext,
  ) => {
    const currentDetail = latestDetailRef.current;
    const contextIsCurrent =
      activationConfirmationGenerationRef.current ===
        confirmationContext.generation &&
      activationConfirmationRef.current?.generation ===
        confirmationContext.generation &&
      isResourceDetailContextCurrent(
        latestRequestContextRef.current,
        confirmationContext,
      ) &&
      activeRequestKeyRef.current === confirmationContext.requestKey &&
      isSubjectActive(confirmationContext.subject) &&
      currentDetail?.id === confirmationContext.resourceId &&
      currentDetail.subject === confirmationContext.subject &&
      currentDetail.versions.some(
        (candidate) =>
          candidate.id === confirmationContext.versionId &&
          candidate.state !== 'current' &&
          isResourceVersionCompatible(currentDetail.type, candidate),
      );

    // Modal.confirm 持有创建时闭包；必须在请求前以实时 ref 复核完整上下文。
    if (!contextIsCurrent || operationTokenRef.current !== null) return;

    const operationGeneration = (operationGenerationRef.current += 1);
    operationTokenRef.current = operationGeneration;
    const operationRequestKey = confirmationContext.requestKey;
    const operationResourceId = confirmationContext.resourceId;
    const operationSubject = confirmationContext.subject;
    const isCurrentOperation = () =>
      operationGenerationRef.current === operationGeneration &&
      activeRequestKeyRef.current === operationRequestKey &&
      isResourceDetailContextCurrent(
        latestRequestContextRef.current,
        confirmationContext,
      ) &&
      isSubjectActive(operationSubject);

    setActivationVersionId(version.id);
    try {
      const response = await activateResourceVersion({
        resourceId: operationResourceId,
        versionId: confirmationContext.versionId,
        subject: operationSubject,
      });
      if (!isCurrentOperation()) {
        if (response.success) onResourceChanged(response.data);
        return;
      }
      if (!response.success) {
        message.error(response.message || '版本生效失败');
        return;
      }
      setDetail(response.data);
      onResourceChanged(response.data);
      message.success(response.message || `V${version.versionNumber} 已生效`);
    } catch {
      if (isCurrentOperation()) message.error('版本生效失败');
    } finally {
      if (operationTokenRef.current === operationGeneration) {
        operationTokenRef.current = null;
      }
      if (isCurrentOperation()) setActivationVersionId(null);
    }
  };

  const confirmActivation = (version: ResourceVersion) => {
    if (
      !request ||
      !detail ||
      !previewedVersionIds.has(version.id) ||
      !isResourceVersionCompatible(detail.type, version)
    ) {
      return;
    }
    const expectedContext: ResourceDetailContextIdentity = {
      requestKey: request.key,
      resourceId: detail.id,
      subject: detail.subject,
    };
    if (
      !isResourceDetailContextCurrent(
        latestRequestContextRef.current,
        expectedContext,
      )
    ) {
      return;
    }

    destroyActivationConfirmation();
    const generation = (activationConfirmationGenerationRef.current += 1);
    const confirmationContext: ActivationConfirmationContext = {
      ...expectedContext,
      generation,
      versionId: version.id,
    };
    const actionLabel = version.state === 'pending' ? '生效' : '重新生效';
    const modal = Modal.confirm({
      title: `确认${actionLabel} V${version.versionNumber}`,
      content: (
        <div className="asset-version-activation-confirm">
          <p>
            当前 V{detail.currentVersion.versionNumber} 将转为历史版本，V
            {version.versionNumber} 成为平台资源库使用的当前版本。
          </p>
          <p>
            资源身份、类型、资源树归属和“{RESOURCE_STATUS_LABELS[detail.status]}
            ”状态均保持不变。
          </p>
        </div>
      ),
      okText: `确认${actionLabel}`,
      onOk: () => executeActivation(version, confirmationContext),
      afterClose: () => releaseActivationConfirmation(generation),
    });
    activationConfirmationRef.current = { generation, modal };
  };

  const versionColumns: ColumnsType<ResourceVersion> = [
    {
      title: '版本',
      key: 'version',
      width: 128,
      render: (_, version) => (
        <div className="asset-version-number-cell">
          <strong>V{version.versionNumber}</strong>
          <Tag color={VERSION_STATE_COLORS[version.state]}>
            {RESOURCE_VERSION_STATE_LABELS[version.state]}
          </Tag>
        </div>
      ),
    },
    {
      title: '内容与文件类型',
      key: 'file',
      width: 260,
      render: (_, version) => (
        <div className="asset-version-file-cell">
          <span
            className={`asset-version-carrier-icon asset-version-carrier-icon-${version.carrierType}`}
          >
            {getCarrierIcon(version)}
          </span>
          <span>
            <strong title={version.originalFileName}>
              {version.originalFileName || '在线组合内容'}
            </strong>
            <small>{RESOURCE_CARRIER_LABELS[version.carrierType]}</small>
          </span>
        </div>
      ),
    },
    {
      title: '创建信息',
      key: 'created',
      width: 180,
      render: (_, version) => (
        <div className="asset-version-created-cell">
          <strong>{version.createdBy.name}</strong>
          <span>{formatDateTime(version.createdAt)}</span>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 190,
      fixed: 'right',
      render: (_, version) => {
        const isCurrent = version.state === 'current';
        const versionIsValid = Boolean(
          detail && isResourceVersionCompatible(detail.type, version),
        );
        const hasPreviewed =
          versionIsValid && previewedVersionIds.has(version.id);
        const operationBusy = Boolean(activationVersionId || uploading);
        return (
          <Space size={4}>
            <Tooltip
              title={
                versionIsValid
                  ? version.carrierType === 'online'
                    ? '查看在线组合内容的只读占位预览'
                    : '查看该附件版本的原型占位预览'
                  : '版本文件类型与资源类型不匹配'
              }
            >
              <span>
                <Button
                  type="link"
                  size="small"
                  icon={<EyeOutlined />}
                  disabled={!versionIsValid}
                  onClick={() => preview(version)}
                >
                  预览
                </Button>
              </span>
            </Tooltip>
            {isCurrent ? (
              <span className="asset-version-current-action">
                <CheckCircleOutlined /> 当前
              </span>
            ) : (
              <Tooltip
                title={
                  !versionIsValid
                    ? '版本文件类型与资源类型不匹配，不能生效'
                    : hasPreviewed
                    ? version.state === 'pending'
                      ? '设为当前生效版本'
                      : '将该历史版本重新设为当前版本'
                    : '请先预览该版本，再确认生效'
                }
              >
                <span>
                  <Button
                    type="link"
                    size="small"
                    disabled={!hasPreviewed || operationBusy}
                    loading={activationVersionId === version.id}
                    onClick={() => confirmActivation(version)}
                  >
                    {version.state === 'pending' ? '确认生效' : '重新生效'}
                  </Button>
                </span>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  const attachmentType = detail?.type as AttachmentResourceType | undefined;
  const drawerTitle = detail?.name || request?.resource.name || '资源详情';

  return (
    <>
      <Drawer
        title={
          <div className="asset-detail-drawer-title">
            <span>资源详情与版本历史</span>
            <strong>{drawerTitle}</strong>
          </div>
        }
        open={Boolean(request)}
        onClose={handleClose}
        width={940}
        destroyOnClose
        extra={
          detail && !isAttachmentResourceType(detail.type) ? (
            <Tooltip title="进入组合制作只读占位，不会直接修改正式内容">
              <Button
                type="primary"
                icon={<FormOutlined />}
                onClick={() => onStartRevision(detail)}
              >
                发起修订
              </Button>
            </Tooltip>
          ) : (
            <Button
              type="primary"
              icon={<FileAddOutlined />}
              disabled={!detail}
              onClick={openUpload}
            >
              上传新版本
            </Button>
          )
        }
        className="asset-detail-drawer"
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : detail ? (
          <div className="asset-detail-content">
            <Descriptions
              size="small"
              column={2}
              className="asset-detail-identity"
              items={[
                { label: '资源名称', children: detail.name },
                {
                  label: '资源类型',
                  children: <Tag>{RESOURCE_TYPE_LABELS[detail.type]}</Tag>,
                },
                {
                  label: '资源树归属',
                  span: 2,
                  children: nodePath || <Tag color="error">节点不可用</Tag>,
                },
                {
                  label: '资源状态',
                  children: (
                    <Tag color={RESOURCE_STATUS_COLORS[detail.status]}>
                      {RESOURCE_STATUS_LABELS[detail.status]}
                    </Tag>
                  ),
                },
                {
                  label: '版本概况',
                  children: `${detail.versionCount} 个版本 · ${detail.pendingVersionCount} 个待生效`,
                },
                {
                  label: '业务引用',
                  children: `${detail.referenceCount} 个固定版本引用`,
                },
                {
                  label: '删除保护',
                  span: 2,
                  children: detail.hardDeleteBlockedReason ? (
                    <span className="asset-detail-delete-protection">
                      <SafetyCertificateOutlined />
                      {detail.hardDeleteBlockedReason}
                    </span>
                  ) : (
                    '当前无业务引用，可彻底删除'
                  ),
                },
              ]}
            />

            <section className="asset-version-anchor" aria-label="当前生效版本">
              <div className="asset-version-anchor-label">
                <span>
                  <CheckCircleOutlined /> 当前生效
                </span>
                <strong>V{detail.currentVersion.versionNumber}</strong>
              </div>
              <div className="asset-version-anchor-file">
                <span
                  className={`asset-version-carrier-icon asset-version-carrier-icon-${detail.currentVersion.carrierType}`}
                >
                  {getCarrierIcon(detail.currentVersion)}
                </span>
                <div>
                  <strong>
                    {detail.currentVersion.originalFileName || '在线组合内容'}
                  </strong>
                  <span>
                    {RESOURCE_CARRIER_LABELS[detail.currentVersion.carrierType]}{' '}
                    · 由 {detail.currentVersion.createdBy.name} 创建于{' '}
                    {formatDateTime(detail.currentVersion.createdAt)}
                  </span>
                </div>
              </div>
              <div className="asset-version-anchor-queue">
                <ClockCircleOutlined />
                <strong>{detail.pendingVersionCount}</strong>
                <span>待生效</span>
              </div>
            </section>

            <ResourceOperationTimeline records={detail.operationRecords} />

            <div className="asset-version-history-heading">
              <div>
                <HistoryOutlined />
                <strong>版本历史</strong>
                <span>版本内容保留原记录；切换当前版本不会复制或删除历史</span>
              </div>
            </div>
            <Table<ResourceVersion>
              rowKey="id"
              columns={versionColumns}
              dataSource={detail.versions}
              pagination={false}
              size="middle"
              scroll={{ x: 780 }}
              rowClassName={(version) => `asset-version-row-${version.state}`}
            />
          </div>
        ) : (
          <Empty description="资源详情不可用，请关闭后重试" />
        )}
      </Drawer>

      <Modal
        title="上传附件新版本"
        open={uploadOpen}
        onOk={handleVersionUpload}
        onCancel={closeUpload}
        okText="创建待生效版本"
        cancelText="取消"
        confirmLoading={uploading}
        width={640}
        destroyOnClose
      >
        {detail && attachmentType && (
          <div className="asset-version-upload-content">
            <div className="asset-version-upload-resource">
              <span>逻辑资源</span>
              <strong>{detail.name}</strong>
              <Tag>{RESOURCE_TYPE_LABELS[detail.type]}</Tag>
              <small>当前 V{detail.currentVersion.versionNumber}</small>
            </div>
            <Alert
              type="info"
              showIcon
              icon={<SafetyCertificateOutlined />}
              message={
                detail.status === 'archived'
                  ? '新版本与归档恢复将在服务端原子完成'
                  : '新文件先进入待生效'
              }
              description={
                detail.status === 'archived'
                  ? `创建后当前 V${detail.currentVersion.versionNumber} 继续有效，新文件进入待生效；资源在同一次变更中恢复为未上架，不会新建重复资源，需再次上架后才会前台可见。`
                  : `创建后当前 V${
                      detail.currentVersion.versionNumber
                    } 继续有效；预览并确认生效后才会切换。资源类型、归属和“${
                      RESOURCE_STATUS_LABELS[detail.status]
                    }”状态不变。`
              }
            />
            <Upload.Dragger
              accept={ATTACHMENT_RESOURCE_ACCEPT[attachmentType]}
              beforeUpload={beforeVersionUpload}
              fileList={uploadFileList}
              onChange={({ fileList }) => setUploadFileList(fileList.slice(-1))}
              maxCount={1}
              multiple={false}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽一个兼容文件到此处</p>
              <p className="ant-upload-hint">
                {attachmentType === 'courseware'
                  ? '课件版本支持 .ppt、.pptx'
                  : '其他类型版本支持 .pdf、.mp3、.mp4，文件类型可随版本变化'}
              </p>
            </Upload.Dragger>
          </div>
        )}
      </Modal>

      <ResourceVersionPreview
        open={Boolean(previewVersion)}
        resourceName={detail?.name || ''}
        version={previewVersion}
        onClose={() => setPreviewVersion(null)}
      />
    </>
  );
};

export default ResourceDetailDrawer;
