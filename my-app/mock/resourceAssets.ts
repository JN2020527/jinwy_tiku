import type { Request, Response } from 'express';
import {
  getStudyGuideStructureError,
  hydrateStudyGuideStructureLabels,
} from '../src/features/study-guide/structureModel';
import type {
  AssetItem,
  AttachmentType,
  HomeworkDetail,
  KnowledgeBlock,
  KnowledgeBlockType,
  StudyGuideContentBlock,
  StudyGuideDetail,
  StudyGuideStructureNode,
} from '../src/services/resourceAssets';
import { getAttachmentType } from '../src/services/resourceAssets';
import { getPreparationKnowledgeTree } from './preparationKnowledgeTreeStore';
import {
  assetStore,
  clone,
  collectLeafIds,
  collectLeaves,
  findAsset,
  homeworkStore,
  isNameTaken,
  knowledgeBlockStore,
  nextId,
  questionStore,
  studyGuideStore,
  touchAsset,
  touchHomework,
} from './resourceAssetsStore';
import { getSubjectColumnsSnapshot } from './subjectColumnsStore';

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

const flattenStructure = (
  nodes: StudyGuideStructureNode[],
): StudyGuideStructureNode[] =>
  nodes.flatMap((node) => [node, ...flattenStructure(node.children)]);

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
  const columns = getSubjectColumnsSnapshot(detail.subject);
  const knowledgeLeaves = collectLeaves(
    getPreparationKnowledgeTree(detail.subject),
  );
  hydrated.structure = hydrateStudyGuideStructureLabels(
    hydrated.structure,
    columns,
    knowledgeLeaves,
  );
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

