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
    ProFormList,
    DragSortTable,
} from '@ant-design/pro-components';
import { Card, Space, message, Button, Descriptions, Modal, Switch, Tag, Row, Col, Tree, Image } from 'antd';
import React, { useMemo, useState } from 'react';
import { useSearchParams } from '@umijs/max';
import { PlusOutlined, DownloadOutlined, ThunderboltOutlined, QrcodeOutlined, EditOutlined, DeleteOutlined, PlusCircleOutlined, SettingOutlined, CheckOutlined } from '@ant-design/icons';
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
        qrCodeUrl?: string;
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

    type VideoSummaryItem = {
        id: string;
        startTime: string;
        endTime: string;
        content: string;
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
        videoSummary?: VideoSummaryItem[];
        questions?: QuestionItem[];
        qrCodeUrl?: string;
        sort: number;
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
    const [editableRowKeys, setEditableRowKeys] = useState<React.Key[]>([]);

    // Question Management State
    const [questionModalVisible, setQuestionModalVisible] = useState(false);
    const [currentEditingQuestion, setCurrentEditingQuestion] = useState<QuestionItem>();
    const [questionForm] = Form.useForm();

    // Directory Management State
    const [isDirectoryManaging, setIsDirectoryManaging] = useState(false);
    const [directoryModalVisible, setDirectoryModalVisible] = useState(false);
    const [currentDirectoryAction, setCurrentDirectoryAction] = useState<'add' | 'edit' | 'addSub'>('add');
    const [currentOperatingDirectory, setCurrentOperatingDirectory] = useState<DirectoryItem>();
    const [directoryForm] = Form.useForm();

    // Mock Data State
    const [directoryList, setDirectoryList] = useState<DirectoryItem[]>([
        { id: '1', name: '第一章', sort: 1, createTime: '2025-12-21', qrCodeUrl: 'https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg' },
        { id: '1-1', name: '第一节', parentId: '1', sort: 1, createTime: '2025-12-21', qrCodeUrl: 'https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg' },
        { id: '2', name: '第二章', sort: 2, createTime: '2025-12-21', qrCodeUrl: 'https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg' },
    ]);

    const [answerList, setAnswerList] = useState<AnswerItem[]>([
        { id: '101', name: '语文试卷A.pdf', type: 'PDF', answerType: 'file', size: '2.5MB', directoryId: '1-1', updateTime: '2025-12-21 10:00:00', allowDownload: true, sort: 1 },
        { id: '102', name: '语文听力.mp3', type: 'MP3', answerType: 'audio', size: '5MB', directoryId: null, updateTime: '2025-12-21 10:05:00', qrCodeUrl: 'https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg', sort: 2 },
        { id: '103', name: '参考答案.doc', type: 'DOC', answerType: 'file', size: '1.2MB', directoryId: null, updateTime: '2025-12-21 10:10:00', allowDownload: false, sort: 3 },
        {
            id: '104', name: '名师讲解.mp4', type: 'MP4', answerType: 'video', size: '500MB', directoryId: '1-1', updateTime: '2025-12-21 12:00:00',
            videoSummary: [
                { id: 'vs1', startTime: '00:00:00', endTime: '00:03:37', content: '太行一号旅游公路圆弧段弧长计算详解' },
                { id: 'vs2', startTime: '00:03:38', endTime: '00:10:00', content: '圆弧段弧长计算公式推导' }
            ],
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
            ],
            sort: 4
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
        setDirectoryMode(checked ? 'required' : 'disabled');
        if (checked) {
            // Default to 'Unassigned' view when enabled
            setSelectedDirectoryKey(UNASSIGNED_DIRECTORY_KEY);

            const unassignedCount = answerList.filter((item) => !item.directoryId).length;
            if (unassignedCount > 0) {
                Modal.info({
                    title: '目录模式已开启',
                    content: `现有 ${unassignedCount} 个文件未关联目录，已自动归入“未归类”中。您可以在该分类下进行查看或批量移动。`,
                    okText: '知道了',
                });
            }
        } else {
            // Reset to 'All' when disabled
            setSelectedDirectoryKey(ALL_DIRECTORY_KEY);
        }
    };


    // Helper to build tree data from flat list (for TreeSelect)
    const buildTreeData = (list: DirectoryItem[], leafOnly: boolean = false) => {
        const map = new Map<string, any>();
        const roots: any[] = [];
        list.forEach((item) => {
            map.set(item.id, { title: item.name, value: item.id, qrCodeUrl: item.qrCodeUrl, sort: item.sort, parentId: item.parentId, children: [] });
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
            title: (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span>{node.title}</span>
                    <Space>
                        {!isDirectoryManaging && node.qrCodeUrl && (
                            <QrcodeOutlined
                                style={{ marginLeft: 8, color: '#1890ff' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentQrCodeItem({ name: node.title, qrCodeUrl: node.qrCodeUrl } as any);
                                    setQrCodeModalVisible(true);
                                }}
                            />
                        )}
                        {isDirectoryManaging && (
                            <>
                                <EditOutlined
                                    style={{ color: '#1890ff', cursor: 'pointer' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDirectoryModalOpen('edit', { id: node.value, name: node.title, sort: node.sort, parentId: node.parentId } as any);
                                    }}
                                />
                                {!node.parentId && (
                                    <PlusCircleOutlined
                                        style={{ color: '#52c41a', cursor: 'pointer' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDirectoryModalOpen('addSub', { id: node.value } as any);
                                        }}
                                    />
                                )}
                                <DeleteOutlined
                                    style={{ color: '#ff4d4f', cursor: 'pointer' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteDirectory({ id: node.value, name: node.title } as any);
                                    }}
                                />
                            </>
                        )}
                    </Space>
                </div>
            ),
            children: node.children ? attachKeys(node.children) : undefined,
        }));

        const treeNodes = attachKeys(buildTreeData(directoryList));

        if (isDirectoryManaging) {
            return treeNodes;
        }

        return [
            { title: '全部', key: ALL_DIRECTORY_KEY },
            { title: `未归类 (${unassignedCount})`, key: UNASSIGNED_DIRECTORY_KEY },
            ...treeNodes,
        ];
    }, [ALL_DIRECTORY_KEY, UNASSIGNED_DIRECTORY_KEY, directoryList, unassignedCount, isDirectoryManaging]);
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
                            setShowVideoSummary(!!(record.videoSummary && record.videoSummary.length > 0));
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

    // AI Generation State
    const [aiGenerating, setAiGenerating] = useState(false);
    const [showVideoSummary, setShowVideoSummary] = useState(false);

    const handleAiGenerate = async () => {
        setAiGenerating(true);
        setShowVideoSummary(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            const mockSummary: VideoSummaryItem[] = [
                { id: Date.now().toString() + '1', startTime: '00:00:00', endTime: '00:05:00', content: 'AI生成：课程导入与背景介绍' },
                { id: Date.now().toString() + '2', startTime: '00:05:01', endTime: '00:15:30', content: 'AI生成：核心知识点深度解析' },
                { id: Date.now().toString() + '3', startTime: '00:15:31', endTime: '00:25:00', content: 'AI生成：典型例题分析与解题技巧' },
                { id: Date.now().toString() + '4', startTime: '00:25:01', endTime: '00:30:00', content: 'AI生成：课程总结与课后作业布置' },
            ];

            form.setFieldValue('videoSummary', mockSummary);
            message.success('AI摘要生成成功');
        } catch (error) {
            message.error('生成失败，请重试');
        } finally {
            setAiGenerating(false);
        }
    };

    // Helper to get all descendant directory IDs
    const getDescendantIds = (rootId: string, allDirs: DirectoryItem[]): string[] => {
        const children = allDirs.filter(d => d.parentId === rootId);
        let ids = children.map(c => c.id);
        children.forEach(c => {
            ids = [...ids, ...getDescendantIds(c.id, allDirs)];
        });
        return ids;
    };

    // Directory Management Logic
    const handleDirectoryModalOpen = (action: 'add' | 'edit' | 'addSub', record?: DirectoryItem) => {
        setCurrentDirectoryAction(action);
        setCurrentOperatingDirectory(record);
        setDirectoryModalVisible(true);
    };

    React.useEffect(() => {
        if (directoryModalVisible) {
            directoryForm.resetFields();
            if (currentDirectoryAction === 'edit' && currentOperatingDirectory) {
                directoryForm.setFieldsValue({
                    name: currentOperatingDirectory.name,
                    sort: currentOperatingDirectory.sort,
                });
            } else if (currentDirectoryAction === 'add' || currentDirectoryAction === 'addSub') {
                // Calculate default sort
                const parentId = currentDirectoryAction === 'addSub' && currentOperatingDirectory ? currentOperatingDirectory.id : undefined;
                const siblings = directoryList.filter(d => d.parentId === parentId);
                const maxSort = Math.max(...siblings.map(s => s.sort), 0);
                directoryForm.setFieldsValue({
                    sort: maxSort + 1,
                });
            }
        }
    }, [directoryModalVisible, currentDirectoryAction, currentOperatingDirectory, directoryForm, directoryList]);

    const handleDeleteDirectory = (record: DirectoryItem) => {
        Modal.confirm({
            title: '确认删除目录?',
            content: `删除 "${record.name}" 将同时删除其所有下级目录。目录下的资源将变为“未归类”。`,
            onOk: () => {
                const idsToDelete = [record.id, ...getDescendantIds(record.id, directoryList)];
                // 1. Remove directories
                // Note: In a real app, we might check if there are resources and ask user what to do.
                // Here we just set them to unassigned (null directoryId) as per warning.

                // Update Answer List: Set directoryId to null for affected answers
                setAnswerList(prev => prev.map(item => {
                    if (item.directoryId && idsToDelete.includes(item.directoryId)) {
                        return { ...item, directoryId: null };
                    }
                    return item;
                }));

                // Update Directory List
                // We can't update state based on previous state inside Modal.confirm easily without refs or functional updates if we were using it directly, 
                // but here we are inside the component scope, so `directoryList` might be stale if not careful.
                // Better to use functional update.
                // However, `getDescendantIds` needs the current list. 
                // Let's assume `directoryList` is fresh enough or use a ref if needed. 
                // For this mock, using the state directly is okay-ish but functional update is safer for the set call.

                // Actually, let's re-calculate ids inside the setter to be safe
                setAnswerList(prevAnswers => {
                    const currentDirList = directoryList; // This might still be stale closure. 
                    // Ideally we should use a ref for directoryList if we need it inside callbacks that might close over old values.
                    // But for this simple case, let's just proceed.
                    return prevAnswers.map(item => {
                        if (item.directoryId && idsToDelete.includes(item.directoryId)) {
                            return { ...item, directoryId: null };
                        }
                        return item;
                    });
                });

                // Remove from directory list
                // We need to use functional update to ensure we don't lose updates
                // But we need the IDs to delete. 
                // Let's just use the ids calculated at the start of onOk.
                // Wait, `directoryList` in `onOk` closure is the one from render. 
                // If `directoryList` hasn't changed since render, it's fine.
                // Since we are not doing async stuff before this, it should be fine.

                // Actually, `setDirectoryList` functional update:
                setDirectoryList(prev => prev.filter(d => !idsToDelete.includes(d.id)));

                message.success('删除成功');
            },
        });
    };

    const handleDirectoryDrop = (info: any) => {
        const dropKey = info.node.key as string;
        const dragKey = info.dragNode.key as string;
        const dropPos = info.node.pos.split('-');
        const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

        const loop = (data: any[], key: string, callback: (item: any, index: number, arr: any[]) => void) => {
            for (let i = 0; i < data.length; i++) {
                if (data[i].key === key) {
                    return callback(data[i], i, data);
                }
                if (data[i].children) {
                    loop(data[i].children, key, callback);
                }
            }
        };

        // We need to work on a clone of the tree structure or just manipulate the flat list.
        // Manipulating the flat list is easier for persistence but harder for drag logic calculation.
        // Antd Tree gives us visual structure.
        // Let's use the `directoryTreeData` to calculate the move, then map back to flat list.

        const data = [...directoryTreeData]; // Shallow copy of root array

        // Find drag object
        let dragObj: any;
        loop(data, dragKey, (item, index, arr) => {
            arr.splice(index, 1);
            dragObj = item;
        });

        if (!info.dropToGap) {
            // Drop on the content -> become child
            loop(data, dropKey, (item) => {
                item.children = item.children || [];
                item.children.push(dragObj);
            });
        } else if (
            (info.node.children || []).length > 0 && // Has children
            info.node.expanded && // Is expanded
            dropPosition === 1 // On the bottom gap
        ) {
            loop(data, dropKey, (item) => {
                item.children = item.children || [];
                item.children.unshift(dragObj);
            });
        } else {
            let ar: any[] = [];
            let i: number = 0;
            loop(data, dropKey, (item, index, arr) => {
                ar = arr;
                i = index;
            });
            if (dropPosition === -1) {
                ar.splice(i, 0, dragObj);
            } else {
                ar.splice(i + 1, 0, dragObj);
            }
        }

        // Now `data` has the new structure. We need to convert it back to flat `directoryList`.
        // And update `parentId` and `sort`.
        const newDirectoryList: DirectoryItem[] = [];
        const flatten = (nodes: any[], parentId?: string) => {
            nodes.forEach((node, index) => {
                // Find original item to keep other props (like createTime)
                const original = directoryList.find(d => d.id === node.key);
                if (original) {
                    newDirectoryList.push({
                        ...original,
                        parentId: parentId,
                        sort: index + 1, // Update sort based on new order
                    });
                }
                if (node.children) {
                    flatten(node.children, node.key);
                }
            });
        };

        // Skip the static nodes "All" and "Unassigned"
        // Our `directoryTreeData` has "All" and "Unassigned" at the top.
        // We should only process the actual directory nodes.
        // The `data` array contains them.
        // "All" key is ALL_DIRECTORY_KEY, "Unassigned" is UNASSIGNED_DIRECTORY_KEY.
        // We should filter them out before flattening or just ignore them in flatten if they are not in directoryList.

        // Actually, the drag might involve moving something *before* "All" or "Unassigned" if we are not careful.
        // But `directoryTreeData` construction puts them first.
        // If user drags a directory to be before "All", it might mess up.
        // We should probably prevent dragging "All" and "Unassigned" and dropping onto them.
        // For now, let's assume user behaves or we filter.

        // Let's just flatten the nodes that correspond to real directories.
        flatten(data, undefined); // Root nodes have undefined parentId

        // Filter out any undefined entries if something went wrong (shouldn't happen if logic is correct)
        // And ensure we only have items that were in the original list (to exclude "All"/"Unassigned" virtual nodes from being added to list)
        const validNewList = newDirectoryList.filter(item => item.id !== ALL_DIRECTORY_KEY && item.id !== UNASSIGNED_DIRECTORY_KEY);

        setDirectoryList(validNewList);
    };

    const handleBatchDownload = () => {
        let resourceQRs: AnswerItem[] = [];
        let directoryQRs: DirectoryItem[] = [];

        if (!isDirectoryEnabled || selectedDirectoryKey === ALL_DIRECTORY_KEY) {
            // All Mode: Everything
            resourceQRs = answerList.filter(item => !!item.qrCodeUrl);
            directoryQRs = directoryList.filter(d => !!d.qrCodeUrl);
        } else if (selectedDirectoryKey === UNASSIGNED_DIRECTORY_KEY) {
            // Unassigned Mode: Only unassigned resources
            resourceQRs = answerList.filter(item => !item.directoryId && !!item.qrCodeUrl);
            directoryQRs = [];
        } else {
            // Specific Directory Mode: Recursive
            const targetDirIds = [selectedDirectoryKey, ...getDescendantIds(selectedDirectoryKey, directoryList)];

            // Collect Directories
            directoryQRs = directoryList.filter(d => targetDirIds.includes(d.id) && !!d.qrCodeUrl);

            // Collect Resources
            resourceQRs = answerList.filter(item => item.directoryId && targetDirIds.includes(item.directoryId) && !!item.qrCodeUrl);
        }

        const totalCount = resourceQRs.length + directoryQRs.length;

        if (totalCount === 0) {
            message.warning('当前范围内没有可下载的二维码');
            return;
        }

        message.loading(`正在打包下载 ${directoryQRs.length} 个目录二维码和 ${resourceQRs.length} 个资源二维码...`, 1.5)
            .then(() => message.success('下载完成'));
    };

    const handleDragSortEnd = (beforeIndex: number, afterIndex: number, newDataSource: AnswerItem[]) => {
        setAnswerList(newDataSource);
        message.success('排序已更新');
    };

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
                        <Card
                            title="目录"
                            extra={
                                <Space>
                                    {isDirectoryManaging && (
                                        <Button
                                            type="link"
                                            size="small"
                                            icon={<PlusOutlined />}
                                            onClick={() => handleDirectoryModalOpen('add')}
                                        >
                                            添加一级
                                        </Button>
                                    )}
                                    <Button
                                        type="text"
                                        icon={isDirectoryManaging ? <CheckOutlined /> : <SettingOutlined />}
                                        onClick={() => setIsDirectoryManaging(!isDirectoryManaging)}
                                    >
                                        {isDirectoryManaging ? '完成' : '管理'}
                                    </Button>
                                </Space>
                            }
                        >
                            <Tree
                                blockNode
                                defaultExpandAll
                                draggable={isDirectoryManaging}
                                onDrop={handleDirectoryDrop}
                                selectedKeys={isDirectoryManaging ? [] : [selectedDirectoryKey]}
                                treeData={directoryTreeData}
                                onSelect={(keys) => {
                                    if (isDirectoryManaging) return;
                                    const nextKey = (keys[0] as string) || ALL_DIRECTORY_KEY;
                                    setSelectedDirectoryKey(nextKey);
                                    setSelectedRowKeys([]);
                                }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} md={18} lg={19}>
                        <DragSortTable<AnswerItem>
                            headerTitle="答案列表"
                            rowKey="id"
                            dataSource={filteredAnswerList}
                            search={false}
                            options={false}
                            toolBarRender={() => [
                                <Button
                                    key="download"
                                    icon={<DownloadOutlined />}
                                    onClick={handleBatchDownload}
                                >
                                    二维码下载
                                </Button>,
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
                            dragSortKey="sort"
                            onDragSortEnd={handleDragSortEnd}
                        />
                    </Col>
                </Row>
            ) : (
                <DragSortTable<AnswerItem>
                    headerTitle="答案列表"
                    rowKey="id"
                    dataSource={answerList}
                    search={false}
                    options={false}
                    toolBarRender={() => [
                        <Button
                            key="download"
                            icon={<DownloadOutlined />}
                            onClick={handleBatchDownload}
                        >
                            二维码下载
                        </Button>,
                        <Button key="create" type="primary" onClick={() => {
                            setCurrentEditingItem(undefined);
                            form.resetFields();
                            setCreateModalVisible(true);
                        }} icon={<PlusOutlined />}>
                            新增答案
                        </Button>,
                    ]}
                    columns={answerColumns}
                    dragSortKey="sort"
                    onDragSortEnd={handleDragSortEnd}
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
                            sort: answerList.length + 1,
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
                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 12 }}>
                        <div style={{ fontSize: 16, fontWeight: 'bold' }}>视频摘要</div>
                        <Button
                            type="primary"
                            ghost
                            size="small"
                            icon={<ThunderboltOutlined />}
                            loading={aiGenerating}
                            onClick={handleAiGenerate}
                        >
                            AI生成视频摘要
                        </Button>
                    </div>
                    {showVideoSummary && (
                        <EditableProTable<VideoSummaryItem>
                            name="videoSummary"
                            rowKey="id"
                            toolBarRender={false}
                            columns={[
                                {
                                    title: '开始时间',
                                    dataIndex: 'startTime',
                                    valueType: 'time',
                                    width: 110,
                                    fieldProps: {
                                        format: 'HH:mm:ss',
                                    },
                                    formItemProps: {
                                        rules: [{ required: true, message: '此项为必填项' }],
                                    },
                                },
                                {
                                    title: '结束时间',
                                    dataIndex: 'endTime',
                                    valueType: 'time',
                                    width: 110,
                                    fieldProps: {
                                        format: 'HH:mm:ss',
                                    },
                                    formItemProps: {
                                        rules: [{ required: true, message: '此项为必填项' }],
                                    },
                                },
                                {
                                    title: '摘要内容',
                                    dataIndex: 'content',
                                    valueType: 'textarea',
                                    formItemProps: {
                                        rules: [{ required: true, message: '此项为必填项' }],
                                    },
                                },
                                {
                                    title: '操作',
                                    valueType: 'option',
                                    width: 120,
                                    render: (text, record, _, action) => [
                                        <a
                                            key="editable"
                                            onClick={() => {
                                                action?.startEditable?.(record.id);
                                            }}
                                        >
                                            编辑
                                        </a>,
                                        <a
                                            key="delete"
                                            onClick={() => {
                                                const dataSource = form.getFieldValue('videoSummary') as VideoSummaryItem[];
                                                form.setFieldValue(
                                                    'videoSummary',
                                                    dataSource.filter((item) => item.id !== record.id),
                                                );
                                            }}
                                        >
                                            删除
                                        </a>,
                                    ],
                                },
                            ]}
                            recordCreatorProps={{
                                newRecordType: 'dataSource',
                                record: () => ({
                                    id: Date.now().toString(),
                                    startTime: '00:00:00',
                                    endTime: '00:00:00',
                                    content: '',
                                }),
                            }}
                            editable={{
                                type: 'multiple',
                                editableKeys: editableRowKeys,
                                actionRender: (row, config, defaultDom) => [
                                    defaultDom.save,
                                    defaultDom.cancel,
                                ],
                                onSave: async (rowKey, data, row) => {
                                    console.log(rowKey, data, row);
                                },
                                onChange: setEditableRowKeys,
                            }}
                        />
                    )}
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: 16, fontWeight: 'bold' }}>选择题列表</div>
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

            {/* Directory Management Modal */}
            <ModalForm
                title={currentDirectoryAction === 'add' ? '添加一级目录' : currentDirectoryAction === 'addSub' ? '添加下级目录' : '编辑目录'}
                width={500}
                open={directoryModalVisible}
                onOpenChange={setDirectoryModalVisible}
                form={directoryForm}
                modalProps={{ zIndex: 2000 }}
                layout="horizontal"
                labelCol={{ flex: '80px' }}
                onFinish={async (values) => {
                    if (currentDirectoryAction === 'edit' && currentOperatingDirectory) {
                        // Edit
                        setDirectoryList(prev => prev.map(item => {
                            if (item.id === currentOperatingDirectory.id) {
                                return { ...item, name: values.name, sort: values.sort };
                            }
                            return item;
                        }));
                        message.success('修改成功');
                    } else {
                        // Add or Add Sub
                        const newId = (Math.random() * 1000000).toFixed(0);
                        const parentId = currentDirectoryAction === 'addSub' && currentOperatingDirectory ? currentOperatingDirectory.id : undefined;
                        const newRecord: DirectoryItem = {
                            id: newId,
                            name: values.name,
                            parentId: parentId,
                            sort: values.sort,
                            createTime: new Date().toISOString(),
                        };
                        setDirectoryList(prev => [...prev, newRecord]);
                        message.success('添加成功');
                    }
                    return true;
                }}
            >
                <ProFormText
                    name="name"
                    label="目录名称"
                    placeholder="请输入目录名称"
                    rules={[{ required: true, message: '请输入目录名称' }]}
                />
                <ProFormText
                    name="sort"
                    label="排序"
                    placeholder="请输入排序号"
                    fieldProps={{ type: 'number' }}
                    initialValue={1}
                    rules={[{ required: true, message: '请输入排序号' }]}
                />
            </ModalForm>

            {/* Question Management Modal */}
            <ModalForm
                title={currentEditingQuestion ? "编辑互动题目" : "视频中插入选择题"}
                width={600}
                open={questionModalVisible}
                onOpenChange={setQuestionModalVisible}
                form={questionForm}
                modalProps={{ zIndex: 2000 }}
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
                <ProFormTextArea
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
