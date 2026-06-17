import type { KnowledgeNode } from '@/services/tagSystem';
import {
  addKnowledgeNode,
  deleteKnowledgeNode,
  updateKnowledgeNode,
} from '@/services/tagSystem';
import { SearchOutlined } from '@ant-design/icons';
import {
  ModalForm,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Button, Card, Form, Input, message, Modal, Tree } from 'antd';
import React, { useState } from 'react';
import TreeNodeTitle from './TreeNodeTitle';
import type { TreeNodeData } from './treeHelpers';
import { useTreeSearch } from './treeHelpers';

interface TopicTreePanelProps {
  topicTree: KnowledgeNode[];
  selectedSubject: string;
  onRefresh: () => void;
}

const TopicTreePanel: React.FC<TopicTreePanelProps> = ({
  topicTree,
  selectedSubject,
  onRefresh,
}) => {
  const tagContext = {
    subject: selectedSubject,
  };
  const topicSearch = useTreeSearch(topicTree as unknown as TreeNodeData[]);
  const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [form] = Form.useForm();

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

  return (
    <>
      <Card
        title="专题体系"
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
          placeholder="搜索专题"
          onChange={topicSearch.onSearch}
        />
        {topicTree.length > 0 ? (
          <Tree
            treeData={topicTree}
            onExpand={topicSearch.onExpand}
            expandedKeys={topicSearch.expandedKeys}
            autoExpandParent={topicSearch.autoExpandParent}
            showLine
            blockNode
            titleRender={(node: TreeNodeData) => (
              <TreeNodeTitle
                nodeData={node}
                searchValue={topicSearch.searchValue}
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

      <ModalForm
        title={modalType === 'add' ? '添加专题' : '编辑专题'}
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
          label="专题名称"
          rules={[{ required: true, message: '请输入专题名称' }]}
        />
        <ProFormTextArea name="description" label="描述" />
      </ModalForm>
    </>
  );
};

export default TopicTreePanel;
