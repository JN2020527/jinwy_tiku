import { formatRegisteredColumnCode } from '@/features/study-guide/columnCode';
import type {
  KnowledgeLeaf,
  RegisteredColumn,
  StructureLevel,
  StudyGuideContentBlock,
  StudyGuideStructureNode,
} from '@/services/resourceAssets';
import { KNOWLEDGE_BLOCK_TYPE_LABELS } from '@/services/resourceAssets';
import { sanitizeHtml } from '@/utils/sanitize';
import {
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  HolderOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Empty, Tag } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';

const NEXT_LEVEL: Partial<Record<StructureLevel, StructureLevel>> = {
  level1: 'level2',
  level2: 'level3',
  level3: 'level4',
};

interface OutlineNode {
  node: StudyGuideStructureNode;
  parentId?: string;
  depth: number;
  code: string | null;
}

type ColumnDropPosition = 'before' | 'after' | 'inside';
type ContentDropPosition = 'before' | 'after' | 'append';

interface StudyGuideContinuousEditorProps {
  readOnly?: boolean;
  structure: StudyGuideStructureNode[];
  blocks: StudyGuideContentBlock[];
  registeredColumns: RegisteredColumn[];
  knowledgeLeaves: KnowledgeLeaf[];
  onAdd: (level: StructureLevel, parentId?: string) => void;
  onEdit: (node: StudyGuideStructureNode) => void;
  onDelete: (node: StudyGuideStructureNode) => void;
  onDragMove: (
    nodeId: string,
    targetId: string,
    position: ColumnDropPosition,
  ) => void;
  onDragMoveContent: (
    blockId: string,
    targetNodeId: string,
    targetBlockId: string | undefined,
    position: ContentDropPosition,
  ) => void;
  onAddContent: (node: StudyGuideStructureNode) => void;
  onEditContent: (
    node: StudyGuideStructureNode,
    block: StudyGuideContentBlock,
  ) => void;
  onDeleteContent: (block: StudyGuideContentBlock) => void;
}

const flattenOutline = (
  nodes: StudyGuideStructureNode[],
  registeredColumnMap: Map<string, RegisteredColumn>,
  parentId?: string,
  depth = 0,
): OutlineNode[] =>
  nodes.flatMap((node, siblingIndex) => [
    {
      node,
      parentId,
      depth,
      code: formatRegisteredColumnCode(
        registeredColumnMap.get(node.referenceId || ''),
        siblingIndex + 1,
      ),
    },
    ...flattenOutline(node.children, registeredColumnMap, node.id, depth + 1),
  ]);

