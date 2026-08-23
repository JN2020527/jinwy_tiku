import type {
  AssetItem,
  AssetStatus,
  AssetType,
} from '@/services/resourceAssets';
import {
  ASSET_STATUS_LABELS,
  ASSET_TYPE_LABELS,
  ATTACHMENT_ACCEPT,
  createAttachment,
  deleteAsset,
  getAssetList,
  getAttachmentType,
  getNameWithoutExtension,
  replaceAttachment,
  updateAssetName,
} from '@/services/resourceAssets';
import {
  DeleteOutlined,
  EditOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useSearchParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Empty,
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
import type { UploadFile } from 'antd/es/upload/interface';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SUBJECT_OPTIONS } from '../TagManage/components/treeFilterConstants';
import './index.less';

interface UploadValues {
  name: string;
  fileList: UploadFile[];
}

interface RenameValues {
  name: string;
}

const TYPE_COLORS: Record<AssetType, string> = {
  studyGuide: 'blue',
  homework: 'purple',
  word: 'cyan',
  ppt: 'volcano',
  audio: 'magenta',
  video: 'geekblue',
};

const TYPE_FILTER_OPTIONS = [
  { label: '全部类型', value: '' },
  ...Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => ({
    label,
    value,
  })),
];
const STATUS_FILTER_OPTIONS = [
  { label: '全部状态', value: '' },
  { label: '草稿', value: 'draft' },
  { label: '正式', value: 'formal' },
];
const REPLACEMENT_ACCEPT: Partial<Record<AssetType, string>> = {
  word: '.docx',
  ppt: '.ppt,.pptx',
  audio: '.mp3,.wav',
  video: '.mp4',
};

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
const normalizeUpload = (event: { fileList?: UploadFile[] } | UploadFile[]) =>
  Array.isArray(event) ? event.slice(-1) : event.fileList?.slice(-1) || [];

const AssetCenterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const requestedSubject = searchParams.get('subject') || '';
  const initialSubject = SUBJECT_OPTIONS.some(
    (option) => option.value === requestedSubject,
  )
    ? requestedSubject
    : 'math';
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssetType | ''>('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | ''>('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);
  const [replacingAsset, setReplacingAsset] = useState<AssetItem | null>(null);
  const [replaceFiles, setReplaceFiles] = useState<UploadFile[]>([]);
  const [operationPending, setOperationPending] = useState(false);
  const [uploadForm] = Form.useForm<UploadValues>();
  const [renameForm] = Form.useForm<RenameValues>();
  const selectedSubjectRef = useRef(selectedSubject);
  const requestIdRef = useRef(0);

  const loadAssets = useCallback(async () => {
    const requestId = (requestIdRef.current += 1);
    const subject = selectedSubject;
    setLoading(true);
    setLoadError('');
    try {
      const response = await getAssetList({
        subject,
        keyword: keyword.trim() || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      });
      if (
        requestId !== requestIdRef.current ||
        subject !== selectedSubjectRef.current
      )
        return;
      if (!response.success) {
        setLoadError(response.message || '资产加载失败');
        return;
      }
      setAssets(response.data);
    } catch {
      if (requestId === requestIdRef.current)
        setLoadError('资产加载失败，请重试');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [keyword, selectedSubject, statusFilter, typeFilter]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  const resetFilters = () => {
    setKeyword('');
    setTypeFilter('');
    setStatusFilter('');
  };

  const changeSubject = (subject: string) => {
    requestIdRef.current += 1;
    selectedSubjectRef.current = subject;
    setSelectedSubject(subject);
    setAssets([]);
    setKeyword('');
    setTypeFilter('');
    setStatusFilter('');
    setUploadOpen(false);
    setEditingAsset(null);
    setReplacingAsset(null);
  };

  const changeTypeFilter = (type: AssetType | '') => {
    setTypeFilter(type);
    if (type === 'homework' && statusFilter === 'draft') setStatusFilter('');
  };

  const openUpload = () => {
    uploadForm.resetFields();
    uploadForm.setFieldsValue({ fileList: [] });
    setUploadOpen(true);
  };

  const selectedUploadFile = Form.useWatch('fileList', uploadForm)?.[0];
  const handleFileSelected = (file: UploadFile) => {
    uploadForm.setFieldValue('name', getNameWithoutExtension(file.name));
    return false;
  };

  const submitUpload = async () => {
    let values: UploadValues;
    try {
      values = await uploadForm.validateFields();
    } catch {
      return;
    }
    const fileName = values.fileList[0]?.name;
    if (!fileName) return;
    setUploading(true);
    try {
      const response = await createAttachment({
        subject: selectedSubject,
        name: values.name.trim(),
        originalFileName: fileName,
      });
      if (!response.success) {
        message.error(response.message || '附件上传失败');
        return;
      }
      setUploadOpen(false);
      message.success(response.message);
      await loadAssets();
    } catch {
      message.error('附件上传失败');
    } finally {
      setUploading(false);
    }
  };

  const openRename = (asset: AssetItem) => {
    setEditingAsset(asset);
    renameForm.setFieldsValue({ name: asset.name });
  };

  const submitRename = async () => {
    if (!editingAsset) return;
    let values: RenameValues;
    try {
      values = await renameForm.validateFields();
    } catch {
      return;
    }
    setOperationPending(true);
    try {
      const response = await updateAssetName({
        id: editingAsset.id,
        subject: selectedSubject,
        name: values.name.trim(),
      });
      if (!response.success) {
        renameForm.setFields([{ name: 'name', errors: [response.message] }]);
        return;
      }
      setEditingAsset(null);
      message.success(response.message);
      await loadAssets();
    } finally {
      setOperationPending(false);
    }
  };

  const submitReplace = async () => {
    if (!replacingAsset || !replaceFiles[0]) return;
    setOperationPending(true);
    try {
      const response = await replaceAttachment({
        id: replacingAsset.id,
        subject: selectedSubject,
        originalFileName: replaceFiles[0].name,
      });
      if (!response.success) {
        message.error(response.message);
        return;
      }
      setReplacingAsset(null);
      setReplaceFiles([]);
      message.success(response.message);
      await loadAssets();
    } finally {
      setOperationPending(false);
    }
  };

  const confirmDelete = (asset: AssetItem) => {
    const relationshipTotal =
      asset.mountCount + asset.platformTemplateCount + asset.teacherTaskCount;
    if (relationshipTotal > 0) {
      Modal.warning({
        title: '当前资产不能删除',
        content: (
          <div className="asset-impact-grid">
            <div>
              <strong>{asset.mountCount}</strong>
              <span>资源节点挂载</span>
            </div>
            <div>
              <strong>{asset.platformTemplateCount}</strong>
              <span>平台模板引用</span>
            </div>
            <div>
              <strong>{asset.teacherTaskCount}</strong>
              <span>教师任务引用</span>
            </div>
          </div>
        ),
      });
      return;
    }
    Modal.confirm({
      title: `确认删除“${asset.name}”？`,
      content:
        asset.type === 'studyGuide'
          ? '学案结构与栏目内容将一起删除；引用的知识块本体保留。删除后不进入回收站。'
          : asset.type === 'homework'
          ? '作业资产将被彻底删除；系统不自动解除关系或保留不可用占位。删除后不进入回收站。'
          : '附件及原始文件将一起删除，删除后不进入回收站。',
      okText: '确认删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        const response = await deleteAsset({
          id: asset.id,
          subject: selectedSubject,
        });
        if (!response.success) throw new Error(response.message);
        message.success(response.message);
        await loadAssets();
      },
    });
  };

  const tableColumns = useMemo<ColumnsType<AssetItem>>(
    () => [
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
        width: 280,
        render: (name: string, asset) => {
          const content = (
            <>
              <span className={`asset-type-icon asset-type-${asset.type}`}>
                {asset.type === 'studyGuide' ? (
                  <FileDoneOutlined />
                ) : (
                  <FileTextOutlined />
                )}
              </span>
              <span>
                <strong>{name}</strong>
              </span>
            </>
          );
          if (!['studyGuide', 'homework'].includes(asset.type)) {
            return <div className="asset-name-cell">{content}</div>;
          }
          const href =
            asset.type === 'homework'
              ? `/preparation/asset-center/homework/${asset.id}?subject=${selectedSubject}`
              : `/combination-production/revision/${
                  asset.id
                }?subject=${selectedSubject}&type=studyGuide&view=${
                  asset.status === 'draft' ? 'edit' : 'preview'
                }`;
          return (
            <a
              className="asset-name-cell"
              href={href}
              onClick={(event) => {
                event.preventDefault();
                history.push(href);
              }}
            >
              {content}
            </a>
          );
        },
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 104,
        render: (type: AssetType) => (
          <Tag color={TYPE_COLORS[type]}>{ASSET_TYPE_LABELS[type]}</Tag>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 96,
        render: (status: AssetStatus) => (
          <Tag color={status === 'formal' ? 'green' : 'gold'}>
            {ASSET_STATUS_LABELS[status]}
          </Tag>
        ),
      },
      {
        title: '原文件名',
        dataIndex: 'originalFileName',
        key: 'originalFileName',
        width: 240,
        render: (value?: string) => value || '—',
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 160,
        render: formatDate,
      },
      {
        title: '操作',
        key: 'actions',
        width: 286,
        fixed: 'right',
        render: (_, asset) => {
          if (asset.status === 'draft' && asset.type === 'studyGuide') {
            return (
              <Space size={4}>
                <Button
                  type="link"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  onClick={() =>
                    history.push(
                      `/combination-production/revision/${asset.id}?subject=${selectedSubject}&type=studyGuide&view=edit`,
                    )
                  }
                >
                  继续处理
                </Button>
                <Button
                  type="link"
                  size="small"
                  danger
                  onClick={() => confirmDelete(asset)}
                >
                  删除草稿
                </Button>
              </Space>
            );
          }
          const isAttachment = !['studyGuide', 'homework'].includes(asset.type);
          return (
            <Space size={2}>
              {asset.type === 'studyGuide' && (
                <Button
                  type="link"
                  size="small"
                  onClick={() =>
                    history.push(
                      `/combination-production/revision/${asset.id}?subject=${selectedSubject}&type=studyGuide&view=preview`,
                    )
                  }
                >
                  查看学案
                </Button>
              )}
              {asset.type === 'homework' && (
                <>
                  <Button
                    type="link"
                    size="small"
                    onClick={() =>
                      history.push(
                        `/preparation/asset-center/homework/${asset.id}?subject=${selectedSubject}`,
                      )
                    }
                  >
                    查看作业
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() =>
                      history.push(
                        `/preparation/asset-center/homework/${asset.id}/edit?subject=${selectedSubject}`,
                      )
                    }
                  >
                    编辑作业
                  </Button>
                </>
              )}
              {asset.type !== 'homework' && (
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openRename(asset)}
                >
                  改名
                </Button>
              )}
              {isAttachment && (
                <Button
                  type="link"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setReplacingAsset(asset);
                    setReplaceFiles([]);
                  }}
                >
                  替换文件
                </Button>
              )}
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => confirmDelete(asset)}
              >
                删除
              </Button>
            </Space>
          );
        },
      },
    ],
    [selectedSubject],
  );

  return (
    <PageContainer
      title="资产中心"
      subTitle="管理当前学科的学案、作业与附件资产"
      className="asset-center-page"
    >
      <Card variant="borderless" className="asset-center-card">
        <div className="asset-center-topbar">
          <div className="asset-subject-context">
            <span>当前学科</span>
            <Select
              value={selectedSubject}
              options={SUBJECT_OPTIONS}
              onChange={changeSubject}
              aria-label="选择资产学科"
            />
            <small>创建或上传时锁定当前学科，资产创建后不可修改</small>
          </div>
          <Space wrap>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={openUpload}
            >
              上传附件
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={() =>
                history.push(
                  `/combination-production/new?subject=${selectedSubject}&type=studyGuide`,
                )
              }
            >
              新建学案
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={() =>
                history.push(
                  `/preparation/asset-center/homework/new?subject=${selectedSubject}`,
                )
              }
            >
              新建作业
            </Button>
          </Space>
        </div>

        <div className="asset-filterbar">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            name="assetKeyword"
            autoComplete="off"
            aria-label="搜索资产名称或原文件名"
            placeholder="搜索名称或原文件名…"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Select
            value={typeFilter}
            options={TYPE_FILTER_OPTIONS}
            onChange={changeTypeFilter}
            aria-label="筛选资产类型"
          />
          <Select
            value={statusFilter}
            options={
              typeFilter === 'homework'
                ? STATUS_FILTER_OPTIONS.filter(
                    (option) => option.value !== 'draft',
                  )
                : STATUS_FILTER_OPTIONS
            }
            onChange={setStatusFilter}
            aria-label="筛选资产状态"
          />
          <Button
            onClick={resetFilters}
            disabled={!keyword && !typeFilter && !statusFilter}
          >
            重置
          </Button>
        </div>

        {loadError ? (
          <Empty description={loadError}>
            <Button onClick={() => void loadAssets()}>重新加载</Button>
          </Empty>
        ) : (
          <Table<AssetItem>
            rowKey="id"
            columns={tableColumns}
            dataSource={assets}
            loading={loading}
            scroll={{ x: 1180 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showTotal: (total) => `共 ${total} 项资产`,
            }}
            locale={{ emptyText: '当前条件下暂无资产' }}
          />
        )}
      </Card>

      <Modal
        title="上传附件"
        open={uploadOpen}
        onCancel={() => setUploadOpen(false)}
        onOk={submitUpload}
        okText="保存为正式附件"
        confirmLoading={uploading}
        width={680}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          message={`学科已锁定：${
            SUBJECT_OPTIONS.find((item) => item.value === selectedSubject)
              ?.label
          }`}
          description="系统根据扩展名自动识别 Word、PPT、音频或视频，不提供手动修改类型；附件不会转换为学案。"
        />
        <Form form={uploadForm} layout="vertical" className="asset-upload-form">
          <Form.Item
            name="fileList"
            label="选择文件"
            valuePropName="fileList"
            getValueFromEvent={normalizeUpload}
            rules={[{ required: true, message: '请选择一个文件' }]}
            extra="支持 .docx、.ppt、.pptx、.mp3、.wav、.mp4；文件大小上限以系统配置为准"
          >
            <Upload.Dragger
              accept={ATTACHMENT_ACCEPT}
              maxCount={1}
              multiple={false}
              beforeUpload={handleFileSelected}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖入一个文件</p>
            </Upload.Dragger>
          </Form.Item>
          <Form.Item
            name="name"
            label="资产名称"
            rules={[
              { required: true, whitespace: true, message: '请输入资产名称' },
            ]}
            extra="默认取文件名去除扩展名，保存前可修改"
          >
            <Input placeholder="选择文件后自动带入…" maxLength={60} showCount />
          </Form.Item>
          {selectedUploadFile &&
            !getAttachmentType(selectedUploadFile.name) && (
              <Alert type="error" showIcon message="不支持该附件格式" />
            )}
        </Form>
      </Modal>

      <Modal
        title="修改资产名称"
        open={Boolean(editingAsset)}
        onCancel={() => setEditingAsset(null)}
        onOk={submitRename}
        confirmLoading={operationPending}
        okText="保存名称"
        destroyOnClose
      >
        {editingAsset && (
          <Alert
            type="info"
            showIcon
            message={`学科和资产类型不可修改：${
              ASSET_TYPE_LABELS[editingAsset.type]
            }`}
          />
        )}
        <Form form={renameForm} layout="vertical" className="asset-upload-form">
          <Form.Item
            name="name"
            label="资产名称"
            rules={[
              { required: true, whitespace: true, message: '请输入资产名称' },
            ]}
          >
            <Input maxLength={60} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="替换附件文件"
        open={Boolean(replacingAsset)}
        onCancel={() => setReplacingAsset(null)}
        onOk={submitReplace}
        okText="确认替换"
        confirmLoading={operationPending}
        okButtonProps={{ disabled: !replaceFiles.length }}
        destroyOnClose
      >
        {replacingAsset && (
          <>
            <Alert
              type={
                replacingAsset.mountCount +
                replacingAsset.platformTemplateCount +
                replacingAsset.teacherTaskCount
                  ? 'warning'
                  : 'info'
              }
              showIcon
              message="替换后资产 ID、名称、学科和现有关系保持不变"
              description={`将影响 ${replacingAsset.mountCount} 个挂载、${replacingAsset.platformTemplateCount} 个平台模板、${replacingAsset.teacherTaskCount} 个教师任务。只能选择同类型文件。`}
            />
            <Upload.Dragger
              accept={REPLACEMENT_ACCEPT[replacingAsset.type]}
              fileList={replaceFiles}
              maxCount={1}
              multiple={false}
              beforeUpload={(file) => {
                setReplaceFiles([file]);
                return false;
              }}
              onRemove={() => setReplaceFiles([])}
            >
              <p className="ant-upload-drag-icon">
                <ReloadOutlined />
              </p>
              <p className="ant-upload-text">选择同类型的新文件</p>
            </Upload.Dragger>
          </>
        )}
      </Modal>
    </PageContainer>
  );
};

export default AssetCenterPage;
