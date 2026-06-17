import type { KnowledgeNode } from '@/services/tagSystem';
import {
  addKnowledgeNode,
  deleteKnowledgeNode,
  moveKnowledgeNode,
  updateKnowledgeNode,
} from '@/services/tagSystem';
import { HolderOutlined, SearchOutlined } from '@ant-design/icons';
import {
  ModalForm,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import type { TreeProps } from 'antd';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Select,
  Tooltip,
  Tree,
} from 'antd';
import React, { useCallback, useState } from 'react';
import './TagSystemTreePanel.less';
import TreeNodeTitle from './TreeNodeTitle';
import type { TreeNodeData } from './treeHelpers';
import {
  allowCrossParentTreeDrop,
  getTreeMovePosition,
  useTreeSearch,
} from './treeHelpers';

interface SelectOption {
  label: string;
  value: string;
}

interface TopicTreePanelProps {
  topicTree: KnowledgeNode[];
  selectedSubject: string;
  subjectOptions: SelectOption[];
  onSubjectChange: (subject: string) => void;
  onRefresh: () => void;
}

const TopicTreePanel: React.FC<TopicTreePanelProps> = ({
  topicTree,
  selectedSubject,
  subjectOptions,
  onSubjectChange,
  onRefresh,
}) => {
  const tagContext = {
    subject: selectedSubject,
  };
  const topicTreeData = topicTree as unknown as TreeNodeData[];
  const topicSearch = useTreeSearch(topicTreeData);
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

  const allowTopicDrop = useCallback<NonNullable<TreeProps['allowDrop']>>(
    ({ dragNode, dropNode }) =>
      allowCrossParentTreeDrop(topicTreeData, dragNode.key, dropNode.key),
    [topicTreeData],
  );

  const handleDropTopic: TreeProps['onDrop'] = async (info) => {
    const res = await moveKnowledgeNode({
      id: String(info.dragNode.key),
      targetId: String(info.node.key),
      position: getTreeMovePosition(info),
      subject: selectedSubject,
    });

    if (res.success) {
      message.success('移动成功');
      onRefresh();
    } else {
      message.error(res.message || '移动失败');
    }
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
        className="tag-system-tree-panel"
        title="专题体系"
        variant="borderless"
        extra={
          <div className="tag-system-tree-card-extra">
            <div className="tag-system-tree-subject-filter">
              <span className="tag-system-tree-subject-label">学科</span>
              <Select
                value={selectedSubject}
                onChange={onSubjectChange}
                className="tag-system-tree-subject-select"
                options={subjectOptions}
                aria-label="选择学科"
              />
            </div>
            <Button type="primary" size="small" onClick={handleAddRoot}>
              添加根节点
            </Button>
          </div>
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
            key={selectedSubject}
            treeData={topicTree}
            onExpand={topicSearch.onExpand}
            expandedKeys={topicSearch.expandedKeys}
            autoExpandParent={topicSearch.autoExpandParent}
            draggable={{
              icon: (
                <Tooltip title="拖拽移动">
                  <HolderOutlined className="tag-system-tree-drag-icon" />
                </Tooltip>
              ),
            }}
            allowDrop={allowTopicDrop}
            onDrop={handleDropTopic}
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
