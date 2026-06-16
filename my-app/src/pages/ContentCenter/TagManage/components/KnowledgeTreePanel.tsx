import type {
  KnowledgeNode,
  TextbookChapter,
  TextbookVersion,
} from '@/services/tagSystem';
import {
  addKnowledgeNode,
  addTextbookChapter,
  deleteKnowledgeNode,
  deleteTextbookChapter,
  getTextbookChapters,
  getTextbookVersions,
  updateKnowledgeNode,
  updateTextbookChapter,
} from '@/services/tagSystem';
import { SearchOutlined } from '@ant-design/icons';
import {
  ModalForm,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Modal,
  Row,
  Select,
  Space,
  Tree,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import TreeNodeTitle from './TreeNodeTitle';
import type { TreeNodeData } from './treeHelpers';
import { useTreeSearch } from './treeHelpers';

interface KnowledgeTreePanelProps {
  knowledgeTree: KnowledgeNode[];
  selectedGrade: string;
  selectedSubject: string;
  onRefresh: () => void;
}

const GRADE_MAP: Record<string, string> = {
  'grade-7': '七年级',
  'grade-8': '八年级',
  'grade-9': '九年级',
  'grade-10': '高一',
  'grade-11': '高二',
  'grade-12': '高三',
};

const SUBJECT_MAP: Record<string, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
  physics: '物理',
  chemistry: '化学',
  biology: '生物',
  history: '历史',
  geography: '地理',
  politics: '道德与法治',
};

