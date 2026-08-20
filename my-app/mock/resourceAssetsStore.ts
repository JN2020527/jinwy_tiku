import type {
  AssetItem,
  AssetType,
  KnowledgeBlock,
  KnowledgeTreeNode,
  StudyGuideContentBlock,
  StudyGuideDetail,
  StudyGuideStructureNode,
} from '../src/services/resourceAssets';

const now = () => new Date().toISOString();

export const knowledgeTreesBySubject: Record<string, KnowledgeTreeNode[]> = {
  math: [
    {
      key: 'kp-1-knowledge-tree-math',
      title: '数与代数',
      children: [
        {
          key: 'kp-1-1-knowledge-tree-math',
          title: '有理数',
          children: [
            {
              key: 'kp-1-1-1-knowledge-tree-math',
              title: '有理数的概念',
            },
            {
              key: 'kp-1-1-2-knowledge-tree-math',
              title: '数轴与相反数',
            },
          ],
        },
        {
          key: 'kp-1-2-knowledge-tree-math',
          title: '整式',
          children: [
            {
              key: 'kp-1-2-1-knowledge-tree-math',
              title: '整式的加减',
            },
          ],
        },
      ],
    },
    {
      key: 'kp-2-knowledge-tree-math',
      title: '图形与几何',
      children: [
        {
          key: 'kp-2-1-knowledge-tree-math',
          title: '三角形',
          children: [
            {
              key: 'kp-2-1-1-knowledge-tree-math',
              title: '三角形的内角和',
            },
          ],
        },
      ],
    },
  ],
  chinese: [
    {
      key: 'kp-1-knowledge-tree-chinese',
      title: '阅读与鉴赏',
      children: [
        {
          key: 'kp-1-1-knowledge-tree-chinese',
          title: '现代文阅读',
          children: [
            {
              key: 'kp-1-1-1-knowledge-tree-chinese',
              title: '概括文章主旨',
            },
          ],
        },
      ],
    },
  ],
  english: [],
  biology: [],
};

const mathStructure: StudyGuideStructureNode[] = [
  {
    id: 'sg-node-l1-core',
    level: 'level1',
    label: '课前预习',
    referenceId: 'column-math-preview',
    children: [
      {
        id: 'sg-node-l2-base',
        level: 'level2',
        label: '基础梳理',
        children: [
          {
            id: 'sg-node-l3-rational',
            level: 'level3',
            label: '有理数的概念',
            referenceId: 'kp-1-1-1-knowledge-tree-math',
            children: [
              {
                id: 'sg-node-l4-summary',
                level: 'level4',
                label: '课堂小结',
                referenceId: 'column-math-summary',
                children: [],
              },
            ],
          },
          {
            id: 'sg-node-l3-axis',
            level: 'level3',
            label: '数轴与相反数',
            referenceId: 'kp-1-1-2-knowledge-tree-math',
            children: [],
          },
        ],
      },
    ],
  },
];

const mathContentBlocks: StudyGuideContentBlock[] = [
  {
    id: 'sg-block-overview',
    kind: 'columnContent',
    structureNodeId: 'sg-node-l2-base',
    knowledgeNodeIds: [],
    html: '<p><strong>本节导读：</strong>从生活中的温度与海拔出发，认识正数、负数和零。</p>',
  },
  {
    id: 'sg-block-comprehensive',
    kind: 'comprehensive',
    structureNodeId: 'sg-node-l2-base',
    knowledgeNodeIds: [
      'kp-1-1-1-knowledge-tree-math',
      'kp-1-1-2-knowledge-tree-math',
    ],
    currentKnowledgeScope: [
      'kp-1-1-1-knowledge-tree-math',
      'kp-1-1-2-knowledge-tree-math',
    ],
    knowledgeBlockId: 'kb-math-comprehensive',
    html: '<p><strong>整体认识：</strong>有理数可以借助数轴形成统一表示，数轴上的方向、原点和单位长度共同决定一个数的位置。</p>',
  },
  {
    id: 'sg-block-single',
    kind: 'single',
    structureNodeId: 'sg-node-l3-rational',
    knowledgeNodeIds: ['kp-1-1-1-knowledge-tree-math'],
    knowledgeBlockId: 'kb-math-single',
    html: '<p>整数和分数统称为有理数。正有理数、零、负有理数构成完整分类。</p><table><tbody><tr><th>类别</th><th>示例</th></tr><tr><td>整数</td><td>−2、0、3</td></tr><tr><td>分数</td><td>1/2、−0.75</td></tr></tbody></table>',
  },
  {
    id: 'sg-block-method',
    kind: 'method',
    structureNodeId: 'sg-node-l4-summary',
    knowledgeNodeIds: ['kp-1-1-1-knowledge-tree-math'],
    knowledgeBlockId: 'kb-math-method',
    html: '<p><strong>分类方法：</strong>先判断是否为零，再看符号，最后判断整数或分数。</p><p>关系式：<math><mrow><mi>a</mi><mo>&gt;</mo><mn>0</mn></mrow></math></p>',
  },
];