const StudyGuideContinuousEditor: React.FC<StudyGuideContinuousEditorProps> = ({
  readOnly = false,
  structure,
  blocks,
  registeredColumns,
  knowledgeLeaves,
  onAdd,
  onEdit,
  onDelete,
  onDragMove,
  onDragMoveContent,
  onAddContent,
  onEditContent,
  onDeleteContent,
}) => {
  const registeredColumnMap = useMemo(
    () => new Map(registeredColumns.map((column) => [column.id, column])),
    [registeredColumns],
  );
  const outline = useMemo(
    () => flattenOutline(structure, registeredColumnMap),
    [registeredColumnMap, structure],
  );
  const blocksByNode = useMemo(() => {
    const grouped = new Map<string, StudyGuideContentBlock[]>();
    blocks.forEach((block) => {
      const current = grouped.get(block.structureNodeId) || [];
      grouped.set(block.structureNodeId, [...current, block]);
    });
    return grouped;
  }, [blocks]);
  const leafMap = useMemo(
    () => new Map(knowledgeLeaves.map((leaf) => [leaf.id, leaf])),
    [knowledgeLeaves],
  );
  const [selectedId, setSelectedId] = useState(outline[0]?.node.id);
  const [isNavigationCollapsed, setIsNavigationCollapsed] = useState(false);
  const [draggedId, setDraggedId] = useState<string>();
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: ColumnDropPosition;
  }>();
  const [draggedContentId, setDraggedContentId] = useState<string>();
  const [contentDropTarget, setContentDropTarget] = useState<{
    nodeId: string;
    blockId?: string;
    position: ContentDropPosition;
  }>();
  const draggedIdRef = useRef<string>();
  const draggedContentIdRef = useRef<string>();
  const contentDragPreviewRef = useRef<HTMLElement>();
  const documentRef = useRef<HTMLDivElement>(null);
  const suppressScrollSyncUntilRef = useRef(0);

  const selected =
    outline.find((item) => item.node.id === selectedId) || outline[0];

  useEffect(() => {
    if (!outline.length) {
      setSelectedId(undefined);
      return;
    }
    if (!outline.some((item) => item.node.id === selectedId)) {
      setSelectedId(outline[0].node.id);
    }
  }, [outline, selectedId]);

  useEffect(() => {
    const syncSelectedColumn = () => {
      if (!documentRef.current) return;
      if (Date.now() < suppressScrollSyncUntilRef.current) return;
      const sections = Array.from(
        documentRef.current.querySelectorAll<HTMLElement>('[data-column-id]'),
      );
      const anchor = 72;
      const isAtPageBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      const current = isAtPageBottom
        ? sections.at(-1)
        : sections
            .filter((section) => section.getBoundingClientRect().top <= anchor)
            .at(-1) || sections[0];
      if (current?.dataset.columnId) setSelectedId(current.dataset.columnId);
    };
    window.addEventListener('scroll', syncSelectedColumn, { passive: true });
    window.addEventListener('resize', syncSelectedColumn);
    return () => {
      window.removeEventListener('scroll', syncSelectedColumn);
      window.removeEventListener('resize', syncSelectedColumn);
    };
  }, [outline]);

  const jumpToColumn = (columnId: string) => {
    suppressScrollSyncUntilRef.current = Date.now() + 500;
    setSelectedId(columnId);
    const target = documentRef.current?.querySelector<HTMLElement>(
      `[data-column-id="${columnId}"]`,
    );
    if (!target) return;
    window.scrollTo({
      top: window.scrollY + target.getBoundingClientRect().top - 16,
      behavior: 'auto',
    });
  };

  const addSibling = () => {
    if (!selected) {
      onAdd('level1');
      return;
    }
    onAdd(selected.node.level, selected.parentId);
  };

  const addChild = () => {
    if (!selected) return;
    const nextLevel = NEXT_LEVEL[selected.node.level];
    if (nextLevel) onAdd(nextLevel, selected.node.id);
  };

  const resolveDropPosition = (
    target: OutlineNode,
    event: React.DragEvent<HTMLDivElement>,
  ): ColumnDropPosition | undefined => {
    const dragged = outline.find(
      (item) => item.node.id === draggedIdRef.current,
    );
    if (!dragged || dragged.node.id === target.node.id) return undefined;
    if (dragged.node.level === target.node.level) {
      const bounds = event.currentTarget.getBoundingClientRect();
      return event.clientY < bounds.top + bounds.height / 2
        ? 'before'
        : 'after';
    }
    return NEXT_LEVEL[target.node.level] === dragged.node.level
      ? 'inside'
      : undefined;
  };

  const finishDragging = () => {
    draggedIdRef.current = undefined;
    setDraggedId(undefined);
    setDropTarget(undefined);
  };

  const finishContentDragging = () => {
    contentDragPreviewRef.current?.remove();
    contentDragPreviewRef.current = undefined;
    draggedContentIdRef.current = undefined;
    setDraggedContentId(undefined);
    setContentDropTarget(undefined);
  };

  const createContentDragPreview = (source: HTMLElement) => {
    contentDragPreviewRef.current?.remove();
    const preview = source.cloneNode(true) as HTMLElement;
    preview.className = 'combination-content-drag-preview';
    preview.setAttribute('aria-hidden', 'true');
    preview.querySelector('.combination-continuous-block-actions')?.remove();
    preview.style.width = `${Math.min(
      Math.max(source.getBoundingClientRect().width * 0.56, 360),
      560,
    )}px`;
    document.body.appendChild(preview);
    contentDragPreviewRef.current = preview;
    return preview;
  };

  const resolveContentDropPosition = (
    event: React.DragEvent<HTMLDivElement>,
  ): Exclude<ContentDropPosition, 'append'> => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
  };

  const getLinkedKnowledgePointNames = (block: StudyGuideContentBlock) => {
    const nodeIds =
      block.kind === 'comprehensive' && block.currentKnowledgeScope?.length
        ? block.currentKnowledgeScope
        : block.knowledgeNodeIds;
    return (
      nodeIds.map((id) => leafMap.get(id)?.title || id).join('、') || '未设置'
    );
  };

  return (
    <section
      className={`combination-continuous-editor ${
        isNavigationCollapsed ? 'is-nav-collapsed' : ''
      }`}
    >
      <aside className="combination-continuous-nav-column">
        {isNavigationCollapsed ? (
          <div className="combination-continuous-nav-collapsed">
            <Button
              type="text"
              icon={<MenuUnfoldOutlined />}
              aria-label="展开栏目结构"
              aria-expanded={false}
              title="展开栏目结构"
              onClick={() => setIsNavigationCollapsed(false)}
            />
          </div>
        ) : (
          <div className="combination-continuous-nav">
            <div className="combination-continuous-nav-heading">
              <div>
                <strong>栏目结构</strong>
              </div>
              <div className="combination-continuous-nav-heading-actions">
                <Button
                  type="text"
                  size="small"
                  icon={<MenuFoldOutlined />}
                  aria-label="收起栏目结构"
                  aria-expanded={true}
                  title="收起栏目结构"
                  onClick={() => setIsNavigationCollapsed(true)}
                />
              </div>
            </div>

            <nav
              className="combination-continuous-outline"
              aria-label="学案栏目"
            >
              {outline.length ? (
                outline.map((item) => {
                  const isActive = item.node.id === selected?.node.id;
                  return (
                    <div
                      key={item.node.id}
                      className={`combination-continuous-outline-row ${
                        isActive ? 'is-active' : ''
                      } ${draggedId === item.node.id ? 'is-dragging' : ''} ${
                        dropTarget?.id === item.node.id
                          ? `is-drop-${dropTarget.position}`
                          : ''
                      }`}
                      style={{ paddingLeft: 12 + item.depth * 18 }}
                      onDragOver={(event) => {
                        const position = resolveDropPosition(item, event);
                        if (!position) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        setDropTarget({ id: item.node.id, position });
                      }}
                      onDragLeave={(event) => {
                        if (
                          !event.currentTarget.contains(
                            event.relatedTarget as Node | null,
                          ) &&
                          dropTarget?.id === item.node.id
                        ) {
                          setDropTarget(undefined);
                        }
                      }}
                      onDrop={(event) => {
                        const position = resolveDropPosition(item, event);
                        event.preventDefault();
                        if (draggedIdRef.current && position) {
                          onDragMove(
                            draggedIdRef.current,
                            item.node.id,
                            position,
                          );
                          setSelectedId(draggedIdRef.current);
                        }
                        finishDragging();
                      }}
                    >
                      {!readOnly ? (
                        <button
                          type="button"
                          draggable
                          className="combination-continuous-outline-drag-handle"
                          aria-label={`拖拽移动${item.node.label}栏目`}
                          title="拖拽移动栏目"
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData(
                              'text/plain',
                              item.node.id,
                            );
                            setSelectedId(item.node.id);
                            draggedIdRef.current = item.node.id;
                            setDraggedId(item.node.id);
                          }}
                          onDragEnd={finishDragging}
                        >
                          <HolderOutlined />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`combination-continuous-outline-jump ${
                          item.code ? 'has-code' : ''
                        }`}
                        aria-current={isActive ? 'location' : undefined}
                        onClick={() => jumpToColumn(item.node.id)}
                      >
                        {item.code ? (
                          <span className="combination-continuous-outline-code">
                            {item.code}
                          </span>
                        ) : null}
                        <strong>{item.node.label}</strong>
                      </button>
                      {!readOnly ? (
                        <div className="combination-continuous-outline-actions">
                          <Dropdown
                            trigger={['click']}
                            menu={{
                              items: [
                                {
                                  key: 'edit',
                                  icon: <EditOutlined />,
                                  label: item.node.referenceId
                                    ? '更换栏目'
                                    : '编辑栏目',
                                },
                                { type: 'divider' as const },
                                {
                                  key: 'delete',
                                  icon: <DeleteOutlined />,
                                  label: '删除栏目',
                                  danger: true,
                                },
                              ],
                              onClick: ({ key }) => {
                                setSelectedId(item.node.id);
                                if (key === 'edit') onEdit(item.node);
                                if (key === 'delete') onDelete(item.node);
                              },
                            }}
                          >
                            <Button
                              className="combination-continuous-outline-more"
                              type="text"
                              size="small"
                              icon={<EllipsisOutlined />}
                              aria-label={`${item.node.label}栏目操作`}
                            />
                          </Dropdown>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="combination-continuous-outline-empty">
                  尚未添加栏目
                </div>
              )}
            </nav>

            {!readOnly ? (
              <div
                className={`combination-continuous-add-actions ${
                  outline.length ? '' : 'is-empty'
                }`}
              >
                {outline.length ? (
                  <>
                    <Button icon={<PlusOutlined />} onClick={addSibling}>
                      添加同级栏目
                    </Button>
                    <Button
                      icon={<PlusOutlined />}
                      disabled={!selected || !NEXT_LEVEL[selected.node.level]}
                      onClick={addChild}
                    >
                      添加下级栏目
                    </Button>
                  </>
                ) : (
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => onAdd('level1')}
                  >
                    添加一级栏目
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        )}
      </aside>

      <main className="combination-continuous-main">
        <div ref={documentRef} className="combination-continuous-flow">
          {outline.length ? (
            <article className="combination-continuous-document">
              {outline.map((item) => {
                const nodeBlocks = blocksByNode.get(item.node.id) || [];
                return (
                  <section
                    key={item.node.id}
                    className={`combination-continuous-section combination-continuous-depth-${Math.min(
                      item.depth,
                      3,
                    )} ${nodeBlocks.length ? 'has-content' : ''} ${
                      contentDropTarget?.nodeId === item.node.id &&
                      contentDropTarget.position === 'append'
                        ? 'is-content-drop-append'
                        : ''
                    }`}
                    data-column-id={item.node.id}
                    onDragOver={(event) => {
                      if (!draggedContentIdRef.current) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      setContentDropTarget({
                        nodeId: item.node.id,
                        position: 'append',
                      });
                    }}
                    onDragLeave={(event) => {
                      if (
                        !event.currentTarget.contains(
                          event.relatedTarget as Node | null,
                        ) &&
                        contentDropTarget?.nodeId === item.node.id
                      ) {
                        setContentDropTarget(undefined);
                      }
                    }}
                    onDrop={(event) => {
                      if (!draggedContentIdRef.current) return;
                      event.preventDefault();
                      onDragMoveContent(
                        draggedContentIdRef.current,
                        item.node.id,
                        undefined,
                        'append',
                      );
                      setSelectedId(item.node.id);
                      finishContentDragging();
                    }}
                  >
                    <header>
                      <h3>
                        {item.code ? (
                          <span className="combination-continuous-heading-code">
                            {item.code}
                          </span>
                        ) : null}
                        <span>{item.node.label}</span>
                      </h3>
                      {!readOnly ? (
                        <div className="combination-continuous-section-actions">
                          <Button
                            type="text"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => onAddContent(item.node)}
                          >
                            添加内容
                          </Button>
                        </div>
                      ) : null}
                    </header>

                    {nodeBlocks.map((block, blockIndex) => (
                      <div
                        key={block.id}
                        className={`combination-continuous-block ${
                          draggedContentId === block.id ? 'is-dragging' : ''
                        } ${
                          contentDropTarget?.blockId === block.id
                            ? `is-content-drop-${contentDropTarget.position}`
                            : ''
                        }`}
                        onDragOver={(event) => {
                          if (
                            !draggedContentIdRef.current ||
                            draggedContentIdRef.current === block.id
                          ) {
                            return;
                          }
                          event.preventDefault();
                          event.stopPropagation();
                          event.dataTransfer.dropEffect = 'move';
                          setContentDropTarget({
                            nodeId: item.node.id,
                            blockId: block.id,
                            position: resolveContentDropPosition(event),
                          });
                        }}
                        onDrop={(event) => {
                          if (
                            !draggedContentIdRef.current ||
                            draggedContentIdRef.current === block.id
                          ) {
                            return;
                          }
                          event.preventDefault();
                          event.stopPropagation();
                          const position = resolveContentDropPosition(event);
                          onDragMoveContent(
                            draggedContentIdRef.current,
                            item.node.id,
                            block.id,
                            position,
                          );
                          setSelectedId(item.node.id);
                          finishContentDragging();
                        }}
                      >
                        <div className="combination-continuous-block-heading">
                          <div className="combination-continuous-block-meta">
                            {!readOnly ? (
                              <button
                                type="button"
                                draggable
                                className="combination-continuous-block-drag-handle"
                                aria-label={`拖拽移动${item.node.label}中的第${
                                  blockIndex + 1
                                }项内容`}
                                title="拖拽移动内容"
                                onDragStart={(event) => {
                                  event.dataTransfer.effectAllowed = 'move';
                                  event.dataTransfer.setData(
                                    'text/plain',
                                    block.id,
                                  );
                                  const source = event.currentTarget.closest(
                                    '.combination-continuous-block',
                                  );
                                  if (source instanceof HTMLElement) {
                                    event.dataTransfer.setDragImage(
                                      createContentDragPreview(source),
                                      28,
                                      22,
                                    );
                                  }
                                  draggedContentIdRef.current = block.id;
                                  setDraggedContentId(block.id);
                                }}
                                onDragEnd={finishContentDragging}
                              >
                                <HolderOutlined />
                              </button>
                            ) : null}
                            <Tag bordered={false}>
                              {block.kind === 'columnContent'
                                ? '栏目内容'
                                : KNOWLEDGE_BLOCK_TYPE_LABELS[block.kind]}
                            </Tag>
                            {block.kind !== 'columnContent' ? (
                              <span
                                className="combination-continuous-block-knowledge"
                                title={`知识点：${getLinkedKnowledgePointNames(
                                  block,
                                )}`}
                              >
                                知识点：
                                {getLinkedKnowledgePointNames(block)}
                              </span>
                            ) : null}
                          </div>
                          {!readOnly ? (
                            <div className="combination-continuous-block-actions">
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                aria-label={`编辑${item.node.label}中的第${
                                  blockIndex + 1
                                }项内容`}
                                title="编辑内容"
                                onClick={() => onEditContent(item.node, block)}
                              />
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                aria-label={`删除${item.node.label}中的第${
                                  blockIndex + 1
                                }项内容`}
                                title="删除内容"
                                onClick={() => onDeleteContent(block)}
                              />
                            </div>
                          ) : null}
                        </div>
                        <div
                          className="rich-content"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(block.html),
                          }}
                        />
                      </div>
                    ))}

                    {!nodeBlocks.length ? (
                      <div
                        className="combination-continuous-section-empty"
                        onDragOver={(event) => {
                          if (!draggedContentIdRef.current) return;
                          event.preventDefault();
                          event.stopPropagation();
                          event.dataTransfer.dropEffect = 'move';
                          setContentDropTarget({
                            nodeId: item.node.id,
                            position: 'append',
                          });
                        }}
                        onDrop={(event) => {
                          if (!draggedContentIdRef.current) return;
                          event.preventDefault();
                          event.stopPropagation();
                          onDragMoveContent(
                            draggedContentIdRef.current,
                            item.node.id,
                            undefined,
                            'append',
                          );
                          setSelectedId(item.node.id);
                          finishContentDragging();
                        }}
                      >
                        当前栏目暂无内容
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </article>
          ) : (
            <div className="combination-continuous-document-empty">
              <Empty
                description={
                  readOnly ? '当前学案暂无栏目' : '请先在左侧添加栏目'
                }
              />
            </div>
          )}
        </div>
      </main>
    </section>
  );
};

export default StudyGuideContinuousEditor;
