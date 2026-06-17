import type {
  AnswerAreaType,
  QuestionTypeAnswerArea,
  QuestionTypeAnswerCardType,
  QuestionTypeNode,
} from '@/services/tagSystem';
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
  ProFormDigit,
  ProFormRadio,
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
import React, { useCallback, useMemo, useState } from 'react';
import './QuestionTypeTreePanel.less';
import './TagSystemTreePanel.less';
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
  subjectOptions: SelectOption[];
  onSubjectChange: (subject: string) => void;
  onRefresh: () => void;
}

const SAME_LEVEL_DROP_WARNING =
  '只能在同一层级内调整顺序，请拖到目标题型的上方或下方';
const MAX_QUESTION_TYPE_LEVEL = 2;
const MIN_QUESTION_TYPE_ANSWER_ROWS = 1;
const MAX_QUESTION_TYPE_ANSWER_ROWS = 20;
const DEFAULT_QUESTION_TYPE_ANSWER_AREA: QuestionTypeAnswerArea = {
  type: 'line',
  rows: 1,
};
const DEFAULT_QUESTION_TYPE_ANSWER_CARD_TYPE: QuestionTypeAnswerCardType =
  'subjective';
const MAX_LEVEL_ADD_WARNING = `题型最多支持 ${MAX_QUESTION_TYPE_LEVEL} 层结构，当前节点不能继续添加子级`;

interface QuestionTypeNodeMeta {
  parentKey: string | null;
  level: number;
  previousKey: string | null;
  nextKey: string | null;
}

interface QuestionTypeFormValues {
  id?: React.Key;
  title?: string;
  parentId?: string | null;
  description?: string;
  answerCardType?: QuestionTypeAnswerCardType;
  answerAreaType?: AnswerAreaType;
  answerAreaRows?: number;
}

const buildQuestionTypeNodeMetaMap = (
  nodes: QuestionTypeNode[],
  parentKey: string | null = null,
  level = 1,
  map = new Map<string, QuestionTypeNodeMeta>(),
) => {
  nodes.forEach((node, index) => {
    const currentKey = String(node.key);
    map.set(currentKey, {
      parentKey,
      level,
      previousKey: nodes[index - 1] ? String(nodes[index - 1].key) : null,
      nextKey: nodes[index + 1] ? String(nodes[index + 1].key) : null,
    });
    if (node.children?.length) {
      buildQuestionTypeNodeMetaMap(node.children, currentKey, level + 1, map);
    }
  });
  return map;
};

const normalizeQuestionTypeAnswerRows = (rows: unknown) => {
  const parsedRows = Number(rows);
  if (!Number.isFinite(parsedRows)) {
    return DEFAULT_QUESTION_TYPE_ANSWER_AREA.rows;
  }
  return Math.min(
    Math.max(Math.trunc(parsedRows), MIN_QUESTION_TYPE_ANSWER_ROWS),
    MAX_QUESTION_TYPE_ANSWER_ROWS,
  );
};

const normalizeQuestionTypeAnswerArea = (
  answerArea?: Partial<QuestionTypeAnswerArea>,
): QuestionTypeAnswerArea => ({
  type: answerArea?.type === 'blank' ? 'blank' : 'line',
  rows: normalizeQuestionTypeAnswerRows(answerArea?.rows),
});

const normalizeQuestionTypeAnswerCardType = (
  answerCardType?: QuestionTypeAnswerCardType,
): QuestionTypeAnswerCardType =>
  answerCardType === 'objective'
    ? 'objective'
    : DEFAULT_QUESTION_TYPE_ANSWER_CARD_TYPE;

const getQuestionTypeAnswerCardTypeFormValues = (
  answerCardType?: QuestionTypeAnswerCardType,
) => ({
  answerCardType: normalizeQuestionTypeAnswerCardType(answerCardType),
});

const getQuestionTypeAnswerCardTypeText = (
  answerCardType?: QuestionTypeAnswerCardType,
) =>
  normalizeQuestionTypeAnswerCardType(answerCardType) === 'objective'
    ? '客观'
    : '主观';

const getQuestionTypeAnswerAreaFormValues = (
  answerArea?: QuestionTypeAnswerArea,
) => {
  const normalizedAnswerArea = normalizeQuestionTypeAnswerArea(answerArea);
  return {
    answerAreaType: normalizedAnswerArea.type,
    answerAreaRows: normalizedAnswerArea.rows,
  };
};

