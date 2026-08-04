export type AttachmentResourceType = 'courseware' | 'extension';
export type ComposedResourceType = 'studyGuide' | 'homework';
export type ResourceType = AttachmentResourceType | ComposedResourceType;
export type ResourceStatus = 'unlisted' | 'listed' | 'archived';

export type CoursewareCarrierType = 'ppt';
export type ExtensionCarrierType = 'pdf' | 'audio' | 'video';
export type AttachmentCarrierType =
  | CoursewareCarrierType
  | ExtensionCarrierType;
export type ComposedCarrierType = 'online';
export type ResourceCarrierType = AttachmentCarrierType | ComposedCarrierType;
export type ResourceVersionState = 'current' | 'pending' | 'historical';

export interface ResourceCarrierByType {
  courseware: CoursewareCarrierType;
  extension: ExtensionCarrierType;
  studyGuide: ComposedCarrierType;
  homework: ComposedCarrierType;
}

export type ResourceCarrierForType<T extends ResourceType> =
  ResourceCarrierByType[T];

export const ATTACHMENT_RESOURCE_TYPES: readonly AttachmentResourceType[] = [
  'courseware',
  'extension',
];
export const COMPOSED_RESOURCE_TYPES: readonly ComposedResourceType[] = [
  'studyGuide',
  'homework',
];

/** 资源类型与其所有正式版本载体之间的唯一合法组合。 */
export const RESOURCE_CARRIERS_BY_TYPE: {
  readonly [T in ResourceType]: readonly ResourceCarrierForType<T>[];
} = {
  courseware: ['ppt'],
  extension: ['pdf', 'audio', 'video'],
  studyGuide: ['online'],
  homework: ['online'],
};

export const isResourceType = (value: unknown): value is ResourceType =>
  value === 'courseware' ||
  value === 'extension' ||
  value === 'studyGuide' ||
  value === 'homework';

export const isAttachmentResourceType = (
  value: unknown,
): value is AttachmentResourceType =>
  value === 'courseware' || value === 'extension';

export const isComposedResourceType = (
  value: unknown,
): value is ComposedResourceType =>
  value === 'studyGuide' || value === 'homework';

export const isResourceCarrierType = (
  value: unknown,
): value is ResourceCarrierType =>
  value === 'ppt' ||
  value === 'pdf' ||
  value === 'audio' ||
  value === 'video' ||
  value === 'online';

export const isResourceVersionState = (
  value: unknown,
): value is ResourceVersionState =>
  value === 'current' || value === 'pending' || value === 'historical';

export const isResourceCarrierCompatible = <T extends ResourceType>(
  type: T,
  carrierType: ResourceCarrierType,
): carrierType is ResourceCarrierForType<T> =>
  (RESOURCE_CARRIERS_BY_TYPE[type] as readonly ResourceCarrierType[]).includes(
    carrierType,
  );

export const inferAttachmentCarrierType = (
  originalFileName: string,
): AttachmentCarrierType | null => {
  const extension = originalFileName
    .trim()
    .toLowerCase()
    .match(/\.[^.\\/]+$/)?.[0];
  if (extension === '.ppt' || extension === '.pptx') return 'ppt';
  if (extension === '.pdf') return 'pdf';
  if (extension === '.mp3') return 'audio';
  if (extension === '.mp4') return 'video';
  return null;
};

export const isAttachmentFileCompatible = (
  type: AttachmentResourceType,
  originalFileName: string,
): boolean => {
  const carrierType = inferAttachmentCarrierType(originalFileName);
  return Boolean(carrierType && isResourceCarrierCompatible(type, carrierType));
};

export interface ResourceCreator {
  readonly id: string;
  readonly name: string;
}

interface ResourceVersionBase<TCarrier extends ResourceCarrierType> {
  readonly id: string;
  readonly resourceId: string;
  readonly versionNumber: number;
  readonly carrierType: TCarrier;
  readonly createdAt: string;
  readonly createdBy: ResourceCreator;
}

/** 待生效版本从未激活；当前和历史版本必须保留生效时间。 */
type ResourceVersionLifecycleMetadata =
  | {
      readonly state: 'pending';
      readonly activatedAt?: never;
    }
  | {
      readonly state: 'current' | 'historical';
      readonly activatedAt: string;
    };

