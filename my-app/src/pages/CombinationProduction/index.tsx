import type { KnowledgeNode, ResourceDetail } from '@/services/tagSystem';
import {
  getKnowledgeTree,
  getResourceDetail,
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
import { history, useLocation, useParams, useSearchParams } from '@umijs/max';
import { Alert, Button, Card, Descriptions, Skeleton, Tag } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { SUBJECT_OPTIONS } from '../ContentCenter/TagManage/components/treeFilterConstants';
import './index.less';
import {
  parseCombinationProductionRouteContext,
  validateRevisionRouteResource,
} from './routeContext';

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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [revisionResource, setRevisionResource] =
    useState<ResourceDetail | null>(null);
  const [revisionNodePath, setRevisionNodePath] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>();

  const requestedSubject = searchParams.get('subject');
  const requestedType = searchParams.get('type');
  const mode = location.pathname.startsWith('/combination-production/revision')
    ? 'revision'
    : 'new';
  const routeContext = useMemo(
    () =>
      parseCombinationProductionRouteContext({
        mode,
        subject: requestedSubject,
        type: requestedType,
        resourceId,
      }),
    [mode, requestedSubject, requestedType, resourceId],
  );
  const isRevision = routeContext.mode === 'revision';
  const routeError = routeContext.valid ? undefined : routeContext.error;

  useEffect(() => {
    let cancelled = false;
    setRevisionResource(null);
    setRevisionNodePath(undefined);
    setLoadError(undefined);

    if (!routeContext.valid || routeContext.mode !== 'revision') {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const revisionContext = routeContext;
    setLoading(true);
    void Promise.all([
      getResourceDetail({
        id: revisionContext.resourceId,
        subject: revisionContext.subject,
      }),
      getKnowledgeTree({
        subject: revisionContext.subject,
        targetType: 'review',
      }),
    ])
      .then(([resourceResponse, treeResponse]) => {
        if (cancelled) return;
        if (!resourceResponse.success) {
          setLoadError(
            `未找到待修订的正式资源，或资源不属于${revisionContext.subjectLabel}`,
          );
          return;
        }

        const resourceValidation = validateRevisionRouteResource(
          revisionContext,
          resourceResponse.data,
        );
        if (!resourceValidation.valid) {
          setLoadError(resourceValidation.message);
          return;
        }

        setRevisionResource(resourceValidation.resource);
        if (treeResponse.success) {
          setRevisionNodePath(
            findNodePath(treeResponse.data, resourceValidation.resource.nodeId),
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
  }, [routeContext]);

  const activeType =
    revisionResource?.type ||
    (routeContext.valid ? routeContext.resourceType : null);
  const typeLabel = activeType
    ? RESOURCE_TYPE_LABELS[activeType]
    : '学案或作业';
  const displayError = routeError || loadError;
  const placeholderTitle = displayError
    ? '组合制作入口不可用'
    : isRevision
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
        children: isRevision ? '发起修订草稿' : `新建${typeLabel}`,
      },
      {
        label: '资源类型',
        children: routeContext.valid
          ? RESOURCE_TYPE_LABELS[routeContext.resourceType]
          : requestedType?.trim() || '未提供',
      },
      {
        label: '学科',
        children: routeContext.valid
          ? routeContext.subjectLabel
          : requestedSubject?.trim() || '未提供',
      },
    ];

    if (isRevision) {
      items.push({
        label: '正式资源 ID',
        children: resourceId?.trim() || '未提供',
      });
    }
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
    requestedSubject,
    requestedType,
    resourceId,
    revisionNodePath,
    revisionResource,
    routeContext,
    typeLabel,
  ]);

  const returnToAssetCenter = () => {
    const requestedSubjectOption = SUBJECT_OPTIONS.find(
      (option) => option.value === requestedSubject?.trim(),
    );
    if (!requestedSubjectOption) {
      history.push('/content/asset-center');
      return;
    }
    const params = new URLSearchParams({
      subject: requestedSubjectOption.value,
    });
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
          data-route-valid={
            routeContext.valid && !displayError ? 'true' : 'false'
          }
        >
          <section className="combination-production-hero">
            <div className="combination-production-seal" aria-hidden="true">
              <StopOutlined />
            </div>
            <div className="combination-production-hero-copy">
              <div className="combination-production-eyebrow">
                <Tag color={displayError ? 'error' : 'default'}>
                  {displayError ? '入口已拒绝' : '禁用占位'}
                </Tag>
                <span>{isRevision ? '修订草稿流程' : '组合草稿流程'}</span>
              </div>
              <h1>{placeholderTitle}</h1>
              <p>
                {routeError
                  ? '入口参数未通过校验；本页面不会读取正式资源，也不会创建或修改任何资源。'
                  : loadError
                  ? '正式资源只读复核未通过；本页面已经停止后续处理，不会创建或修改任何资源。'
                  : '原子化知识块与试题组合能力尚未接入。当前页面只明确制作边界，'}
                {!displayError &&
                  (isRevision
                    ? '没有创建修订草稿，也不会改写当前正式内容。'
                    : '不会创建组合草稿，也不会产出正式资源。')}
              </p>
              <Button type="primary" icon={<LockOutlined />} disabled>
                {disabledActionLabel}
              </Button>
            </div>
          </section>

          <Alert
            type={displayError ? 'error' : 'info'}
            showIcon
            className="combination-production-alert"
            message={
              displayError ||
              (isRevision
                ? '当前正式资源保持只读'
                : '本次访问不会写入任何资源数据')
            }
            description={
              displayError
                ? '入口已受控拒绝；不会创建草稿、切换版本或改写正式内容。'
                : isRevision
                ? revisionResource
                  ? `当前 V${revisionResource.currentVersion.versionNumber} 继续生效；待原子体系接入后，“发起修订”才会先创建独立修订草稿，发布前不改变正式资源。`
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
                  {routeError
                    ? '入口参数校验失败时不读取正式资源，也不调用任何写接口。'
                    : loadError
                    ? '正式资源只读复核已停止；复核过程未调用任何写接口。'
                    : isRevision
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
