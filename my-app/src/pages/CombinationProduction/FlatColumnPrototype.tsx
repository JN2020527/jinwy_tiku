import PrototypeSwitcher from '@/components/PrototypeSwitcher';
import { formatRegisteredColumnCode } from '@/features/study-guide/columnCode';
import type {
  RegisteredColumn,
  StudyGuideContentBlock,
  StudyGuideStructureNode,
} from '@/services/resourceAssets';
import { KNOWLEDGE_BLOCK_TYPE_LABELS } from '@/services/resourceAssets';
import { sanitizeHtml } from '@/utils/sanitize';
import {
  AppstoreOutlined,
  BarsOutlined,
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  EyeOutlined,
  FileTextOutlined,
  HolderOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { history, useLocation } from '@umijs/max';
import { Button, Tag } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import './FlatColumnPrototype.less';

export type FlatColumnPrototypeVariant = 'A' | 'B' | 'C' | 'D';

export const isFlatColumnPrototypeVariant = (
  value?: string | null,
): value is FlatColumnPrototypeVariant =>
  value === 'A' || value === 'B' || value === 'C' || value === 'D';

interface FlatColumn {
  id: string;
  title: string;
  blocks: StudyGuideContentBlock[];
  depth: number;
  hasChildren: boolean;
  code: string | null;
}

interface FlatColumnPrototypeProps {
  variant: FlatColumnPrototypeVariant;
  structure: StudyGuideStructureNode[];
  blocks: StudyGuideContentBlock[];
  registeredColumns: RegisteredColumn[];
}

const VARIANTS = [
  { key: 'A', label: '连续文稿' },
  { key: 'B', label: '聚焦工作台' },
  { key: 'C', label: '卡片画布' },
  { key: 'D', label: '目录 + 连续文稿' },
] satisfies Array<{ key: FlatColumnPrototypeVariant; label: string }>;

const flattenColumns = (
  nodes: StudyGuideStructureNode[],
  blocks: StudyGuideContentBlock[],
  registeredColumnMap: Map<string, RegisteredColumn>,
  depth = 0,
): FlatColumn[] =>
  nodes.flatMap((node, siblingIndex) => [
    {
      id: node.id,
      title: node.label,
      blocks: blocks.filter((block) => block.structureNodeId === node.id),
      depth,
      hasChildren: node.children.length > 0,
      code: formatRegisteredColumnCode(
        registeredColumnMap.get(node.referenceId || ''),
        siblingIndex + 1,
      ),
    },
    ...flattenColumns(node.children, blocks, registeredColumnMap, depth + 1),
  ]);

const htmlToText = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');

const EmptyColumn = () => (
  <div className="flat-prototype-empty">暂无内容，点击“添加内容”开始编写</div>
);

const BlockContent: React.FC<{ block: StudyGuideContentBlock }> = ({
  block,
}) => (
  <div className="flat-prototype-content-block">
    <Tag bordered={false}>
      {block.kind === 'columnContent'
        ? '栏目内容'
        : KNOWLEDGE_BLOCK_TYPE_LABELS[block.kind]}
    </Tag>
    <div
      className="rich-content"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.html) }}
    />
  </div>
);

const PrototypeHeading: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  count: number;
  countLabel?: string;
  countDescription?: string;
}> = ({
  icon,
  title,
  description,
  count,
  countLabel = '个同级栏目',
  countDescription = '仅保留顺序 · 无父子关系',
}) => (
  <header className="flat-prototype-heading">
    <div className="flat-prototype-heading-icon">{icon}</div>
    <div>
      <div className="flat-prototype-eyebrow">扁平栏目编排方向</div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    <div className="flat-prototype-state">
      <strong>{count}</strong>
      <span>{countLabel}</span>
      <small>{countDescription}</small>
    </div>
  </header>
);

const VariantA: React.FC<{ columns: FlatColumn[] }> = ({ columns }) => (
  <section className="flat-prototype flat-prototype-a">
    <PrototypeHeading
      icon={<FileTextOutlined />}
      title="连续文稿"
      description="栏目就是文稿中的独立章节，按阅读顺序从上到下直接编写。"
      count={columns.length}
    />
    <div className="flat-a-toolbar">
      <div>
        <strong>学案正文</strong>
        <span>拖动左侧序号即可调整栏目顺序</span>
      </div>
      <Button icon={<PlusOutlined />}>添加栏目</Button>
    </div>
    <div className="flat-a-document">
      {columns.map((column, index) => (
        <article key={column.id} className="flat-a-section">
          <aside>
            <HolderOutlined />
            <span>{String(index + 1).padStart(2, '0')}</span>
          </aside>
          <div>
            <header>
              <h3>{column.title}</h3>
              <div>
                <Button type="text" size="small" icon={<EditOutlined />}>
                  重命名
                </Button>
                <Button type="text" size="small" icon={<PlusOutlined />}>
                  添加内容
                </Button>
                <Button
                  type="text"
                  size="small"
                  icon={<EllipsisOutlined />}
                  aria-label={`更多${column.title}操作`}
                />
              </div>
            </header>
            {column.blocks.length ? (
              column.blocks.map((block) => (
                <BlockContent key={block.id} block={block} />
              ))
            ) : (
              <EmptyColumn />
            )}
          </div>
        </article>
      ))}
    </div>
  </section>
);

