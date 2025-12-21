import {
    ProFormTreeSelect,
    EditableProTable,
    ProTable,
    ModalForm,
    ProFormUploadButton,
    PageContainer,
    ActionType,
} from '@ant-design/pro-components';
import {
    DndContext,
    MouseSensor,
    PointerSensor,
    rectIntersection,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Space, message, Button, Modal, Descriptions, Tag } from 'antd';
import React, { useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useSearchParams } from '@umijs/max';
import { HolderOutlined, PlusOutlined } from '@ant-design/icons';

const DragHandleContext = React.createContext<{ handle: React.ReactNode | null }>({ handle: null });

const SortableItemCell: React.FC<any> = (props) => {
    const { handle } = useContext(DragHandleContext);
    const { children, ...rest } = props;
    if (handle) {
        return (
            <td {...rest}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {handle}
                    {children}
                </div>
            </td>
        );
    }
    return <td {...rest}>{children}</td>;
};

const SortableRow: React.FC<any> = (props) => {
    const { id, dragSortKey, children, ...rest } = props;
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = {
        ...rest.style,
        transform: CSS.Transform.toString(transform),
        transition,
    };
    const handle = (
        <span
            {...listeners}
            {...attributes}
            style={{ cursor: 'grab', color: '#999', display: 'inline-flex' }}
        >
            <HolderOutlined />
        </span>
    );
    const cells: React.ReactNode[] = [];
    React.Children.forEach(children, (child, index) => {
        if (child?.key === dragSortKey) {
            cells.push(
                <DragHandleContext.Provider key={child.key ?? index} value={{ handle }}>
                    {child}
                </DragHandleContext.Provider>,
            );
            return;
        }
        cells.push(child);
    });
    return (
        <tr {...rest} ref={setNodeRef} style={style}>
            {cells}
        </tr>
    );
};