const prepareStudyGuideStructure = (
  subject: string,
  structure: StudyGuideStructureNode[],
) => {
  const columns = getSubjectColumnsSnapshot(subject);
  const knowledgeLeaves = collectLeaves(getPreparationKnowledgeTree(subject));
  const error = getStudyGuideStructureError(
    structure,
    columns,
    knowledgeLeaves,
  );
  return {
    error,
    structure: error
      ? structure
      : hydrateStudyGuideStructureLabels(structure, columns, knowledgeLeaves),
  };
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

  'POST /api/resource-assets/study-guide/online': (
    req: Request,
    res: Response,
  ) => {
    const subject = String(req.body?.subject || '').trim();
    const name = String(req.body?.name || '').trim();
    const structure = clone(
      (req.body?.structure || []) as StudyGuideStructureNode[],
    );
    const contentBlocks = clone(
      (req.body?.contentBlocks || []) as StudyGuideContentBlock[],
    );
    if (!subject) return sendFailure(res, '创建学案的学科不可用');
    if (!name) return sendFailure(res, '请输入学案名称');
    if (isNameTaken(subject, 'studyGuide', name)) {
      return sendFailure(res, '当前学科已存在同名学案');
    }
    const prepared = prepareStudyGuideStructure(subject, structure);
    if (prepared.error) return sendFailure(res, prepared.error);

    const draft: StudyGuideDetail = {
      id: nextId('asset-study-guide'),
      subject,
      type: 'studyGuide',
      status: 'draft',
      name,
      updatedAt: new Date().toISOString(),
      source: 'online',
      mountCount: 0,
      platformTemplateCount: 0,
      teacherTaskCount: 0,
      structure: prepared.structure,
      contentBlocks,
      skippedColumns: [],
      autosaveState: 'saved',
    };
    studyGuideStore[draft.id] = draft;
    refreshAssetFromDetail(draft);
    sendSuccess(res, draft, '学案草稿已保存');
  },

  'PUT /api/resource-assets/study-guide/online': (
    req: Request,
    res: Response,
  ) => {
    const { id, subject } = getAssetContext(req);
    const name = String(req.body?.name || '').trim();
    const current = studyGuideStore[id];
    if (!current || current.subject !== subject || current.status !== 'draft') {
      return sendFailure(res, '学案草稿不存在');
    }
    if (!name) return sendFailure(res, '请输入学案名称');
    if (isNameTaken(subject, 'studyGuide', name, id)) {
      return sendFailure(res, '当前学科已存在同名学案');
    }
    const requestedStructure = clone(
      (req.body?.structure || []) as StudyGuideStructureNode[],
    );
    const prepared = prepareStudyGuideStructure(subject, requestedStructure);
    if (prepared.error) return sendFailure(res, prepared.error);
    const requestedContentBlocks = clone(
      (req.body?.contentBlocks || []) as StudyGuideContentBlock[],
    );

    current.name = name;
    current.structure = prepared.structure;
    current.contentBlocks = requestedContentBlocks;
    current.autosaveState = 'saved';
    touchAsset(current);
    refreshAssetFromDetail(current);
    sendSuccess(res, current, '学案草稿已保存');
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
    const requestedStructure = clone(
      (req.body?.structure || []) as StudyGuideStructureNode[],
    );
    const nextBlocks = clone(
      (req.body?.contentBlocks || []) as StudyGuideContentBlock[],
    );
    const prepared = prepareStudyGuideStructure(subject, requestedStructure);
    if (prepared.error) return sendFailure(res, prepared.error);
    const nextStructure = prepared.structure;
    const structureNodeIds = new Set(
      flattenStructure(nextStructure).map((node) => node.id),
    );
    for (const block of nextBlocks) {
      if (!structureNodeIds.has(block.structureNodeId)) {
        return sendFailure(res, '栏目内容关联的栏目已不存在');
      }
      if (block.kind !== 'columnContent') {
        const source = knowledgeBlockStore.find(
          (item) =>
            item.id === block.knowledgeBlockId && item.subject === subject,
        );
        if (!source) return sendFailure(res, '引用的知识块已不可用');
        if (source.type !== block.kind) {
          return sendFailure(res, '知识块类型与栏目内容类型不一致');
        }
        if (block.kind === 'comprehensive') {
          if ((block.currentKnowledgeScope?.length || 0) < 2) {
            return sendFailure(res, '综合类知识至少关联两个末级节点');
          }
          if (
            block.currentKnowledgeScope?.some(
              (nodeId) => !source.knowledgeNodeIds.includes(nodeId),
            )
          ) {
            return sendFailure(res, '综合类知识存在已失效的末级节点关系');
          }
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
          collectLeafIds(getPreparationKnowledgeTree(subject), knowledgeNodeId),
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
          collectLeafIds(getPreparationKnowledgeTree(subject), knowledgeNodeId),
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
      collectLeaves(getPreparationKnowledgeTree(subject)).map(
        (leaf) => leaf.id,
      ),
    );
    if (knowledgeNodeIds.some((nodeId) => !validLeafIds.has(nodeId))) {
      return sendFailure(res, '知识块只能关联当前学科知识树末级节点');
    }
    if (type === 'comprehensive' && knowledgeNodeIds.length < 2) {
      return sendFailure(res, '综合类知识至少关联两个末级节点');
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
      collectLeaves(getPreparationKnowledgeTree(subject)).map(
        (leaf) => leaf.id,
      ),
    );
    if (knowledgeNodeIds.some((nodeId) => !validLeafIds.has(nodeId))) {
      return sendFailure(res, '知识块只能关联当前学科知识树末级节点');
    }
    if (type === 'comprehensive' && knowledgeNodeIds.length < 2) {
      return sendFailure(res, '综合类知识至少关联两个末级节点');
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
          .map((node) => node.knowledgeNodeId)
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
    const knowledgeTree = getPreparationKnowledgeTree(subject);
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
          dataSource: column.dataSource,
          codeEnabled: column.codeEnabled,
          codeStyle: column.codeStyle,
        })),
      },
      '资源资产上下文加载成功',
    );
  },
};
