import type {
  KnowledgeTreeNode,
  PublishedQuestion,
} from '@/services/resourceAssets';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Collapse,
  Empty,
  Input,
  List,
  Modal,
  Pagination,
  Segmented,
  Space,
  Switch,
  Tag,
  Tooltip,
  Tree,
  Typography,
  message,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import React, { useEffect, useMemo, useState } from 'react';
import {
  QUESTION_BASKET_EMPTY_MESSAGE,
  QUESTION_BASKET_LIMIT_MESSAGE,
  QUESTION_BASKET_MAX_COUNT,
  addQuestionId,
  moveQuestionId,
  removeQuestionId,
} from './basket';
import {
  ALL_VALUE,
  type FilterOption,
  type FilterRowKey,
  type FilterState,
  type SelectionMode,
  type SortKey,
  createDefaultFilterState,
  deriveFilterOptions,
  filterQuestions,
  filterTreeNodeByQuery,
  formatQuestionCount,
  getAncestorKeys,
  getDescendantLeafKeys,
  getDifficultyLabel,
  getFirstLevelKeys,
  getSubtreeKeys,
  toggleFilterSelection,
} from './filtering';

const QUESTION_PAGE_SIZE = 10;

const FILTER_ROW_LABELS: Record<FilterRowKey, string> = {
  source: '来源',
  type: '题型',
  difficulty: '难度',
};

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'latest', label: '最新' },
  { value: 'popular', label: '最热' },
];

interface WorkbenchProps {
  treeNodes: KnowledgeTreeNode[];
  questions: PublishedQuestion[];
  selectedIds: string[];
  /** 试题内容索引（编辑预载时被删除的题不在其中）。 */
  questionMap: Map<string, PublishedQuestion>;
  onSelectedIdsChange: (ids: string[]) => void;
}

