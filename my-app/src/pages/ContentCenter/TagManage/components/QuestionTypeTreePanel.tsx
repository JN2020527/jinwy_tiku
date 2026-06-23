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
const MIN_QUESTION_TYPE_ANSWER_ROWS = 0;
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
  parentAnswerCardType?: QuestionTypeAnswerCardType | null;
  level: number;
  previousKey: string | null;
  nextKey: string | null;
}

interface QuestionTypeFormValues {
  id?: React.Key;
  title?: string;
  parentId?: string | null;
  parentName?: string;
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
  parentAnswerCardType: QuestionTypeAnswerCardType | null = null,
) => {
  nodes.forEach((node, index) => {
    const currentKey = String(node.key);
    map.set(currentKey, {
      parentKey,
      parentAnswerCardType,
      level,
      previousKey: nodes[index - 1] ? String(nodes[index - 1].key) : null,
      nextKey: nodes[index + 1] ? String(nodes[index + 1].key) : null,
    });
    if (node.children?.length) {
      buildQuestionTypeNodeMetaMap(
        node.children,
        currentKey,
        level + 1,
        map,
        node.answerCardType === 'objective' ? 'objective' : 'subjective',
      );
    }
  });
  return map;
};

const findQuestionTypeNodeTitle = (
  nodes: QuestionTypeNode[],
  targetKey?: string | null,
): string | undefined => {
  if (!targetKey) {
    return undefined;
  }
  for (const node of nodes) {
    if (String(node.key) === targetKey) {
      return node.title;
    }
    if (node.children?.length) {
      const found = findQuestionTypeNodeTitle(node.children, targetKey);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
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

const shouldQuestionTypeNeedAnswerArea = (
  parentAnswerCardType?: QuestionTypeAnswerCardType | null,
) => parentAnswerCardType !== 'objective';

const getQuestionTypeAnswerAreaFormValues = (
  answerArea?: QuestionTypeAnswerArea,
) => {
  const normalizedAnswerArea = normalizeQuestionTypeAnswerArea(answerArea);
  return {
    answerAreaType: normalizedAnswerArea.type,
    answerAreaRows: normalizedAnswerArea.rows,
  };
};

const getQuestionTypeNodeMeta = (
  node: TreeNodeData,
  isFirstLevel: boolean,
  shouldShowAnswerArea: boolean,
) => {
  const normalizedAnswerArea = normalizeQuestionTypeAnswerArea(node.answerArea);
  const answerAreaTypeText =
    normalizedAnswerArea.type === 'blank' ? '空白' : '横线';
  const answerCardTypeText = isFirstLevel
    ? `${getQuestionTypeAnswerCardTypeText(node.answerCardType)}题`
    : '—';
  const answerAreaTypeValue = shouldShowAnswerArea ? answerAreaTypeText : '—';
  const answerAreaRowsValue = shouldShowAnswerArea
    ? `${normalizedAnswerArea.rows} 行`
    : '—';

  return (
    <span className="question-type-node-meta-list">
      <span
        className="question-type-node-meta-item"
        aria-label={`题型类型：${answerCardTypeText}`}
      >
        {answerCardTypeText}
      </span>
      <span
        className="question-type-node-meta-item"
        aria-label={`答题区类型：${answerAreaTypeValue}`}
      >
        {answerAreaTypeValue}
      </span>
      <span
        className="question-type-node-meta-item"
        aria-label={`答题区行数：${answerAreaRowsValue}`}
      >
        {answerAreaRowsValue}
      </span>
    </span>
  );
};

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
  const [arrangeMode, setArrangeMode] = useState(false);
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

  const shouldShowAnswerCardTypeSettings =
    qtModalType === 'add'
      ? !selectedQtNode
      : selectedQtNode
      ? isFirstLevelQuestionTypeNode(selectedQtNode.key)
      : false;
  const isChildQuestionTypeModal =
    qtModalType === 'add'
      ? Boolean(selectedQtNode)
      : selectedQtNode
      ? !isFirstLevelQuestionTypeNode(selectedQtNode.key)
      : false;
  const parentAnswerCardTypeForModal =
    qtModalType === 'add'
      ? selectedQtNode?.answerCardType
      : selectedQtNode
      ? nodeMetaMap.get(String(selectedQtNode.key))?.parentAnswerCardType
      : undefined;
  const shouldShowAnswerAreaSettings =
    isChildQuestionTypeModal &&
    shouldQuestionTypeNeedAnswerArea(parentAnswerCardTypeForModal);
  const shouldShowParentQuestionTypeName = isChildQuestionTypeModal;

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
    });
    setQtModalVisible(true);
  };

  const handleToggleArrangeMode = () => {
    setQtModalVisible(false);
    if (!arrangeMode) {
      questionTypeSearch.resetSearch();
    }
    setArrangeMode((value) => !value);
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
    const parentNeedsAnswerArea = shouldQuestionTypeNeedAnswerArea(
      node.answerCardType,
    );
    qtForm.setFieldsValue({
      parentId: node.key,
      parentName: node.title,
      ...(parentNeedsAnswerArea ? getQuestionTypeAnswerAreaFormValues() : {}),
    });
    setQtModalVisible(true);
  };

  const handleEditQt = (node: TreeNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    setQtModalType('edit');
    setSelectedQtNode(node);
    qtForm.resetFields();
    const nodeMeta = nodeMetaMap.get(String(node.key));
    const baseValues: QuestionTypeFormValues = {
      id: node.key,
      title: node.title,
      description: node.description,
    };
    const isFirstLevel = isFirstLevelQuestionTypeNode(node.key);
    const parentNeedsAnswerArea = shouldQuestionTypeNeedAnswerArea(
      nodeMeta?.parentAnswerCardType,
    );
    qtForm.setFieldsValue(
      isFirstLevel
        ? {
            ...baseValues,
            ...getQuestionTypeAnswerCardTypeFormValues(node.answerCardType),
          }
        : {
            ...baseValues,
            parentId: nodeMeta?.parentKey,
            parentName: findQuestionTypeNodeTitle(
              questionTypeTree,
              nodeMeta?.parentKey,
            ),
            ...(parentNeedsAnswerArea
              ? getQuestionTypeAnswerAreaFormValues(node.answerArea)
              : {}),
          },
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
    if (!arrangeMode) return;

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
    const formValues = values as QuestionTypeFormValues;
    const isFirstLevelSubmit =
      qtModalType === 'add'
        ? !formValues.parentId
        : selectedQtNode
        ? isFirstLevelQuestionTypeNode(selectedQtNode.key)
        : false;
    const isChildLevelSubmit =
      qtModalType === 'add'
        ? Boolean(formValues.parentId)
        : selectedQtNode
        ? !isFirstLevelQuestionTypeNode(selectedQtNode.key)
        : false;
    const submitParentAnswerCardType =
      qtModalType === 'add'
        ? selectedQtNode?.answerCardType
        : selectedQtNode
        ? nodeMetaMap.get(String(selectedQtNode.key))?.parentAnswerCardType
        : undefined;
    const shouldSubmitAnswerArea =
      isChildLevelSubmit &&
      shouldQuestionTypeNeedAnswerArea(submitParentAnswerCardType);
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
      }
      if (shouldSubmitAnswerArea) {
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
      }
      if (shouldSubmitAnswerArea) {
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
        className={`tag-system-tree-panel tag-system-tree-panel-no-title question-type-tree-panel${
          arrangeMode ? ' tag-system-tree-panel-arranging' : ''
        }`}
        variant="borderless"
        extra={
          <div className="tag-system-tree-card-extra">
            {arrangeMode ? null : (
              <div className="question-type-tree-toolbar-filters">
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
                <Input
                  className="question-type-tree-search"
                  prefix={
                    <SearchOutlined
                      aria-hidden="true"
                      style={{ color: '#ccc' }}
                    />
                  }
                  aria-label="搜索题型"
                  allowClear
                  name="questionTypeSearch"
                  autoComplete="off"
                  placeholder="搜索题型"
                  value={questionTypeSearch.searchValue}
                  onChange={questionTypeSearch.onSearch}
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
                <Button type="primary" size="small" onClick={handleAddQtRoot}>
                  添加一级题型
                </Button>
              )}
            </div>
          </div>
        }
      >
        {questionTypeTree.length > 0 ? (
          <>
            {arrangeMode ? null : (
              <div className="question-type-tree-table-header">
                <span>题型名称</span>
                <span>题型类型</span>
                <span>答题区类型</span>
                <span>答题区行数</span>
                <span>操作</span>
              </div>
            )}
            <Tree
              key={selectedSubject}
              treeData={questionTypeTree}
              onExpand={questionTypeSearch.onExpand}
              expandedKeys={questionTypeSearch.expandedKeys}
              autoExpandParent={questionTypeSearch.autoExpandParent}
              draggable={
                arrangeMode
                  ? {
                      icon: (
                        <Tooltip title="拖拽排序">
                          <HolderOutlined
                            aria-hidden="true"
                            className="tag-system-tree-drag-icon"
                          />
                        </Tooltip>
                      ),
                    }
                  : undefined
              }
              allowDrop={arrangeMode ? allowQuestionTypeDrop : undefined}
              onDrop={arrangeMode ? handleDropQuestionType : undefined}
              showLine
              blockNode
              titleRender={(node: TreeNodeData) => {
                const canAddChild = canAddQuestionTypeChild(node.key);
                const isFirstLevel = isFirstLevelQuestionTypeNode(node.key);
                const nodeMeta = nodeMetaMap.get(String(node.key));
                const nodeLevel = nodeMeta?.level ?? 1;
                const shouldShowNodeAnswerArea =
                  !isFirstLevel &&
                  shouldQuestionTypeNeedAnswerArea(
                    nodeMeta?.parentAnswerCardType,
                  );
                return (
                  <TreeNodeTitle
                    className="question-type-tree-table-row"
                    style={
                      {
                        '--question-type-node-indent': `${Math.max(
                          nodeLevel - 1,
                          0,
                        ) * 24}px`,
                      } as React.CSSProperties
                    }
                    nodeData={node}
                    searchValue={questionTypeSearch.searchValue}
                    meta={
                      arrangeMode
                        ? null
                        : getQuestionTypeNodeMeta(
                            node,
                            isFirstLevel,
                            shouldShowNodeAnswerArea,
                          )
                    }
                    actionsVisible={!arrangeMode}
                    nodeActionsVisible={!arrangeMode}
                    showAddChild={!arrangeMode && canAddChild}
                    addChildTitle="添加二级题型"
                    canMoveUp={false}
                    canMoveDown={false}
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
          </>
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
        width={
          shouldShowAnswerCardTypeSettings || shouldShowParentQuestionTypeName
            ? 640
            : 560
        }
      >
        <div className="question-type-modal-basic-grid">
          {shouldShowParentQuestionTypeName ? (
            <ProFormText
              name="parentName"
              label="一级题型名称"
              disabled
            />
          ) : null}
          {shouldShowParentQuestionTypeName ? (
            <ProFormText
              name="parentId"
              label="父节点ID"
              hidden
            />
          ) : null}
          <ProFormText
            className={
              !shouldShowAnswerCardTypeSettings &&
              !shouldShowAnswerAreaSettings &&
              !shouldShowParentQuestionTypeName
                ? 'question-type-modal-full-field'
                : ''
            }
            name="title"
            label={isChildQuestionTypeModal ? '二级题型名称' : '一级题型名称'}
            rules={[
              {
                required: true,
                message: isChildQuestionTypeModal
                  ? '请输入二级题型名称'
                  : '请输入一级题型名称',
              },
            ]}
          />
          {shouldShowAnswerCardTypeSettings ? (
            <ProFormRadio.Group
              name="answerCardType"
              label="题型类型"
              radioType="button"
              fieldProps={{
                className: 'question-type-answer-card-radio',
              }}
              options={[
                { label: '主观题', value: 'subjective' },
                { label: '客观题', value: 'objective' },
              ]}
              rules={[{ required: true, message: '请选择题型类型' }]}
            />
          ) : null}
        </div>
        {shouldShowAnswerAreaSettings ? (
          <section className="question-type-answer-config">
            <div className="question-type-answer-config-grid">
              <ProFormRadio.Group
                name="answerAreaType"
                label="答题区类型"
                radioType="button"
                fieldProps={{
                  className: 'question-type-answer-area-radio',
                }}
                options={[
                  { label: '横线', value: 'line' },
                  { label: '空白', value: 'blank' },
                ]}
                rules={[{ required: true, message: '请选择答题区类型' }]}
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