const VariantB: React.FC<{ columns: FlatColumn[] }> = ({ columns }) => {
  const [selectedId, setSelectedId] = useState(columns[0]?.id);
  const selected =
    columns.find((column) => column.id === selectedId) || columns[0];

  return (
    <section className="flat-prototype flat-prototype-b">
      <PrototypeHeading
        icon={<BarsOutlined />}
        title="聚焦工作台"
        description="左侧只负责选栏目和排序，右侧集中处理当前栏目的内容。"
        count={columns.length}
      />
      <div className="flat-b-workspace">
        <aside className="flat-b-sidebar">
          <div className="flat-b-sidebar-title">
            <div>
              <strong>全部栏目</strong>
              <span>{columns.length} 个</span>
            </div>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              aria-label="添加栏目"
            />
          </div>
          <div className="flat-b-list">
            {columns.map((column, index) => (
              <button
                key={column.id}
                type="button"
                className={column.id === selected?.id ? 'is-active' : ''}
                onClick={() => setSelectedId(column.id)}
              >
                <HolderOutlined />
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{column.title}</strong>
                <small>{column.blocks.length} 项内容</small>
              </button>
            ))}
          </div>
          <Button block icon={<PlusOutlined />}>
            添加同级栏目
          </Button>
        </aside>
        {selected && (
          <main className="flat-b-editor">
            <header>
              <div>
                <span>当前栏目</span>
                <h3>{selected.title}</h3>
              </div>
              <div>
                <Button icon={<EyeOutlined />}>预览本栏</Button>
                <Button type="primary" icon={<PlusOutlined />}>
                  添加内容
                </Button>
              </div>
            </header>
            <div className="flat-b-editor-body">
              {selected.blocks.length ? (
                selected.blocks.map((block) => (
                  <BlockContent key={block.id} block={block} />
                ))
              ) : (
                <EmptyColumn />
              )}
            </div>
            <footer>
              <Button type="text" icon={<EditOutlined />}>
                修改栏目名称
              </Button>
              <Button type="text" danger icon={<DeleteOutlined />}>
                删除栏目
              </Button>
            </footer>
          </main>
        )}
      </div>
    </section>
  );
};

const VariantC: React.FC<{ columns: FlatColumn[] }> = ({ columns }) => (
  <section className="flat-prototype flat-prototype-c">
    <PrototypeHeading
      icon={<AppstoreOutlined />}
      title="卡片画布"
      description="先用同级卡片快速搭出学案全貌，再进入任一栏目补充内容。"
      count={columns.length}
    />
    <div className="flat-c-toolbar">
      <div>
        <strong>栏目画布</strong>
        <span>卡片从左到右、从上到下形成最终顺序</span>
      </div>
      <Button type="primary" icon={<PlusOutlined />}>
        新建栏目
      </Button>
    </div>
    <div className="flat-c-grid">
      {columns.map((column, index) => (
        <article key={column.id} className="flat-c-card">
          <header>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <HolderOutlined />
            <Button
              type="text"
              size="small"
              icon={<EllipsisOutlined />}
              aria-label={`更多${column.title}操作`}
            />
          </header>
          <h3>{column.title}</h3>
          <p>
            {column.blocks.length
              ? column.blocks
                  .map((block) => htmlToText(block.html))
                  .join(' ')
                  .slice(0, 76)
              : '当前栏目还没有内容，可以稍后补充。'}
          </p>
          <footer>
            <span>{column.blocks.length} 项内容</span>
            <Button type="link" size="small">
              打开编辑
            </Button>
          </footer>
        </article>
      ))}
      <button type="button" className="flat-c-add-card">
        <PlusOutlined />
        <strong>添加同级栏目</strong>
        <span>放到学案末尾</span>
      </button>
    </div>
  </section>
);

