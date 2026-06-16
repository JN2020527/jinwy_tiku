import type { QuestionTypeNode } from '@/services/tagSystem';
import {
  addQuestionTypeNode,
  deleteQuestionTypeNode,
  updateQuestionTypeNode,
} from '@/services/tagSystem';
import {
  ModalForm,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Button, Card, Form, message, Modal, Tree } from 'antd';
import React, { useState } from 'react';
import TreeNodeTitle from './TreeNodeTitle';
import type { TreeNodeData } from './treeHelpers';

interface QuestionTypeTreePanelProps {
  questionTypeTree: QuestionTypeNode[];
  onRefresh: () => void;
}

const QuestionTypeTreePanel: React.FC<QuestionTypeTreePanelProps> = ({
  questionTypeTree,
  onRefresh,
}) => {
  const [selectedQtNode, setSelectedQtNode] = useState<TreeNodeData | null>(
    null,
  );
  const [qtModalVisible, setQtModalVisible] = useState<boolean>(false);
  const [qtModalType, setQtModalType] = useState<'add' | 'edit'>('add');
  const [qtForm] = Form.useForm();

  const handleAddQtRoot = () => {
    setQtModalType('add');
    setSelectedQtNode(null);
    qtForm.resetFields();
    setQtModalVisible(true);
  };

  const handleAddQtChild = (node: TreeNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    setQtModalType('add');
    setSelectedQtNode(node);
    qtForm.resetFields();
    qtForm.setFieldValue('parentId', node.key);
    qtForm.setFieldValue('parentName', node.title);
    setQtModalVisible(true);
  };

  const handleEditQt = (node: TreeNodeData, e: React.MouseEvent) => {
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

  const handleDeleteQt = (node: TreeNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除题型 "${node.title}" 吗？`,
      onOk: async () => {
        const res = await deleteQuestionTypeNode(node.key);
        if (res.success) {
          message.success('删除成功');
          onRefresh();
        } else {
          message.error('删除失败');
        }
      },
    });
  };

  const handleQtModalFinish = async (values: Record<string, unknown>) => {
    let res;
    if (qtModalType === 'add') {
      res = await addQuestionTypeNode(values);
    } else {
      res = await updateQuestionTypeNode({ ...values, id: selectedQtNode.key });
    }
    if (res.success) {
      message.success(qtModalType === 'add' ? '添加成功' : '修改成功');
      setQtModalVisible(false);
      onRefresh();
      return true;
    }
    return false;
  };

  return (
    <>
      <Card
        title="题型结构树"
        variant="borderless"
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
            titleRender={(node: TreeNodeData) => (
              <TreeNodeTitle
                nodeData={node}
                onAddChild={handleAddQtChild}
                onEdit={handleEditQt}
                onDelete={handleDeleteQt}
              />
            )}
            fieldNames={{
              title: 'title',
              key: 'key',
              children: 'children',
            }}
          />
        ) : (
          <div>暂无数据</div>
        )}
      </Card>

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
          <ProFormText
            name="parentId"
            label="父节点ID"
            hidden
            initialValue={selectedQtNode.key}
          />
        )}
        <ProFormText
          name="title"
          label="题型名称"
          rules={[{ required: true, message: '请输入题型名称' }]}
        />
        <ProFormTextArea name="description" label="描述" />
      </ModalForm>
    </>
  );
};

export default QuestionTypeTreePanel;