const seededStudyGuide: StudyGuideDetail = {
  id: 'asset-math-study-guide-1',
  subject: 'math',
  type: 'studyGuide',
  status: 'formal',
  name: '有理数单元学案',
  originalFileName: '有理数单元学案.docx',
  updatedAt: '2026-08-20T09:30:00.000Z',
  source: 'upload',
  mountCount: 2,
  platformTemplateCount: 1,
  teacherTaskCount: 3,
  structure: structuredClone(mathStructure),
  contentBlocks: structuredClone(mathContentBlocks),
  skippedColumns: ['巩固练习'],
};

const seededAssets: AssetItem[] = [
  seededStudyGuide,
  {
    id: 'asset-math-study-guide-draft',
    subject: 'math',
    type: 'studyGuide',
    status: 'draft',
    name: '整式复习学案',
    originalFileName: '整式复习学案.docx',
    updatedAt: '2026-08-20T08:10:00.000Z',
    source: 'upload',
    mountCount: 0,
    platformTemplateCount: 0,
    teacherTaskCount: 0,
  },
  {
    id: 'asset-math-homework-1',
    subject: 'math',
    type: 'homework',
    status: 'formal',
    name: '有理数基础作业',
    updatedAt: '2026-08-19T11:00:00.000Z',
    source: 'seed',
    mountCount: 1,
    platformTemplateCount: 0,
    teacherTaskCount: 2,
  },
  {
    id: 'asset-math-ppt-1',
    subject: 'math',
    type: 'ppt',
    status: 'formal',
    name: '有理数课堂课件',
    originalFileName: '有理数课堂课件.pptx',
    updatedAt: '2026-08-19T07:40:00.000Z',
    source: 'seed',
    mountCount: 2,
    platformTemplateCount: 1,
    teacherTaskCount: 0,
  },
  {
    id: 'asset-math-word-1',
    subject: 'math',
    type: 'word',
    status: 'formal',
    name: '课堂观察记录',
    originalFileName: '课堂观察记录.docx',
    updatedAt: '2026-08-18T03:20:00.000Z',
    source: 'seed',
    mountCount: 0,
    platformTemplateCount: 0,
    teacherTaskCount: 0,
  },
  {
    id: 'asset-chinese-audio-1',
    subject: 'chinese',
    type: 'audio',
    status: 'formal',
    name: '古诗朗读示范',
    originalFileName: '古诗朗读示范.mp3',
    updatedAt: '2026-08-18T06:00:00.000Z',
    source: 'seed',
    mountCount: 1,
    platformTemplateCount: 0,
    teacherTaskCount: 1,
  },
];

export const assetStore: AssetItem[] = structuredClone(seededAssets);
export const studyGuideStore: Record<string, StudyGuideDetail> = {
  [seededStudyGuide.id]: structuredClone(seededStudyGuide),
  'asset-math-study-guide-draft': {
    ...structuredClone(seededStudyGuide),
    id: 'asset-math-study-guide-draft',
    status: 'draft',
    name: '整式复习学案',
    originalFileName: '整式复习学案.docx',
    updatedAt: '2026-08-20T08:10:00.000Z',
    structure: [
      {
        id: 'sg-draft-l1-preview',
        level: 'level1',
        label: '课前预习',
        referenceId: 'column-math-preview',
        children: [
          {
            id: 'sg-draft-l2-algebra',
            level: 'level2',
            label: '整式梳理',
            children: [
              {
                id: 'sg-draft-l3-polynomial',
                level: 'level3',
                label: '整式的加减',
                referenceId: 'kp-1-2-1-knowledge-tree-math',
                children: [],
              },
            ],
          },
        ],
      },
    ],
    contentBlocks: [
      {
        id: 'sg-draft-block',
        kind: 'single',
        structureNodeId: 'sg-draft-l3-polynomial',
        knowledgeNodeIds: ['kp-1-2-1-knowledge-tree-math'],
        html: '<p>整式加减的关键是先去括号，再合并同类项。</p>',
      },
    ],
    skippedColumns: [],
  },
};

