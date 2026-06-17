import type { KnowledgeNode } from '@/services/tagSystem';
import {
  addKnowledgeNode,
  deleteKnowledgeNode,
  moveKnowledgeNode,
  updateKnowledgeNode,
} from '@/services/tagSystem';
import { HolderOutlined, SearchOutlined } from '@ant-design/icons';
import type { TreeProps } from 'antd';
import {
  Button,
  Card,
  Input,
  message,
  Modal,
  Select,
  Tooltip,
  Tree,
} from 'antd';
import React, { useCallback, useMemo, useState } from 'react';
import './TagSystemTreePanel.less';
import TreeNodeTitle from './TreeNodeTitle';
import type { TreeNodeData } from './treeHelpers';
import {
  allowCrossParentTreeDrop,
  appendTreeNode,
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

interface InlineEditState {
  key: React.Key;
  mode: 'add' | 'edit';
  parentKey?: React.Key | null;
  initialValue: string;
  description?: string;
  saving?: boolean;
}

const createDraftNodeKey = () => `draft-${Date.now()}`;

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
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);
  const displayTopicTree = useMemo(() => {
    if (!inlineEdit || inlineEdit.mode !== 'add') {
      return topicTreeData;
    }
    return appendTreeNode(
      topicTreeData,
      {
        key: inlineEdit.key,
        title: inlineEdit.initialValue,
      },
      inlineEdit.parentKey,
    );
  }, [inlineEdit, topicTreeData]);
  const topicSearch = useTreeSearch(displayTopicTree);

  const handleAddRoot = () => {
    setInlineEdit({
      key: createDraftNodeKey(),
      mode: 'add',
      parentKey: null,
      initialValue: '',
    });
  };

  const handleAddChild = (node: TreeNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    setInlineEdit({
      key: createDraftNodeKey(),
      mode: 'add',
      parentKey: node.key,
      initialValue: '',
    });
  };

  const handleEdit = (node: TreeNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    setInlineEdit({
      key: node.key,
      mode: 'edit',
      initialValue: node.title,
      description: node.description,
    });
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

  const handleCancelInlineEdit = () => {
    setInlineEdit(null);
  };

  const handleInlineEditSubmit = async (title: string) => {
    if (!inlineEdit) return;
    if (!title) {
      message.warning('请输入专题名称');
      return;
    }

    setInlineEdit({ ...inlineEdit, saving: true });
    const res =
      inlineEdit.mode === 'add'
        ? await addKnowledgeNode({
            title,
            parentId: inlineEdit.parentKey
              ? String(inlineEdit.parentKey)
              : null,
            subject: selectedSubject,
          })
        : await updateKnowledgeNode({
            id: String(inlineEdit.key),
            title,
            subject: selectedSubject,
            description: inlineEdit.description,
          });

    if (res.success) {
      message.success(inlineEdit.mode === 'add' ? '添加成功' : '修改成功');
      setInlineEdit(null);
      onRefresh();
    } else {
      message.error(res.message || '保存失败');
      setInlineEdit({ ...inlineEdit, saving: false });
    }
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
        {displayTopicTree.length > 0 ? (
          <Tree
            key={selectedSubject}
            treeData={displayTopicTree}
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
                inlineEdit={
                  inlineEdit?.key === node.key
                    ? {
                        initialValue: inlineEdit.initialValue,
                        placeholder: '请输入专题名称',
                        saving: inlineEdit.saving,
                        onSubmit: handleInlineEditSubmit,
                        onCancel: handleCancelInlineEdit,
                      }
                    : undefined
                }
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
    </>
  );
};

export default TopicTreePanel;
