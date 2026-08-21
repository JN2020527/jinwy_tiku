import type { Request, Response } from 'express';
import type {
  AssetItem,
  AttachmentType,
  HomeworkDetail,
  KnowledgeBlock,
  KnowledgeBlockType,
  StudyGuideContentBlock,
  StudyGuideDetail,
  StudyGuideStructureNode,
  UploadValidationIssue,
} from '../src/services/resourceAssets';
import { getAttachmentType } from '../src/services/resourceAssets';
import {
  assetStore,
  clone,
  collectLeafIds,
  collectLeaves,
  findAsset,
  homeworkStore,
  isNameTaken,
  knowledgeBlockStore,
  knowledgeTreesBySubject,
  nextId,
  questionStore,
  studyGuideStore,
  touchAsset,
  touchHomework,
} from './resourceAssetsStore';
import { getSubjectColumnsSnapshot } from './subjectColumns';

const queryValue = (value: unknown) =>
  Array.isArray(value) ? String(value[0] || '') : String(value || '');
const sendFailure = (res: Response, message: string, data: unknown = null) =>
  res.send({ success: false, message, data });
const sendSuccess = <T>(res: Response, data: T, message = '操作成功') =>
  res.send({ success: true, message, data: clone(data) });

const getAssetContext = (req: Request) => ({
  subject: queryValue(req.query.subject || req.body?.subject).trim(),
  id: queryValue(req.query.id || req.body?.id).trim(),
});

const attachmentExtensions: Record<AttachmentType, string[]> = {
  word: ['.docx'],
  ppt: ['.ppt', '.pptx'],
  audio: ['.mp3', '.wav'],
  video: ['.mp4'],
};

const buildUploadStructure = (subject: string): StudyGuideStructureNode[] => {
  const columns = getSubjectColumnsSnapshot(subject);
  const level1Candidates = columns.filter(
    (column) => column.level === 1 && column.type === 'knowledge',
  );
  const level1 =
    level1Candidates.find((candidate) =>
      columns.some(
        (column) =>
          column.level === 4 &&
          column.type === 'knowledge' &&
          column.parentId === candidate.id,
      ),
    ) || level1Candidates[0];
  const level4 = columns.find(
    (column) =>
      column.level === 4 &&
      column.type === 'knowledge' &&
      column.parentId === level1?.id,
  );
  const leaves = collectLeaves(knowledgeTreesBySubject[subject] || []);
  if (!level1 || !leaves.length) return [];
  const firstLeaf = leaves[0];
  const secondLeaf = leaves[1] || firstLeaf;
  return [
    {
      id: nextId('upload-l1'),
      level: 'level1',
      label: level1.name,
      referenceId: level1.id,
      children: [
        {
          id: nextId('upload-l2'),
          level: 'level2',
          label: '概念与方法',
          children: [
            {
              id: nextId('upload-l3'),
              level: 'level3',
              label: firstLeaf.title,
              referenceId: firstLeaf.id,
              children: level4
                ? [
                    {
                      id: nextId('upload-l4'),
                      level: 'level4',
                      label: level4.name,
                      referenceId: level4.id,
                      children: [],
                    },
                  ]
                : [],
            },
            {
              id: nextId('upload-l3'),
              level: 'level3',
              label: secondLeaf.title,
              referenceId: secondLeaf.id,
              children: [],
            },
          ],
        },
      ],
    },
  ];
};

const flattenStructure = (
  nodes: StudyGuideStructureNode[],
): StudyGuideStructureNode[] =>
  nodes.flatMap((node) => [node, ...flattenStructure(node.children)]);

const findStructurePath = (
  nodes: StudyGuideStructureNode[],
  targetId: string,
  ancestors: StudyGuideStructureNode[] = [],
): StudyGuideStructureNode[] => {
  for (const node of nodes) {
    const path = [...ancestors, node];
    if (node.id === targetId) return path;
    const childPath = findStructurePath(node.children, targetId, path);
    if (childPath.length) return childPath;
  }
  return [];
};

const pruneEmptyStructure = (
  nodes: StudyGuideStructureNode[],
  contentBlocks: StudyGuideContentBlock[],
): StudyGuideStructureNode[] => {
  const occupiedNodeIds = new Set(
    contentBlocks.map((block) => block.structureNodeId),
  );
  return nodes.flatMap((node) => {
    const children = pruneEmptyStructure(node.children, contentBlocks);
    return occupiedNodeIds.has(node.id) || children.length
      ? [{ ...node, children }]
      : [];
  });
};

const recalculateDraftComprehensiveRelations = (draft: StudyGuideDetail) => {
  const knowledgeNodeIds = Array.from(
    new Set(
      flattenStructure(draft.structure)
        .filter((node) => node.level === 'level3' && node.referenceId)
        .map((node) => node.referenceId as string),
    ),
  );
  draft.contentBlocks = draft.contentBlocks.map((block) =>
    block.kind === 'comprehensive'
      ? {
          ...block,
          knowledgeNodeIds,
          currentKnowledgeScope: knowledgeNodeIds,
        }
      : block,
  );
};