const VariantD: React.FC<{ columns: FlatColumn[] }> = ({ columns }) => {
  const [selectedId, setSelectedId] = useState(columns[0]?.id);
  const documentRef = useRef<HTMLDivElement>(null);

  const jumpToColumn = (columnId: string) => {
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

  useEffect(() => {
    const syncSelectedColumn = () => {
      if (!documentRef.current) return;
      const sections = Array.from(
        documentRef.current.querySelectorAll<HTMLElement>('[data-column-id]'),
      );
      const anchor = Math.min(window.innerHeight * 0.28, 220);
      const current =
        sections
          .filter((section) => section.getBoundingClientRect().top <= anchor)
          .at(-1) || sections[0];
      if (current?.dataset.columnId) setSelectedId(current.dataset.columnId);
    };
    syncSelectedColumn();
    window.addEventListener('scroll', syncSelectedColumn, { passive: true });
    window.addEventListener('resize', syncSelectedColumn);
    return () => {
      window.removeEventListener('scroll', syncSelectedColumn);
      window.removeEventListener('resize', syncSelectedColumn);
    };
  }, [columns]);

  return (
    <section className="flat-prototype flat-prototype-d">
      <PrototypeHeading
        icon={<BarsOutlined />}
        title="目录 + 连续文稿"
        description="左右使用同一栏目层级，右侧以标题层级连续展开正文。"
        count={columns.length}
        countLabel="个栏目"
        countDescription="保留父子关系 · 正文连续展开"
      />
      <div className="flat-d-workspace">
        <aside className="flat-d-nav-column">
          <div className="flat-b-sidebar flat-d-sidebar">
            <div className="flat-b-sidebar-title">
              <div>
                <strong>栏目结构</strong>
                <span>{columns.length} 个栏目</span>
              </div>
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                aria-label="添加一级栏目"
              />
            </div>
            <div className="flat-b-list">
              {columns.map((column) => (
                <button
                  key={column.id}
                  type="button"
                  className={`${column.code ? 'has-code' : ''} ${
                    column.id === selectedId ? 'is-active' : ''
                  }`}
                  style={{
                    paddingLeft: 10 + column.depth * 18,
                  }}
                  onClick={() => jumpToColumn(column.id)}
                >
                  <HolderOutlined />
                  {column.code ? <span>{column.code}</span> : null}
                  <strong>{column.title}</strong>
                </button>
              ))}
            </div>
            <div className="flat-d-add-actions">
              <Button icon={<PlusOutlined />}>添加同级栏目</Button>
              <Button icon={<PlusOutlined />}>添加下级栏目</Button>
            </div>
          </div>
        </aside>
        <main className="flat-d-editor">
          <div className="flat-d-toolbar">
            <div>
              <strong>学案正文</strong>
              <span>全部栏目连续呈现，点击左侧目录可快速定位</span>
            </div>
            <Button icon={<EyeOutlined />}>预览整篇</Button>
          </div>
          <div ref={documentRef} className="flat-d-document-scroll">
            <div className="flat-a-document flat-d-document">
              {columns.map((column) => (
                <article
                  key={column.id}
                  className={`flat-a-section flat-d-section flat-d-section-depth-${Math.min(
                    column.depth,
                    3,
                  )} ${column.hasChildren ? 'has-children' : ''} ${
                    column.blocks.length ? 'has-content' : ''
                  } ${column.id === selectedId ? 'is-active' : ''}`}
                  data-column-id={column.id}
                >
                  <div>
                    <header>
                      <h3>
                        {column.code ? (
                          <span className="flat-d-heading-code">
                            {column.code}
                          </span>
                        ) : null}
                        <span>{column.title}</span>
                      </h3>
                      <div>
                        <Button
                          type="text"
                          size="small"
                          icon={<PlusOutlined />}
                        >
                          添加内容
                        </Button>
                        <Button
                          type="text"
                          size="small"
                          icon={<EllipsisOutlined />}
                          aria-label={`更多${column.title}操作`}
                        />
                      </div>
                    </header>
                    {column.blocks.length ? (
                      column.blocks.map((block) => (
                        <BlockContent key={block.id} block={block} />
                      ))
                    ) : column.hasChildren ? null : (
                      <EmptyColumn />
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </main>
      </div>
    </section>
  );
};

const FlatColumnPrototype: React.FC<FlatColumnPrototypeProps> = ({
  variant,
  structure,
  blocks,
  registeredColumns,
}) => {
  const location = useLocation();
  const registeredColumnMap = useMemo(
    () => new Map(registeredColumns.map((column) => [column.id, column])),
    [registeredColumns],
  );
  const columns = useMemo(
    () => flattenColumns(structure, blocks, registeredColumnMap),
    [blocks, registeredColumnMap, structure],
  );

  const changeVariant = (nextVariant: FlatColumnPrototypeVariant) => {
    const params = new URLSearchParams(location.search);
    params.set('variant', nextVariant);
    history.replace(`${location.pathname}?${params.toString()}`);
    window.setTimeout(() => window.scrollTo(0, 0));
  };

  return (
    <>
      {variant === 'A' && <VariantA columns={columns} />}
      {variant === 'B' && <VariantB columns={columns} />}
      {variant === 'C' && <VariantC columns={columns} />}
      {variant === 'D' && <VariantD columns={columns} />}
      <PrototypeSwitcher
        variants={VARIANTS}
        current={variant}
        onChange={changeVariant}
      />
    </>
  );
};

export default FlatColumnPrototype;
