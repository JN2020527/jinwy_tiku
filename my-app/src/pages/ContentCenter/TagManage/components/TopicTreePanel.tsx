import type {
  AttributeUsageRule,
  KnowledgeNode,
  NodeAttributeRelation,
  TagCategory,
} from '@/services/tagSystem';
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
  Tag,
  Tooltip,
  Tree,
} from 'antd';
import React, { useCallback, useMemo, useState } from 'react';
import {
  getCategoryMap,
  getDisplayAttributeIds,
  getOptionMap,
} from './nodeAttributeRelationHelpers';
import './TagSystemTreePanel.less';
import type { TreeNodeData } from './treeHelpers';
import {
  allowCrossParentTreeDrop,
  appendTreeNode,
  getTreeMoveRequest,
  useTreeSearch,
} from './treeHelpers';
import TreeNodeTitle from './TreeNodeTitle';

interface SelectOption {
  label: string;
  value: string;
}

interface TopicTreePanelProps {
  topicTree: KnowledgeNode[];
  tagCategories: TagCategory[];
  usageRules: AttributeUsageRule[];
  nodeRelations: NodeAttributeRelation[];
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
  tagCategories,
  usageRules,
  nodeRelations,
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
  const [arrangeMode, setArrangeMode] = useState(false);
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

  const displayAttributeIds = useMemo(
    () => getDisplayAttributeIds(usageRules, 'topic'),
    [usageRules],
  );
  const categoryMap = useMemo(
    () => getCategoryMap(tagCategories),
    [tagCategories],
  );
  const optionMap = useMemo(
    () => getOptionMap(tagCategories, selectedSubject),
    [selectedSubject, tagCategories],
  );
  const relationMapByNode = useMemo(() => {
    const map = new Map<string, NodeAttributeRelation[]>();
    nodeRelations
      .filter(
        (relation) =>
          relation.targetType === 'topic' &&
          relation.subject === selectedSubject,
      )
      .forEach((relation) => {
        map.set(relation.nodeId, [
          ...(map.get(relation.nodeId) || []),
          relation,
        ]);
      });
    return map;
  }, [nodeRelations, selectedSubject]);

  const renderNodeRelationMeta = useCallback(
    (nodeKey: React.Key) => {
      const relationsForNode = relationMapByNode.get(String(nodeKey)) || [];
      const tags = displayAttributeIds.flatMap((attributeId) => {
        const category = categoryMap.get(attributeId);
        const relation = relationsForNode.find(
          (item) => item.attributeId === attributeId,
        );
        const option = relation ? optionMap.get(relation.optionId) : undefined;

        if (!category || category.status === 'disabled') {
          return [];
        }
        if (!option || option.status === 'disabled') {
          return [];
        }

        return [
          <Tag
            key={`${attributeId}-${option.id}`}
            className="tag-tree-node-tag"
          >
            {option.name}
          </Tag>,
        ];
      });

      return tags.length ? (
        <span className="tag-tree-node-tags">{tags}</span>
      ) : null;
    },
    [categoryMap, displayAttributeIds, optionMap, relationMapByNode],
  );

  const handleAddRoot = () => {
    setInlineEdit({
      key: createDraftNodeKey(),
      mode: 'add',
      parentKey: null,
      initialValue: '',
    });
  };

  const handleToggleArrangeMode = () => {
    setInlineEdit(null);
    setArrangeMode((value) => !value);
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
    if (!arrangeMode) return;

    const moveRequest = getTreeMoveRequest(topicTreeData, info);

    const res = await moveKnowledgeNode({
      id: String(info.dragNode.key),
      targetId: String(moveRequest.targetId),
      position: moveRequest.position,
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
        className={`tag-system-tree-panel tag-system-tree-panel-no-title${
          arrangeMode ? ' tag-system-tree-panel-arranging' : ''
        }`}
        variant="borderless"
        extra={
          <div className="tag-system-tree-card-extra">
            {arrangeMode ? null : (
              <div className="tag-system-tree-toolbar-filters">
                <div className="tag-system-tree-subject-filter">
                  <span className="tag-system-tree-subject-label">学科</span>
                  <Select
                    size="small"
                    value={selectedSubject}
                    onChange={onSubjectChange}
                    className="tag-system-tree-subject-select"
                    options={subjectOptions}
                    aria-label="选择学科"
                  />
                </div>
                <Input
                  className="tag-system-tree-search"
                  name="topicSearch"
                  autoComplete="off"
                  prefix={
                    <SearchOutlined
                      aria-hidden="true"
                      style={{ color: '#ccc' }}
                    />
                  }
                  aria-label="搜索专题"
                  allowClear
                  placeholder="搜索专题…"
                  value={topicSearch.searchValue}
                  onChange={topicSearch.onSearch}
                />
              </div>
            )}
            <div className="tag-system-tree-actions">
              <Button
                type={arrangeMode ? 'primary' : 'default'}
                size="small"
                onClick={handleToggleArrangeMode}
              >
                {arrangeMode ? '完成整理' : '整理'}
              </Button>
              {arrangeMode ? null : (
                <Button type="primary" size="small" onClick={handleAddRoot}>
                  添加根节点
                </Button>
              )}
            </div>
          </div>
        }
      >
        {displayTopicTree.length > 0 ? (
          <Tree
            key={selectedSubject}
            treeData={displayTopicTree}
            onExpand={topicSearch.onExpand}
            expandedKeys={topicSearch.expandedKeys}
            autoExpandParent={topicSearch.autoExpandParent}
            draggable={
              arrangeMode
                ? {
                    icon: (
                      <Tooltip title="拖拽移动">
                        <HolderOutlined className="tag-system-tree-drag-icon" />
                      </Tooltip>
                    ),
                  }
                : undefined
            }
            allowDrop={arrangeMode ? allowTopicDrop : undefined}
            onDrop={arrangeMode ? handleDropTopic : undefined}
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
                        placeholder: '请输入专题名称…',
                        saving: inlineEdit.saving,
                        onSubmit: handleInlineEditSubmit,
                        onCancel: handleCancelInlineEdit,
                      }
                    : undefined
                }
                actionsVisible={!arrangeMode}
                meta={renderNodeRelationMeta(node.key)}
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