const KnowledgeTreePanel: React.FC<KnowledgeTreePanelProps> = ({
  knowledgeTree,
  selectedGrade,
  selectedSubject,
  onRefresh,
}) => {
  const tagContext = {
    grade: selectedGrade,
    subject: selectedSubject,
  };

  // Knowledge tree search
  const knowledgeSearch = useTreeSearch(
    knowledgeTree as unknown as TreeNodeData[],
  );

  // Knowledge Node State
  const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [form] = Form.useForm();

  // Textbook State
  const [textbookVersions, setTextbookVersions] = useState<TextbookVersion[]>(
    [],
  );
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [chapterTree, setChapterTree] = useState<TextbookChapter[]>([]);

  // Textbook tree search
  const textbookSearch = useTreeSearch(
    chapterTree as unknown as TreeNodeData[],
  );

  // Textbook Chapter Node State
  const [selectedTextbookNode, setSelectedTextbookNode] =
    useState<TreeNodeData | null>(null);
  const [textbookModalVisible, setTextbookModalVisible] =
    useState<boolean>(false);
  const [textbookModalType, setTextbookModalType] = useState<'add' | 'edit'>(
    'add',
  );
  const [textbookForm] = Form.useForm();

  // Fetch textbook versions (once on mount)
  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const versionRes = await getTextbookVersions();
        if (versionRes.success) {
          setTextbookVersions(versionRes.data);
          if (versionRes.data.length > 0) {
            setSelectedVersion(versionRes.data[0].value);
          }
        }
      } catch {
        message.error('获取教材版本失败');
      }
    };
    fetchVersions();
  }, []);

  // Fetch chapters when version changes
  const fetchChapters = useCallback(async () => {
    if (!selectedVersion) return;
    try {
      const res = await getTextbookChapters(selectedVersion);
      if (res.success) {
        setChapterTree(res.data);
      }
    } catch {
      message.error('获取章节失败');
    }
  }, [selectedVersion]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  // --- Knowledge Node Handlers ---
  const handleAddRoot = () => {
    setModalType('add');
    setSelectedNode(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleAddChild = (node: TreeNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalType('add');
    setSelectedNode(node);
    form.resetFields();
    form.setFieldValue('parentId', node.key);
    form.setFieldValue('parentName', node.title);
    setModalVisible(true);
  };

  const handleEdit = (node: TreeNodeData, e: React.MouseEvent) => {
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

  const handleDelete = (node: TreeNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除节点 "${node.title}" 吗？`,
      onOk: async () => {
        const res = await deleteKnowledgeNode(String(node.key), tagContext);
        if (res.success) {
          message.success('删除成功');
          onRefresh();
        } else {
          message.error('删除失败');
        }
      },
    });
  };

  const handleModalFinish = async (values: Record<string, unknown>) => {
    let res;
    const payload = {
      ...values,
      ...tagContext,
    };
    if (modalType === 'add') {
      res = await addKnowledgeNode(
        payload as Parameters<typeof addKnowledgeNode>[0],
      );
    } else {
      res = await updateKnowledgeNode({
        ...(payload as Parameters<typeof updateKnowledgeNode>[0]),
        id: String(selectedNode?.key),
      });
    }
    if (res.success) {
      message.success(modalType === 'add' ? '添加成功' : '修改成功');
      setModalVisible(false);
      onRefresh();
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

  const handleAddTextbookChild = (node: TreeNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    setTextbookModalType('add');
    setSelectedTextbookNode(node);
    textbookForm.resetFields();
    textbookForm.setFieldValue('parentId', node.key);
    textbookForm.setFieldValue('parentName', node.title);
    setTextbookModalVisible(true);
  };

  const handleEditTextbook = (node: TreeNodeData, e: React.MouseEvent) => {
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

  const handleDeleteTextbook = (node: TreeNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除章节 "${node.title}" 吗？`,
      onOk: async () => {
        const res = await deleteTextbookChapter(String(node.key));
        if (res.success) {
          message.success('删除成功');
          fetchChapters();
        } else {
          message.error('删除失败');
        }
      },
    });
  };

  const handleTextbookModalFinish = async (values: Record<string, unknown>) => {
    let res;
    const payload = {
      ...(values as Parameters<typeof addTextbookChapter>[0]),
      version: selectedVersion,
    };
    if (textbookModalType === 'add') {
      res = await addTextbookChapter(payload);
    } else {
      res = await updateTextbookChapter({
        ...(values as Parameters<typeof updateTextbookChapter>[0]),
        id: String(selectedTextbookNode?.key),
        version: selectedVersion,
      });
    }
    if (res.success) {
      message.success(textbookModalType === 'add' ? '添加成功' : '修改成功');
      setTextbookModalVisible(false);
      fetchChapters();
      return true;
    }
    return false;
  };

  const subjectLabel = SUBJECT_MAP[selectedSubject] || selectedSubject;
  const gradeLabel = GRADE_MAP[selectedGrade] || selectedGrade;

  return (
    <>
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
            variant="borderless"
            className="h-full"
            extra={
              <Button
                type="primary"
                size="small"
                onClick={handleAddTextbookRoot}
                disabled={!selectedVersion}
              >
                添加根节点
              </Button>
            }
          >
            <Input
              prefix={<SearchOutlined style={{ color: '#ccc' }} />}
              allowClear
              style={{ marginBottom: 8 }}
              placeholder="搜索章节"
              onChange={textbookSearch.onSearch}
            />
            {chapterTree.length > 0 ? (
              <Tree
                treeData={chapterTree}
                onExpand={textbookSearch.onExpand}
                expandedKeys={textbookSearch.expandedKeys}
                autoExpandParent={textbookSearch.autoExpandParent}
                showLine
                blockNode
                titleRender={(node: TreeNodeData) => (
                  <TreeNodeTitle
                    nodeData={node}
                    searchValue={textbookSearch.searchValue}
                    onAddChild={handleAddTextbookChild}
                    onEdit={handleEditTextbook}
                    onDelete={handleDeleteTextbook}
                  />
                )}
                fieldNames={{
                  title: 'title',
                  key: 'key',
                  children: 'children',
                }}
                height={600}
              />
            ) : (
              <div
                style={{
                  padding: 20,
                  textAlign: 'center',
                  color: '#999',
                }}
              >
                请选择教材版本或暂无数据
              </div>
            )}
          </Card>
        </Col>
        <Col span={12} style={{ borderLeft: '1px solid #f0f0f0' }}>
          <Card
            title={`${gradeLabel}${subjectLabel}知识点结构树`}
            variant="borderless"
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
              onChange={knowledgeSearch.onSearch}
            />
            {knowledgeTree.length > 0 ? (
              <Tree
                treeData={knowledgeTree}
                onExpand={knowledgeSearch.onExpand}
                expandedKeys={knowledgeSearch.expandedKeys}
                autoExpandParent={knowledgeSearch.autoExpandParent}
                showLine
                blockNode
                titleRender={(node: TreeNodeData) => (
                  <TreeNodeTitle
                    nodeData={node}
                    searchValue={knowledgeSearch.searchValue}
                    onAddChild={handleAddChild}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                )}
                fieldNames={{
                  title: 'title',
                  key: 'key',
                  children: 'children',
                }}
                height={600}
              />
            ) : (
              <div>暂无数据</div>
            )}
          </Card>
        </Col>
      </Row>

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
          <ProFormText
            name="parentId"
            label="父节点ID"
            hidden
            initialValue={selectedNode.key}
          />
        )}
        <ProFormText
          name="title"
          label="知识点名称"
          rules={[{ required: true, message: '请输入知识点名称' }]}
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
          <ProFormText
            name="parentId"
            label="父节点ID"
            hidden
            initialValue={selectedTextbookNode.key}
          />
        )}
        <ProFormText
          name="title"
          label="章节名称"
          rules={[{ required: true, message: '请输入章节名称' }]}
        />
        <ProFormTextArea name="description" label="描述" />
      </ModalForm>
    </>
  );
};

export default KnowledgeTreePanel;
