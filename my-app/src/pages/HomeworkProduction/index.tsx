import type {
  HomeworkDetail,
  KnowledgeTreeNode,
  PublishedQuestion,
} from '@/services/resourceAssets';
import {
  getAssetDetail,
  getHomeworkQuestions,
  getPublishedQuestions,
  getResourceAssetContext,
  saveHomework,
} from '@/services/resourceAssets';
import { EditOutlined, ReadOutlined, SaveOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useLocation } from '@umijs/max';
import { Alert, Button, message, Modal, Skeleton, Space, Tag } from 'antd';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SUBJECT_OPTIONS } from '../ContentCenter/TagManage/components/treeFilterConstants';
import { sameOrderedIds } from './basket';
import './index.less';
import Preview from './Preview';
import { parseHomeworkProductionRouteContext } from './routeContext';
import SaveHomeworkModal from './SaveHomeworkModal';
import Workbench from './Workbench';

const getSubjectLabel = (subject: string) =>
  SUBJECT_OPTIONS.find((option) => option.value === subject)?.label || subject;

const MODE_TITLES = {
  new: '新建作业',
  preview: '作业预览',
  edit: '编辑作业',
} as const;

/**
 * 加工作业页：同一个 index.tsx 处理三种路由语义（以 pathname 判 mode）：
 * - /preparation/asset-center/homework/new            → 新建（空白工作台）
 * - /preparation/asset-center/homework/:homeworkId    → 只读预览
 * - /preparation/asset-center/homework/:homeworkId/edit → 编辑（按原顺序预载）
 * subject 从 query 读取并校验，学科锁定，不二次选择（AC-01 / AC-18）。
 */
