import {
    addAttribute,
    addKnowledgeNode,
    addQuestionTypeNode,
    addTagCategory,
    addTextbookChapter,
    deleteAttribute,
    deleteKnowledgeNode,
    deleteQuestionTypeNode,
    deleteTagCategory,
    deleteTextbookChapter,
    getKnowledgeTree,
    getQuestionTypeTree,
    getTagCategories,
    getTextbookChapters,
    getTextbookVersions,
    updateAttribute,
    updateKnowledgeNode,
    updateQuestionTypeNode,
    updateTextbookChapter,
    updateTagCategory,
} from '@/services/tagSystem';
import { DeleteOutlined, EditOutlined, PlusOutlined, SettingOutlined, SearchOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import {
    ModalForm,
    PageContainer,
    ProFormText,
    ProFormTextArea,
    ProFormSelect,
    ProFormList,
    ProFormGroup,
    EditableProTable,
} from '@ant-design/pro-components';
import { Button, Card, Col, Form, Input, message, Modal, Row, Select, Space, Spin, Tabs, Tag, Tooltip, Tree, Table } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';

const { Search } = Input;

// Helper to flatten tree for searching
const getParentKey = (key: React.Key, tree: any[]): React.Key => {
    let parentKey;
    for (let i = 0; i < tree.length; i++) {
        const node = tree[i];
        if (node.children) {
            if (node.children.some((item: any) => item.key === key)) {
                parentKey = node.key;
            } else if (getParentKey(key, node.children)) {
                parentKey = getParentKey(key, node.children);
            }
        }
    }
    return parentKey!;
};

const generateList = (data: any[], dataList: any[]) => {
    for (let i = 0; i < data.length; i++) {
        const node = data[i];
        const { key, title } = node;
        dataList.push({ key, title });
        if (node.children) {
            generateList(node.children, dataList);
        }
    }
};

const TagManage: React.FC = () => {
    const [knowledgeTree, setKnowledgeTree] = useState<any[]>([]);
    const [questionTypeTree, setQuestionTypeTree] = useState<any[]>([]);
    const [tagCategories, setTagCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    // Knowledge Node State
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [modalType, setModalType] = useState<'add' | 'edit'>('add');
    const [form] = Form.useForm();

    // Search State for Knowledge Tree
    const [knowledgeExpandedKeys, setKnowledgeExpandedKeys] = useState<React.Key[]>([]);
    const [knowledgeAutoExpandParent, setKnowledgeAutoExpandParent] = useState<boolean>(true);
    const [knowledgeSearchValue, setKnowledgeSearchValue] = useState<string>('');

    // Search State for Textbook Tree
    const [textbookExpandedKeys, setTextbookExpandedKeys] = useState<React.Key[]>([]);
    const [textbookAutoExpandParent, setTextbookAutoExpandParent] = useState<boolean>(true);
    const [textbookSearchValue, setTextbookSearchValue] = useState<string>('');

    // Question Type Node State
    const [selectedQtNode, setSelectedQtNode] = useState<any>(null);
    const [qtModalVisible, setQtModalVisible] = useState<boolean>(false);
    const [qtModalType, setQtModalType] = useState<'add' | 'edit'>('add');
    const [qtForm] = Form.useForm();

    // Textbook Chapter Node State
    const [selectedTextbookNode, setSelectedTextbookNode] = useState<any>(null);
    const [textbookModalVisible, setTextbookModalVisible] = useState<boolean>(false);
    const [textbookModalType, setTextbookModalType] = useState<'add' | 'edit'>('add');
    const [textbookForm] = Form.useForm();

    // Attribute Modal State
    const [attrModalVisible, setAttrModalVisible] = useState<boolean>(false);
    const [attrModalType, setAttrModalType] = useState<'add' | 'edit'>('add');
    const [currentCategoryId, setCurrentCategoryId] = useState<string>('');
    const [selectedAttr, setSelectedAttr] = useState<any>(null);
    const [attrForm] = Form.useForm();
    const [editingCategories, setEditingCategories] = useState<Record<string, boolean>>({});

    // Category Modal State
    const [catModalVisible, setCatModalVisible] = useState<boolean>(false);
    const [catModalType, setCatModalType] = useState<'add' | 'edit'>('add');
    const [catForm] = Form.useForm();

    // Textbook State
    const [textbookVersions, setTextbookVersions] = useState<any[]>([]);
    const [selectedVersion, setSelectedVersion] = useState<string>('');
    const [chapterTree, setChapterTree] = useState<any[]>([]);

    // Global Filters State
    const [selectedStage, setSelectedStage] = useState<string>('junior');
    const [selectedSubject, setSelectedSubject] = useState<string>('math');

    const fetchData = async () => {
        setLoading(true);
        try {
            const treeRes = await getKnowledgeTree();
            const qtRes = await getQuestionTypeTree();
            const catRes = await getTagCategories();
            const versionRes = await getTextbookVersions();

            if (treeRes.success) {
                setKnowledgeTree(treeRes.data);
            }
            if (qtRes.success) {
                setQuestionTypeTree(qtRes.data);
            }
            if (catRes.success) {
                setTagCategories(catRes.data);
            }
            if (versionRes.success) {
                setTextbookVersions(versionRes.data);
                if (versionRes.data.length > 0 && !selectedVersion) {
                    setSelectedVersion(versionRes.data[0].value);
                }
            }
        } catch (error) {
            console.error('Failed to fetch tag data', error);
            message.error('获取数据失败');
        } finally {
            setLoading(false);
        }
    };

    const fetchChapters = async () => {
        if (!selectedVersion) return;
        try {
            const res = await getTextbookChapters(selectedVersion);
            if (res.success) {
                setChapterTree(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch chapters', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedStage, selectedSubject]);

    useEffect(() => {
        fetchChapters();
    }, [selectedVersion]);

    // --- Search Handlers ---
    const onKnowledgeExpand = (newExpandedKeys: React.Key[]) => {
        setKnowledgeExpandedKeys(newExpandedKeys);
        setKnowledgeAutoExpandParent(false);
    };

    const onKnowledgeSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        const dataList: any[] = [];
        generateList(knowledgeTree, dataList);

        const newExpandedKeys = dataList
            .map((item) => {
                if (item.title.indexOf(value) > -1) {
                    return getParentKey(item.key, knowledgeTree);
                }
                return null;
            })
            .filter((item, i, self) => item && self.indexOf(item) === i);

        setKnowledgeExpandedKeys(newExpandedKeys as React.Key[]);
        setKnowledgeSearchValue(value);
        setKnowledgeAutoExpandParent(true);
    };

    const onTextbookExpand = (newExpandedKeys: React.Key[]) => {
        setTextbookExpandedKeys(newExpandedKeys);
        setTextbookAutoExpandParent(false);
    };

    const onTextbookSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        const dataList: any[] = [];
        generateList(chapterTree, dataList);

        const newExpandedKeys = dataList
            .map((item) => {
                if (item.title.indexOf(value) > -1) {
                    return getParentKey(item.key, chapterTree);
                }
                return null;
            })
            .filter((item, i, self) => item && self.indexOf(item) === i);

        setTextbookExpandedKeys(newExpandedKeys as React.Key[]);
        setTextbookSearchValue(value);
        setTextbookAutoExpandParent(true);
    };

    // --- Knowledge Node Handlers ---
    const handleAddRoot = () => {
        setModalType('add');
        setSelectedNode(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleAddChild = (node: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setModalType('add');
        setSelectedNode(node);
        form.resetFields();
        form.setFieldValue('parentId', node.key);
        form.setFieldValue('parentName', node.title);
        setModalVisible(true);
    };

    const handleEdit = (node: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setModalType('edit');
        setSelectedNode(node);
        form.setFieldsValue({
            id: node.key,
            title: node.title,
            description: node.description,
        });
        setModalVisible(true);
    };

    const handleDelete = (node: any, e: React.MouseEvent) => {
        e.stopPropagation();
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除节点 "${node.title}" 吗？`,
            onOk: async () => {
                const res = await deleteKnowledgeNode(node.key);
                if (res.success) {
                    message.success('删除成功');
                    fetchData();
                } else {
                    message.error('删除失败');
                }
            },
        });
    };

    const handleModalFinish = async (values: any) => {
        let res;
        if (modalType === 'add') {
            res = await addKnowledgeNode(values);
        } else {
            res = await updateKnowledgeNode({ ...values, id: selectedNode.key });
        }
        if (res.success) {
            message.success(modalType === 'add' ? '添加成功' : '修改成功');
            setModalVisible(false);
            fetchData();
            return true;
        }
        return false;
    };

    // --- Question Type Node Handlers ---
    const handleAddQtRoot = () => {
        setQtModalType('add');
        setSelectedQtNode(null);
        qtForm.resetFields();
        setQtModalVisible(true);
    };

    const handleAddQtChild = (node: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setQtModalType('add');
        setSelectedQtNode(node);
        qtForm.resetFields();
        qtForm.setFieldValue('parentId', node.key);
        qtForm.setFieldValue('parentName', node.title);
        setQtModalVisible(true);
    };

    const handleEditQt = (node: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setQtModalType('edit');
        setSelectedQtNode(node);
        qtForm.setFieldsValue({
            id: node.key,
            title: node.title,
            description: node.description,
        });
        setQtModalVisible(true);
    };

    const handleDeleteQt = (node: any, e: React.MouseEvent) => {
        e.stopPropagation();
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除题型 "${node.title}" 吗？`,
            onOk: async () => {
                const res = await deleteQuestionTypeNode(node.key);
                if (res.success) {
                    message.success('删除成功');
                    fetchData();
                } else {
                    message.error('删除失败');
                }
            },
        });
    };

    const handleQtModalFinish = async (values: any) => {
        let res;
        if (qtModalType === 'add') {
            res = await addQuestionTypeNode(values);
        } else {
            res = await updateQuestionTypeNode({ ...values, id: selectedQtNode.key });
        }
        if (res.success) {
            message.success(qtModalType === 'add' ? '添加成功' : '修改成功');
            setQtModalVisible(false);
            fetchData();
            return true;
        }
        return false;
    };

    // --- Textbook Chapter Node Handlers ---
    const handleAddTextbookRoot = () => {
        setTextbookModalType('add');
        setSelectedTextbookNode(null);
        textbookForm.resetFields();
        setTextbookModalVisible(true);
    };

    const handleAddTextbookChild = (node: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setTextbookModalType('add');
        setSelectedTextbookNode(node);
        textbookForm.resetFields();
        textbookForm.setFieldValue('parentId', node.key);
        textbookForm.setFieldValue('parentName', node.title);
        setTextbookModalVisible(true);
    };

    const handleEditTextbook = (node: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setTextbookModalType('edit');
        setSelectedTextbookNode(node);
        textbookForm.setFieldsValue({
            id: node.key,
            title: node.title,
            description: node.description,
        });
        setTextbookModalVisible(true);
    };

    const handleDeleteTextbook = (node: any, e: React.MouseEvent) => {
        e.stopPropagation();
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除章节 "${node.title}" 吗？`,
            onOk: async () => {
                const res = await deleteTextbookChapter(node.key);
                if (res.success) {
                    message.success('删除成功');
                    fetchChapters(); // Refresh chapters
                } else {
                    message.error('删除失败');
                }
            },
        });
    };

    const handleTextbookModalFinish = async (values: any) => {
        let res;
        const payload = { ...values, version: selectedVersion }; // Include version context
        if (textbookModalType === 'add') {
            res = await addTextbookChapter(payload);
        } else {
            res = await updateTextbookChapter({ ...payload, id: selectedTextbookNode.key });
        }
        if (res.success) {
            message.success(textbookModalType === 'add' ? '添加成功' : '修改成功');
            setTextbookModalVisible(false);
            fetchChapters();
            return true;
        }
        return false;
    };

    // --- Attribute Category Handlers ---
    const handleAddCategory = () => {
        setCatModalType('add');
        catForm.resetFields();
        setEditableKeys([]);
        setCatModalVisible(true);
    };

    const handleEditCategory = (category: any) => {
        setCatModalType('edit');
        setCurrentCategoryId(category.id);
        catForm.setFieldsValue({
            name: category.name,
            tags: category.tags,
        });
        setEditableKeys([]);
        setCatModalVisible(true);
    };



    const handleCatModalFinish = async (values: any) => {
        let res;
        if (catModalType === 'add') {
            res = await addTagCategory(values);
        } else {
            res = await updateTagCategory({ ...values, id: currentCategoryId });
        }

        if (res.success) {
            message.success(catModalType === 'add' ? '分类添加成功' : '分类更新成功');
            setCatModalVisible(false);
            fetchData();
            return true;
        }
        return false;
    };

    const handleDeleteCategory = (cat: any) => {
        Modal.confirm({
            title: '确认删除分类',
            content: `确定要删除分类 "${cat.name}" 及其所有标签吗？`,
            onOk: async () => {
                const res = await deleteTagCategory(cat.id);
                if (res.success) {
                    message.success('删除成功');
                    fetchData();
                }
            }
        });
    };

    // --- Attribute Handlers ---
    const toggleEdit = (categoryId: string) => {
        setEditingCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
    };

    const handleAddAttr = (categoryId: string) => {
        setAttrModalType('add');
        setCurrentCategoryId(categoryId);
        setSelectedAttr(null);
        attrForm.resetFields();
        setAttrModalVisible(true);
    };

    const handleEditAttr = (categoryId: string, item: any) => {
        setAttrModalType('edit');
        setCurrentCategoryId(categoryId);
        setSelectedAttr(item);
        attrForm.setFieldsValue({
            name: item.name,
            color: item.color,
        });
        setAttrModalVisible(true);
    };

    const handleDeleteAttr = (categoryId: string, item: any) => {
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除标签 "${item.name}" 吗？`,
            onOk: async () => {
                const res = await deleteAttribute(item.id, categoryId);
                if (res.success) {
                    message.success('删除成功');
                    fetchData();
                } else {
                    message.error('删除失败');
                }
            },
        });
    };

    const handleAttrModalFinish = async (values: any) => {
        let res;
        const payload = { ...values, categoryId: currentCategoryId };
        if (attrModalType === 'add') {
            res = await addAttribute(payload);
        } else {
            res = await updateAttribute({ ...payload, id: selectedAttr.id });
        }

        if (res.success) {
            message.success(attrModalType === 'add' ? '添加成功' : '修改成功');
            setAttrModalVisible(false);
            fetchData();
            return true;
        }
        return false;
    };

    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const [editableKeys, setEditableKeys] = useState<React.Key[]>([]);

    const toggleExpand = (categoryId: string) => {
        setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
    };

    const [inputVisible, setInputVisible] = useState<Record<string, boolean>>({});
    const [inputValue, setInputValue] = useState<Record<string, string>>({});

    const showInput = (categoryId: string) => {
        setInputVisible(prev => ({ ...prev, [categoryId]: true }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, categoryId: string) => {
        setInputValue(prev => ({ ...prev, [categoryId]: e.target.value }));
    };

    const handleInputConfirm = async (categoryId: string) => {
        const value = inputValue[categoryId];
        if (value) {
            const res = await addAttribute({ categoryId, name: value, color: 'default' });
            if (res.success) {
                message.success('添加成功');
                fetchData();
            }
        }
        setInputVisible(prev => ({ ...prev, [categoryId]: false }));
        setInputValue(prev => ({ ...prev, [categoryId]: '' }));
    };

    const columns = [
        {
            title: '标签分类',
            dataIndex: 'name',
            key: 'name',
            width: 150,
            render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
        },
        {
            title: '包含标签',
            key: 'tags',
            render: (_: any, record: any) => {
                const isEditing = editingCategories[record.id];
                const isExpanded = expandedCategories[record.id];
                const MAX_VISIBLE_TAGS = 15;
                const tags = record.tags || [];
                const visibleTags = isExpanded ? tags : tags.slice(0, MAX_VISIBLE_TAGS);
                const hasMore = tags.length > MAX_VISIBLE_TAGS;

                return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        {visibleTags.map((item: any) => (
                            <Tag
                                key={item.id}
                                color="default"
                                closable={isEditing}
                                onClose={(e) => {
                                    e.preventDefault();
                                    handleDeleteAttr(record.id, item);
                                }}
                                style={{ cursor: isEditing ? 'pointer' : 'default', margin: 0 }}
                                onClick={() => {
                                    if (isEditing) handleEditAttr(record.id, item);
                                }}
                            >
                                {item.name}
                            </Tag>
                        ))}
                        {hasMore && (
                            <Button
                                type="link"
                                size="small"
                                onClick={() => toggleExpand(record.id)}
                                style={{ padding: 0 }}
                            >
                                {isExpanded ? '收起' : `展开(${tags.length})`}
                            </Button>
                        )}
                        {!tags.length && !inputVisible[record.id] && <span style={{ color: '#999', fontSize: '12px' }}>暂无标签</span>}
                        {inputVisible[record.id] && (
                            <Input
                                type="text"
                                size="small"
                                style={{ width: 78 }}
                                value={inputValue[record.id]}
                                onChange={(e) => handleInputChange(e, record.id)}
                                onBlur={() => handleInputConfirm(record.id)}
                                onPressEnter={() => handleInputConfirm(record.id)}
                                autoFocus
                            />
                        )}
                    </div>
                );
            },
        },
        {
            title: '操作',
            key: 'action',
            width: 200,
            render: (_: any, record: any) => {
                const isEditing = editingCategories[record.id];
                return (
                    <Space>
                        <Button
                            type="link"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEditCategory(record)}
                        >
                            编辑
                        </Button>
                        <Button
                            type="text"
                            danger
                            size="small"
                            onClick={() => handleDeleteCategory(record)}
                        >
                            删除
                        </Button>
                    </Space>
                );
            },
        },
    ];

    const titleRender = (nodeData: any, type: 'knowledge' | 'questionType' | 'textbook') => {
        let addHandler, editHandler, deleteHandler;
        let searchValue = '';

        if (type === 'knowledge') {
            addHandler = handleAddChild;
            editHandler = handleEdit;
            deleteHandler = handleDelete;
            searchValue = knowledgeSearchValue;
        } else if (type === 'questionType') {
            addHandler = handleAddQtChild;
            editHandler = handleEditQt;
            deleteHandler = handleDeleteQt;
        } else {
            addHandler = handleAddTextbookChild;
            editHandler = handleEditTextbook;
            deleteHandler = handleDeleteTextbook;
            searchValue = textbookSearchValue;
        }

        // Highlight search term
        const index = nodeData.title.indexOf(searchValue);
        const beforeStr = nodeData.title.substr(0, index);
        const afterStr = nodeData.title.substr(index + searchValue.length);
        const title =
            index > -1 ? (
                <span>
                    {beforeStr}
                    <span style={{ color: '#f50' }}>{searchValue}</span>
                    {afterStr}
                </span>
            ) : (
                <span>{nodeData.title}</span>
            );

        return (
            <div className="group flex items-center justify-between" style={{ width: '100%', display: 'flex' }}>
                <span>{title}</span>
                <Space className="action-icons" style={{ marginLeft: 12 }}>
                    <Tooltip title="添加子节点">
                        <PlusOutlined
                            className="cursor-pointer text-blue-500"
                            onClick={(e) => addHandler(nodeData, e)}
                            style={{ color: '#1890ff' }}
                        />
                    </Tooltip>
                    <Tooltip title="编辑">
                        <EditOutlined
                            className="cursor-pointer text-green-500"
                            onClick={(e) => editHandler(nodeData, e)}
                            style={{ color: '#52c41a' }}
                        />
                    </Tooltip>
                    <Tooltip title="删除">
                        <DeleteOutlined
                            className="cursor-pointer text-red-500"
                            onClick={(e) => deleteHandler(nodeData, e)}
                            style={{ color: '#ff4d4f' }}
                        />
                    </Tooltip>
                </Space>
            </div>
        );
    };

    return (
        <PageContainer>
            <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '16px 24px' }}>
                <Space size="large">
                    <Space>
                        <span>学段：</span>
                        <Select
                            value={selectedStage}
                            onChange={setSelectedStage}
                            style={{ width: 120 }}
                            options={[
                                { label: '初中', value: 'junior' },
                                { label: '高中', value: 'senior' },
                            ]}
                        />
                    </Space>
                    <Space>
                        <span>学科：</span>
                        <Select
                            value={selectedSubject}
                            onChange={setSelectedSubject}
                            style={{ width: 120 }}
                            options={[
                                { label: '语文', value: 'chinese' },
                                { label: '数学', value: 'math' },
                                { label: '英语', value: 'english' },
                                { label: '物理', value: 'physics' },
                                { label: '化学', value: 'chemistry' },
                                { label: '生物', value: 'biology' },
                                { label: '历史', value: 'history' },
                                { label: '地理', value: 'geography' },
                                { label: '道德与法治', value: 'politics' },
                            ]}
                        />
                    </Space>
                </Space>
            </Card>

            <Spin spinning={loading}>
                <Card>
                    <Tabs
                        items={[
                            {
                                label: '知识体系管理',
                                key: 'knowledge-system',
                                children: (
                                    <Row gutter={24}>
                                        <Col span={12}>
                                            <Card
                                                title={
                                                    <Space>
                                                        <span>教材目录</span>
                                                        <Select
                                                            value={selectedVersion}
                                                            onChange={setSelectedVersion}
                                                            style={{ width: 140 }}
                                                            size="small"
                                                            options={textbookVersions}
                                                        />
                                                    </Space>
                                                }
                                                bordered={false}
                                                className="h-full"
                                                extra={
                                                    <Button type="primary" size="small" onClick={handleAddTextbookRoot} disabled={!selectedVersion}>
                                                        添加根节点
                                                    </Button>
                                                }
                                            >
                                                <Input
                                                    prefix={<SearchOutlined style={{ color: '#ccc' }} />}
                                                    allowClear
                                                    style={{ marginBottom: 8 }}
                                                    placeholder="搜索章节"
                                                    onChange={onTextbookSearch}
                                                />
                                                {chapterTree.length > 0 ? (
                                                    <Tree
                                                        treeData={chapterTree}
                                                        onExpand={onTextbookExpand}
                                                        expandedKeys={textbookExpandedKeys}
                                                        autoExpandParent={textbookAutoExpandParent}
                                                        showLine
                                                        blockNode
                                                        titleRender={(node) => titleRender(node, 'textbook')}
                                                        fieldNames={{ title: 'title', key: 'key', children: 'children' }}
                                                        height={600}
                                                    />
                                                ) : (
                                                    <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
                                                        请选择教材版本或暂无数据
                                                    </div>
                                                )}
                                            </Card>
                                        </Col>
                                        <Col span={12} style={{ borderLeft: '1px solid #f0f0f0' }}>
                                            <Card
                                                title={`${selectedStage === 'junior' ? '初中' : '高中'}${selectedSubject === 'math' ? '数学' :
                                                    selectedSubject === 'chinese' ? '语文' :
                                                        selectedSubject === 'english' ? '英语' :
                                                            selectedSubject === 'physics' ? '物理' :
                                                                selectedSubject === 'chemistry' ? '化学' :
                                                                    selectedSubject === 'biology' ? '生物' :
                                                                        selectedSubject === 'history' ? '历史' :
                                                                            selectedSubject === 'geography' ? '地理' : '道德与法治'
                                                    }知识点结构树`}
                                                bordered={false}
                                                extra={
                                                    <Button type="primary" size="small" onClick={handleAddRoot}>
                                                        添加根节点
                                                    </Button>
                                                }
                                            >
                                                <Input
                                                    prefix={<SearchOutlined style={{ color: '#ccc' }} />}
                                                    allowClear
                                                    style={{ marginBottom: 8 }}
                                                    placeholder="搜索知识点"
                                                    onChange={onKnowledgeSearch}
                                                />
                                                {knowledgeTree.length > 0 ? (
                                                    <Tree
                                                        treeData={knowledgeTree}
                                                        onExpand={onKnowledgeExpand}
                                                        expandedKeys={knowledgeExpandedKeys}
                                                        autoExpandParent={knowledgeAutoExpandParent}
                                                        showLine
                                                        blockNode
                                                        titleRender={(node) => titleRender(node, 'knowledge')}
                                                        fieldNames={{ title: 'title', key: 'key', children: 'children' }}
                                                        height={600}
                                                    />
                                                ) : (
                                                    <div>暂无数据</div>
                                                )}
                                            </Card>
                                        </Col>
                                    </Row>
                                ),
                            },
                            {
                                label: '题型管理',
                                key: 'questionType',
                                children: (
                                    <Card
                                        title="题型结构树"
                                        bordered={false}
                                        extra={
                                            <Button type="primary" size="small" onClick={handleAddQtRoot}>
                                                添加根节点
                                            </Button>
                                        }
                                    >
                                        {questionTypeTree.length > 0 ? (
                                            <Tree
                                                treeData={questionTypeTree}
                                                defaultExpandAll
                                                showLine
                                                blockNode
                                                titleRender={(node) => titleRender(node, 'questionType')}
                                                fieldNames={{ title: 'title', key: 'key', children: 'children' }}
                                            />
                                        ) : (
                                            <div>暂无数据</div>
                                        )}
                                    </Card>
                                ),
                            },
                            {
                                label: '属性标签管理',
                                key: 'attributes',
                                children: (
                                    <div>
                                        <div style={{ marginBottom: 16 }}>
                                            <Button type="dashed" block icon={<PlusOutlined />} onClick={handleAddCategory}>
                                                添加标签分类
                                            </Button>
                                        </div>
                                        <Table
                                            dataSource={tagCategories}
                                            columns={columns}
                                            rowKey="id"
                                            pagination={false}
                                            size="small"
                                        />
                                    </div>
                                ),
                            },
                        ]}
                    />
                </Card>
            </Spin>

            {/* Knowledge Node Modal */}
            <ModalForm
                title={modalType === 'add' ? '添加知识点' : '编辑知识点'}
                open={modalVisible}
                onOpenChange={setModalVisible}
                form={form}
                onFinish={handleModalFinish}
            >
                {modalType === 'add' && selectedNode && (
                    <ProFormText
                        name="parentName"
                        label="父节点"
                        disabled
                        initialValue={selectedNode.title}
                    />
                )}
                {modalType === 'add' && selectedNode && (
                    <ProFormText name="parentId" label="父节点ID" hidden initialValue={selectedNode.key} />
                )}
                <ProFormText
                    name="title"
                    label="知识点名称"
                    rules={[{ required: true, message: '请输入知识点名称' }]}
                />
                <ProFormTextArea name="description" label="描述" />
            </ModalForm>

            {/* Question Type Node Modal */}
            <ModalForm
                title={qtModalType === 'add' ? '添加题型' : '编辑题型'}
                open={qtModalVisible}
                onOpenChange={setQtModalVisible}
                form={qtForm}
                onFinish={handleQtModalFinish}
            >
                {qtModalType === 'add' && selectedQtNode && (
                    <ProFormText
                        name="parentName"
                        label="父节点"
                        disabled
                        initialValue={selectedQtNode.title}
                    />
                )}
                {qtModalType === 'add' && selectedQtNode && (
                    <ProFormText name="parentId" label="父节点ID" hidden initialValue={selectedQtNode.key} />
                )}
                <ProFormText
                    name="title"
                    label="题型名称"
                    rules={[{ required: true, message: '请输入题型名称' }]}
                />
                <ProFormTextArea name="description" label="描述" />
            </ModalForm>

            {/* Textbook Chapter Node Modal */}
            <ModalForm
                title={textbookModalType === 'add' ? '添加章节' : '编辑章节'}
                open={textbookModalVisible}
                onOpenChange={setTextbookModalVisible}
                form={textbookForm}
                onFinish={handleTextbookModalFinish}
            >
                {textbookModalType === 'add' && selectedTextbookNode && (
                    <ProFormText
                        name="parentName"
                        label="父节点"
                        disabled
                        initialValue={selectedTextbookNode.title}
                    />
                )}
                {textbookModalType === 'add' && selectedTextbookNode && (
                    <ProFormText name="parentId" label="父节点ID" hidden initialValue={selectedTextbookNode.key} />
                )}
                <ProFormText
                    name="title"
                    label="章节名称"
                    rules={[{ required: true, message: '请输入章节名称' }]}
                />
                <ProFormTextArea name="description" label="描述" />
            </ModalForm>

            {/* Attribute Modal */}
            <ModalForm
                title={attrModalType === 'add' ? '添加属性标签' : '编辑属性标签'}
                open={attrModalVisible}
                onOpenChange={setAttrModalVisible}
                form={attrForm}
                onFinish={handleAttrModalFinish}
                width={400}
            >
                <ProFormText
                    name="name"
                    label="标签名称"
                    rules={[{ required: true, message: '请输入标签名称' }]}
                />

            </ModalForm>

            {/* Category Modal [NEW] */}
            <ModalForm
                title={catModalType === 'add' ? '添加标签分类' : '编辑标签分类'}
                open={catModalVisible}
                onOpenChange={setCatModalVisible}
                form={catForm}
                onFinish={handleCatModalFinish}
                width={580}
            >
                <ProFormText
                    name="name"
                    label="分类名称"
                    rules={[{ required: true, message: '请输入分类名称' }]}
                    placeholder="例如：年份、来源、VIP属性"
                />
                <EditableProTable<any>
                    name="tags"
                    rowKey="id"
                    toolBarRender={false}
                    columns={[
                        {
                            title: '标签名称',
                            dataIndex: 'name',
                            formItemProps: {
                                rules: [{ required: true, message: '此项为必填项' }],
                            },
                            width: '80%',
                        },
                        {
                            title: '操作',
                            valueType: 'option',
                            width: 100,
                            render: (text: any, record: any, _: any, action: any) => [
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
                                        const dataSource = catForm.getFieldValue('tags');
                                        const newDataSource = dataSource.filter((item: any) => item.id !== record.id);
                                        catForm.setFieldsValue({ tags: newDataSource });
                                    }}
                                >
                                    删除
                                </a>,
                            ],
                        },
                    ]}
                    recordCreatorProps={{
                        newRecordType: 'dataSource',
                        position: 'bottom',
                        record: () => ({ id: Date.now(), name: '' }),
                        creatorButtonText: '添加新标签',
                    }}
                    editable={{
                        type: 'multiple',
                        editableKeys,
                        onChange: setEditableKeys,
                        onValuesChange: (record: any, recordList: any) => {
                            catForm.setFieldsValue({ tags: recordList });
                        },
                        actionRender: (row, config, defaultDom) => [
                            defaultDom.save,
                            defaultDom.cancel,
                        ],
                    }}
                />
            </ModalForm>
        </PageContainer >
    );
};

export default TagManage;
