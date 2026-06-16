import type { QuestionTypeNode } from '@/services/tagSystem';
import {
  addQuestionTypeNode,
  deleteQuestionTypeNode,
  moveQuestionTypeNode,
  updateQuestionTypeNode,
} from '@/services/tagSystem';
import {
  HolderOutlined,
  InfoCircleFilled,
  SearchOutlined,
} from '@ant-design/icons';
import {
  ModalForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import type { TreeProps } from 'antd';
import { Button, Card, Form, Input, message, Modal, Tooltip, Tree } from 'antd';
import React, { useCallback, useMemo, useState } from 'react';
import './QuestionTypeTreePanel.less';
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

const SAME_LEVEL_DROP_WARNING =
  '只能在同一层级内调整顺序，请拖到目标题型的上方或下方';
const MAX_QUESTION_TYPE_LEVEL = 2;
const MAX_LEVEL_ADD_WARNING = `题型最多支持 ${MAX_QUESTION_TYPE_LEVEL} 层结构，当前节点不能继续添加子级`;

interface QuestionTypeNodeMeta {
  parentKey: string | null;
  level: number;
}

const buildQuestionTypeNodeMetaMap = (
  nodes: QuestionTypeNode[],
  parentKey: string | null = null,
  level = 1,
  map = new Map<string, QuestionTypeNodeMeta>(),
) => {
  nodes.forEach((node) => {
    const currentKey = String(node.key);
    map.set(currentKey, { parentKey, level });
    if (node.children?.length) {
      buildQuestionTypeNodeMetaMap(node.children, currentKey, level + 1, map);
    }
  });
  return map;
};

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
  const nodeMetaMap = useMemo(
    () => buildQuestionTypeNodeMetaMap(questionTypeTree),
    [questionTypeTree],
  );

  const isSameLevelDrop = useCallback(
    (dragKey: string, dropKey: string) =>
      dragKey !== dropKey &&
      nodeMetaMap.has(dragKey) &&
      nodeMetaMap.has(dropKey) &&
      nodeMetaMap.get(dragKey)?.parentKey ===
        nodeMetaMap.get(dropKey)?.parentKey,
    [nodeMetaMap],
  );

  const canAddQuestionTypeChild = useCallback(
    (nodeKey: React.Key) =>
      (nodeMetaMap.get(String(nodeKey))?.level ?? MAX_QUESTION_TYPE_LEVEL) <
      MAX_QUESTION_TYPE_LEVEL,
    [nodeMetaMap],
  );

  const allowQuestionTypeDrop: TreeProps['allowDrop'] = ({
    dragNode,
    dropNode,
    dropPosition,
  }) => {
    if (dropPosition === 0) {
      return false;
    }
    return isSameLevelDrop(String(dragNode.key), String(dropNode.key));
  };

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
    if (!canAddQuestionTypeChild(node.key)) {
      message.warning(MAX_LEVEL_ADD_WARNING);
      return;
    }
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

  const handleDropQuestionType: TreeProps['onDrop'] = async (info) => {
    const dragKey = String(info.dragNode.key);
    const dropKey = String(info.node.key);

    if (dragKey === dropKey) {
      return;
    }

    if (!info.dropToGap || !isSameLevelDrop(dragKey, dropKey)) {
      message.warning(SAME_LEVEL_DROP_WARNING);
      return;
    }

    const dropPos = info.node.pos.split('-');
    const dropPosition =
      info.dropPosition - Number(dropPos[dropPos.length - 1]);
    const position = dropPosition < 0 ? 'before' : 'after';

    const res = await moveQuestionTypeNode({
      id: dragKey,
      targetId: dropKey,
      position,
      subject: selectedSubject,
    });

    if (res.success) {
      message.success('移动成功');
      onRefresh();
    } else {
      message.error(res.message || '移动失败');
    }
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
        className="question-type-tree-panel"
        title={
          <div className="question-type-card-title">
            <span className="question-type-card-title-text">
              {selectedSubjectLabel}题型结构树
            </span>
            <span className="question-type-rule-inline">
              <InfoCircleFilled />
              最多 {MAX_QUESTION_TYPE_LEVEL}{' '}
              层：一级=父题型，二级=子题型；拖拽仅支持同层排序。
            </span>
          </div>
        }
        variant="borderless"
        extra={
          <Button type="primary" size="small" onClick={handleAddQtRoot}>
            添加一级题型
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
            draggable={{
              icon: (
                <Tooltip title="拖拽排序">
                  <HolderOutlined className="question-type-drag-icon" />
                </Tooltip>
              ),
            }}
            allowDrop={allowQuestionTypeDrop}
            onDrop={handleDropQuestionType}
            showLine
            blockNode
            titleRender={(node: TreeNodeData) => {
              const canAddChild = canAddQuestionTypeChild(node.key);
              return (
                <TreeNodeTitle
                  nodeData={node}
                  searchValue={questionTypeSearch.searchValue}
                  showAddChild={canAddChild}
                  addChildTitle="添加二级题型"
                  onAddChild={handleAddQtChild}
                  onEdit={handleEditQt}
                  onDelete={handleDeleteQt}
                />
              );
            }}
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
        title={
          qtModalType === 'edit'
            ? '编辑题型'
            : selectedQtNode
            ? '添加二级题型'
            : '添加一级题型'
        }
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
            label="一级题型"
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