const buildUploadBlocks = (
  structure: StudyGuideStructureNode[],
): StudyGuideContentBlock[] => {
  const nodes = flattenStructure(structure);
  const level2 = nodes.find((node) => node.level === 'level2')!;
  const level3Nodes = nodes.filter((node) => node.level === 'level3');
  const level4 = nodes.find((node) => node.level === 'level4');
  const knowledgeIds = level3Nodes
    .map((node) => node.referenceId)
    .filter((id): id is string => Boolean(id));
  return [
    {
      id: nextId('upload-block'),
      kind: 'columnContent',
      structureNodeId: level2.id,
      html: '<p><strong>学习提示：</strong>先用实例理解正负数，再借助数轴建立数形联系。</p>',
      knowledgeNodeIds: [],
    },
    {
      id: nextId('upload-block'),
      kind: 'comprehensive',
      structureNodeId: level2.id,
      html: '<p>有理数的分类、数轴表示和相反数共同构成这一单元的知识主线。</p>',
      knowledgeNodeIds: knowledgeIds,
      currentKnowledgeScope: knowledgeIds,
    },
    {
      id: nextId('upload-block'),
      kind: 'single',
      structureNodeId: level3Nodes[0].id,
      html: '<p>整数和分数统称为有理数。零既不是正数，也不是负数。</p><ol><li>先判断符号</li><li>再判断整数或分数</li></ol><table><tbody><tr><th>分类</th><th>示例</th></tr><tr><td>正有理数</td><td>3、1/2</td></tr><tr><td>负有理数</td><td>−2、−0.5</td></tr></tbody></table><p><img src="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27240%27 height=%2780%27%3E%3Crect width=%27240%27 height=%2780%27 fill=%27%23eff6ff%27/%3E%3Ctext x=%27120%27 y=%2745%27 text-anchor=%27middle%27 fill=%27%231d4ed8%27%3EWord 内嵌示意图%3C/text%3E%3C/svg%3E" alt="Word 内嵌示意图" width="240" height="80"></p>',
      knowledgeNodeIds: [knowledgeIds[0]],
    },
    {
      id: nextId('upload-block'),
      kind: 'method',
      structureNodeId: level4?.id || level3Nodes[0].id,
      html: '<p><strong>判断方法：</strong>按“符号 → 是否为零 → 整数或分数”的顺序分类。</p><p><math><mrow><mi>a</mi><mo>&gt;</mo><mn>0</mn></mrow></math> 表示 a 是正数。</p>',
      knowledgeNodeIds: [knowledgeIds[0]],
    },
    {
      id: nextId('upload-block'),
      kind: 'example',
      structureNodeId: level3Nodes[1].id,
      html: '<p><strong>例：</strong>在数轴上标出 −2 与 2，并说明它们到原点的距离关系。</p>',
      knowledgeNodeIds: [knowledgeIds[1]],
    },
  ];
};

const uploadIssues: UploadValidationIssue[] = [
  {
    location: '第 2 页，第 4 个标记',
    marker: '【三级：一次函数】',
    reason: '当前学科知识树中未找到同名末级节点',
  },
  {
    location: '第 3 页，第 7 个标记',
    marker: '【四级：典型练习】',
    reason: '四级栏目未注册，或不归属当前一级栏目“课前预习”',
  },
  {
    location: '第 4 页，段落 3',
    marker: '知识回顾正文',
    reason: '正文位于合法内容标记之外',
  },
  {
    location: '第 5 页，第 10 个标记',
    marker: '【综合知识】',
    reason: '不是正式内容标记，应使用“【综合类知识】”',
  },
  {
    location: '第 6 页，第 12 个标记',
    marker: '【例题类知识】',
    reason: '标记后没有有效内容，形成空知识块',
  },
];

const refreshAssetFromDetail = (detail: StudyGuideDetail) => {
  const index = assetStore.findIndex((asset) => asset.id === detail.id);
  const summary: AssetItem = {
    id: detail.id,
    subject: detail.subject,
    type: detail.type,
    status: detail.status,
    name: detail.name,
    originalFileName: detail.originalFileName,
    updatedAt: detail.updatedAt,
    source: detail.source,
    mountCount: detail.mountCount,
    platformTemplateCount: detail.platformTemplateCount,
    teacherTaskCount: detail.teacherTaskCount,
  };
  if (index >= 0) assetStore[index] = summary;
  else assetStore.unshift(summary);
};

const refreshAssetFromHomework = (homework: HomeworkDetail) => {
  const summary: AssetItem = {
    id: homework.id,
    subject: homework.subject,
    type: homework.type,
    status: homework.status,
    name: homework.name,
    updatedAt: homework.updatedAt,
    source: homework.source,
    mountCount: homework.mountCount,
    platformTemplateCount: homework.platformTemplateCount,
    teacherTaskCount: homework.teacherTaskCount,
  };
  const index = assetStore.findIndex((asset) => asset.id === homework.id);
  if (index >= 0) assetStore[index] = summary;
  else assetStore.unshift(summary);
};