export type CoursewareResourceVersion =
  ResourceVersionBase<CoursewareCarrierType> &
    ResourceVersionLifecycleMetadata & {
      readonly originalFileName: string;
    };

export type ExtensionResourceVersion =
  ResourceVersionBase<ExtensionCarrierType> &
    ResourceVersionLifecycleMetadata & {
      readonly originalFileName: string;
    };

export type OnlineResourceVersion = ResourceVersionBase<ComposedCarrierType> &
  ResourceVersionLifecycleMetadata & {
    /** 在线组合版本没有附件原始文件名。 */
    readonly originalFileName?: never;
  };

export type AttachmentResourceVersion =
  | CoursewareResourceVersion
  | ExtensionResourceVersion;
export type ResourceVersion = AttachmentResourceVersion | OnlineResourceVersion;

export type ResourceVersionForType<T extends ResourceType> =
  T extends 'courseware'
    ? CoursewareResourceVersion
    : T extends 'extension'
    ? ExtensionResourceVersion
    : OnlineResourceVersion;

interface VersionCarrierMetadata {
  carrierType?: unknown;
  originalFileName?: unknown;
}

/**
 * 校验业务类型、载体和附件文件名三者的耐久不变量。
 * 组合型版本必须是 online 且不存在原始文件名；附件版本必须由文件名推导出载体。
 */
export const isResourceVersionCompatible = <T extends ResourceType>(
  type: T,
  version: VersionCarrierMetadata,
): boolean => {
  if (!isResourceCarrierType(version.carrierType)) return false;
  if (!isResourceCarrierCompatible(type, version.carrierType)) return false;

  if (isComposedResourceType(type)) {
    return (
      version.carrierType === 'online' &&
      version.originalFileName === undefined &&
      !Object.prototype.hasOwnProperty.call(version, 'originalFileName')
    );
  }

  if (
    typeof version.originalFileName !== 'string' ||
    !version.originalFileName.trim() ||
    version.originalFileName !== version.originalFileName.trim()
  ) {
    return false;
  }

  return (
    inferAttachmentCarrierType(version.originalFileName) === version.carrierType
  );
};

export type ResourceInvariantValidationResult =
  | { valid: true }
  | { valid: false; message: string };