export const getRegisteredColumnUsageCounts = (subject: string) => {
  const counts: Record<string, number> = {};
  Object.values(studyGuideStore)
    .filter((guide) => guide.subject === subject)
    .flatMap((guide) => guide.structure)
    .forEach(function visit(node) {
      if (
        (node.level === 'level1' || node.level === 'level4') &&
        node.referenceId
      ) {
        counts[node.referenceId] = (counts[node.referenceId] || 0) + 1;
      }
      node.children.forEach(visit);
    });
  return counts;
};

export const knowledgeBlockStore: KnowledgeBlock[] = [
  {
    id: 'kb-math-single',
    subject: 'math',
    type: 'single',
    html: mathContentBlocks[2].html,
    knowledgeNodeIds: ['kp-1-1-1-knowledge-tree-math'],
    referenceStudyGuides: [
      { id: seededStudyGuide.id, name: seededStudyGuide.name },
    ],
    createdAt: '2026-08-18T02:00:00.000Z',
    updatedAt: '2026-08-20T09:30:00.000Z',
  },
  {
    id: 'kb-math-comprehensive',
    subject: 'math',
    type: 'comprehensive',
    html: mathContentBlocks[1].html,
    knowledgeNodeIds: [
      'kp-1-1-1-knowledge-tree-math',
      'kp-1-1-2-knowledge-tree-math',
    ],
    referenceStudyGuides: [
      { id: seededStudyGuide.id, name: seededStudyGuide.name },
    ],
    createdAt: '2026-08-18T02:20:00.000Z',
    updatedAt: '2026-08-20T09:30:00.000Z',
  },
  {
    id: 'kb-math-method',
    subject: 'math',
    type: 'method',
    html: mathContentBlocks[3].html,
    knowledgeNodeIds: ['kp-1-1-1-knowledge-tree-math'],
    referenceStudyGuides: [
      { id: seededStudyGuide.id, name: seededStudyGuide.name },
    ],
    createdAt: '2026-08-18T03:00:00.000Z',
    updatedAt: '2026-08-20T09:30:00.000Z',
  },
  {
    id: 'kb-math-example',
    subject: 'math',
    type: 'example',
    html: '<p><strong>例：</strong>将 −3、0、2.5 标在数轴上，并比较大小。</p><ol><li>确定原点和单位长度</li><li>根据符号判断方向</li><li>按绝对值确定距离</li></ol>',
    knowledgeNodeIds: ['kp-1-1-2-knowledge-tree-math'],
    referenceStudyGuides: [],
    createdAt: '2026-08-19T04:00:00.000Z',
    updatedAt: '2026-08-19T04:00:00.000Z',
  },
];

let sequence = 0;
export const nextId = (prefix: string) => {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
};

export const touchAsset = (asset: AssetItem) => {
  asset.updatedAt = now();
  const detail = studyGuideStore[asset.id];
  if (detail) detail.updatedAt = asset.updatedAt;
};

export const clone = <T>(value: T): T => structuredClone(value);

export const findAsset = (id: string, subject: string) =>
  assetStore.find((asset) => asset.id === id && asset.subject === subject);

export const isNameTaken = (
  subject: string,
  type: AssetType,
  name: string,
  excludeId?: string,
) =>
  assetStore.some(
    (asset) =>
      asset.id !== excludeId &&
      asset.subject === subject &&
      asset.type === type &&
      asset.name.trim() === name.trim(),
  );

export const collectLeafIds = (
  nodes: KnowledgeTreeNode[],
  targetId?: string,
): string[] => {
  const target = targetId
    ? (() => {
        const find = (
          list: KnowledgeTreeNode[],
        ): KnowledgeTreeNode | undefined => {
          for (const node of list) {
            if (node.key === targetId) return node;
            const child = find(node.children || []);
            if (child) return child;
          }
          return undefined;
        };
        return find(nodes);
      })()
    : undefined;
  const root = target ? [target] : nodes;
  return root.flatMap((node) =>
    node.children?.length ? collectLeafIds(node.children) : [node.key],
  );
};

export const collectLeaves = (
  nodes: KnowledgeTreeNode[],
  parentPath: string[] = [],
): Array<{ id: string; title: string; path: string[] }> =>
  nodes.flatMap((node) => {
    const path = [...parentPath, node.title];
    return node.children?.length
      ? collectLeaves(node.children, path)
      : [{ id: node.key, title: node.title, path }];
  });

export const getStudyGuideReferenceCounts = (subject: string) => {
  const counts: Record<string, number> = {};
  Object.values(studyGuideStore)
    .filter((guide) => guide.subject === subject)
    .flatMap((guide) => guide.structure)
    .forEach(function visit(node) {
      if (node.level === 'level3' && node.referenceId) {
        counts[node.referenceId] = (counts[node.referenceId] || 0) + 1;
      }
      node.children.forEach(visit);
    });
  return counts;
};