const validateHomeworkPayload = (
  subject: string,
  name: string,
  questionIds: string[],
  excludeId?: string,
): string | null => {
  if (!subject) return '保存作业的学科不可用';
  if (!name) return '请输入作业名称';
  if (!questionIds.length) return '至少加入 1 道题才能保存作业';
  if (questionIds.length > 60) return '作业最多可添加 60 道题';
  if (new Set(questionIds).size !== questionIds.length) {
    return '同一试题在一份作业中不能重复';
  }
  if (isNameTaken(subject, 'homework', name, excludeId)) {
    return '当前学科已存在同名作业';
  }
  const publishedIds = new Set(
    questionStore
      .filter((question) => question.subject === subject)
      .filter((question) => question.status === 'published')
      .map((question) => question.id),
  );
  const invalidCount = questionIds.filter(
    (questionId) => !publishedIds.has(questionId),
  ).length;
  if (invalidCount) {
    return `所选试题中存在 ${invalidCount} 道不属于当前学科或未发布的试题，请移除后保存`;
  }
  return null;
};

const hydrateStudyGuideReferences = (
  detail: StudyGuideDetail,
): StudyGuideDetail => {
  const hydrated = clone(detail);
  const columnMap = new Map(
    getSubjectColumnsSnapshot(detail.subject).map((column) => [
      column.id,
      column.name,
    ]),
  );
  const knowledgeLeafMap = new Map(
    collectLeaves(knowledgeTreesBySubject[detail.subject] || []).map((leaf) => [
      leaf.id,
      leaf.title,
    ]),
  );
  const hydrateStructure = (
    nodes: StudyGuideStructureNode[],
  ): StudyGuideStructureNode[] =>
    nodes.map((node) => ({
      ...node,
      label:
        node.level === 'level1' || node.level === 'level4'
          ? columnMap.get(node.referenceId || '') || node.label
          : node.level === 'level3'
          ? knowledgeLeafMap.get(node.referenceId || '') || node.label
          : node.label,
      children: hydrateStructure(node.children),
    }));
  hydrated.structure = hydrateStructure(hydrated.structure);
  hydrated.contentBlocks = hydrated.contentBlocks.map((block) => {
    if (!block.knowledgeBlockId) return block;
    const source = knowledgeBlockStore.find(
      (item) => item.id === block.knowledgeBlockId,
    );
    return source
      ? {
          ...block,
          kind: source.type,
          html: source.html,
          knowledgeNodeIds: clone(source.knowledgeNodeIds),
        }
      : block;
  });
  return hydrated;
};

const syncKnowledgeBlockReferences = (subject: string) => {
  const formalGuides = Object.values(studyGuideStore).filter(
    (guide) => guide.subject === subject && guide.status === 'formal',
  );
  knowledgeBlockStore
    .filter((block) => block.subject === subject)
    .forEach((block) => {
      block.referenceStudyGuides = formalGuides
        .filter((guide) =>
          guide.contentBlocks.some(
            (item) => item.knowledgeBlockId === block.id,
          ),
        )
        .map((guide) => ({ id: guide.id, name: guide.name }));
    });
};

const validateDraftForFinal = (draft: StudyGuideDetail) => {
  if (!draft.contentBlocks.length) return '草稿至少保留一个知识块或栏目内容块';
  const invalidComprehensive = draft.contentBlocks.find(
    (block) =>
      block.kind === 'comprehensive' &&
      (!block.knowledgeNodeIds.length || !block.currentKnowledgeScope?.length),
  );
  if (invalidComprehensive) return '综合类知识块必须至少关联一个本学案三级考点';
  return null;
};

const allowedTypesForStructureNode = (
  structure: StudyGuideStructureNode[],
  nodeId: string,
): KnowledgeBlockType[] => {
  const node = flattenStructure(structure).find((item) => item.id === nodeId);
  if (!node) return [];
  if (node.level === 'level2') return ['comprehensive'];
  if (node.level === 'level3' || node.level === 'level4') {
    return ['single', 'method', 'example'];
  }
  return [];
};

