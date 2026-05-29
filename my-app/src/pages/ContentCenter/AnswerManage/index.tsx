import { ModalForm, PageContainer, ProFormTreeSelect } from '@ant-design/pro-components';
import { useSearchParams } from '@umijs/max';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Image,
  Modal,
  Row,
  Switch,
  message,
} from 'antd';
import type { AnswerItem, DirectoryItem } from './components/types';
import React, { useMemo, useState } from 'react';
import AnswerTable from './components/AnswerTable';
import DirectoryPanel, {
  ALL_DIRECTORY_KEY,
  UNASSIGNED_DIRECTORY_KEY,
  buildTreeData,
} from './components/DirectoryPanel';
import VideoConfigDrawer from './components/VideoConfigDrawer';

const AnswerManage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('productId');
  const subjectName = searchParams.get('subjectName');

  // Hardcoded Mock Data for Header
  const mockInfo = {
    productId: productId || '46',
    productName: '晋文源九年级考试-名师精讲',
    subjectName: subjectName || '语文',
  };

  const [directoryMode, setDirectoryMode] = useState<'disabled' | 'required'>(
    'disabled',
  );
  const isDirectoryEnabled = directoryMode === 'required';
  const [moveModalVisible, setMoveModalVisible] = useState(false);

  const [selectedDirectoryKey, setSelectedDirectoryKey] =
    useState<string>(ALL_DIRECTORY_KEY);

  // Configuration State
  const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);
  const [videoConfigVisible, setVideoConfigVisible] = useState(false);
  const [currentQrCodeItem, setCurrentQrCodeItem] = useState<{
    name: string;
    qrCodeUrl?: string;
  }>();
  const [currentVideoItem, setCurrentVideoItem] = useState<AnswerItem>();

  // Mock Data State
  const [directoryList, setDirectoryList] = useState<DirectoryItem[]>([
    {
      id: '1',
      name: '第一章',
      sort: 1,
      createTime: '2025-12-21',
      qrCodeUrl:
        'https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg',
    },
    {
      id: '1-1',
      name: '第一节',
      parentId: '1',
      sort: 1,
      createTime: '2025-12-21',
      qrCodeUrl:
        'https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg',
    },
    {
      id: '2',
      name: '第二章',
      sort: 2,
      createTime: '2025-12-21',
      qrCodeUrl:
        'https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg',
    },
  ]);

  const [answerList, setAnswerList] = useState<AnswerItem[]>([
    {
      id: '101',
      name: '语文试卷A.pdf',
      type: 'PDF',
      answerType: 'file',
      size: '2.5MB',
      directoryId: '1-1',
      updateTime: '2025-12-21 10:00:00',
      allowDownload: true,
      sort: 1,
    },
    {
      id: '102',
      name: '语文听力.mp3',
      type: 'MP3',
      answerType: 'audio',
      size: '5MB',
      directoryId: null,
      updateTime: '2025-12-21 10:05:00',
      qrCodeUrl:
        'https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg',
      sort: 2,
    },
    {
      id: '103',
      name: '参考答案.doc',
      type: 'DOC',
      answerType: 'file',
      size: '1.2MB',
      directoryId: null,
      updateTime: '2025-12-21 10:10:00',
      allowDownload: false,
      sort: 3,
    },
    {
      id: '104',
      name: '名师讲解.mp4',
      type: 'MP4',
      answerType: 'video',
      size: '500MB',
      directoryId: '1-1',
      updateTime: '2025-12-21 12:00:00',
      videoSummary: [
        {
          id: 'vs1',
          startTime: '00:00:00',
          endTime: '00:03:37',
          content: '太行一号旅游公路圆弧段弧长计算详解',
        },
        {
          id: 'vs2',
          startTime: '00:03:38',
          endTime: '00:10:00',
          content: '圆弧段弧长计算公式推导',
        },
      ],
      qrCodeUrl:
        'https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg',
      questions: [
        {
          id: 'q1',
          time: '00:05:00',
          title: '这个知识点懂了吗？',
          optionA: '懂了',
          optionB: '不懂',
          optionC: '有点懂',
          optionD: '完全不懂',
          correctAnswer: 'A',
          analysis: '解析内容...',
        },
        {
          id: 'q2',
          time: '00:10:30',
          title: '请回答下列问题...',
          optionA: '选项A内容',
          optionB: '选项B内容',
          optionC: '选项C内容',
          optionD: '选项D内容',
          correctAnswer: 'B',
          analysis: '解析内容...',
        },
      ],
      sort: 4,
    },
  ]);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const handleDirectoryModeChange = (checked: boolean) => {
    setDirectoryMode(checked ? 'required' : 'disabled');
    if (checked) {
      setSelectedDirectoryKey(UNASSIGNED_DIRECTORY_KEY);

      const unassignedCount = answerList.filter(
        (item) => !item.directoryId,
      ).length;
      if (unassignedCount > 0) {
        Modal.info({
          title: '目录模式已开启',
          content: `现有 ${unassignedCount} 个文件未关联目录，已自动归入"未归类"中。您可以在该分类下进行查看或批量移动。`,
          okText: '知道了',
        });
      }
    } else {
      setSelectedDirectoryKey(ALL_DIRECTORY_KEY);
    }
  };

  const filteredAnswerList = useMemo(() => {
    if (!isDirectoryEnabled || selectedDirectoryKey === ALL_DIRECTORY_KEY) {
      return answerList;
    }
    if (selectedDirectoryKey === UNASSIGNED_DIRECTORY_KEY) {
      return answerList.filter((item) => !item.directoryId);
    }
    return answerList.filter(
      (item) => item.directoryId === selectedDirectoryKey,
    );
  }, [answerList, isDirectoryEnabled, selectedDirectoryKey]);

  const handleDirectoryListChangeWithCleanup = (
    updater: (prev: DirectoryItem[]) => DirectoryItem[],
  ) => {
    setDirectoryList((prev) => {
      const newList = updater(prev);
      const removedIds = prev
        .filter((d) => !newList.some((n) => n.id === d.id))
        .map((d) => d.id);
      if (removedIds.length > 0) {
        setAnswerList((prevAnswers) =>
          prevAnswers.map((item) => {
            if (item.directoryId && removedIds.includes(item.directoryId)) {
              return { ...item, directoryId: null };
            }
            return item;
          }),
        );
      }
      return newList;
    });
  };

  const handleQrCodeOpen = (
    item: { name: string; qrCodeUrl?: string },
  ) => {
    setCurrentQrCodeItem(item);
    setQrCodeModalVisible(true);
  };

  const handleVideoConfigOpen = (item: AnswerItem) => {
    setCurrentVideoItem(item);
    setVideoConfigVisible(true);
  };

  return (
    <PageContainer>
      {/* Header Info */}
      <Card style={{ marginBottom: 24 }}>
        <Descriptions>
          <Descriptions.Item label="产品ID">
            {mockInfo.productId}
          </Descriptions.Item>
          <Descriptions.Item label="产品名称">
            {mockInfo.productName}
          </Descriptions.Item>
          <Descriptions.Item label="科目名称">
            {mockInfo.subjectName}
          </Descriptions.Item>
          <Descriptions.Item label="目录模式">
            <Switch
              checked={isDirectoryEnabled}
              onChange={handleDirectoryModeChange}
              checkedChildren="开启"
              unCheckedChildren="关闭"
            />
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Answer List Table */}
      {isDirectoryEnabled ? (
        <Row gutter={16} align="top">
          <Col xs={24} md={6} lg={5}>
            <DirectoryPanel
              directoryList={directoryList}
              onDirectoryListChange={handleDirectoryListChangeWithCleanup}
              selectedDirectoryKey={selectedDirectoryKey}
              onSelectedDirectoryKeyChange={(key) => {
                setSelectedDirectoryKey(key);
                setSelectedRowKeys([]);
              }}
              onQrCodeOpen={handleQrCodeOpen}
            />
          </Col>
          <Col xs={24} md={18} lg={19}>
            <AnswerTable
              answerList={filteredAnswerList}
              onAnswerListChange={setAnswerList}
              directoryList={directoryList}
              isDirectoryEnabled={isDirectoryEnabled}
              selectedRowKeys={selectedRowKeys}
              onSelectedRowKeysChange={setSelectedRowKeys}
              onQrCodeOpen={handleQrCodeOpen}
              onVideoConfigOpen={handleVideoConfigOpen}
              onMoveModalOpen={() => setMoveModalVisible(true)}
            />
          </Col>
        </Row>
      ) : (
        <AnswerTable
          answerList={answerList}
          onAnswerListChange={setAnswerList}
          directoryList={directoryList}
          isDirectoryEnabled={isDirectoryEnabled}
          selectedRowKeys={selectedRowKeys}
          onSelectedRowKeysChange={setSelectedRowKeys}
          onQrCodeOpen={handleQrCodeOpen}
          onVideoConfigOpen={handleVideoConfigOpen}
          onMoveModalOpen={() => setMoveModalVisible(true)}
        />
      )}

      {/* Move Answer Modal */}
      {isDirectoryEnabled && (
        <ModalForm
          title="批量移动"
          width={500}
          open={moveModalVisible}
          onOpenChange={setMoveModalVisible}
          onFinish={async (values) => {
            const targetDirId = values.targetDirectoryId;
            setAnswerList((prev) =>
              prev.map((item) =>
                selectedRowKeys.includes(item.id)
                  ? { ...item, directoryId: targetDirId }
                  : item,
              ),
            );
            message.success('移动成功');
            setSelectedRowKeys([]);
            return true;
          }}
        >
          <ProFormTreeSelect
            name="targetDirectoryId"
            label="移动到"
            placeholder="请选择目标目录"
            fieldProps={{
              treeData: buildTreeData(directoryList, true),
              showSearch: true,
              treeDefaultExpandAll: true,
            }}
            rules={[{ required: true, message: '请选择目标目录' }]}
          />
        </ModalForm>
      )}

      {/* QR Code Modal */}
      <Modal
        title="二维码"
        open={qrCodeModalVisible}
        onCancel={() => setQrCodeModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setQrCodeModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="download"
            type="primary"
            onClick={() => message.success('二维码已下载')}
          >
            下载二维码
          </Button>,
        ]}
      >
        <div style={{ textAlign: 'center' }}>
          <p>名称：{currentQrCodeItem?.name}</p>
          <Image
            width={200}
            src={currentQrCodeItem?.qrCodeUrl}
            fallback="https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg"
            preview={false}
          />
          <p style={{ marginTop: 10, color: '#999' }}>扫描二维码查看内容</p>
        </div>
      </Modal>

      {/* Video Configuration Drawer */}
      <VideoConfigDrawer
        open={videoConfigVisible}
        onOpenChange={setVideoConfigVisible}
        currentVideoItem={currentVideoItem}
        onAnswerListChange={setAnswerList}
      />
    </PageContainer>
  );
};

export default AnswerManage;
