import type { ResourceCreator } from './resourceModel';

export const RESOURCE_HAS_REFERENCES_CODE = 'RESOURCE_HAS_REFERENCES';

/**
 * 正式资源关键变更的稳定动作集合。记录只追加、不覆盖；delete 记录保存在
 * 资源聚合之外，因此资源彻底删除后仍可按资源身份查询。
 */
export type ResourceOperationAction =
  | 'upload'
  | 'publish'
  | 'uploadVersion'
  | 'publishVersion'
  | 'rename'
  | 'adjustOwnership'
  | 'list'
  | 'unlist'
  | 'activateVersion'
  | 'rollbackVersion'
  | 'archive'
  | 'restore'
  | 'delete';

export const RESOURCE_OPERATION_ACTION_LABELS: Record<
  ResourceOperationAction,
  string
> = {
  upload: '上传资源',
  publish: '发布组合资源',
  uploadVersion: '上传新版本',
  publishVersion: '发布修订版本',
  rename: '修改资源名称',
  adjustOwnership: '调整归属',
  list: '上架',
  unlist: '下架',
  activateVersion: '版本生效',
  rollbackVersion: '版本回退',
  archive: '归档',
  restore: '恢复',
  delete: '彻底删除',
};

/** 操作发生时保存可读快照，避免后续节点改名或版本切换篡改历史摘要。 */
export interface ResourceOperationChange {
  readonly label: string;
  readonly before?: string;
  readonly after?: string;
}

export interface ResourceOperationRecord {
  readonly id: string;
  readonly resourceId: string;
  readonly subject: string;
  readonly action: ResourceOperationAction;
  readonly operator: ResourceCreator;
  readonly occurredAt: string;
  readonly summary: string;
  readonly changes: readonly ResourceOperationChange[];
}

export interface ResourceDeletionResult {
  readonly resourceId: string;
  readonly deletedAt: string;
  /** 删除记录位于独立的只追加操作账本中，不随资源聚合删除。 */
  readonly operationRecordId: string;
}
