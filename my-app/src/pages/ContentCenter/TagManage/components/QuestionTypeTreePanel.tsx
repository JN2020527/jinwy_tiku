import type { QuestionTypeNode } from '@/services/tagSystem';
import {
  addQuestionTypeNode,
  deleteQuestionTypeNode,
  updateQuestionTypeNode,
} from '@/services/tagSystem';
import {
  ModalForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { SearchOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, message, Modal, Tree } from 'antd';
import React, { useState } from 'react';
import TreeNodeTitle from './TreeNodeTitle';
import type { TreeNodeData } from './treeHelpers';
import { useTreeSearch } from './treeHelpers';

interface SelectOption {
  label: string;
  value: string;
}

interface QuestionTypeTreePanelProps {
  questionTypeTree: QuestionTypeNode[];
  selectedSubject: string;
  selectedSubjectLabel: string;
  subjectOptions: SelectOption[];
  onRefresh: () => void;
}

const QuestionTypeTreePanel: React.FC<QuestionTypeTreePanelProps> = ({
  questionTypeTree,
  selectedSubject,
  selectedSubjectLabel,
  subjectOptions,
  onRefresh,
}) => {
  const questionTypeSearch = useTreeSearch(
    questionTypeTree as unknown as TreeNodeData[],
  );
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
    qtForm.setFieldsValue({
      subject: selectedSubject,
    });
    setQtModalVisible(true);
  };

  const handleAddQtChild = (node: TreeNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    setQtModalType('add');
    setSelectedQtNode(node);
    qtForm.resetFields();
    qtForm.setFieldsValue({
      parentId: node.key,
      parentName: node.title,
      subject: node.subject || selectedSubject,
    });
    setQtModalVisible(true);
  };

  const handleEditQt = (node: TreeNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    setQtModalType('edit');
    setSelectedQtNode(node);
    qtForm.setFieldsValue({
      id: node.key,
      title: node.title,
      subject: node.subject || selectedSubject,
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
        const res = await deleteQuestionTypeNode(String(node.key), {
          subject: selectedSubject,
        });
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
    const payload = {
      ...values,
      subject: selectedSubject,
    };
    let res;
    if (qtModalType === 'add') {
      res = await addQuestionTypeNode(
        payload as Parameters<typeof addQuestionTypeNode>[0],
      );
    } else {
      res = await updateQuestionTypeNode({
        ...(payload as Parameters<typeof updateQuestionTypeNode>[0]),
        id: String(selectedQtNode?.key),
      });
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
        title={`${selectedSubjectLabel}题型结构树`}
        variant="borderless"
        extra={
          <Button type="primary" size="small" onClick={handleAddQtRoot}>
            添加根节点
          </Button>
        }
      >
        <Input
          prefix={<SearchOutlined style={{ color: '#ccc' }} />}
          allowClear
          style={{ marginBottom: 8 }}
          placeholder="搜索题型"
          onChange={questionTypeSearch.onSearch}
        />
        {questionTypeTree.length > 0 ? (
          <Tree
            key={selectedSubject}
            treeData={questionTypeTree}
            onExpand={questionTypeSearch.onExpand}
            expandedKeys={questionTypeSearch.expandedKeys}
            autoExpandParent={questionTypeSearch.autoExpandParent}
            showLine
            blockNode
            titleRender={(node: TreeNodeData) => (
              <TreeNodeTitle
                nodeData={node}
                searchValue={questionTypeSearch.searchValue}
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
            height={600}
          />
        ) : (
          <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
            当前学科暂无题型
          </div>
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
        <ProFormSelect
          name="subject"
          label="学科"
          disabled
          options={subjectOptions}
          initialValue={selectedSubject}
          rules={[{ required: true, message: '请选择学科' }]}
        />
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