const Workbench: React.FC<WorkbenchProps> = ({
  treeNodes,
  questions,
  selectedIds,
  questionMap,
  onSelectedIdsChange,
}) => {
  const [filters, setFilters] = useState<FilterState>(createDefaultFilterState);
  const [sortKey, setSortKey] = useState<SortKey>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  const [treeSearch, setTreeSearch] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<string[]>(() =>
    getFirstLevelKeys(treeNodes),
  );

  const filterOptions = useMemo(
    () => deriveFilterOptions(questions),
    [questions],
  );

  const selectedLeafKeys = useMemo(
    () =>
      selectedNodeKey ? getDescendantLeafKeys(treeNodes, selectedNodeKey) : [],
    [selectedNodeKey, treeNodes],
  );

  const filteredQuestions = useMemo(
    () =>
      filterQuestions(
        questions,
        selectedLeafKeys,
        filters,
        searchQuery,
        sortKey,
      ),
    [filters, questions, searchQuery, selectedLeafKeys, sortKey],
  );

  const pageCount = Math.max(
    1,
    Math.ceil(filteredQuestions.length / QUESTION_PAGE_SIZE),
  );
  const normalizedPage = Math.min(Math.max(1, currentPage), pageCount);
  const pageStart = (normalizedPage - 1) * QUESTION_PAGE_SIZE;
  const pageQuestions = filteredQuestions.slice(
    pageStart,
    pageStart + QUESTION_PAGE_SIZE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchQuery, selectedLeafKeys, sortKey]);

  useEffect(() => {
    if (treeNodes.length === 0) return;
    // 数据异步到达后默认展开第一层，便于浏览结构
    setExpandedKeys((current) =>
      current.length > 0 ? current : getFirstLevelKeys(treeNodes),
    );
  }, [treeNodes]);

  useEffect(() => {
    if (!selectedNodeKey) return;
    setExpandedKeys((current) =>
      Array.from(
        new Set([
          ...current,
          ...getAncestorKeys(treeNodes, selectedNodeKey),
          ...getSubtreeKeys(treeNodes, selectedNodeKey),
        ]),
      ),
    );
  }, [selectedNodeKey, treeNodes]);

  const visibleTreeData = useMemo(() => {
    const searching = treeSearch.trim().length > 0;
    return searching ? filterTreeNodeByQuery(treeNodes, treeSearch) : treeNodes;
  }, [treeNodes, treeSearch]);

  useEffect(() => {
    if (treeSearch.trim().length === 0) {
      setExpandedKeys(getFirstLevelKeys(treeNodes));
      return;
    }
    const collectAllKeys = (current: KnowledgeTreeNode[]): string[] =>
      current.flatMap((node) => [
        node.key,
        ...collectAllKeys(node.children ?? []),
      ]);
    setExpandedKeys(collectAllKeys(visibleTreeData));
  }, [treeNodes, treeSearch, visibleTreeData]);

  const handleSelectNode = (keys: React.Key[]) => {
    setSelectedNodeKey((keys[0] as string | undefined) ?? null);
  };

  const handleToggleFilter = (
    rowKey: FilterRowKey,
    value: string,
    mode: SelectionMode,
  ) => {
    setFilters((current) => ({
      ...current,
      [rowKey]: {
        ...current[rowKey],
        values: toggleFilterSelection(current[rowKey].values, value, mode),
      },
    }));
  };

  const handleResetFilters = () => {
    setFilters(createDefaultFilterState());
    setSelectedNodeKey(null);
    setTreeSearch('');
    setExpandedKeys(getFirstLevelKeys(treeNodes));
  };

  const handleToggleMode = (rowKey: FilterRowKey, multiple: boolean) => {
    setFilters((current) => ({
      ...current,
      [rowKey]: {
        ...current[rowKey],
        mode: multiple ? 'multiple' : 'single',
        values: multiple
          ? current[rowKey].values
          : [current[rowKey].values.at(-1) ?? ALL_VALUE],
      },
    }));
  };

  const handleAddQuestion = (questionId: string) => {
    const result = addQuestionId(selectedIds, questionId);
    if (result.limitReached) {
      message.warning(QUESTION_BASKET_LIMIT_MESSAGE);
      return;
    }
    if (result.added) {
      onSelectedIdsChange([...selectedIds, questionId]);
    }
  };

  const handleRemoveQuestion = (questionId: string) => {
    onSelectedIdsChange(removeQuestionId(selectedIds, questionId));
  };

  const handleMoveQuestion = (index: number, direction: -1 | 1) => {
    onSelectedIdsChange(moveQuestionId(selectedIds, index, direction));
  };

  const handleClearSelected = () => {
    if (selectedIds.length === 0) return;
    Modal.confirm({
      title: '确认清空已选题目？',
      content: `已选的 ${selectedIds.length} 道题将从作业中全部移除。`,
      okText: '确认清空',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => onSelectedIdsChange([]),
    });
  };

  const renderFilterRow = (rowKey: FilterRowKey, options: FilterOption[]) => {
    const row = filters[rowKey];
    return (
      <div className="homework-filter-row" key={rowKey}>
        <span className="homework-filter-label">
          {FILTER_ROW_LABELS[rowKey]}
        </span>
        <div className="homework-filter-options">
          {options.map((option) => {
            const selected = row.values.includes(option.value);
            return (
              <Tag.CheckableTag
                key={option.value}
                checked={selected}
                className="homework-filter-tag"
                onClick={() =>
                  handleToggleFilter(rowKey, option.value, row.mode)
                }
              >
                {option.label}
              </Tag.CheckableTag>
            );
          })}
        </div>
        <Tooltip
          title={
            row.mode === 'single'
              ? '开启后可多选'
              : '当前为多选，点击切换为单选'
          }
        >
          <Switch
            size="small"
            checked={row.mode === 'multiple'}
            onChange={(checked) => handleToggleMode(rowKey, checked)}
            checkedChildren="多选"
            unCheckedChildren="单选"
          />
        </Tooltip>
      </div>
    );
  };

  return (
    <div className="homework-workbench">
      {/* 左栏：知识点树（单选，选父节点筛选全部后代叶子并展开） */}
      <Card
        className="homework-tree-panel"
        title={
          <span className="homework-panel-title">
            知识点
            <Typography.Text type="secondary" className="homework-panel-sub">
              单选
            </Typography.Text>
          </span>
        }
        size="small"
      >
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="搜索知识点"
          value={treeSearch}
          onChange={(event) => setTreeSearch(event.target.value)}
          className="homework-tree-search"
        />
        <div className="homework-tree-scroll">
          <Tree
            treeData={visibleTreeData as DataNode[]}
            selectedKeys={selectedNodeKey ? [selectedNodeKey] : []}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys as string[])}
            onSelect={handleSelectNode}
            blockNode
            showLine={{ showLeafIcon: false }}
          />
        </div>
      </Card>

      {/* 中栏：筛选区 + 排序/搜索 + 试题卡片列表 */}
      <div className="homework-middle">
        <Card
          className="homework-filter-panel"
          size="small"
          title={<span className="homework-panel-title">筛选</span>}
          extra={
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleResetFilters}
              disabled={
                !selectedNodeKey &&
                !treeSearch &&
                Object.values(filters).every(
                  (row) =>
                    row.mode === 'single' &&
                    row.values.length === 1 &&
                    row.values[0] === ALL_VALUE,
                )
              }
            >
              重置筛选
            </Button>
          }
        >
          {renderFilterRow('source', filterOptions.source)}
          {renderFilterRow('type', filterOptions.type)}
          {renderFilterRow('difficulty', filterOptions.difficulty)}
        </Card>

        <div className="homework-sort-search-bar">
          <div className="homework-sort-control">
            <Typography.Text type="secondary" className="homework-sort-label">
              排序
            </Typography.Text>
            <Segmented
              size="small"
              value={sortKey}
              options={SORT_OPTIONS}
              onChange={(value) => setSortKey(value as SortKey)}
            />
          </div>
          <div className="homework-search-summary">
            <Input.Search
              allowClear
              placeholder="在结果中搜索题干"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="homework-result-search"
            />
            <Typography.Text type="secondary" className="homework-result-count">
              {formatQuestionCount(filteredQuestions.length)}
            </Typography.Text>
          </div>
        </div>

        {pageQuestions.length > 0 ? (
          <List
            className="homework-question-list"
            dataSource={pageQuestions}
            rowKey="id"
            pagination={false}
            renderItem={(question, index) => {
              const selected = selectedIds.includes(question.id);
              return (
                <List.Item className="homework-question-item">
                  <Card size="small" className="homework-question-card">
                    <div className="homework-question-card-header">
                      <div className="homework-question-tags">
                        <Tag color="default">来源：{question.source}</Tag>
                        <Tag color="blue">题型：{question.type}</Tag>
                        <Tag color="orange">
                          难度：{getDifficultyLabel(question.difficulty)}
                        </Tag>
                        {question.year ? (
                          <Tag color="geekblue">年份：{question.year}</Tag>
                        ) : null}
                      </div>
                      {selected ? (
                        <Button
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveQuestion(question.id)}
                        >
                          移除
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => handleAddQuestion(question.id)}
                        >
                          加入作业
                        </Button>
                      )}
                    </div>
                    <Typography.Paragraph className="homework-question-stem">
                      {pageStart + index + 1}. {question.stem}
                    </Typography.Paragraph>
                    {question.options && question.options.length > 0 ? (
                      <ul className="homework-question-options">
                        {question.options.map((option, optionIndex) => (
                          <li key={optionIndex}>
                            {option.label}. {option.text}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <Collapse
                      ghost
                      size="small"
                      className="homework-question-answer-collapse"
                      items={[
                        {
                          key: 'answer',
                          label: '答案解析',
                          children: (
                            <div className="homework-question-answer">
                              <p>
                                <strong>答案：</strong>
                                {question.answer || '—'}
                              </p>
                              <p>
                                <strong>解析：</strong>
                                {question.explanation || '—'}
                              </p>
                            </div>
                          ),
                        },
                      ]}
                    />
                  </Card>
                </List.Item>
              );
            }}
          />
        ) : (
          <Empty
            className="homework-question-empty"
            description="暂无符合条件的试题，请调整知识点或筛选条件"
          />
        )}

        <Pagination
          className="homework-pagination"
          current={normalizedPage}
          pageSize={QUESTION_PAGE_SIZE}
          total={filteredQuestions.length}
          onChange={setCurrentPage}
          showSizeChanger={false}
          showTotal={(total) => formatQuestionCount(total)}
        />
      </div>

      {/* 右栏：已选作业面板（序号/上移/下移/移除/清空） */}
      <Card
        className="homework-selected-panel"
        size="small"
        title={
          <span className="homework-panel-title homework-panel-title-purple">
            <CheckCircleOutlined className="homework-selected-icon" />
            已选作业
            <Tag color="purple" className="homework-selected-count">
              {selectedIds.length}/{QUESTION_BASKET_MAX_COUNT}
            </Tag>
          </span>
        }
        extra={
          <Button
            type="link"
            size="small"
            danger
            disabled={selectedIds.length === 0}
            onClick={handleClearSelected}
          >
            清空
          </Button>
        }
      >
        {selectedIds.length > 0 ? (
          <List
            className="homework-selected-list"
            dataSource={selectedIds}
            rowKey={(id) => id}
            renderItem={(questionId, index) => {
              const question = questionMap.get(questionId);
              return (
                <List.Item className="homework-selected-item">
                  <span className="homework-selected-index">{index + 1}</span>
                  <Tooltip
                    title={question ? question.stem : '题目内容缺失'}
                    placement="topLeft"
                  >
                    <Typography.Text
                      ellipsis
                      className={
                        question
                          ? 'homework-selected-stem'
                          : 'homework-selected-stem homework-selected-missing'
                      }
                    >
                      {question
                        ? question.stem
                        : `题目内容缺失（${questionId}）`}
                    </Typography.Text>
                  </Tooltip>
                  <Space size={2} className="homework-selected-actions">
                    <Tooltip title="上移">
                      <Button
                        type="text"
                        size="small"
                        icon={<ArrowUpOutlined />}
                        aria-label={`上移第 ${index + 1} 题`}
                        disabled={index === 0}
                        onClick={() => handleMoveQuestion(index, -1)}
                      />
                    </Tooltip>
                    <Tooltip title="下移">
                      <Button
                        type="text"
                        size="small"
                        icon={<ArrowDownOutlined />}
                        aria-label={`下移第 ${index + 1} 题`}
                        disabled={index === selectedIds.length - 1}
                        onClick={() => handleMoveQuestion(index, 1)}
                      />
                    </Tooltip>
                    <Tooltip title="移除">
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={`移除第 ${index + 1} 题`}
                        onClick={() => handleRemoveQuestion(questionId)}
                      />
                    </Tooltip>
                  </Space>
                </List.Item>
              );
            }}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={QUESTION_BASKET_EMPTY_MESSAGE}
          />
        )}
        <Typography.Text type="secondary" className="homework-selected-hint">
          已选列表即作业本体，保存时按当前顺序生成作业
        </Typography.Text>
      </Card>
    </div>
  );
};

export default Workbench;
