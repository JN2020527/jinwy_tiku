import type {
  ComposedResourceType,
  KnowledgeNode,
  ResourceDetail,
} from '@/services/tagSystem';
import {
  getKnowledgeTree,
  getResourceDetail,
  isComposedResourceType,
  RESOURCE_CARRIER_LABELS,
  RESOURCE_STATUS_LABELS,
  RESOURCE_TYPE_LABELS,
} from '@/services/tagSystem';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  LockOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useParams, useSearchParams } from '@umijs/max';
import { Alert, Button, Card, Descriptions, Skeleton, Tag } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { SUBJECT_OPTIONS } from '../ContentCenter/TagManage/components/treeFilterConstants';
import './index.less';

const findNodePath = (
  nodes: KnowledgeNode[],
  targetNodeId: string,
  parentTitles: string[] = [],
): string | undefined => {
  for (const node of nodes) {
    const titles = [...parentTitles, node.title];
    if (node.key === targetNodeId) return titles.join(' / ');
    const childPath = findNodePath(node.children || [], targetNodeId, titles);
    if (childPath) return childPath;
  }
  return undefined;
};

const CombinationProductionPage: React.FC = () => {
  const { resourceId } = useParams<'resourceId'>();
  const [searchParams] = useSearchParams();
  const [revisionResource, setRevisionResource] =
    useState<ResourceDetail | null>(null);
  const [revisionNodePath, setRevisionNodePath] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>();

  const subjectOption =
    SUBJECT_OPTIONS.find(
      (option) => option.value === searchParams.get('subject'),
    ) || SUBJECT_OPTIONS.find((option) => option.value === 'math')!;
  const subject = subjectOption.value;
  const requestedType = searchParams.get('type');
  const newResourceType: ComposedResourceType | null = isComposedResourceType(
    requestedType,
  )
    ? requestedType
    : null;
  const isRevision = Boolean(resourceId);

  useEffect(() => {
    let cancelled = false;
    setRevisionResource(null);
    setRevisionNodePath(undefined);
    setLoadError(undefined);

    if (!resourceId) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    void Promise.all([
      getResourceDetail({ id: resourceId, subject }),
      getKnowledgeTree({ subject, targetType: 'review' }),
    ])
      .then(([resourceResponse, treeResponse]) => {
        if (cancelled) return;
        if (!resourceResponse.success) {
          setLoadError(resourceResponse.message || '正式资源详情不可用');
          return;
        }
        if (!isComposedResourceType(resourceResponse.data.type)) {
          setLoadError('该资源不是正式学案或作业，不能进入修订草稿流程');
          return;
        }

        setRevisionResource(resourceResponse.data);
        if (treeResponse.success) {
          setRevisionNodePath(
            findNodePath(treeResponse.data, resourceResponse.data.nodeId),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('正式资源详情不可用，请返回资产中心重试');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resourceId, subject]);

  const activeType = revisionResource?.type || newResourceType;
  const typeLabel = activeType
    ? RESOURCE_TYPE_LABELS[activeType]
    : '学案或作业';
  const placeholderTitle = isRevision
    ? revisionResource
      ? `“${revisionResource.name}”的修订入口暂不可用`
      : '修订草稿入口暂不可用'
    : `${typeLabel}组合制作暂不可用`;
  const disabledActionLabel = isRevision
    ? '暂不可创建修订草稿'
    : '暂不可创建组合草稿';

  const contextItems = useMemo(() => {
    const items = [
      {
        label: '入口动作',
        children: isRevision ? '编辑内容' : `新建${typeLabel}`,
      },
      { label: '资源类型', children: typeLabel },
      { label: '学科', children: subjectOption.label },
    ];

    if (!revisionResource) return items;
    return [
      ...items,
      {
        label: '正式资源状态',
        children: RESOURCE_STATUS_LABELS[revisionResource.status],
      },
      {
        label: '当前版本',
        children: `V${revisionResource.currentVersion.versionNumber}`,
      },
      {
        label: '载体',
        children:
          RESOURCE_CARRIER_LABELS[revisionResource.currentVersion.carrierType],
      },
      {
        label: '末级节点归属',
        children: revisionNodePath || revisionResource.nodeId,
      },
    ];
  }, [
    isRevision,
    revisionNodePath,
    revisionResource,
    subjectOption.label,
    typeLabel,
  ]);

  const returnToAssetCenter = () => {
    const params = new URLSearchParams({ subject });
    history.push(`/content/asset-center?${params.toString()}`);
  };

  return (
    <PageContainer
      title="组合制作"
      subTitle="独立于资产中心的学案与作业制作模块"
      className="combination-production-page"
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={returnToAssetCenter}>
          返回资产中心
        </Button>
      }
    >
      <Card variant="borderless" className="combination-production-card">
        <div
          className="combination-production-placeholder"
          data-production-disabled="true"
        >
          <section className="combination-production-hero">
            <div className="combination-production-seal" aria-hidden="true">
              <StopOutlined />
            </div>
            <div className="combination-production-hero-copy">
              <div className="combination-production-eyebrow">
                <Tag color="default">禁用占位</Tag>
                <span>{isRevision ? '修订草稿流程' : '组合草稿流程'}</span>
              </div>
              <h1>{placeholderTitle}</h1>
              <p>
                原子化知识块与试题组合能力尚未接入。当前页面只明确制作边界，
                {isRevision
                  ? '没有创建修订草稿，也不会改写当前正式内容。'
                  : '不会创建组合草稿，也不会产出正式资源。'}
              </p>
              <Button type="primary" icon={<LockOutlined />} disabled>
                {disabledActionLabel}
              </Button>
            </div>
          </section>

          <Alert
            type={loadError ? 'error' : 'info'}
            showIcon
            className="combination-production-alert"
            message={
              loadError ||
              (isRevision
                ? '当前正式资源保持只读'
                : '本次访问不会写入任何资源数据')
            }
            description={
              loadError
                ? '该入口仍保持禁用，不会产生草稿或正式资源。'
                : isRevision
                ? revisionResource
                  ? `当前 V${revisionResource.currentVersion.versionNumber} 继续生效；待原子体系接入后，“编辑内容”才会先创建独立修订草稿，发布前不改变正式资源。`
                  : '正在只读核对正式资源；核对期间不会创建修订草稿。'
                : '待原子体系接入后，组合草稿可独立暂存；只有完成编辑并选择同学科复习树末级节点后，才会发布为正式资源。'
            }
          />

          <div className="combination-production-workspace">
            <section
              className="combination-production-rail"
              aria-label="组合制作发布边界"
            >
              <div className="combination-production-section-heading">
                <span>制作链路</span>
                <strong>阻断在内容原料接入前</strong>
              </div>
              <div className="combination-production-stages">
                <article className="combination-production-stage combination-production-stage-blocked">
                  <span className="combination-production-stage-icon">
                    <StopOutlined />
                  </span>
                  <div>
                    <small>内容原料</small>
                    <strong>原子体系未接入</strong>
                    <p>暂无原子化知识块与试题可供选择</p>
                  </div>
                </article>
                <article className="combination-production-stage">
                  <span className="combination-production-stage-icon">
                    <LockOutlined />
                  </span>
                  <div>
                    <small>{isRevision ? '修订草稿' : '组合草稿'}</small>
                    <strong>不创建</strong>
                    <p>资产中心不承载草稿或组合编辑器</p>
                  </div>
                </article>
                <article className="combination-production-stage">
                  <span className="combination-production-stage-icon">
                    <FileTextOutlined />
                  </span>
                  <div>
                    <small>正式发布</small>
                    <strong>不产出资源</strong>
                    <p>未选择有效末级节点前不能形成正式资源</p>
                  </div>
                </article>
              </div>
            </section>

            <aside className="combination-production-context">
              <div className="combination-production-section-heading">
                <span>入口上下文</span>
                <strong>{isRevision ? '正式资源快照' : '新建意图'}</strong>
              </div>
              {loading ? (
                <Skeleton active paragraph={{ rows: 5 }} />
              ) : (
                <Descriptions column={1} size="small" items={contextItems} />
              )}
              <div className="combination-production-readonly-note">
                <CheckCircleOutlined />
                <span>
                  {isRevision
                    ? '这里只读取正式资源身份、归属、状态和当前版本。'
                    : '这里只保留入口意图，不保存草稿。'}
                </span>
              </div>
            </aside>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
};

export default CombinationProductionPage;
