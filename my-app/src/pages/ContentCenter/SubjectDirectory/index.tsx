import {
    EditableProTable,
    PageContainer,
    type ActionType,
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
import { HolderOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, message } from 'antd';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useSearchParams } from '@umijs/max';

const DragHandleContext = React.createContext<{ handle: React.ReactNode | null }>({ handle: null });

const SortableItemCell: React.FC<any> = (props) => {
    const { handle } = React.useContext(DragHandleContext);
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

type DirectoryItem = {
    id: string;
    name: string;
    parentId?: string;
    sort: number;
    createTime: string;
};

const SubjectDirectory: React.FC = () => {
    const actionRef = useRef<ActionType>();
    const [searchParams] = useSearchParams();
    const productId = searchParams.get('productId');
    const subjectId = searchParams.get('subjectId');
    const subjectName = searchParams.get('subjectName');

    const mockProductInfo = {
        id: productId || '46',
        name: '晋文源九年级考试-名师精讲',
    };

    const mockSubjectInfo = {
        id: subjectId || '164',
        name: subjectName || '语文',
    };

    const [directoryList, setDirectoryList] = useState<DirectoryItem[]>([
        { id: '1', name: '第一章', sort: 1, createTime: '2025-12-21' },
        { id: '1-1', name: '第一节', parentId: '1', sort: 1, createTime: '2025-12-21' },
        { id: '1-1-1', name: '知识点 1.1.1', parentId: '1-1', sort: 1, createTime: '2025-12-21' },
        { id: '2', name: '第二章', sort: 2, createTime: '2025-12-21' },
    ]);
    const [editableKeys, setEditableRowKeys] = useState<React.Key[]>([]);
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>(
        () => directoryList.map((item) => item.id),
    );

    const normalizeParentId = (parentId?: string | null) => (parentId === undefined || parentId === null ? null : parentId);
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
    };

    const nestDirectoryList = (list: DirectoryItem[]) => {
        const indexMap = new Map<string, number>();
        list.forEach((item, index) => indexMap.set(item.id, index));
        const map = new Map<string, DirectoryItem & { children?: DirectoryItem[] }>();
        const roots: (DirectoryItem & { children?: DirectoryItem[] })[] = [];
        list.forEach(item => {
            map.set(item.id, { ...item, children: [] });
        });
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
                    setExpandedRowKeys((keys) => (keys.includes(record.id) ? keys : [...keys, record.id]));
                    addDirectoryRecord({ parentId: record.id });
                }}>添加下级</a>,
                <a key="delete" onClick={() => setDirectoryList(directoryList.filter((item) => item.id !== record.id))}>删除</a>,
            ],
        },
    ];

    return (
        <PageContainer>
            <Card style={{ marginBottom: 24 }}>
                <Descriptions>
                    <Descriptions.Item label="产品ID">{mockProductInfo.id}</Descriptions.Item>
                    <Descriptions.Item label="产品名称">{mockProductInfo.name}</Descriptions.Item>
                    <Descriptions.Item label="科目ID">{mockSubjectInfo.id}</Descriptions.Item>
                    <Descriptions.Item label="科目名称">{mockSubjectInfo.name}</Descriptions.Item>
                </Descriptions>
            </Card>

            <EditableProTable<DirectoryItem>
                rowKey="id"
                actionRef={actionRef}
                headerTitle="目录列表"
                recordCreatorProps={false}
                toolBarRender={() => [
                    <Button
                        key="add"
                        type="primary"
                        icon={<PlusOutlined />}
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
        </PageContainer>
    );
};

export default SubjectDirectory;
