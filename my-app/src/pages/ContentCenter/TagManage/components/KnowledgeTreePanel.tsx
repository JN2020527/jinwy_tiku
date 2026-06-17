import type { TextbookChapter } from '@/services/tagSystem';
import {
  addTextbookChapter,
  deleteTextbookChapter,
  getTextbookChapters,
  getTextbookVersions,
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
  Form,
  Input,
  message,
  Modal,
  Tree,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import TreeNodeTitle from './TreeNodeTitle';
import type { TreeNodeData } from './treeHelpers';
import { useTreeSearch } from './treeHelpers';

interface KnowledgeTreePanelProps {
  selectedSubject: string;
}

const KnowledgeTreePanel: React.FC<KnowledgeTreePanelProps> = ({
  selectedSubject,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [chapterTree, setChapterTree] = useState<TextbookChapter[]>([]);
  const textbookSearch = useTreeSearch(
    chapterTree as unknown as TreeNodeData[],
  );
  const [selectedTextbookNode, setSelectedTextbookNode] =
    useState<TreeNodeData | null>(null);
  const [textbookModalVisible, setTextbookModalVisible] =
    useState<boolean>(false);
  const [textbookModalType, setTextbookModalType] = useState<'add' | 'edit'>(
    'add',
  );
  const [textbookForm] = Form.useForm();

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const versionRes = await getTextbookVersions();
        if (versionRes.success) {
          if (versionRes.data.length > 0) {
            setSelectedVersion(versionRes.data[0].value);
          }
        }
      } catch {
        message.error('获取知识体系失败');
      }
    };
    fetchVersions();
  }, []);

  const fetchChapters = useCallback(async () => {
    if (!selectedVersion) return;
    try {
      const res = await getTextbookChapters(selectedVersion, selectedSubject);
      if (res.success) {
        setChapterTree(res.data);
      }
    } catch {
      message.error('获取知识体系失败');
    }
  }, [selectedSubject, selectedVersion]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

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
      content: `确定要删除知识节点 "${node.title}" 吗？`,
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

  return (
    <>
      <Card
        title="知识体系"
        variant="borderless"
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
          placeholder="搜索知识节点"
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
            暂无数据
          </div>
        )}
      </Card>

      <ModalForm
        title={textbookModalType === 'add' ? '添加知识节点' : '编辑知识节点'}
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
          label="知识节点名称"
          rules={[{ required: true, message: '请输入知识节点名称' }]}
        />
        <ProFormTextArea name="description" label="描述" />
      </ModalForm>
    </>
  );
};

export default KnowledgeTreePanel;