const HomeworkProductionPage: React.FC = () => {
  const location = useLocation();
  const route = useMemo(
    () =>
      parseHomeworkProductionRouteContext({
        pathname: location.pathname,
        subject: new URLSearchParams(location.search).get('subject'),
      }),
    [location.pathname, location.search],
  );

  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>(
    'loading',
  );
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [treeNodes, setTreeNodes] = useState<KnowledgeTreeNode[]>([]);
  const [questions, setQuestions] = useState<PublishedQuestion[]>([]);
  const [detail, setDetail] = useState<HomeworkDetail | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savedQuestionIds, setSavedQuestionIds] = useState<string[]>([]);
  const [savedName, setSavedName] = useState('');

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreviewAnswers, setShowPreviewAnswers] = useState(false);

  const subject = route.valid ? route.subject : '';
  const assetCenterUrl = `/preparation/asset-center?subject=${subject}`;

  const loadWorkbench = useCallback(async () => {
    if (!route.valid || route.mode === 'preview') return;
    setLoadState('loading');
    setLoadError('');
    setDetail(null);
    try {
      const [contextResponse, questionsResponse] = await Promise.all([
        getResourceAssetContext({ subject: route.subject }),
        getPublishedQuestions({ subject: route.subject }),
      ]);
      if (!contextResponse.success) {
        throw new Error(contextResponse.message || '知识树加载失败');
      }
      if (!questionsResponse.success) {
        throw new Error(questionsResponse.message || '试题加载失败');
      }
      setTreeNodes(contextResponse.data.knowledgeTree ?? []);
      // 一次拉取当前学科全部已发布试题（mock 未传 pageSize 时返回全量），
      // 筛选/搜索/排序/分页在客户端完成，与教师端工作台交互形态一致（AC-02）。
      setQuestions(questionsResponse.data.list ?? []);

      if (route.mode === 'edit') {
        const [detailResponse, homeworkQuestionsResponse] = await Promise.all([
          getAssetDetail({ id: route.homeworkId, subject: route.subject }),
          getHomeworkQuestions({
            id: route.homeworkId,
            subject: route.subject,
          }),
        ]);
        if (!detailResponse.success) {
          throw new Error(detailResponse.message || '作业加载失败');
        }
        if (detailResponse.data.type !== 'homework') {
          throw new Error('该资产不是作业，无法编辑');
        }
        const homeworkDetail = detailResponse.data as HomeworkDetail;
        setDetail(homeworkDetail);
        if (!homeworkQuestionsResponse.success) {
          throw new Error(
            homeworkQuestionsResponse.message || '作业试题加载失败',
          );
        }
        // 编辑已有顺序预载（AC-12）
        const orderedIds = homeworkQuestionsResponse.data.map(
          (entry) => entry.questionId,
        );
        setSelectedIds(orderedIds);
        setSavedQuestionIds(orderedIds);
        setSavedName(homeworkDetail.name);
      } else {
        setSelectedIds([]);
        setSavedQuestionIds([]);
        setSavedName('');
      }
      setLoadState('ready');
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : '页面加载失败，请重试',
      );
      setLoadState('error');
    }
  }, [route]);

  useEffect(() => {
    void loadWorkbench();
  }, [loadWorkbench, reloadKey]);

  // —— 未保存变更（试题列表，或保存弹窗中的名称草稿，AC-14）——
  const dirty = useMemo(
    () => !sameOrderedIds(selectedIds, savedQuestionIds) || saveModalOpen,
    [saveModalOpen, savedQuestionIds, selectedIds],
  );
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const allowLeaveRef = useRef(false);

  useEffect(() => {
    if (!route.valid || route.mode === 'preview') return;
    const unblock = history.block((transition) => {
      if (allowLeaveRef.current || !dirtyRef.current) {
        unblock();
        transition.retry();
        return;
      }
      Modal.confirm({
        title: '有未保存的修改',
        content: '离开后修改不会保留，确定离开吗？',
        okText: '离开',
        cancelText: '留在本页',
        onOk: () => {
          allowLeaveRef.current = true;
          unblock();
          transition.retry();
        },
      });
    });
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current && !allowLeaveRef.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      unblock();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [route.mode, route.valid]);

  const handleBack = () => {
    if (!dirtyRef.current) {
      history.push(assetCenterUrl);
      return;
    }
    Modal.confirm({
      title: '有未保存的修改',
      content: '离开后修改不会保留，确定离开吗？',
      okText: '离开',
      cancelText: '留在本页',
      onOk: () => {
        allowLeaveRef.current = true;
        history.push(assetCenterUrl);
      },
    });
  };

  const handlePreviewEdit = () => {
    if (!route.valid || route.mode !== 'preview') return;
    history.push(
      `/preparation/asset-center/homework/${encodeURIComponent(
        route.homeworkId,
      )}/edit?subject=${route.subject}`,
    );
  };

  const questionMap = useMemo(() => {
    const map = new Map<string, PublishedQuestion>();
    questions.forEach((question) => map.set(question.id, question));
    return map;
  }, [questions]);

  // —— 保存作业（AC-08 / AC-09 / AC-10 / AC-13 / AC-21）——
  const handleSaveClick = () => {
    if (selectedIds.length === 0) {
      message.warning('至少加入 1 道题');
      return;
    }
    const impactTotal = detail
      ? detail.mountCount +
        detail.platformTemplateCount +
        detail.teacherTaskCount
      : 0;
    if (route.valid && route.mode === 'edit' && detail && impactTotal > 0) {
      Modal.confirm({
        title: '保存前确认影响',
        content: (
          <div className="homework-impact-confirm">
            <p>该作业已被引用，保存修改将影响以下引用，确认保存？</p>
            <div className="homework-impact-grid">
              <div>
                <strong>{detail.mountCount}</strong>
                <span>资源节点挂载</span>
              </div>
              <div>
                <strong>{detail.platformTemplateCount}</strong>
                <span>平台模板引用</span>
              </div>
              <div>
                <strong>{detail.teacherTaskCount}</strong>
                <span>教师任务引用</span>
              </div>
            </div>
          </div>
        ),
        okText: '继续保存',
        cancelText: '取消',
        onOk: () => setSaveModalOpen(true),
      });
      return;
    }
    setSaveModalOpen(true);
  };

  const handleSaveConfirm = async (name: string): Promise<string | null> => {
    if (!route.valid) return '页面上下文缺失，请刷新后重试';
    setSaving(true);
    try {
      const response = await saveHomework({
        id: route.mode === 'edit' ? route.homeworkId : undefined,
        subject: route.subject,
        name,
        questionIds: selectedIds,
      });
      if (!response.success) {
        return response.message || '保存失败';
      }
      setSavedName(name);
      setSavedQuestionIds([...selectedIds]);
      message.success(response.message || '保存成功');
      setSaveModalOpen(false);
      allowLeaveRef.current = true;
      history.push(assetCenterUrl);
      return null;
    } catch {
      return '保存失败，请重试';
    } finally {
      setSaving(false);
    }
  };

  if (!route.valid) {
    return (
      <PageContainer title="加工作业" className="homework-production-page">
        <Alert
          type="error"
          showIcon
          message="无法进入加工作业页"
          description={route.error}
          action={
            <Button
              size="small"
              onClick={() => history.push('/preparation/asset-center')}
            >
              返回资产中心
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const headerExtra =
    route.mode === 'preview' ? (
      <Space>
        <Button
          icon={<ReadOutlined />}
          aria-pressed={showPreviewAnswers}
          onClick={() => setShowPreviewAnswers((current) => !current)}
        >
          {showPreviewAnswers ? '隐藏答案解析' : '显示答案解析'}
        </Button>
        <Button onClick={handleBack}>返回</Button>
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={handlePreviewEdit}
        >
          编辑
        </Button>
      </Space>
    ) : (
      <Space>
        <Button onClick={handleBack}>返回</Button>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSaveClick}
        >
          保存作业
        </Button>
      </Space>
    );

  const title = (
    <Space size={8} wrap>
      <span>{MODE_TITLES[route.mode]}</span>
      <Tag color="blue">{getSubjectLabel(route.subject)}</Tag>
      {route.mode !== 'new' ? <Tag color="green">正式</Tag> : null}
    </Space>
  );

  return (
    <PageContainer
      title={title}
      subTitle={route.mode === 'edit' ? savedName : undefined}
      className="homework-production-page"
      extra={headerExtra}
    >
      {route.mode === 'preview' ? (
        <Preview
          homeworkId={route.homeworkId}
          subject={route.subject}
          showAnswers={showPreviewAnswers}
        />
      ) : loadState === 'loading' ? (
        <div className="homework-loading">
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      ) : loadState === 'error' ? (
        <Alert
          type="error"
          showIcon
          message="页面加载失败"
          description={loadError}
          action={
            <Space>
              <Button
                size="small"
                onClick={() => setReloadKey((key) => key + 1)}
              >
                重试
              </Button>
              <Button size="small" onClick={handleBack}>
                返回资产中心
              </Button>
            </Space>
          }
        />
      ) : (
        <Workbench
          treeNodes={treeNodes}
          questions={questions}
          selectedIds={selectedIds}
          questionMap={questionMap}
          onSelectedIdsChange={setSelectedIds}
        />
      )}

      <SaveHomeworkModal
        open={saveModalOpen}
        initialName={savedName}
        saving={saving}
        onCancel={() => setSaveModalOpen(false)}
        onConfirm={handleSaveConfirm}
      />
    </PageContainer>
  );
};

export default HomeworkProductionPage;
