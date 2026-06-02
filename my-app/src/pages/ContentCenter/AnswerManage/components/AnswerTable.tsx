import {
  DownloadOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  DragSortTable,
  ModalForm,
  ProFormDependency,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTreeSelect,
  ProFormUploadButton,
} from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Form, Space, Tag, message } from 'antd';
import React, { useMemo, useState } from 'react';
import type { AnswerItem, DirectoryItem } from './types';
import { buildTreeData } from './DirectoryPanel';

const uploadTypeConfig = {
  file: {
    label: '答案文件',
    accept: '.pdf,.doc,.docx,.ppt,.pptx',
    title: '文件大小不能超过10M，仅支持PDF、DOC、DOCX、PPT、PPTX等格式。',
    typeTag: 'FILE',
  },
  image: {
    label: '答案图片',
    accept: '.jpg,.jpeg,.png',
    title: '单张图片大小不能超过10M，仅支持JPG、JPEG、PNG等格式。',
    typeTag: 'IMAGE',
  },
  video: {
    label: '答案视频',
    accept: '.mp4',
    title: '视频文件大小不能超过1G，仅支持MP4格式，MPEG-4编码格式',
    typeTag: 'VIDEO',
  },
  audio: {
    label: '答案音频',
    accept: '.mp3',
    title: '音频大小不能超过500M，仅支持MP3格式。',
    typeTag: 'AUDIO',
  },
  archive: {
    label: '答案压缩文档',
    accept: '.zip,.rar',
    title: '文件大小不能超过100M，仅支持ZIP、RAR格式。',
    typeTag: 'ARCHIVE',
  },
} as const;

const downloadMockFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

interface AnswerTableProps {
  answerList: AnswerItem[];
  onAnswerListChange: (updater: AnswerItem[] | ((prev: AnswerItem[]) => AnswerItem[])) => void;
  directoryList: DirectoryItem[];
  isDirectoryEnabled: boolean;
  selectedRowKeys: React.Key[];
  onSelectedRowKeysChange: (keys: React.Key[]) => void;
  onQrCodeOpen: (item: AnswerItem) => void;
  onVideoConfigOpen: (item: AnswerItem) => void;
  onMoveModalOpen: () => void;
}