const valid = (): ResourceInvariantValidationResult => ({ valid: true });
const invalid = (message: string): ResourceInvariantValidationResult => ({
  valid: false,
  message,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isNonEmptyTrimmedString = (value: unknown): value is string =>
  typeof value === 'string' && Boolean(value) && value === value.trim();

const isValidTimestamp = (value: unknown): value is string =>
  typeof value === 'string' &&
  Boolean(value) &&
  Number.isFinite(Date.parse(value));

/** 校验一条已发布正式版本的身份、时间、创建人和载体元数据。 */
export const validateFormalResourceVersion = (
  resource: unknown,
  version: unknown,
): ResourceInvariantValidationResult => {
  if (
    !isRecord(resource) ||
    !isNonEmptyTrimmedString(resource.id) ||
    !isResourceType(resource.type)
  ) {
    return invalid('正式资源身份或类型无效');
  }
  if (!isRecord(version)) return invalid('正式版本元数据不存在');
  if (!isNonEmptyTrimmedString(version.id)) {
    return invalid('正式版本 ID 无效');
  }
  if (version.resourceId !== resource.id) {
    return invalid('正式版本不属于当前资源');
  }
  if (
    typeof version.versionNumber !== 'number' ||
    !Number.isInteger(version.versionNumber) ||
    version.versionNumber < 1
  ) {
    return invalid('正式版本号无效');
  }
  if (!isValidTimestamp(version.createdAt)) {
    return invalid('正式版本创建时间无效');
  }
  if (
    !isRecord(version.createdBy) ||
    !isNonEmptyTrimmedString(version.createdBy.id) ||
    !isNonEmptyTrimmedString(version.createdBy.name)
  ) {
    return invalid('正式版本创建人无效');
  }
  if (!isResourceVersionState(version.state)) {
    return invalid('正式版本状态无效');
  }
  if (version.state === 'pending') {
    if (version.activatedAt !== undefined) {
      return invalid('待生效版本不能包含生效时间');
    }
  } else if (!isValidTimestamp(version.activatedAt)) {
    return invalid('已生效版本缺少有效生效时间');
  }
  if (!isResourceVersionCompatible(resource.type, version)) {
    return invalid('正式版本载体与资源类型不匹配');
  }
  return valid();
};

const areVersionSnapshotsEqual = (
  left: Record<string, unknown>,
  right: Record<string, unknown>,
) =>
  left.id === right.id &&
  left.resourceId === right.resourceId &&
  left.versionNumber === right.versionNumber &&
  left.carrierType === right.carrierType &&
  left.originalFileName === right.originalFileName &&
  left.createdAt === right.createdAt &&
  left.state === right.state &&
  left.activatedAt === right.activatedAt &&
  isRecord(left.createdBy) &&
  isRecord(right.createdBy) &&
  left.createdBy.id === right.createdBy.id &&
  left.createdBy.name === right.createdBy.name;

/**
 * 校验正式资源聚合的版本集合。currentVersionId 必须指向唯一 current，
 * currentVersion 必须是该记录的同值快照，版本 ID 与版本号均不得重复。
 */
export const validateFormalResourceVersionAggregate = (
  resource: unknown,
): ResourceInvariantValidationResult => {
  if (!isRecord(resource)) return invalid('正式资源数据不存在');
  if (!isNonEmptyTrimmedString(resource.id) || !isResourceType(resource.type)) {
    return invalid('正式资源身份或类型无效');
  }
  if (!isNonEmptyTrimmedString(resource.currentVersionId)) {
    return invalid('当前版本 ID 无效');
  }
  if (!Array.isArray(resource.versions) || resource.versions.length === 0) {
    return invalid('正式资源至少需要一个版本');
  }

  const versionIds = new Set<string>();
  const versionNumbers = new Set<number>();
  for (const version of resource.versions) {
    const versionValidation = validateFormalResourceVersion(resource, version);
    if (!versionValidation.valid) return versionValidation;
    if (!isRecord(version)) return invalid('正式版本元数据不存在');

    const versionId = version.id as string;
    const versionNumber = version.versionNumber as number;
    if (versionIds.has(versionId)) return invalid('正式版本 ID 不能重复');
    if (versionNumbers.has(versionNumber)) {
      return invalid('同一资源的正式版本号不能重复');
    }
    versionIds.add(versionId);
    versionNumbers.add(versionNumber);
  }

  const currentVersions = resource.versions.filter(
    (version) => isRecord(version) && version.state === 'current',
  );
  if (
    currentVersions.length !== 1 ||
    !isRecord(currentVersions[0]) ||
    currentVersions[0].id !== resource.currentVersionId
  ) {
    return invalid('当前版本 ID 必须指向唯一当前版本');
  }

  if (!isRecord(resource.currentVersion)) {
    return invalid('当前版本快照不存在');
  }
  const currentValidation = validateFormalResourceVersion(
    resource,
    resource.currentVersion,
  );
  if (!currentValidation.valid) return currentValidation;
  if (
    resource.currentVersion.id !== resource.currentVersionId ||
    !areVersionSnapshotsEqual(resource.currentVersion, currentVersions[0])
  ) {
    return invalid('当前版本快照与当前版本 ID 不一致');
  }

  if (
    resource.versionCount !== undefined &&
    resource.versionCount !== resource.versions.length
  ) {
    return invalid('正式版本总数无效');
  }
  const pendingVersionCount = resource.versions.filter(
    (version) => isRecord(version) && version.state === 'pending',
  ).length;
  if (
    resource.pendingVersionCount !== undefined &&
    resource.pendingVersionCount !== pendingVersionCount
  ) {
    return invalid('待生效版本数量无效');
  }

  return valid();
};

export const assertValidFormalResourceVersionAggregate = (
  resource: unknown,
): void => {
  const validation = validateFormalResourceVersionAggregate(resource);
  if (!validation.valid) {
    throw new Error(validation.message);
  }
};