const getQuestionTypeAnswerAreaText = (answerArea?: QuestionTypeAnswerArea) => {
  const normalizedAnswerArea = normalizeQuestionTypeAnswerArea(answerArea);
  const typeText = normalizedAnswerArea.type === 'blank' ? '空白' : '横线';
  return `${typeText} ${normalizedAnswerArea.rows} 行`;
};

const getQuestionTypeNodeMetaText = (node: TreeNodeData) =>
  `${getQuestionTypeAnswerCardTypeText(
    node.answerCardType,
  )} · ${getQuestionTypeAnswerAreaText(node.answerArea)}`;

const QuestionTypeTreePanel: React.FC<QuestionTypeTreePanelProps> = ({
  questionTypeTree,
  selectedSubject,
  subjectOptions,
  onSubjectChange,
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

  const isFirstLevelQuestionTypeNode = useCallback(
    (nodeKey: React.Key) =>
      (nodeMetaMap.get(String(nodeKey))?.level ?? 1) === 1,
    [nodeMetaMap],
  );

  const canMoveQuestionTypeNodeUp = useCallback(
    (nodeKey: React.Key) =>
      Boolean(nodeMetaMap.get(String(nodeKey))?.previousKey),
    [nodeMetaMap],
  );

  const canMoveQuestionTypeNodeDown = useCallback(
    (nodeKey: React.Key) => Boolean(nodeMetaMap.get(String(nodeKey))?.nextKey),
    [nodeMetaMap],
  );

  const shouldShowQuestionTypeSettings =
    qtModalType === 'add'
      ? !selectedQtNode
      : selectedQtNode
      ? isFirstLevelQuestionTypeNode(selectedQtNode.key)
      : false;

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
      ...getQuestionTypeAnswerCardTypeFormValues(),
      ...getQuestionTypeAnswerAreaFormValues(),
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
    });
    setQtModalVisible(true);
  };

  const handleEditQt = (node: TreeNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    setQtModalType('edit');
    setSelectedQtNode(node);
    qtForm.resetFields();
    const baseValues: QuestionTypeFormValues = {
      id: node.key,
      title: node.title,
      description: node.description,
    };
    qtForm.setFieldsValue(
      isFirstLevelQuestionTypeNode(node.key)
        ? {
            ...baseValues,
            ...getQuestionTypeAnswerCardTypeFormValues(node.answerCardType),
            ...getQuestionTypeAnswerAreaFormValues(node.answerArea),
          }
        : baseValues,
    );
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

  const handleMoveQuestionTypeByButton = async (
    node: TreeNodeData,
    direction: 'up' | 'down',
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    const nodeMeta = nodeMetaMap.get(String(node.key));
    const targetId =
      direction === 'up' ? nodeMeta?.previousKey : nodeMeta?.nextKey;

    if (!targetId) {
      return;
    }

    const res = await moveQuestionTypeNode({
      id: String(node.key),
      targetId,
      position: direction === 'up' ? 'before' : 'after',
      subject: selectedSubject,
    });

    if (res.success) {
      message.success(direction === 'up' ? '已上移' : '已下移');
      onRefresh();
    } else {
      message.error(res.message || '移动失败');
    }
  };

  const handleQtModalFinish = async (values: Record<string, unknown>) => {
    const formValues = values as QuestionTypeFormValues;
    const isFirstLevelSubmit =
      qtModalType === 'add'
        ? !formValues.parentId
        : selectedQtNode
        ? isFirstLevelQuestionTypeNode(selectedQtNode.key)
        : false;
    let res;
    if (qtModalType === 'add') {
      const payload: Parameters<typeof addQuestionTypeNode>[0] = {
        title: String(formValues.title || ''),
        parentId: formValues.parentId ? String(formValues.parentId) : null,
        subject: selectedSubject,
        description: formValues.description,
      };
      if (isFirstLevelSubmit) {
        payload.answerCardType = normalizeQuestionTypeAnswerCardType(
          formValues.answerCardType,
        );
        payload.answerArea = normalizeQuestionTypeAnswerArea({
          type: formValues.answerAreaType,
          rows: formValues.answerAreaRows,
        });
      }
      res = await addQuestionTypeNode(payload);
    } else {
      const payload: Parameters<typeof updateQuestionTypeNode>[0] = {
        id: String(selectedQtNode?.key),
        title: String(formValues.title || ''),
        subject: selectedSubject,
        description: formValues.description,
      };
      if (isFirstLevelSubmit) {
        payload.answerCardType = normalizeQuestionTypeAnswerCardType(
          formValues.answerCardType,
        );
        payload.answerArea = normalizeQuestionTypeAnswerArea({
          type: formValues.answerAreaType,
          rows: formValues.answerAreaRows,
        });
      }
      res = await updateQuestionTypeNode(payload);
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
        className="tag-system-tree-panel question-type-tree-panel"
        title={
          <div className="question-type-card-title">
            <span className="question-type-card-title-text">题型结构树</span>
            <span className="question-type-rule-inline">
              <InfoCircleFilled aria-hidden="true" />
              最多 {MAX_QUESTION_TYPE_LEVEL}{' '}
              层：一级=父题型，二级=子题型；拖拽仅支持同层排序。
            </span>
          </div>
        }
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
            <Button type="primary" size="small" onClick={handleAddQtRoot}>
              添加一级题型
            </Button>
          </div>
        }
      >
        <Input
          prefix={<SearchOutlined style={{ color: '#ccc' }} />}
          aria-label="搜索题型"
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
                  <HolderOutlined className="tag-system-tree-drag-icon" />
                </Tooltip>
              ),
            }}
            allowDrop={allowQuestionTypeDrop}
            onDrop={handleDropQuestionType}
            showLine
            blockNode
            titleRender={(node: TreeNodeData) => {
              const canAddChild = canAddQuestionTypeChild(node.key);
              const isFirstLevel = isFirstLevelQuestionTypeNode(node.key);
              return (
                <TreeNodeTitle
                  nodeData={node}
                  searchValue={questionTypeSearch.searchValue}
                  meta={isFirstLevel ? getQuestionTypeNodeMetaText(node) : null}
                  canMoveUp={canMoveQuestionTypeNodeUp(node.key)}
                  canMoveDown={canMoveQuestionTypeNodeDown(node.key)}
                  onMoveUp={(targetNode, e) =>
                    handleMoveQuestionTypeByButton(targetNode, 'up', e)
                  }
                  onMoveDown={(targetNode, e) =>
                    handleMoveQuestionTypeByButton(targetNode, 'down', e)
                  }
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
        width={shouldShowQuestionTypeSettings ? 640 : 560}
      >
        <div className="question-type-modal-basic-grid">
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
            className={
              !shouldShowQuestionTypeSettings &&
              !(qtModalType === 'add' && selectedQtNode)
                ? 'question-type-modal-full-field'
                : ''
            }
            name="title"
            label="题型名称"
            rules={[{ required: true, message: '请输入题型名称' }]}
          />
          {shouldShowQuestionTypeSettings ? (
            <ProFormRadio.Group
              name="answerCardType"
              label="题型属性"
              radioType="button"
              fieldProps={{
                className: 'question-type-answer-card-radio',
              }}
              options={[
                { label: '主观题', value: 'subjective' },
                { label: '客观题', value: 'objective' },
              ]}
              rules={[{ required: true, message: '请选择题型属性' }]}
            />
          ) : null}
        </div>
        {shouldShowQuestionTypeSettings ? (
          <section className="question-type-answer-config">
            <div className="question-type-answer-config-grid">
              <ProFormRadio.Group
                name="answerAreaType"
                label="答题区样式"
                radioType="button"
                options={[
                  { label: '横线', value: 'line' },
                  { label: '空白', value: 'blank' },
                ]}
                rules={[{ required: true, message: '请选择答题区样式' }]}
              />
              <ProFormDigit
                className="question-type-answer-rows-field"
                name="answerAreaRows"
                label="答题区行数"
                min={MIN_QUESTION_TYPE_ANSWER_ROWS}
                max={MAX_QUESTION_TYPE_ANSWER_ROWS}
                fieldProps={{
                  precision: 0,
                }}
                rules={[{ required: true, message: '请输入答题区行数' }]}
              />
            </div>
          </section>
        ) : null}
        <ProFormTextArea
          name="description"
          label="描述"
          placeholder="补充说明…"
          fieldProps={{ rows: 3 }}
        />
      </ModalForm>
    </>
  );
};

export default QuestionTypeTreePanel;
