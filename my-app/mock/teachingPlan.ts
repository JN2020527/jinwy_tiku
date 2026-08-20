import { Request, Response } from 'express';

import {
  SchedulableResourceNode,
  TeachingPlanDomainError,
  TeachingPlanTemplateStatus,
  TeachingPlanTemplateStore,
} from '../src/features/teaching-plan';
import { getResourceTreeLeafNodesSnapshot } from './tagSystem';
import { registerTeachingPlanReferenceCounter } from './teachingPlanReferenceRegistry';

const store = new TeachingPlanTemplateStore();
const sample = store.create({
  name: '历史基础复习',
  subject: 'history',
  totalWeeks: 20,
  weeklyHours: 2,
});
store.add({
  templateId: sample.id,
  resourceNode: {
    id: 'rv-1-2-1-history',
    name: '近代史',
    path: ['一轮复习', '中国近现代史', '近代史'],
    subject: 'history',
    suggestedHours: 1.5,
    enabled: true,
  },
  anchorWeek: 1,
});

const getCurrentResourceNodes = (subject: string): SchedulableResourceNode[] =>
  getResourceTreeLeafNodesSnapshot(subject);

const syncDraft = (id: string) => {
  const template = store.get(id);
  return template.status === 'draft'
    ? store.refreshDraftResourceNodes(
        id,
        getCurrentResourceNodes(template.subject),
      )
    : template;
};

const syncAllDrafts = () => {
  store.list({ status: 'draft' }).forEach((template) => syncDraft(template.id));
};

const getCurrentResourceNode = (templateId: string, resourceNodeId: string) => {
  const template = syncDraft(templateId);
  const node = getCurrentResourceNodes(template.subject).find(
    (item) => item.id === resourceNodeId,
  );
  if (!node) {
    throw new TeachingPlanDomainError(
      'INVALID_INPUT',
      '资源节点不存在或不属于当前学科',
    );
  }
  return node;
};
store.add({
  templateId: sample.id,
  resourceNode: {
    id: 'rv-1-2-2-history',
    name: '现代史',
    path: ['一轮复习', '中国近现代史', '现代史'],
    subject: 'history',
    suggestedHours: 1,
    enabled: true,
  },
  anchorWeek: 1,
});

registerTeachingPlanReferenceCounter((resourceNodeIds) =>
  store.countTaskReferences(resourceNodeIds),
);

const sendResult = <T>(res: Response, operation: () => T) => {
  try {
    res.send({ success: true, message: '操作成功', data: operation() });
  } catch (error) {
    res.send({
      success: false,
      message: error instanceof Error ? error.message : '操作失败',
      code:
        error instanceof TeachingPlanDomainError ? error.code : 'UNKNOWN_ERROR',
    });
  }
};

export default {
  'GET /api/teaching-plan/templates': (req: Request, res: Response) => {
    sendResult(res, () => {
      syncAllDrafts();
      return store.list({
        subject:
          typeof req.query.subject === 'string' ? req.query.subject : undefined,
        status:
          typeof req.query.status === 'string'
            ? (req.query.status as TeachingPlanTemplateStatus)
            : undefined,
      });
    });
  },
  'GET /api/teaching-plan/templates/:id': (req: Request, res: Response) => {
    sendResult(res, () => syncDraft(req.params.id));
  },
  'POST /api/teaching-plan/templates': (req: Request, res: Response) => {
    sendResult(res, () => store.create(req.body));
  },
  'PUT /api/teaching-plan/templates/:id': (req: Request, res: Response) => {
    sendResult(res, () => {
      syncDraft(req.params.id);
      return store.update({ ...req.body, id: req.params.id });
    });
  },
  'POST /api/teaching-plan/templates/:id/tasks': (
    req: Request,
    res: Response,
  ) => {
    sendResult(res, () => {
      const resourceNode = getCurrentResourceNode(
        req.params.id,
        req.body.resourceNode?.id,
      );
      return store.add({
        ...req.body,
        templateId: req.params.id,
        resourceNode,
      });
    });
  },
  'PUT /api/teaching-plan/templates/:id/tasks/:taskId/move': (
    req: Request,
    res: Response,
  ) => {
    sendResult(res, () => {
      syncDraft(req.params.id);
      return store.move({
        ...req.body,
        templateId: req.params.id,
        taskId: req.params.taskId,
      });
    });
  },
  'PUT /api/teaching-plan/templates/:id/weeks/:week/tasks/order': (
    req: Request,
    res: Response,
  ) => {
    sendResult(res, () => {
      syncDraft(req.params.id);
      return store.reorder({
        ...req.body,
        templateId: req.params.id,
        week: Number(req.params.week),
      });
    });
  },
  'DELETE /api/teaching-plan/templates/:id/tasks/:taskId': (
    req: Request,
    res: Response,
  ) => {
    sendResult(res, () => {
      syncDraft(req.params.id);
      return store.remove({
        templateId: req.params.id,
        taskId: req.params.taskId,
        operator: req.body?.operator,
      });
    });
  },
  'POST /api/teaching-plan/templates/:id/activate': (
    req: Request,
    res: Response,
  ) => {
    sendResult(res, () => {
      syncDraft(req.params.id);
      return store.activate({ id: req.params.id, operator: req.body.operator });
    });
  },
  'POST /api/teaching-plan/templates/:id/stop': (
    req: Request,
    res: Response,
  ) => {
    sendResult(res, () =>
      store.stop({ id: req.params.id, operator: req.body.operator }),
    );
  },
  'POST /api/teaching-plan/templates/:id/restart': (
    req: Request,
    res: Response,
  ) => {
    sendResult(res, () => {
      const template = store.get(req.params.id);
      store.assertResourceNodesAvailable(
        template.id,
        getCurrentResourceNodes(template.subject),
      );
      return store.restart({ id: req.params.id, operator: req.body.operator });
    });
  },
  'POST /api/teaching-plan/templates/:id/draft-version': (
    req: Request,
    res: Response,
  ) => {
    sendResult(res, () => {
      const draft = store.createDraftVersion({
        id: req.params.id,
        operator: req.body.operator,
      });
      return store.refreshDraftResourceNodes(
        draft.id,
        getCurrentResourceNodes(draft.subject),
      );
    });
  },
  'POST /api/teaching-plan/templates/:id/copy': (
    req: Request,
    res: Response,
  ) => {
    sendResult(res, () => {
      const copied = store.copy({
        id: req.params.id,
        name: req.body.name,
        operator: req.body.operator,
      });
      return store.refreshDraftResourceNodes(
        copied.id,
        getCurrentResourceNodes(copied.subject),
      );
    });
  },
  'DELETE /api/teaching-plan/templates/:id': (req: Request, res: Response) => {
    sendResult(res, () =>
      store.deleteOrArchive(req.params.id, req.body?.operator),
    );
  },
};