const AnswerTable: React.FC<AnswerTableProps> = ({
  answerList,
  onAnswerListChange,
  directoryList,
  isDirectoryEnabled,
  selectedRowKeys,
  onSelectedRowKeysChange,
  onQrCodeOpen,
  onVideoConfigOpen,
  onMoveModalOpen,
}) => {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [currentEditingItem, setCurrentEditingItem] = useState<AnswerItem>();
  const [form] = Form.useForm();

  const answerColumns = useMemo(() => {
    const columns: ProColumns<AnswerItem>[] = [
      { title: '排序', dataIndex: 'sort', width: 60 },
      { title: '文件名称', dataIndex: 'name' },
      {
        title: '答案类型',
        dataIndex: 'answerType',
        valueEnum: {
          file: { text: '答案文件' },
          image: { text: '答案图片' },
          video: { text: '答案视频' },
          audio: { text: '答案音频' },
          archive: { text: '答案压缩文档' },
        },
        render: (dom: React.ReactNode, record: AnswerItem) => {
          return (
            <Space>
              {dom}
              {record.answerType === 'file' &&
                (record.allowDownload ? (
                  <Tag color="success">可下载</Tag>
                ) : (
                  <Tag color="default">不可下载</Tag>
                ))}
            </Space>
          );
        },
      },
      {
        title: '文件类型',
        dataIndex: 'type',
        render: (text: string) => <Tag>{text}</Tag>,
      },
      { title: '大小', dataIndex: 'size' },
      { title: '更新时间', dataIndex: 'updateTime' },
      {
        title: '操作',
        valueType: 'option',
        render: (_text: React.ReactNode, record: AnswerItem) => [
          <a
            key="edit"
            onClick={() => {
              setCurrentEditingItem(record);
              form.setFieldsValue({
                ...record,
                title: record.name.replace(/\.[^/.]+$/, ''),
                answerUpload: [
                  {
                    uid: '-1',
                    name: record.name,
                    status: 'done',
                    url: '',
                  },
                ],
              });
              setCreateModalVisible(true);
            }}
          >
            编辑
          </a>,
          <a
            key="delete"
            onClick={() => {
              onAnswerListChange((prev: AnswerItem[]) =>
                prev.filter((item) => item.id !== record.id),
              );
              message.success('删除成功');
            }}
          >
            删除
          </a>,
          (record.answerType === 'audio' || record.answerType === 'video') && (
            <a
              key="qrcode"
              onClick={() => {
                onQrCodeOpen(record);
              }}
            >
              二维码
            </a>
          ),
          record.answerType === 'video' && (
            <a
              key="config"
              onClick={() => {
                onVideoConfigOpen(record);
              }}
            >
              配置
            </a>
          ),
        ],
      },
    ];
    if (isDirectoryEnabled) {
      columns.splice(4, 0, {
        title: '所属目录',
        dataIndex: 'directoryId',
        render: (_dom: React.ReactNode, record: AnswerItem) => {
          const dir = directoryList.find((d) => d.id === record.directoryId);
          return dir ? dir.name : <span style={{ color: '#999' }}>无目录</span>;
        },
      });
    }
    return columns;
  }, [directoryList, isDirectoryEnabled]);

  const handleDragSortEnd = (
    _beforeIndex: number,
    _afterIndex: number,
    newDataSource: AnswerItem[],
  ) => {
    onAnswerListChange(newDataSource);
    message.success('排序已更新');
  };

  const handleBatchDownload = () => {
    const resourceQRs = answerList.filter((item) => !!item.qrCodeUrl);
    const totalCount = resourceQRs.length;

    if (totalCount === 0) {
      message.warning('当前范围内没有可下载的二维码');
      return;
    }

    const loadingMsg = `正在打包下载 ${resourceQRs.length} 个资源二维码...`;

    message.loading(loadingMsg, 1.5).then(() => {
      const content = `Mock Download Manifest\n\nResources:\n${resourceQRs
        .map((r) => `- ${r.name}`)
        .join('\n')}`;
      downloadMockFile(`qrcode_package_${Date.now()}.txt`, content);
      message.success('下载完成 (模拟文件已生成)');
    });
  };

  const toolbarButtons = [
    <Button
      key="download"
      icon={<DownloadOutlined />}
      onClick={handleBatchDownload}
    >
      二维码下载
    </Button>,
    <Button
      key="create"
      type="primary"
      onClick={() => {
        setCurrentEditingItem(undefined);
        form.resetFields();
        setCreateModalVisible(true);
      }}
      icon={<PlusOutlined />}
    >
      新增答案
    </Button>,
  ];

  const tableAlertRender = ({ selectedRowKeys: keys, onCleanSelected }: any) => (
    <Space size={24}>
      <span>已选 {keys.length} 项</span>
      <a onClick={onCleanSelected}>取消选择</a>
    </Space>
  );

  const tableAlertOptionRender = () => (
    <Space size={16}>
      <a onClick={() => onMoveModalOpen()}>批量移动</a>
    </Space>
  );

  return (
    <>
      <DragSortTable<AnswerItem>
        headerTitle="答案列表"
        rowKey="id"
        dataSource={answerList}
        search={false}
        options={false}
        toolBarRender={() => toolbarButtons}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => onSelectedRowKeysChange(keys),
        }}
        tableAlertRender={isDirectoryEnabled ? tableAlertRender : undefined}
        tableAlertOptionRender={isDirectoryEnabled ? tableAlertOptionRender : undefined}
        columns={answerColumns}
        dragSortKey="sort"
        onDragSortEnd={handleDragSortEnd}
      />

      {/* Create/Edit Answer Modal */}
      <ModalForm
        title={currentEditingItem ? '编辑答案' : '新增答案'}
        width={800}
        open={createModalVisible}
        onOpenChange={setCreateModalVisible}
        form={form}
        layout="horizontal"
        labelCol={{ flex: '120px' }}
        onFinish={async (values) => {

          const mockQrCodeUrl =
            'https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg';

          if (currentEditingItem) {
            // Edit Mode
            onAnswerListChange((prev: AnswerItem[]) =>
              prev.map((item) => {
                if (item.id === currentEditingItem.id) {
                  return {
                    ...item,
                    name:
                      values.title +
                      (item.type ? `.${item.type.toLowerCase()}` : ''),
                    directoryId: isDirectoryEnabled
                      ? values.directoryId || null
                      : null,
                    allowDownload: values.allowDownload,
                    answerType: values.answerType,
                    qrCodeUrl:
                      values.answerType === 'audio' ||
                      values.answerType === 'video'
                        ? item.qrCodeUrl || mockQrCodeUrl
                        : undefined,
                  };
                }
                return item;
              }),
            );
            message.success('修改成功');
          } else {
            // Create Mode
            const newId = Date.now().toString();
            const selectedType = (values.answerType ||
              'file') as keyof typeof uploadTypeConfig;
            const typeConfig =
              uploadTypeConfig[selectedType] || uploadTypeConfig.file;
            const directoryId = isDirectoryEnabled
              ? values.directoryId || null
              : null;
            const fileName =
              values.title || `New Uploaded ${typeConfig.typeTag} File`;

            const newItem: AnswerItem = {
              id: newId,
              name: fileName,
              type: typeConfig.typeTag,
              answerType: selectedType,
              size: '1.5MB',
              directoryId,
              allowDownload: values.allowDownload,
              qrCodeUrl:
                selectedType === 'audio' || selectedType === 'video'
                  ? mockQrCodeUrl
                  : undefined,
              updateTime: (() => {
                const now = new Date();
                const YYYY = now.getFullYear();
                const MM = String(now.getMonth() + 1).padStart(2, '0');
                const DD = String(now.getDate()).padStart(2, '0');
                const HH = String(now.getHours()).padStart(2, '0');
                const mm = String(now.getMinutes()).padStart(2, '0');
                const ss = String(now.getSeconds()).padStart(2, '0');
                return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
              })(),
              sort: answerList.length + 1,
            };

            onAnswerListChange((prev: AnswerItem[]) => [...prev, newItem]);
            message.success('上传成功');
          }
          return true;
        }}
      >
        {isDirectoryEnabled && (
          <ProFormTreeSelect
            name="directoryId"
            label="所属目录"
            placeholder="请选择目录"
            fieldProps={{
              treeData: buildTreeData(directoryList, true),
              showSearch: true,
              treeDefaultExpandAll: true,
            }}
            rules={[{ required: true, message: '请选择所属目录' }]}
            width="md"
          />
        )}

        <ProFormSelect
          name="answerType"
          label="答案类型"
          width="md"
          initialValue="file"
          rules={[{ required: true, message: '请选择答案类型' }]}
          options={[
            { label: '答案文件', value: 'file' },
            { label: '答案图片', value: 'image' },
            { label: '答案视频', value: 'video' },
            { label: '答案音频', value: 'audio' },
            { label: '答案压缩文档', value: 'archive' },
          ]}
        />

        <ProFormText
          name="title"
          label="标题"
          width="md"
          placeholder="请输入标题"
          rules={[{ required: true, message: '请输入标题' }]}
        />

        <ProFormDependency name={['answerType']}>
          {({ answerType }) => {
            return answerType === 'file' || !answerType ? (
              <ProFormSwitch
                name="allowDownload"
                label="允许下载"
                initialValue={true}
              />
            ) : null;
          }}
        </ProFormDependency>

        <ProFormDependency name={['answerType']}>
          {({ answerType }) => {
            const typeKey = (answerType ||
              'file') as keyof typeof uploadTypeConfig;
            const typeConfig =
              uploadTypeConfig[typeKey] || uploadTypeConfig.file;
            return (
              <>
                <ProFormUploadButton
                  label={typeConfig.label}
                  name="answerUpload"
                  max={1}
                  rules={[{ required: true, message: '请上传文件' }]}
                  fieldProps={{
                    name: 'file',
                    multiple: false,
                    accept: typeConfig.accept,
                    onChange: (info) => {
                      if (
                        info.file.status === 'done' ||
                        info.fileList.length > 0
                      ) {
                        const file = info.fileList[0];
                        if (file && file.name) {
                          const fileNameWithoutExt = file.name.replace(
                            /\.[^/.]+$/,
                            '',
                          );
                          form.setFieldValue('title', fileNameWithoutExt);
                        }
                      }
                    },
                  }}
                  title={typeConfig.title}
                />
                {answerType === 'video' && (
                  <ProFormUploadButton
                    label="视频图片"
                    name="videoCover"
                    max={1}
                    rules={[{ required: true, message: '请上传视频图片' }]}
                    fieldProps={{
                      name: 'file',
                      multiple: false,
                      accept: '.jpg,.jpeg,.png',
                    }}
                    title="图片大小不能超过2MB，建议304*172"
                  />
                )}
              </>
            );
          }}
        </ProFormDependency>
      </ModalForm>
    </>
  );
};

export default AnswerTable;
