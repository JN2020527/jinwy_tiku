import {
    ProFormDependency,
    ProFormSelect,
    ProFormTreeSelect,
    ProTable,
    ModalForm,
    ProFormUploadButton,
    PageContainer,
} from '@ant-design/pro-components';
import { Card, Space, message, Button, Descriptions, Modal, Switch, Tag, Row, Col, Tree } from 'antd';
import React, { useMemo, useState } from 'react';
import { useSearchParams } from '@umijs/max';
import { PlusOutlined } from '@ant-design/icons';

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

    type AnswerItem = {
        id: string;
        name: string;
        type: string;
        size: string;
        directoryId: string | null;
        updateTime: string;
    };

    const [directoryMode, setDirectoryMode] = useState<'disabled' | 'required'>('disabled');
    const isDirectoryEnabled = directoryMode === 'required';
    const [createModalVisible, setCreateModalVisible] = useState(false); // Create Answer Modal
    const [moveModalVisible, setMoveModalVisible] = useState(false); // Move Answer Modal
    const ALL_DIRECTORY_KEY = '__all__';
    const UNASSIGNED_DIRECTORY_KEY = '__unassigned__';
    const [selectedDirectoryKey, setSelectedDirectoryKey] = useState<string>(ALL_DIRECTORY_KEY);

    // Mock Data State
    const [directoryList] = useState<DirectoryItem[]>([
        { id: '1', name: '第一章', sort: 1, createTime: '2025-12-21' },
        { id: '1-1', name: '第一节', parentId: '1', sort: 1, createTime: '2025-12-21' },
        { id: '1-1-1', name: '知识点 1.1.1', parentId: '1-1', sort: 1, createTime: '2025-12-21' },
        { id: '2', name: '第二章', sort: 2, createTime: '2025-12-21' },
    ]);

    const [answerList, setAnswerList] = useState<AnswerItem[]>([
        { id: '101', name: '语文试卷A.pdf', type: 'PDF', size: '2.5MB', directoryId: '1-1', updateTime: '2025-12-21 10:00:00' },
        { id: '102', name: '语文听力.mp3', type: 'MP3', size: '5MB', directoryId: null, updateTime: '2025-12-21 10:05:00' },
        { id: '103', name: '参考答案.doc', type: 'DOC', size: '1.2MB', directoryId: null, updateTime: '2025-12-21 10:10:00' },
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
    const buildTreeData = (list: DirectoryItem[]) => {
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
            { title: '类型', dataIndex: 'type', render: (text: string) => <Tag>{text}</Tag> },
            { title: '大小', dataIndex: 'size' },
            { title: '更新时间', dataIndex: 'updateTime' },
            {
                title: '操作',
                valueType: 'option',
                render: (text: any, record: AnswerItem) => [
                    <a key="delete" onClick={() => {
                        setAnswerList((list) => list.filter(item => item.id !== record.id));
                        message.success('删除成功');
                    }}>删除</a>
                ],
            },
        ];
        if (isDirectoryEnabled) {
            columns.splice(3, 0, {
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
                                <Button key="create" type="primary" onClick={() => setCreateModalVisible(true)} icon={<PlusOutlined />}>
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
                        <Button key="create" type="primary" onClick={() => setCreateModalVisible(true)} icon={<PlusOutlined />}>
                            新增答案
                        </Button>,
                    ]}
                    columns={answerColumns}
                />
            )}

            {/* Create Answer Modal */}
            <ModalForm
                title="新增答案"
                width={800}
                open={createModalVisible}
                onOpenChange={setCreateModalVisible}
                layout="horizontal"
                labelCol={{ flex: '100px' }}
                onFinish={async (values) => {
                    console.log('Upload values:', values);
                    const newId = (Math.random() * 1000).toFixed(0);
                    // Mock adding files
                    const newFiles = [];
                    // Simple logic to mock adding entries based on upload inputs
                    // In real app, we parse values.file or answerFile list
                    const selectedType = (values.answerType || 'file') as keyof typeof uploadTypeConfig;
                    const typeConfig = uploadTypeConfig[selectedType] || uploadTypeConfig.file;
                    const directoryId = isDirectoryEnabled ? (values.directoryId || null) : null;
                    const fileName = `New Uploaded ${typeConfig.typeTag} File`;
                    newFiles.push({
                        id: newId,
                        name: fileName, // Mock file name
                        type: typeConfig.typeTag,
                        size: '1.5MB',
                        directoryId,
                        updateTime: new Date().toLocaleTimeString(),
                    });
                    setAnswerList([...answerList, ...newFiles]);
                    message.success('上传成功');
                    return true;
                }}
            >
                {isDirectoryEnabled && (
                    <ProFormTreeSelect
                        name="directoryId"
                        label="所属目录"
                        placeholder="请选择目录"
                        fieldProps={{
                            treeData: buildTreeData(directoryList),
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

                <ProFormDependency name={['answerType']}>
                    {({ answerType }) => {
                        const typeKey = (answerType || 'file') as keyof typeof uploadTypeConfig;
                        const typeConfig = uploadTypeConfig[typeKey] || uploadTypeConfig.file;
                        return (
                            <ProFormUploadButton
                                label={typeConfig.label}
                                name="answerUpload"
                                max={99}
                                fieldProps={{ name: 'file', multiple: true, accept: typeConfig.accept }}
                                title={typeConfig.title}
                            />
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
                            treeData: buildTreeData(directoryList),
                            showSearch: true,
                            treeDefaultExpandAll: true,
                        }}
                        rules={[{ required: true, message: '请选择目标目录' }]}
                    />
                </ModalForm>
            )}

        </PageContainer>
    );
};

export default AnswerManage;
