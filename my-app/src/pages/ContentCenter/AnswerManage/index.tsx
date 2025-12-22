import {
    ProFormDependency,
    ProFormSelect,
    ProFormTreeSelect,
    ProTable,
    ModalForm,
    ProFormUploadButton,
    PageContainer,
    ProFormText,
    ProFormSwitch,
    DrawerForm,
    ProFormTextArea,
    EditableProTable,
    ProFormTimePicker,
} from '@ant-design/pro-components';
import { Card, Space, message, Button, Descriptions, Modal, Switch, Tag, Row, Col, Tree, Image } from 'antd';
import React, { useMemo, useState } from 'react';
import { useSearchParams } from '@umijs/max';
import { PlusOutlined } from '@ant-design/icons';
import { Form } from 'antd';

const AnswerManage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const productId = searchParams.get('productId');
    const subjectId = searchParams.get('subjectId');
    const subjectName = searchParams.get('subjectName');

    // Hardcoded Mock Data for Header
    const mockInfo = {
        productId: productId || '46',
        productName: '晋文源九年级考试-名师精讲',
        subjectName: subjectName || '语文',
    };

    // Types
    type DirectoryItem = {
        id: string;
        name: string;
        parentId?: string;
        sort: number;
        createTime: string;
    };

    type QuestionItem = {
        id: string;
        time: string;
        title: string;
        optionA: string;
        optionB: string;
        optionC: string;
        optionD: string;
        correctAnswer: string;
        analysis: string;
    };

    type AnswerItem = {
        id: string;
        name: string;
        type: string;
        answerType: string;
        size: string;
        directoryId: string | null;
        updateTime: string;
        allowDownload?: boolean;
        videoSummary?: string;
        questions?: QuestionItem[];
        qrCodeUrl?: string;
    };

    const [directoryMode, setDirectoryMode] = useState<'disabled' | 'required'>('disabled');
    const isDirectoryEnabled = directoryMode === 'required';
    const [createModalVisible, setCreateModalVisible] = useState(false); // Create Answer Modal
    const [moveModalVisible, setMoveModalVisible] = useState(false); // Move Answer Modal
    const ALL_DIRECTORY_KEY = '__all__';
    const UNASSIGNED_DIRECTORY_KEY = '__unassigned__';
    const [selectedDirectoryKey, setSelectedDirectoryKey] = useState<string>(ALL_DIRECTORY_KEY);
    const [form] = Form.useForm();

    // Configuration State
    const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);
    const [videoConfigVisible, setVideoConfigVisible] = useState(false);
    const [currentQrCodeItem, setCurrentQrCodeItem] = useState<AnswerItem>();
    const [currentVideoItem, setCurrentVideoItem] = useState<AnswerItem>();
    const [currentEditingItem, setCurrentEditingItem] = useState<AnswerItem>();

    // Question Management State
    const [questionModalVisible, setQuestionModalVisible] = useState(false);
    const [currentEditingQuestion, setCurrentEditingQuestion] = useState<QuestionItem>();
    const [questionForm] = Form.useForm();

    // Mock Data State
    const [directoryList] = useState<DirectoryItem[]>([
        { id: '1', name: '第一章', sort: 1, createTime: '2025-12-21' },
        { id: '1-1', name: '第一节', parentId: '1', sort: 1, createTime: '2025-12-21' },
        { id: '1-1-1', name: '知识点 1.1.1', parentId: '1-1', sort: 1, createTime: '2025-12-21' },
        { id: '2', name: '第二章', sort: 2, createTime: '2025-12-21' },
    ]);

    const [answerList, setAnswerList] = useState<AnswerItem[]>([
        { id: '101', name: '语文试卷A.pdf', type: 'PDF', answerType: 'file', size: '2.5MB', directoryId: '1-1', updateTime: '2025-12-21 10:00:00', allowDownload: true },
        { id: '102', name: '语文听力.mp3', type: 'MP3', answerType: 'audio', size: '5MB', directoryId: null, updateTime: '2025-12-21 10:05:00', qrCodeUrl: 'https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg' },
        { id: '103', name: '参考答案.doc', type: 'DOC', answerType: 'file', size: '1.2MB', directoryId: null, updateTime: '2025-12-21 10:10:00', allowDownload: false },
        {
            id: '104', name: '名师讲解.mp4', type: 'MP4', answerType: 'video', size: '500MB', directoryId: '1-1-1', updateTime: '2025-12-21 12:00:00',
            videoSummary: '本视频详细讲解了第一章的重点难点。',
            qrCodeUrl: 'https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg',
            questions: [
                {
                    id: 'q1', time: '00:05:00', title: '这个知识点懂了吗？',
                    optionA: '懂了', optionB: '不懂', optionC: '有点懂', optionD: '完全不懂',
                    correctAnswer: 'A', analysis: '解析内容...'
                },
                {
                    id: 'q2', time: '00:10:30', title: '请回答下列问题...',
                    optionA: '选项A内容', optionB: '选项B内容', optionC: '选项C内容', optionD: '选项D内容',
                    correctAnswer: 'B', analysis: '解析内容...'
                },
            ]
        },
    ]);

    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

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

    const handleDirectoryModeChange = (checked: boolean) => {
        if (checked) {
            const resolvedProductId = productId || mockInfo.productId;
            const resolvedSubjectName = subjectName || mockInfo.subjectName;
            const encodedSubjectName = encodeURIComponent(resolvedSubjectName);
            const unassignedCount = answerList.filter((item) => !item.directoryId).length;
            if (directoryList.length === 0) {
                Modal.confirm({
                    title: '暂无目录，无法开启',
                    content: '请先到目录管理页面新建目录。',
                    okText: '去新建',
                    cancelText: '取消',
                    onOk: () => {
                        window.location.href = `/content/product-list/subject-directory?subjectId=${subjectId || ''}&subjectName=${encodedSubjectName}&productId=${resolvedProductId}`;
                    },
                });
                return;
            }
            if (unassignedCount > 0) {
                const unassignedKeys = answerList
                    .filter((item) => !item.directoryId)
                    .map((item) => item.id);
                Modal.confirm({
                    title: `存在 ${unassignedCount} 条未归类答案`,
                    content: '开启后新上传必须选择目录，建议先批量归类存量答案。',
                    okText: '去批量归类',
                    cancelText: '仍然开启',
                    onOk: () => {
                        setDirectoryMode('required');
                        setSelectedDirectoryKey(ALL_DIRECTORY_KEY);
                        setSelectedRowKeys(unassignedKeys);
                        setMoveModalVisible(true);
                        message.info('请批量选择目标目录完成归类');
                    },
                    onCancel: () => {
                        setDirectoryMode('required');
                        setSelectedDirectoryKey(ALL_DIRECTORY_KEY);
                        setSelectedRowKeys([]);
                        setMoveModalVisible(false);
                        message.info('已开启目录管理，后续上传需选择目录');
                    },
                });
                return;
            }
        }
        setDirectoryMode(checked ? 'required' : 'disabled');
        setSelectedDirectoryKey(ALL_DIRECTORY_KEY);
        setSelectedRowKeys([]);
        setMoveModalVisible(false);
        message.info(checked ? '已开启目录管理，后续上传需选择目录' : '已关闭目录管理');
    };

    // Helper to build tree data from flat list (for TreeSelect)
    const buildTreeData = (list: DirectoryItem[], leafOnly: boolean = false) => {
        const map = new Map<string, any>();
        const roots: any[] = [];
        list.forEach((item) => {
            map.set(item.id, { title: item.name, value: item.id, children: [] });
        });
        list.forEach((item) => {
            const node = map.get(item.id);
            if (item.parentId && map.has(item.parentId)) {
                map.get(item.parentId).children.push(node);
            } else {
                roots.push(node);
            }
        });

        if (leafOnly) {
            const disableParents = (nodes: any[]) => {
                nodes.forEach(node => {
                    if (node.children && node.children.length > 0) {
                        node.selectable = false;
                        disableParents(node.children);
                    }
                });
            };
            disableParents(roots);
        }

        return roots;
    };

    const unassignedCount = useMemo(
        () => answerList.filter((item) => !item.directoryId).length,
        [answerList],
    );
    const directoryTreeData = useMemo(() => {
        const attachKeys = (nodes: any[]): any[] => nodes.map((node) => ({
            ...node,
            key: node.value,
            children: node.children ? attachKeys(node.children) : undefined,
        }));
        return [
            { title: '全部', key: ALL_DIRECTORY_KEY },
            { title: `未归类 (${unassignedCount})`, key: UNASSIGNED_DIRECTORY_KEY },
            ...attachKeys(buildTreeData(directoryList)),
        ];
    }, [ALL_DIRECTORY_KEY, UNASSIGNED_DIRECTORY_KEY, directoryList, unassignedCount]);
    const filteredAnswerList = useMemo(() => {
        if (!isDirectoryEnabled || selectedDirectoryKey === ALL_DIRECTORY_KEY) {
            return answerList;
        }
        if (selectedDirectoryKey === UNASSIGNED_DIRECTORY_KEY) {
            return answerList.filter((item) => !item.directoryId);
        }
        return answerList.filter((item) => item.directoryId === selectedDirectoryKey);
    }, [answerList, isDirectoryEnabled, selectedDirectoryKey, ALL_DIRECTORY_KEY, UNASSIGNED_DIRECTORY_KEY]);

    const answerColumns = useMemo(() => {
        const columns: any[] = [
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
                            {record.answerType === 'file' && (
                                record.allowDownload ?
                                    <Tag color="success">可下载</Tag> :
                                    <Tag color="default">不可下载</Tag>
                            )}
                        </Space>
                    );
                },
            },
            { title: '文件类型', dataIndex: 'type', render: (text: string) => <Tag>{text}</Tag> },
            { title: '大小', dataIndex: 'size' },
            { title: '更新时间', dataIndex: 'updateTime' },
            {
                title: '操作',
                valueType: 'option',
                render: (text: any, record: AnswerItem) => [
                    <a key="edit" onClick={() => {
                        setCurrentEditingItem(record);
                        form.setFieldsValue({
                            ...record,
                            title: record.name.replace(/\.[^/.]+$/, ""), // Remove extension for title
                            answerUpload: [
                                {
                                    uid: '-1',
                                    name: record.name,
                                    status: 'done',
                                    url: '', // Mock URL or empty if not available
                                }
                            ],
                        });
                        setCreateModalVisible(true);
                    }}>编辑</a>,
                    <a key="delete" onClick={() => {
                        setAnswerList((list) => list.filter(item => item.id !== record.id));
                        message.success('删除成功');
                    }}>删除</a>,
                    (record.answerType === 'audio' || record.answerType === 'video') && (
                        <a key="qrcode" onClick={() => {
                            setCurrentQrCodeItem(record);
                            setQrCodeModalVisible(true);
                        }}>二维码</a>
                    ),
                    record.answerType === 'video' && (
                        <a key="config" onClick={() => {
                            setCurrentVideoItem(record);
                            setVideoConfigVisible(true);
                        }}>配置</a>
                    ),
                ],
            },
        ];
        if (isDirectoryEnabled) {
            columns.splice(4, 0, {
                title: '所属目录',
                dataIndex: 'directoryId',
                render: (dom: any, record: AnswerItem) => {
                    const dir = directoryList.find(d => d.id === record.directoryId);
                    return dir ? dir.name : <span style={{ color: '#999' }}>无目录</span>;
                }
            });
        }
        return columns;
    }, [directoryList, isDirectoryEnabled]);

    return (
        <PageContainer>
            {/* Header Info */}
            <Card style={{ marginBottom: 24 }}>
                <Descriptions>
                    <Descriptions.Item label="产品ID">{mockInfo.productId}</Descriptions.Item>
                    <Descriptions.Item label="产品名称">{mockInfo.productName}</Descriptions.Item>
                    <Descriptions.Item label="科目名称">{mockInfo.subjectName}</Descriptions.Item>
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
                        <Card title="目录">
                            <Tree
                                blockNode
                                defaultExpandAll
                                selectedKeys={[selectedDirectoryKey]}
                                treeData={directoryTreeData}
                                onSelect={(keys) => {
                                    const nextKey = (keys[0] as string) || ALL_DIRECTORY_KEY;
                                    setSelectedDirectoryKey(nextKey);
                                    setSelectedRowKeys([]);
                                }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} md={18} lg={19}>
                        <ProTable<AnswerItem>
                            headerTitle="答案列表"
                            rowKey="id"
                            dataSource={filteredAnswerList}
                            search={false}
                            options={false}
                            toolBarRender={() => [
                                <Button key="create" type="primary" onClick={() => {
                                    setCurrentEditingItem(undefined);
                                    form.resetFields();
                                    setCreateModalVisible(true);
                                }} icon={<PlusOutlined />}>
                                    新增答案
                                </Button>,
                            ]}
                            rowSelection={{
                                selectedRowKeys,
                                onChange: (keys) => setSelectedRowKeys(keys),
                            }}
                            tableAlertRender={({ selectedRowKeys, onCleanSelected }) => (
                                <Space size={24}>
                                    <span>已选 {selectedRowKeys.length} 项</span>
                                    <a onClick={onCleanSelected}>取消选择</a>
                                </Space>
                            )}
                            tableAlertOptionRender={() => (
                                <Space size={16}>
                                    <a onClick={() => setMoveModalVisible(true)}>批量移动</a>
                                </Space>
                            )}
                            columns={answerColumns}
                        />
                    </Col>
                </Row>
            ) : (
                <ProTable<AnswerItem>
                    headerTitle="答案列表"
                    rowKey="id"
                    dataSource={answerList}
                    search={false}
                    options={false}
                    toolBarRender={() => [
                        <Button key="create" type="primary" onClick={() => {
                            setCurrentEditingItem(undefined);
                            form.resetFields();
                            setCreateModalVisible(true);
                        }} icon={<PlusOutlined />}>
                            新增答案
                        </Button>,
                    ]}
                    columns={answerColumns}
                />
            )}

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
                    console.log('Form values:', values);

                    const mockQrCodeUrl = 'https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg';

                    if (currentEditingItem) {
                        // Edit Mode
                        setAnswerList(prev => prev.map(item => {
                            if (item.id === currentEditingItem.id) {
                                return {
                                    ...item,
                                    name: values.title + (item.type ? `.${item.type.toLowerCase()}` : ''), // Reconstruct name
                                    directoryId: isDirectoryEnabled ? (values.directoryId || null) : null,
                                    allowDownload: values.allowDownload,
                                    answerType: values.answerType,
                                    qrCodeUrl: (values.answerType === 'audio' || values.answerType === 'video') ? (item.qrCodeUrl || mockQrCodeUrl) : undefined,
                                    // In real app, handle file re-upload if needed
                                };
                            }
                            return item;
                        }));
                        message.success('修改成功');
                    } else {
                        // Create Mode
                        const newId = (Math.random() * 1000).toFixed(0);
                        // Mock adding files
                        const newFiles = [];
                        // Simple logic to mock adding entries based on upload inputs
                        // In real app, we parse values.file or answerFile list
                        const selectedType = (values.answerType || 'file') as keyof typeof uploadTypeConfig;
                        const typeConfig = uploadTypeConfig[selectedType] || uploadTypeConfig.file;
                        const directoryId = isDirectoryEnabled ? (values.directoryId || null) : null;
                        const fileName = values.title || `New Uploaded ${typeConfig.typeTag} File`;
                        newFiles.push({
                            id: newId,
                            name: fileName, // Mock file name
                            type: typeConfig.typeTag,
                            answerType: selectedType,
                            size: '1.5MB',
                            directoryId,
                            allowDownload: values.allowDownload,
                            qrCodeUrl: (selectedType === 'audio' || selectedType === 'video') ? mockQrCodeUrl : undefined,
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
                        });
                        setAnswerList([...answerList, ...newFiles]);
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
                        return (answerType === 'file' || !answerType) ? (
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
                        const typeKey = (answerType || 'file') as keyof typeof uploadTypeConfig;
                        const typeConfig = uploadTypeConfig[typeKey] || uploadTypeConfig.file;
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
                                            if (info.file.status === 'done' || info.fileList.length > 0) {
                                                const file = info.fileList[0];
                                                if (file && file.name) {
                                                    // Remove extension for title
                                                    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                                                    form.setFieldValue('title', fileNameWithoutExt);
                                                }
                                            }
                                        }
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

            {/* Move Answer Modal */}
            {isDirectoryEnabled && (
                <ModalForm
                    title="批量移动"
                    width={500}
                    open={moveModalVisible}
                    onOpenChange={setMoveModalVisible}
                    onFinish={async (values) => {
                        const targetDirId = values.targetDirectoryId;
                        setAnswerList(answerList.map(item => {
                            if (selectedRowKeys.includes(item.id)) {
                                return { ...item, directoryId: targetDirId };
                            }
                            return item;
                        }));
                        message.success('移动成功');
                        setSelectedRowKeys([]); // Clear selection
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
                    <Button key="download" type="primary" onClick={() => message.success('二维码已下载')}>
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
            <DrawerForm
                title="视频配置"
                width={800}
                open={videoConfigVisible}
                onOpenChange={setVideoConfigVisible}
                drawerProps={{
                    destroyOnClose: true,
                    mask: true,
                    maskClosable: true,
                    maskStyle: { backgroundColor: 'transparent' },
                }}
                onFinish={async (values) => {
                    console.log('Video Config Values:', values);
                    // Update mock data
                    setAnswerList(prev => prev.map(item => {
                        if (item.id === currentVideoItem?.id) {
                            return {
                                ...item,
                                videoSummary: values.videoSummary,
                                questions: values.questions,
                            };
                        }
                        return item;
                    }));
                    message.success('配置保存成功');
                    return true;
                }}
                initialValues={{
                    videoSummary: currentVideoItem?.videoSummary,
                    questions: currentVideoItem?.questions || [],
                }}
            >
                <Descriptions column={1} style={{ marginBottom: 24 }}>
                    <Descriptions.Item label="视频名称">{currentVideoItem?.name}</Descriptions.Item>
                </Descriptions>

                <Row gutter={24}>
                    <Col span={12}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <Image
                                width={150}
                                src={currentVideoItem?.qrCodeUrl}
                                fallback="https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg"
                                preview={false}
                            />
                            <p style={{ marginTop: 10, color: '#999' }}>视频二维码</p>
                        </div>
                    </Col>
                    <Col span={12}>
                        <ProFormTextArea
                            name="videoSummary"
                            label="视频摘要"
                            placeholder="请输入视频摘要"
                            fieldProps={{ rows: 6 }}
                        />
                    </Col>
                </Row>

                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <span style={{ fontWeight: 'bold' }}>互动题目管理</span>
                    </div>

                    <ProTable<QuestionItem>
                        rowKey="id"
                        dataSource={currentVideoItem?.questions || []}
                        search={false}
                        options={false}
                        pagination={false}
                        columns={[
                            {
                                title: '时间点',
                                dataIndex: 'time',
                                valueType: 'time',
                                width: 150,
                                fieldProps: {
                                    format: 'HH:mm:ss',
                                },
                            },
                            {
                                title: '题目名称',
                                dataIndex: 'title',
                            },
                            {
                                title: '操作',
                                valueType: 'option',
                                width: 120,
                                render: (text, record) => [
                                    <a
                                        key="edit"
                                        onClick={() => {
                                            setCurrentEditingQuestion(record);
                                            questionForm.setFieldsValue(record);
                                            setQuestionModalVisible(true);
                                        }}
                                    >
                                        编辑
                                    </a>,
                                    <a
                                        key="delete"
                                        onClick={() => {
                                            if (currentVideoItem) {
                                                const newQuestions = (currentVideoItem.questions || []).filter(q => q.id !== record.id);
                                                setCurrentVideoItem({
                                                    ...currentVideoItem,
                                                    questions: newQuestions
                                                });
                                                // Also update the main list
                                                setAnswerList(prev => prev.map(item => {
                                                    if (item.id === currentVideoItem.id) {
                                                        return { ...item, questions: newQuestions };
                                                    }
                                                    return item;
                                                }));
                                                message.success('删除成功');
                                            }
                                        }}
                                    >
                                        删除
                                    </a>,
                                ],
                            },
                        ]}
                    />

                    <Button
                        type="dashed"
                        style={{ width: '100%', marginTop: 16 }}
                        onClick={() => {
                            setCurrentEditingQuestion(undefined);
                            questionForm.resetFields();
                            setQuestionModalVisible(true);
                        }}
                    >
                        + 添加一行数据
                    </Button>
                </div>
            </DrawerForm>

            {/* Question Management Modal */}
            <ModalForm
                title={currentEditingQuestion ? "编辑互动题目" : "视频中插入选择题"}
                width={600}
                open={questionModalVisible}
                onOpenChange={setQuestionModalVisible}
                form={questionForm}
                layout="horizontal"
                labelCol={{ flex: '80px' }}
                onFinish={async (values) => {
                    console.log('Question values:', values);
                    if (currentVideoItem) {
                        let newQuestions = [...(currentVideoItem.questions || [])];
                        if (currentEditingQuestion) {
                            // Edit
                            newQuestions = newQuestions.map(q => q.id === currentEditingQuestion.id ? { ...q, ...values, id: q.id } : q);
                        } else {
                            // Create
                            newQuestions.push({
                                id: Date.now().toString(),
                                ...values,
                            });
                        }

                        // Update Video Item
                        const updatedVideoItem = { ...currentVideoItem, questions: newQuestions };
                        setCurrentVideoItem(updatedVideoItem);

                        // Update Main List
                        setAnswerList(prev => prev.map(item => {
                            if (item.id === currentVideoItem.id) {
                                return updatedVideoItem;
                            }
                            return item;
                        }));

                        message.success('保存成功');
                        return true;
                    }
                    return false;
                }}
            >
                <ProFormText
                    name="title"
                    label="题目"
                    placeholder="请输入"
                    rules={[{ required: true, message: '请输入题目' }]}
                />
                <ProFormTimePicker
                    name="time"
                    label="时间点"
                    placeholder="请选择时间"
                    fieldProps={{ format: 'HH:mm:ss' }}
                    rules={[{ required: true, message: '请选择时间点' }]}
                />

                <ProFormText
                    name="optionA"
                    label="选项 A"
                    placeholder="请输入"
                    rules={[{ required: true, message: '请输入选项A' }]}
                />
                <ProFormText
                    name="optionB"
                    label="选项 B"
                    placeholder="请输入"
                    rules={[{ required: true, message: '请输入选项B' }]}
                />
                <ProFormText
                    name="optionC"
                    label="选项 C"
                    placeholder="请输入"
                    rules={[{ required: true, message: '请输入选项C' }]}
                />
                <ProFormText
                    name="optionD"
                    label="选项 D"
                    placeholder="请输入"
                    rules={[{ required: true, message: '请输入选项D' }]}
                />

                <ProFormSelect
                    name="correctAnswer"
                    label="答案"
                    placeholder="请选择"
                    options={[
                        { label: 'A', value: 'A' },
                        { label: 'B', value: 'B' },
                        { label: 'C', value: 'C' },
                        { label: 'D', value: 'D' },
                    ]}
                    rules={[{ required: true, message: '请选择答案' }]}
                />

                <ProFormText
                    name="analysis"
                    label="解析"
                    placeholder="请输入"
                    rules={[{ required: true, message: '请输入解析' }]}
                />
            </ModalForm>
        </PageContainer>
    );
};

export default AnswerManage;
