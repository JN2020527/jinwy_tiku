import type {
  KnowledgeTreeNode,
  PublishedQuestion,
} from '@/services/resourceAssets';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckOutlined,
  DeleteOutlined,
  LeftOutlined,
  PlusOutlined,
  ReadOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Drawer,
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
  HOMEWORK_BASKET_EMPTY_MESSAGE,
  HOMEWORK_BASKET_LIMIT_MESSAGE,
  HOMEWORK_BASKET_MAX_COUNT,
  addQuestionId,
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
import { getQuestionGroupHeading, groupByQuestionType } from './grouping';

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
  const [expandedAnswerIds, setExpandedAnswerIds] = useState<string[]>([]);
  const [basketExpanded, setBasketExpanded] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<string[]>(() =>
    getFirstLevelKeys(treeNodes),
  );

  const filterOptions = useMemo(
    () => deriveFilterOptions(questions),
    [questions],
  );
  const basketGroups = useMemo(
    () => groupByQuestionType(selectedIds, (id) => questionMap.get(id)),
    [questionMap, selectedIds],
  );
  const basketDisplayOrder = useMemo(
    () =>
      new Map(
        basketGroups.flatMap((group) =>
          group.items.map((item, index) => [
            item.value,
            group.startIndex + index + 1,
          ]),
        ),
      ),
    [basketGroups],
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
      message.warning(HOMEWORK_BASKET_LIMIT_MESSAGE);
      return;
    }
    if (result.added) {
      onSelectedIdsChange([...selectedIds, questionId]);
    }
  };

  const handleRemoveQuestion = (questionId: string) => {
    onSelectedIdsChange(removeQuestionId(selectedIds, questionId));
  };

  const toggleQuestionAnswer = (questionId: string) => {
    setExpandedAnswerIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
  };

  const handleMoveQuestionInGroup = (
    sourceIndexes: number[],
    itemIndex: number,
    direction: -1 | 1,
  ) => {
    const targetItemIndex = itemIndex + direction;
    if (targetItemIndex < 0 || targetItemIndex >= sourceIndexes.length) return;
    const currentSourceIndex = sourceIndexes[itemIndex];
    const targetSourceIndex = sourceIndexes[targetItemIndex];
    const next = [...selectedIds];
    [next[currentSourceIndex], next[targetSourceIndex]] = [
      next[targetSourceIndex],
      next[currentSourceIndex],
    ];
    onSelectedIdsChange(next);
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
              const selectedOrder = basketDisplayOrder.get(question.id) || 0;
              const answerExpanded = expandedAnswerIds.includes(question.id);
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
                        <span className="homework-question-selected-state">
                          <CheckOutlined />
                          已选 · 第 {selectedOrder} 题
                        </span>
                      ) : null}
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
                    {answerExpanded ? (
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
                    ) : null}
                    <div className="homework-question-actions">
                      <Button
                        size="small"
                        type="text"
                        icon={<ReadOutlined />}
                        aria-expanded={answerExpanded}
                        onClick={() => toggleQuestionAnswer(question.id)}
                      >
                        {answerExpanded ? '收起解析' : '答案解析'}
                      </Button>
                      {selected ? (
                        <Button
                          size="small"
                          icon={<DeleteOutlined />}
                          aria-label={`将第 ${
                            pageStart + index + 1
                          } 题移出作业篮`}
                          onClick={() => handleRemoveQuestion(question.id)}
                        >
                          移出作业篮
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          type="primary"
                          icon={<PlusOutlined />}
                          aria-label={`将第 ${
                            pageStart + index + 1
                          } 题加入作业篮`}
                          onClick={() => handleAddQuestion(question.id)}
                        >
                          加入作业篮
                        </Button>
                      )}
                    </div>
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

      {/* 右侧只保留稳定入口，作业明细在抽屉中维护，避免挤压选题区。 */}
      <aside className="homework-basket-rail" aria-label="作业篮">
        <Tooltip title="展开查看作业明细" placement="left">
          <Button
            className="homework-basket-rail-button"
            aria-label={`展开作业篮，当前已选 ${selectedIds.length} 道题`}
            aria-expanded={basketExpanded}
            onClick={() => setBasketExpanded(true)}
          >
            <LeftOutlined />
            <ShoppingOutlined className="homework-basket-rail-icon" />
            <span>作业篮</span>
            <strong>{selectedIds.length}</strong>
            <small>/ {HOMEWORK_BASKET_MAX_COUNT}</small>
          </Button>
        </Tooltip>
      </aside>

      <Drawer
        rootClassName="homework-basket-drawer"
        width={760}
        title={
          <span className="homework-basket-drawer-title">
            <ShoppingOutlined />
            作业篮
            <Typography.Text type="secondary">
              已选 {selectedIds.length} 道题
            </Typography.Text>
          </span>
        }
        extra={
          <Button
            type="link"
            danger
            disabled={selectedIds.length === 0}
            onClick={handleClearSelected}
          >
            全部清空
          </Button>
        }
        open={basketExpanded}
        onClose={() => setBasketExpanded(false)}
      >
        <div className="homework-basket-summary" aria-live="polite">
          <div>
            <span>当前作业</span>
            <strong>{selectedIds.length}</strong>
            <span>道题</span>
          </div>
          <Typography.Text type="secondary">
            按题型展示，组内可调整顺序；底层仍保存平铺试题顺序
          </Typography.Text>
        </div>

        {selectedIds.length > 0 ? (
          <div className="homework-basket-groups">
            {basketGroups.map((group, groupIndex) => {
              const sourceIndexes = group.items.map((item) => item.sourceIndex);
              return (
                <section className="homework-basket-group" key={group.key}>
                  <header className="homework-basket-group-header">
                    <strong>
                      {getQuestionGroupHeading(groupIndex, group.label)}
                    </strong>
                    <span>{group.items.length} 道题</span>
                  </header>
                  <List
                    className="homework-basket-list"
                    dataSource={group.items}
                    rowKey={(item) => item.value}
                    renderItem={(item, index) => {
                      const questionId = item.value;
                      const question = questionMap.get(questionId);
                      const displayNumber = group.startIndex + index + 1;
                      return (
                        <List.Item className="homework-basket-item">
                          <div className="homework-basket-item-header">
                            <span className="homework-basket-item-index">
                              {displayNumber}
                            </span>
                            <div className="homework-basket-item-meta">
                              {question ? (
                                <>
                                  <Tag color="orange">
                                    {getDifficultyLabel(question.difficulty)}
                                  </Tag>
                                  <Tag>{question.source}</Tag>
                                </>
                              ) : (
                                <Tag color="warning">题目内容缺失</Tag>
                              )}
                            </div>
                            <Space
                              size={2}
                              className="homework-basket-item-actions"
                            >
                              <Tooltip title="组内上移">
                                <Button
                                  type="text"
                                  icon={<ArrowUpOutlined />}
                                  aria-label={`组内上移第 ${displayNumber} 题`}
                                  disabled={index === 0}
                                  onClick={() =>
                                    handleMoveQuestionInGroup(
                                      sourceIndexes,
                                      index,
                                      -1,
                                    )
                                  }
                                />
                              </Tooltip>
                              <Tooltip title="组内下移">
                                <Button
                                  type="text"
                                  icon={<ArrowDownOutlined />}
                                  aria-label={`组内下移第 ${displayNumber} 题`}
                                  disabled={index === group.items.length - 1}
                                  onClick={() =>
                                    handleMoveQuestionInGroup(
                                      sourceIndexes,
                                      index,
                                      1,
                                    )
                                  }
                                />
                              </Tooltip>
                              <Tooltip title="移出作业篮">
                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  aria-label={`移出作业篮第 ${displayNumber} 题`}
                                  onClick={() =>
                                    handleRemoveQuestion(questionId)
                                  }
                                />
                              </Tooltip>
                            </Space>
                          </div>

                          <Typography.Paragraph
                            className={`homework-basket-item-stem ${
                              question ? '' : 'homework-basket-item-missing'
                            }`}
                          >
                            {question
                              ? question.stem
                              : `题目内容缺失（${questionId}），可将其移出作业篮`}
                          </Typography.Paragraph>

                          {question?.options && question.options.length > 0 ? (
                            <ul className="homework-basket-item-options">
                              {question.options.map((option, optionIndex) => (
                                <li key={optionIndex}>
                                  {option.label}. {option.text}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </List.Item>
                      );
                    }}
                  />
                </section>
              );
            })}
          </div>
        ) : (
          <div className="homework-basket-empty">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={HOMEWORK_BASKET_EMPTY_MESSAGE}
            >
              <Button type="primary" onClick={() => setBasketExpanded(false)}>
                继续选题
              </Button>
            </Empty>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Workbench;