const AnswerManage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const productId = searchParams.get('productId');

    // Hardcoded Mock Data for Header
    const mockInfo = {
        productId: productId || '46',
        productName: '晋文源九年级考试-名师精讲',
        subjectName: '语文',
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

    const normalizeParentId = (parentId?: string | null) => (parentId === undefined || parentId === null ? null : parentId);

    // State
    const [modalVisible, setModalVisible] = useState(false); // Directory Manage Modal
    const [createModalVisible, setCreateModalVisible] = useState(false); // Create Answer Modal
    const [moveModalVisible, setMoveModalVisible] = useState(false); // Move Answer Modal

    // Mock Data State
    const [directoryList, setDirectoryList] = useState<DirectoryItem[]>([
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

    const [editableKeys, setEditableRowKeys] = useState<React.Key[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>(
        () => directoryList.map((item) => item.id),
    );
    const actionRef = useRef<ActionType>();
    const dragSortKey = 'sort';

    const addDirectoryRecord = (overrides: Partial<DirectoryItem> = {}) => {
        const newId = (Math.random() * 1000000).toFixed(0);
        setDirectoryList((list) => {
            const parentKey = normalizeParentId(overrides.parentId);
            const maxSort = list.reduce((max, item) => {
                if (normalizeParentId(item.parentId) !== parentKey) {
                    return max;
                }
                return Math.max(max, Number(item.sort) || 0);
            }, 0);
            const newRecord: DirectoryItem = {
                id: newId,
                name: '',
                createTime: new Date().toISOString(),
                ...overrides,
                sort: Number(overrides.sort ?? maxSort + 1),
            };
            return [...list, newRecord];
        });
        setEditableRowKeys([newId]);
        return newId;
    };

    // Helper to build tree data from flat list (for TreeSelect)
    const buildTreeData = (list: DirectoryItem[]) => {
        const tree = nestDirectoryList(list);
        const mapToTreeData = (nodes: (DirectoryItem & { children?: DirectoryItem[] })[]) => nodes.map((node) => ({
            title: node.name,
            value: node.id,
            children: node.children && node.children.length > 0 ? mapToTreeData(node.children) : undefined,
        }));
        return mapToTreeData(tree);
    };

    // Helper: Flat List -> Tree (for Table Display)
    const nestDirectoryList = (list: DirectoryItem[]) => {
        const indexMap = new Map<string, number>();
        list.forEach((item, index) => indexMap.set(item.id, index));
        const map = new Map<string, DirectoryItem & { children?: DirectoryItem[] }>();
        const roots: (DirectoryItem & { children?: DirectoryItem[] })[] = [];

        // 1. Create a shallow copy of items map
        list.forEach(item => {
            map.set(item.id, { ...item, children: [] });
        });

        // 2. Build tree
        list.forEach(item => {
            const node = map.get(item.id)!;
            if (item.parentId && map.has(item.parentId)) {
                map.get(item.parentId)!.children!.push(node);
            } else {
                roots.push(node);
            }
        });

        const compareBySort = (a: DirectoryItem, b: DirectoryItem) => {
            const aSort = Number(a.sort) || 0;
            const bSort = Number(b.sort) || 0;
            if (aSort !== bSort) {
                return aSort - bSort;
            }
            return (indexMap.get(a.id) ?? 0) - (indexMap.get(b.id) ?? 0);
        };
        const sortTree = (nodes: (DirectoryItem & { children?: DirectoryItem[] })[]) => {
            nodes.sort(compareBySort);
            nodes.forEach((node) => {
                if (node.children && node.children.length > 0) {
                    sortTree(node.children);
                }
            });
        };
        sortTree(roots);
        return roots;
    };

    // Helper: Tree -> Flat List (for State Update)
    const flattenDirectoryList = (tree: (DirectoryItem & { children?: DirectoryItem[] })[]) => {
        const flat: DirectoryItem[] = [];
        const walk = (nodes: (DirectoryItem & { children?: DirectoryItem[] })[]) => {
            nodes.forEach((node) => {
                const { children, ...rest } = node;
                flat.push(rest as DirectoryItem);
                if (children && children.length > 0) {
                    walk(children);
                }
            });
        };
        walk(tree);
        return flat;
    };

    const flattenVisibleDirectoryList = (
        tree: (DirectoryItem & { children?: DirectoryItem[] })[],
        expandedKeys: React.Key[],
    ) => {
        const expandedSet = new Set(expandedKeys);
        const flat: DirectoryItem[] = [];
        const walk = (nodes: (DirectoryItem & { children?: DirectoryItem[] })[]) => {
            nodes.forEach((node) => {
                const { children, ...rest } = node;
                flat.push(rest as DirectoryItem);
                if (children && children.length > 0 && expandedSet.has(node.id)) {
                    walk(children);
                }
            });
        };
        walk(tree);
        return flat;
    };

    const directoryTree = useMemo(() => nestDirectoryList(directoryList), [directoryList]);
    const visibleDirectoryList = useMemo(
        () => flattenVisibleDirectoryList(directoryTree, expandedRowKeys),
        [directoryTree, expandedRowKeys],
    );
    const visibleDirectoryIndexMap = useMemo(() => {
        const map = new Map<string, number>();
        visibleDirectoryList.forEach((item, index) => {
            map.set(item.id, index);
        });
        return map;
    }, [visibleDirectoryList]);

    const sensors = useSensors(useSensor(PointerSensor), useSensor(MouseSensor));
    const handleDirectoryDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (!over?.id || active.id === over.id) {
            return;
        }
        const beforeIndex = Number(active.id);
        const afterIndex = Number(over.id);
        if (Number.isNaN(beforeIndex) || Number.isNaN(afterIndex)) {
            return;
        }
        const movedItem = visibleDirectoryList[beforeIndex];
        const targetItem = visibleDirectoryList[afterIndex];
        if (!movedItem || !targetItem) {
            return;
        }
        const parentKey = normalizeParentId(movedItem.parentId);
        if (parentKey !== normalizeParentId(targetItem.parentId)) {
            message.warning('仅支持同级目录拖拽排序');
            return;
        }
        const newOrder = arrayMove(visibleDirectoryList, beforeIndex, afterIndex);
        const siblings = newOrder.filter((item) => normalizeParentId(item.parentId) === parentKey);
        const sortMap = new Map<string, number>();
        siblings.forEach((item, index) => {
            sortMap.set(item.id, index + 1);
        });
        setDirectoryList((list) => list.map((item) => {
            const nextSort = sortMap.get(item.id);
            if (nextSort === undefined) {
                return item;
            }
            return { ...item, sort: nextSort };
        }));
    }, [visibleDirectoryList]);

    const DraggableContainer = useCallback((props: any) => (
        <SortableContext
            items={visibleDirectoryList.map((_, index) => index.toString())}
            strategy={verticalListSortingStrategy}
        >
            <tbody {...props} />
        </SortableContext>
    ), [visibleDirectoryList]);

    const DraggableBodyRow = useCallback((props: any) => {
        const rowKey = props['data-row-key'];
        const index = visibleDirectoryIndexMap.get(String(rowKey));
        if (index === undefined) {
            return <tr {...props} />;
        }
        return <SortableRow {...props} id={index.toString()} dragSortKey={dragSortKey} />;
    }, [dragSortKey, visibleDirectoryIndexMap]);

    // Columns
    const directoryColumns: any[] = [
        {
            title: '目录名称',
            dataIndex: 'name',
            formItemProps: { rules: [{ required: true, message: '此项是必填项' }] },
        },
        {
            title: '上级目录',
            dataIndex: 'parentId',
            editable: false,
            render: (dom: any, record: DirectoryItem) => {
                if (!record.parentId) {
                    return <span style={{ color: '#999' }}>无</span>;
                }
                const parent = directoryList.find((item) => item.id === record.parentId);
                return parent ? parent.name : <span style={{ color: '#999' }}>无</span>;
            },
        },
        { title: '排序', dataIndex: 'sort', key: dragSortKey, valueType: 'digit', width: 100 },
        {
            title: '操作',
            valueType: 'option',
            width: 200,
            render: (text: any, record: DirectoryItem, _: any, action: any) => [
                <a key="editable" onClick={() => action?.startEditable?.(record.id)}>编辑</a>,
                <a key="addSub" onClick={() => {
                    // Auto-expand parent when adding sub-directory
                    setExpandedRowKeys((keys) => (keys.includes(record.id) ? keys : [...keys, record.id]));
                    addDirectoryRecord({ parentId: record.id });
                }}>添加下级</a>,
                <a key="delete" onClick={() => setDirectoryList(directoryList.filter((item) => item.id !== record.id))}>删除</a>,
            ],
        },
    ];

    const answerColumns: any[] = [
        { title: '文件名称', dataIndex: 'name' },
        { title: '类型', dataIndex: 'type', render: (text: string) => <Tag>{text}</Tag> },
        { title: '大小', dataIndex: 'size' },
        {
            title: '所属目录',
            dataIndex: 'directoryId',
            render: (dom: any, record: AnswerItem) => {
                const dir = directoryList.find(d => d.id === record.directoryId);
                return dir ? dir.name : <span style={{ color: '#999' }}>无目录</span>;
            }
        },
        { title: '更新时间', dataIndex: 'updateTime' },
        {
            title: '操作',
            valueType: 'option',
            render: (text: any, record: AnswerItem) => [
                <a key="delete" onClick={() => {
                    setAnswerList(answerList.filter(item => item.id !== record.id));
                    message.success('删除成功');
                }}>删除</a>
            ],
        },
    ];

    return (
        <PageContainer>
            {/* Header Info */}
            <Card style={{ marginBottom: 24 }}>
                <Descriptions>
                    <Descriptions.Item label="产品ID">{mockInfo.productId}</Descriptions.Item>
                    <Descriptions.Item label="产品名称">{mockInfo.productName}</Descriptions.Item>
                    <Descriptions.Item label="科目名称">{mockInfo.subjectName}</Descriptions.Item>
                </Descriptions>
            </Card>

            {/* Answer List Table */}
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
                    <Button key="dir" onClick={() => setModalVisible(true)}>
                        目录管理
                    </Button>
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
                    newFiles.push({
                        id: newId,
                        name: 'New Uploaded File.doc', // Mock name
                        type: 'DOC',
                        size: '1.5MB',
                        directoryId: values.directoryId || null,
                        updateTime: new Date().toLocaleTimeString(),
                    });
                    setAnswerList([...answerList, ...newFiles]);
                    message.success('上传成功');
                    return true;
                }}
            >
                <div style={{ paddingBottom: 16 }}>
                    <ProFormTreeSelect
                        name="directoryId"
                        label="所属目录"
                        placeholder="请选择目录（可选）"
                        fieldProps={{
                            treeData: buildTreeData(directoryList),
                            showSearch: true,
                            treeDefaultExpandAll: true,
                            allowClear: true,
                        }}
                        width="md"
                    />
                </div>

                {/* 5 Types of Uploads */}
                <ProFormUploadButton
                    label="答案文件"
                    name="answerFile"
                    max={99}
                    fieldProps={{ name: 'file', multiple: true, accept: '.pdf,.doc,.docx,.ppt,.pptx' }}
                    title="文件大小不能超过10M，仅支持PDF、DOC、DOCX、PPT、PPTX等格式。"
                />
                <ProFormUploadButton
                    label="答案图片"
                    name="answerImage"
                    max={99}
                    fieldProps={{ name: 'file', multiple: true, accept: '.jpg,.jpeg,.png' }}
                    title="单张图片大小不能超过10M，仅支持JPG、JPEG、PNG等格式。"
                />
                <ProFormUploadButton
                    label="答案视频"
                    name="answerVideo"
                    max={99}
                    fieldProps={{ name: 'file', multiple: true, accept: '.mp4' }}
                    title="视频文件大小不能超过1G，仅支持MP4格式，MPEG-4编码格式"
                />
                <ProFormUploadButton
                    label="答案音频"
                    name="answerAudio"
                    max={99}
                    fieldProps={{ name: 'file', multiple: true, accept: '.mp3' }}
                    title="音频大小不能超过500M，仅支持MP3格式。"
                />
                <ProFormUploadButton
                    label="答案压缩文档"
                    name="answerArchive"
                    max={99}
                    fieldProps={{ name: 'file', multiple: true, accept: '.zip,.rar' }}
                    title="文件大小不能超过100M，仅支持ZIP、RAR格式。"
                />
            </ModalForm>

            {/* Move Answer Modal */}
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

            {/* Directory Manage Modal (Existing Logic) */}
            <Modal
                title="目录管理"
                width={800}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
            >
                <EditableProTable<DirectoryItem>
                    rowKey="id"
                    actionRef={actionRef}
                    headerTitle="目录列表"
                    recordCreatorProps={false}
                    toolBarRender={() => [
                        <Button
                            key="add"
                            type="primary"
                            onClick={() => {
                                addDirectoryRecord();
                            }}
                        >
                            添加一级目录
                        </Button>
                    ]}
                    columns={directoryColumns}
                    value={directoryTree}
                    onChange={(values) => setDirectoryList(flattenDirectoryList(values as any))}
                    components={{
                        body: {
                            wrapper: DraggableContainer,
                            row: DraggableBodyRow,
                            cell: SortableItemCell,
                        },
                    }}
                    tableViewRender={(_, defaultDom) => (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={rectIntersection}
                            onDragEnd={handleDirectoryDragEnd}
                            modifiers={[restrictToVerticalAxis]}
                        >
                            {defaultDom}
                        </DndContext>
                    )}
                    expandable={{
                        expandedRowKeys,
                        onExpandedRowsChange: setExpandedRowKeys,
                    }}
                    editable={{
                        type: 'single',
                        editableKeys,
                        onSave: async (rowKey, data, row) => { console.log(rowKey, data, row); },
                        onChange: setEditableRowKeys,
                    }}
                />
            </Modal>
        </PageContainer>
    );
};

export default AnswerManage;