export default {
  'GET /api/resource-assets': (req: Request, res: Response) => {
    const subject = queryValue(req.query.subject).trim();
    const keyword = queryValue(req.query.keyword).trim().toLowerCase();
    const type = queryValue(req.query.type);
    const status = queryValue(req.query.status);
    if (!subject) return sendFailure(res, '请选择学科');
    const result = assetStore
      .filter((asset) => asset.subject === subject)
      .filter((asset) => !type || asset.type === type)
      .filter((asset) => !status || asset.status === status)
      .filter(
        (asset) =>
          !keyword ||
          asset.name.toLowerCase().includes(keyword) ||
          asset.originalFileName?.toLowerCase().includes(keyword),
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    sendSuccess(res, result, '资产列表加载成功');
  },

  'GET /api/resource-assets/detail': (req: Request, res: Response) => {
    const { id, subject } = getAssetContext(req);
    const asset = findAsset(id, subject);
    if (!asset) return sendFailure(res, '资产不存在或不属于当前学科');
    if (homeworkStore[id]) {
      return sendSuccess(res, homeworkStore[id], '资产详情加载成功');
    }
    sendSuccess(
      res,
      studyGuideStore[id]
        ? hydrateStudyGuideReferences(studyGuideStore[id])
        : asset,
      '资产详情加载成功',
    );
  },

  'POST /api/resource-assets/study-guide/upload': (
    req: Request,
    res: Response,
  ) => {
    const subject = String(req.body?.subject || '').trim();
    const name = String(req.body?.name || '').trim();
    const originalFileName = String(req.body?.originalFileName || '').trim();
    const fixture = String(req.body?.fixture || 'valid');
    if (!subject) return sendFailure(res, '上传学科不可用');
    if (!name) return sendFailure(res, '请输入学案名称');
    if (!originalFileName.toLowerCase().endsWith('.docx')) {
      return sendFailure(res, '成品学案仅支持 .docx');
    }
    if (isNameTaken(subject, 'studyGuide', name)) {
      return sendFailure(res, '当前学科已存在同名学案');
    }
    if (fixture === 'invalid') {
      return sendSuccess(
        res,
        { issues: uploadIssues, skippedColumns: [] },
        '发现 5 处格式问题，未创建任何对象',
      );
    }
    if (fixture === 'questionOnly') {
      return sendSuccess(
        res,
        {
          issues: [
            {
              location: '整份文档',
              marker: '试题型栏目',
              reason: '跳过试题型栏目后没有任何可保留内容块',
            },
          ],
          skippedColumns: ['巩固练习', '单元检测'],
        },
        '未形成草稿',
      );
    }
    if (fixture === 'emptyKnowledge') {
      return sendSuccess(
        res,
        {
          issues: [
            {
              location: '整份文档',
              marker: '【综合类知识】',
              reason: '文档没有保留三级考点，综合类知识无法建立末级节点关联',
            },
          ],
          skippedColumns: ['巩固练习'],
        },
        '未形成草稿',
      );
    }
    const structure = buildUploadStructure(subject);
    if (!structure.length) {
      return sendSuccess(
        res,
        {
          issues: [
            {
              location: '整份文档',
              marker: '栏目标记与三级考点',
              reason: '当前学科缺少可匹配的知识型一级栏目或知识树末级节点',
            },
          ],
          skippedColumns: [],
        },
        '未形成草稿',
      );
    }
    const draft: StudyGuideDetail = {
      id: nextId('asset-study-guide'),
      subject,
      type: 'studyGuide',
      status: 'draft',
      name,
      originalFileName,
      updatedAt: new Date().toISOString(),
      source: 'upload',
      mountCount: 0,
      platformTemplateCount: 0,
      teacherTaskCount: 0,
      structure,
      contentBlocks: buildUploadBlocks(structure),
      skippedColumns: ['巩固练习'],
      autosaveState: 'saved',
    };
    studyGuideStore[draft.id] = draft;
    refreshAssetFromDetail(draft);
    sendSuccess(
      res,
      { draft, issues: [], skippedColumns: draft.skippedColumns },
      '拆分完成，已形成学案草稿',
    );
  },

  'PUT /api/resource-assets/study-guide/draft': (
    req: Request,
    res: Response,
  ) => {
    const { id, subject } = getAssetContext(req);
    const draft = studyGuideStore[id];
    if (!draft || draft.subject !== subject || draft.status !== 'draft') {
      return sendFailure(res, '学案草稿不存在');
    }
    if (req.body?.simulateFailure) {
      return sendFailure(res, '自动保存失败，页面调整已保留，请重试');
    }
    draft.contentBlocks = clone(req.body.contentBlocks || []);
    draft.structure = pruneEmptyStructure(draft.structure, draft.contentBlocks);
    recalculateDraftComprehensiveRelations(draft);
    draft.autosaveState = 'saved';
    touchAsset(draft);
    refreshAssetFromDetail(draft);
    sendSuccess(res, draft, '草稿已自动保存');
  },

  'PUT /api/resource-assets/study-guide/finalize': (
    req: Request,
    res: Response,
  ) => {
    const { id, subject } = getAssetContext(req);
    const draft = studyGuideStore[id];
    if (!draft || draft.subject !== subject || draft.status !== 'draft') {
      return sendFailure(res, '学案草稿不存在');
    }
    const validationError = validateDraftForFinal(draft);
    if (validationError) return sendFailure(res, validationError);
    if (req.body?.simulateFailure) {
      return sendFailure(res, '原子保存失败，草稿和已保存内容保持不变');
    }
    const createdBlockIds: string[] = [];
    try {
      draft.contentBlocks.forEach((block) => {
        if (block.kind === 'columnContent' || block.knowledgeBlockId) return;
        const knowledgeBlock: KnowledgeBlock = {
          id: nextId('kb'),
          subject,
          type: block.kind,
          html: block.html,
          knowledgeNodeIds: clone(block.knowledgeNodeIds),
          referenceStudyGuides: [{ id: draft.id, name: draft.name }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        knowledgeBlockStore.unshift(knowledgeBlock);
        createdBlockIds.push(knowledgeBlock.id);
        block.knowledgeBlockId = knowledgeBlock.id;
      });
      draft.status = 'formal';
      draft.autosaveState = undefined;
      touchAsset(draft);
      refreshAssetFromDetail(draft);
      syncKnowledgeBlockReferences(subject);
      sendSuccess(res, draft, '学案及全部内容关系已原子转为正式');
    } catch {
      createdBlockIds.forEach((blockId) => {
        const index = knowledgeBlockStore.findIndex(
          (item) => item.id === blockId,
        );
        if (index >= 0) knowledgeBlockStore.splice(index, 1);
      });
      draft.contentBlocks.forEach((block) => {
        if (
          block.knowledgeBlockId &&
          createdBlockIds.includes(block.knowledgeBlockId)
        ) {
          delete block.knowledgeBlockId;
        }
      });
      sendFailure(res, '原子保存失败，未产生部分正式数据');
    }
  },

  'PUT /api/resource-assets/study-guide/formal': (
    req: Request,
    res: Response,
  ) => {
    const { id, subject } = getAssetContext(req);
    const current = studyGuideStore[id];
    if (
      !current ||
      current.subject !== subject ||
      current.status !== 'formal'
    ) {
      return sendFailure(res, '正式学案不存在');
    }
    const nextStructure = clone(
      (req.body?.structure || []) as StudyGuideStructureNode[],
    );
    const nextBlocks = clone(
      (req.body?.contentBlocks || []) as StudyGuideContentBlock[],
    );
    const currentColumns = getSubjectColumnsSnapshot(subject);
    const currentKnowledgeLeafIds = new Set(
      collectLeaves(knowledgeTreesBySubject[subject] || []).map(
        (leaf) => leaf.id,
      ),
    );
    const validateStructure = (
      nodes: StudyGuideStructureNode[],
      activeLevel1ReferenceId?: string,
    ): string | null => {
      for (const node of nodes) {
        const nextLevel1ReferenceId =
          node.level === 'level1' ? node.referenceId : activeLevel1ReferenceId;
        if (
          node.level === 'level1' &&
          !currentColumns.some(
            (column) => column.level === 1 && column.id === node.referenceId,
          )
        ) {
          return `一级栏目“${node.label}”已不可用`;
        }
        if (
          node.level === 'level3' &&
          (!node.referenceId || !currentKnowledgeLeafIds.has(node.referenceId))
        ) {
          return `三级考点“${node.label}”不是当前知识树末级节点`;
        }
        if (node.level === 'level4') {
          const column = currentColumns.find(
            (candidate) =>
              candidate.level === 4 && candidate.id === node.referenceId,
          );
          if (!column || column.parentId !== activeLevel1ReferenceId) {
            return `四级栏目“${node.label}”不归属当前一级栏目`;
          }
        }
        const childError = validateStructure(
          node.children,
          nextLevel1ReferenceId,
        );
        if (childError) return childError;
      }
      return null;
    };
    const structureError = validateStructure(nextStructure);
    if (structureError) return sendFailure(res, structureError);
    const level3Ids = new Set(
      flattenStructure(nextStructure)
        .filter((node) => node.level === 'level3' && node.referenceId)
        .map((node) => node.referenceId as string),
    );
    for (const block of nextBlocks) {
      if (block.kind !== 'columnContent') {
        const allowed = allowedTypesForStructureNode(
          nextStructure,
          block.structureNodeId,
        );
        if (!allowed.includes(block.kind)) {
          return sendFailure(res, '知识块类型不符合当前结构位置');
        }
        const source = knowledgeBlockStore.find(
          (item) => item.id === block.knowledgeBlockId,
        );
        if (!source) return sendFailure(res, '引用的知识块已不可用');
        if (block.kind !== 'comprehensive') {
          const enclosingLevel3 = findStructurePath(
            nextStructure,
            block.structureNodeId,
          ).find((node) => node.level === 'level3');
          if (
            !enclosingLevel3?.referenceId ||
            !source.knowledgeNodeIds.includes(enclosingLevel3.referenceId)
          ) {
            return sendFailure(
              res,
              '知识块未关联所在三级考点，不能放入当前结构位置',
            );
          }
        }
      }
      if (block.kind === 'comprehensive') {
        const source = knowledgeBlockStore.find(
          (item) => item.id === block.knowledgeBlockId,
        );
        const intersection =
          source?.knowledgeNodeIds.filter((nodeId) => level3Ids.has(nodeId)) ||
          block.knowledgeNodeIds.filter((nodeId) => level3Ids.has(nodeId));
        if (!intersection.length || !block.currentKnowledgeScope?.length) {
          return sendFailure(
            res,
            '综合类引用项本次知识范围为空，请调整三级考点或移除引用',
          );
        }
        if (
          block.currentKnowledgeScope.some(
            (nodeId) => !intersection.includes(nodeId),
          )
        ) {
          return sendFailure(
            res,
            '综合类引用项存在已失效的本次知识范围，受影响引用 1 项',
          );
        }
      }
    }
    if (req.body?.simulateFailure) {
      return sendFailure(res, '保存失败，修改前正式内容保持不变');
    }
    current.structure = nextStructure;
    current.contentBlocks = nextBlocks;
    touchAsset(current);
    refreshAssetFromDetail(current);
    syncKnowledgeBlockReferences(subject);
    sendSuccess(res, current, '正式学案已更新，同一 ID 继续生效');
  },

  'POST /api/resource-assets/attachment': (req: Request, res: Response) => {
    const subject = String(req.body?.subject || '').trim();
    const name = String(req.body?.name || '').trim();
    const originalFileName = String(req.body?.originalFileName || '').trim();
    const type = getAttachmentType(originalFileName);
    if (!subject) return sendFailure(res, '上传学科不可用');
    if (!type) return sendFailure(res, '不支持该附件格式');
    if (!name) return sendFailure(res, '请输入附件名称');
    if (isNameTaken(subject, type, name)) {
      return sendFailure(res, '当前学科、当前附件类型已存在同名资产');
    }
    const asset: AssetItem = {
      id: nextId('asset-attachment'),
      subject,
      type,
      status: 'formal',
      name,
      originalFileName,
      updatedAt: new Date().toISOString(),
      source: 'upload',
      mountCount: 0,
      platformTemplateCount: 0,
      teacherTaskCount: 0,
    };
    assetStore.unshift(asset);
    sendSuccess(res, asset, '附件已保存为正式资产');
  },

  'PUT /api/resource-assets/name': (req: Request, res: Response) => {
    const { id, subject } = getAssetContext(req);
    const asset = findAsset(id, subject);
    const name = String(req.body?.name || '').trim();
    if (!asset) return sendFailure(res, '资产不存在');
    if (!name) return sendFailure(res, '请输入资产名称');
    if (isNameTaken(subject, asset.type, name, id)) {
      return sendFailure(res, '当前学科、当前资产类型已存在同名资产');
    }
    asset.name = name;
    touchAsset(asset);
    const detail = studyGuideStore[id];
    if (detail) detail.name = name;
    if (detail) syncKnowledgeBlockReferences(subject);
    const homework = homeworkStore[id];
    if (homework) {
      homework.name = name;
      homework.updatedAt = asset.updatedAt;
    }
    sendSuccess(res, asset, '名称修改成功');
  },

  'PUT /api/resource-assets/attachment/file': (req: Request, res: Response) => {
    const { id, subject } = getAssetContext(req);
    const asset = findAsset(id, subject);
    const originalFileName = String(req.body?.originalFileName || '').trim();
    if (!asset || asset.type === 'studyGuide' || asset.type === 'homework') {
      return sendFailure(res, '只有附件型资产支持替换文件');
    }
    const extension =
      originalFileName.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    if (!attachmentExtensions[asset.type].includes(extension)) {
      return sendFailure(res, '替换文件必须属于当前附件类型');
    }
    asset.originalFileName = originalFileName;
    touchAsset(asset);
    sendSuccess(res, asset, '附件文件已替换，资产 ID 和关系保持不变');
  },

  'DELETE /api/resource-assets': (req: Request, res: Response) => {
    const { id, subject } = getAssetContext(req);
    const index = assetStore.findIndex(
      (asset) => asset.id === id && asset.subject === subject,
    );
    if (index < 0) return sendFailure(res, '资产不存在');
    const asset = assetStore[index];
    const total =
      asset.mountCount + asset.platformTemplateCount + asset.teacherTaskCount;
    if (total > 0) {
      return sendFailure(
        res,
        `该资产存在 ${asset.mountCount} 个资源节点挂载、${asset.platformTemplateCount} 个平台模板引用、${asset.teacherTaskCount} 个教师任务引用，不能删除`,
      );
    }
    assetStore.splice(index, 1);
    delete studyGuideStore[id];
    delete homeworkStore[id];
    syncKnowledgeBlockReferences(subject);
    sendSuccess(res, undefined, '资产及所属原文件已彻底删除');
  },

  'GET /api/resource-assets/questions': (req: Request, res: Response) => {
    const subject = queryValue(req.query.subject).trim();
    if (!subject) return sendFailure(res, '请选择学科');
    const keyword = queryValue(req.query.keyword).trim().toLowerCase();
    const type = queryValue(req.query.type);
    const difficulty = queryValue(req.query.difficulty);
    const year = queryValue(req.query.year);
    const knowledgeNodeId = queryValue(req.query.knowledgeNodeId);
    const sort = queryValue(req.query.sort);
    const current = Number(queryValue(req.query.current)) || 1;
    const pageSize = Number(queryValue(req.query.pageSize)) || 0;
    const leafIds = knowledgeNodeId
      ? new Set(
          collectLeafIds(
            knowledgeTreesBySubject[subject] || [],
            knowledgeNodeId,
          ),
        )
      : null;
    const filtered = questionStore
      .filter((question) => question.subject === subject)
      // AC-03：只返回已发布正式试题
      .filter((question) => question.status === 'published')
      .filter((question) => !type || question.type === type)
      .filter((question) => !difficulty || question.difficulty === difficulty)
      .filter((question) => !year || question.year === year)
      .filter(
        (question) =>
          !keyword ||
          question.stem.toLowerCase().includes(keyword) ||
          question.source.toLowerCase().includes(keyword),
      )
      .filter(
        (question) =>
          !leafIds ||
          question.knowledgeNodeIds.some((nodeId) => leafIds.has(nodeId)),
      );
    const list = [...filtered].sort((left, right) =>
      sort === 'popular'
        ? right.popularity - left.popularity
        : right.updatedAt.localeCompare(left.updatedAt),
    );
    const total = list.length;
    const paged =
      pageSize > 0
        ? list.slice((current - 1) * pageSize, current * pageSize)
        : list;
    sendSuccess(
      res,
      {
        list: paged,
        total,
        current: pageSize > 0 ? current : 1,
        pageSize: pageSize > 0 ? pageSize : total,
      },
      '已发布试题加载成功',
    );
  },

  'GET /api/resource-assets/homework/questions': (
    req: Request,
    res: Response,
  ) => {
    const { id, subject } = getAssetContext(req);
    const homework = homeworkStore[id];
    if (!homework || homework.subject !== subject) {
      return sendFailure(res, '作业不存在或不属于当前学科');
    }
    // 按作业顺序动态读取试题当前内容；缺失/非已发布保留占位
    const items = homework.questionIds.map((questionId) => {
      const question = questionStore.find(
        (candidate) =>
          candidate.id === questionId && candidate.status === 'published',
      );
      return question
        ? { questionId, question }
        : { questionId, question: undefined };
    });
    sendSuccess(res, items, '作业试题加载成功');
  },

  'POST /api/resource-assets/homework': (req: Request, res: Response) => {
    const subject = String(req.body?.subject || '').trim();
    const name = String(req.body?.name || '').trim();
    const questionIds: string[] = Array.isArray(req.body?.questionIds)
      ? req.body.questionIds.map(String)
      : [];
    const validationError = validateHomeworkPayload(subject, name, questionIds);
    if (validationError) return sendFailure(res, validationError);
    const homework: HomeworkDetail = {
      id: nextId('asset-homework'),
      subject,
      type: 'homework',
      status: 'formal',
      name,
      updatedAt: new Date().toISOString(),
      source: 'upload',
      mountCount: 0,
      platformTemplateCount: 0,
      teacherTaskCount: 0,
      questionIds,
    };
    homeworkStore[homework.id] = homework;
    refreshAssetFromHomework(homework);
    sendSuccess(res, homework, '作业已保存为正式资产');
  },

  'PUT /api/resource-assets/homework': (req: Request, res: Response) => {
    const id = String(req.body?.id || '').trim();
    const subject = String(req.body?.subject || '').trim();
    const name = String(req.body?.name || '').trim();
    const questionIds: string[] = Array.isArray(req.body?.questionIds)
      ? req.body.questionIds.map(String)
      : [];
    const homework = homeworkStore[id];
    if (!homework || homework.subject !== subject) {
      return sendFailure(res, '作业不存在或不属于当前学科');
    }
    const validationError = validateHomeworkPayload(
      subject,
      name,
      questionIds,
      id,
    );
    if (validationError) return sendFailure(res, validationError);
    homework.name = name;
    homework.questionIds = questionIds;
    touchHomework(homework);
    refreshAssetFromHomework(homework);
    sendSuccess(res, homework, '作业已更新，同一 ID 继续生效');
  },

  'GET /api/resource-assets/knowledge-blocks': (
    req: Request,
    res: Response,
  ) => {
    const subject = queryValue(req.query.subject).trim();
    const keyword = queryValue(req.query.keyword).trim().toLowerCase();
    const type = queryValue(req.query.type);
    const knowledgeNodeId = queryValue(req.query.knowledgeNodeId);
    const leafIds = knowledgeNodeId
      ? new Set(
          collectLeafIds(
            knowledgeTreesBySubject[subject] || [],
            knowledgeNodeId,
          ),
        )
      : null;
    const result = knowledgeBlockStore
      .filter((block) => block.subject === subject)
      .filter((block) => !type || block.type === type)
      .filter((block) => !keyword || block.html.toLowerCase().includes(keyword))
      .filter(
        (block) =>
          !leafIds || block.knowledgeNodeIds.some((id) => leafIds.has(id)),
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    sendSuccess(res, result, '知识块加载成功');
  },

  'POST /api/resource-assets/knowledge-block': (
    req: Request,
    res: Response,
  ) => {
    const subject = String(req.body?.subject || '').trim();
    const type = req.body?.type as KnowledgeBlockType;
    const html = String(req.body?.html || '').trim();
    const knowledgeNodeIds: string[] = Array.isArray(req.body?.knowledgeNodeIds)
      ? req.body.knowledgeNodeIds.map(String)
      : [];
    if (!subject || !html || !knowledgeNodeIds.length) {
      return sendFailure(res, '请完整填写知识块内容和末级知识点');
    }
    const validLeafIds = new Set(
      collectLeaves(knowledgeTreesBySubject[subject] || []).map(
        (leaf) => leaf.id,
      ),
    );
    if (knowledgeNodeIds.some((nodeId) => !validLeafIds.has(nodeId))) {
      return sendFailure(res, '知识块只能关联当前学科知识树末级节点');
    }
    if (type !== 'comprehensive' && knowledgeNodeIds.length !== 1) {
      return sendFailure(res, '单一、方法、例题类只能关联一个末级节点');
    }
    const block: KnowledgeBlock = {
      id: nextId('kb'),
      subject,
      type,
      html,
      knowledgeNodeIds,
      referenceStudyGuides: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    knowledgeBlockStore.unshift(block);
    sendSuccess(res, block, '知识块已直接保存为正式资产');
  },

  'PUT /api/resource-assets/knowledge-block': (req: Request, res: Response) => {
    const id = String(req.body?.id || '');
    const subject = String(req.body?.subject || '').trim();
    const block = knowledgeBlockStore.find(
      (item) => item.id === id && item.subject === subject,
    );
    if (!block) return sendFailure(res, '知识块不存在');
    const type = req.body?.type as KnowledgeBlockType;
    const html = String(req.body?.html || '').trim();
    const knowledgeNodeIds: string[] = Array.isArray(req.body?.knowledgeNodeIds)
      ? req.body.knowledgeNodeIds.map(String)
      : [];
    if (!html || !knowledgeNodeIds.length) {
      return sendFailure(res, '请完整填写知识块内容和末级知识点');
    }
    const validLeafIds = new Set(
      collectLeaves(knowledgeTreesBySubject[subject] || []).map(
        (leaf) => leaf.id,
      ),
    );
    if (knowledgeNodeIds.some((nodeId) => !validLeafIds.has(nodeId))) {
      return sendFailure(res, '知识块只能关联当前学科知识树末级节点');
    }
    if (type !== 'comprehensive' && knowledgeNodeIds.length !== 1) {
      return sendFailure(res, '单一、方法、例题类只能关联一个末级节点');
    }
    if (
      block.referenceStudyGuides.length > 0 &&
      (block.type === 'comprehensive') !== (type === 'comprehensive')
    ) {
      return sendFailure(
        res,
        `知识类型变化会使 ${block.referenceStudyGuides.length} 个既有栏目位置和引用范围失效`,
      );
    }
    const invalidReferences = block.referenceStudyGuides.filter((guide) => {
      const detail = studyGuideStore[guide.id];
      if (!detail) return false;
      const guideKnowledgeIds = new Set(
        flattenStructure(detail.structure)
          .filter((node) => node.level === 'level3')
          .map((node) => node.referenceId)
          .filter(Boolean),
      );
      const references = detail.contentBlocks.filter(
        (item) => item.knowledgeBlockId === block.id,
      );
      return references.some((reference) => {
        if (type === 'comprehensive') {
          const currentScope = reference.currentKnowledgeScope || [];
          return (
            !currentScope.length ||
            currentScope.some(
              (nodeId) =>
                !knowledgeNodeIds.includes(nodeId) ||
                !guideKnowledgeIds.has(nodeId),
            )
          );
        }
        return !knowledgeNodeIds.some((nodeId) =>
          guideKnowledgeIds.has(nodeId),
        );
      });
    });
    if (invalidReferences.length) {
      return sendFailure(
        res,
        `新类型或知识点会使 ${invalidReferences.length} 个既有引用范围失效`,
      );
    }
    block.type = type;
    block.html = html;
    block.knowledgeNodeIds = knowledgeNodeIds;
    block.updatedAt = new Date().toISOString();
    sendSuccess(res, block, '知识块已更新，引用处读取当前内容');
  },

  'DELETE /api/resource-assets/knowledge-block': (
    req: Request,
    res: Response,
  ) => {
    const id = queryValue(req.query.id);
    const subject = queryValue(req.query.subject);
    const index = knowledgeBlockStore.findIndex(
      (block) => block.id === id && block.subject === subject,
    );
    if (index < 0) return sendFailure(res, '知识块不存在');
    const block = knowledgeBlockStore[index];
    if (block.referenceStudyGuides.length) {
      return sendFailure(
        res,
        `该知识块被 ${block.referenceStudyGuides.length} 份学案引用，不能删除`,
        block,
      );
    }
    knowledgeBlockStore.splice(index, 1);
    sendSuccess(res, undefined, '知识块已删除');
  },

  'GET /api/resource-assets/context': (req: Request, res: Response) => {
    const subject = queryValue(req.query.subject).trim();
    const knowledgeTree = knowledgeTreesBySubject[subject] || [];
    sendSuccess(
      res,
      {
        knowledgeTree,
        knowledgeLeaves: collectLeaves(knowledgeTree),
        columns: getSubjectColumnsSnapshot(subject).map((column) => ({
          id: column.id,
          name: column.name,
          type: column.type,
          level: column.level,
          parentId: column.parentId,
        })),
      },
      '资源资产上下文加载成功',
    );
  },
};
