import type { TextbookChapter } from '@/services/tagSystem';
import {
  addTextbookChapter,
  deleteTextbookChapter,
  getTextbookChapters,
  getTextbookVersions,
  moveTextbookChapter,
  updateTextbookChapter,
} from '@/services/tagSystem';
import { HolderOutlined, SearchOutlined } from '@ant-design/icons';
import type { TreeProps } from 'antd';
import {
  Button,
  Card,
  Input,
  message,
  Modal,
  Select,
  Tooltip,
  Tree,
} from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './TagSystemTreePanel.less';
import TreeNodeTitle from './TreeNodeTitle';
import type { TreeNodeData } from './treeHelpers';
import {
  allowCrossParentTreeDrop,
  appendTreeNode,
  getTreeMoveRequest,
  useTreeSearch,
} from './treeHelpers';

interface SelectOption {
  label: string;
  value: string;
}

interface KnowledgeTreePanelProps {
  selectedSubject: string;
  subjectOptions: SelectOption[];
  onSubjectChange: (subject: string) => void;
}

interface InlineEditState {
  key: React.Key;
  mode: 'add' | 'edit';
  parentKey?: React.Key | null;
  initialValue: string;
  description?: string;
  saving?: boolean;
}

const createDraftNodeKey = () => `draft-${Date.now()}`;

const KnowledgeTreePanel: React.FC<KnowledgeTreePanelProps> = ({
  selectedSubject,
  subjectOptions,
  onSubjectChange,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [chapterTree, setChapterTree] = useState<TextbookChapter[]>([]);
  const chapterTreeData = chapterTree as unknown as TreeNodeData[];
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);
  const [arrangeMode, setArrangeMode] = useState(false);
  const displayChapterTree = useMemo(() => {
    if (!inlineEdit || inlineEdit.mode !== 'add') {
      return chapterTreeData;
    }
    return appendTreeNode(
      chapterTreeData,
      {
        key: inlineEdit.key,
        title: inlineEdit.initialValue,
      },
      inlineEdit.parentKey,
    );
  }, [chapterTreeData, inlineEdit]);
  const textbookSearch = useTreeSearch(
    displayChapterTree as unknown as TreeNodeData[],
  );

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const versionRes = await getTextbookVersions();
        if (versionRes.success) {
          if (versionRes.data.length > 0) {
            setSelectedVersion(versionRes.data[0].value);
          }
        }
      } catch {
        message.error('获取知识体系失败');
      }
    };
    fetchVersions();
  }, []);

  const fetchChapters = useCallback(async () => {
    if (!selectedVersion) return;
    try {
      const res = await getTextbookChapters(selectedVersion, selectedSubject);
      if (res.success) {
        setChapterTree(res.data);
      }
    } catch {
      message.error('获取知识体系失败');
    }
  }, [selectedSubject, selectedVersion]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  const handleAddTextbookRoot = () => {
    setInlineEdit({
      key: createDraftNodeKey(),
      mode: 'add',
      parentKey: null,
      initialValue: '',
    });
  };

  const handleToggleArrangeMode = () => {
    setInlineEdit(null);
    setArrangeMode((value) => !value);
  };

  const handleAddTextbookChild = (node: TreeNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    setInlineEdit({
      key: createDraftNodeKey(),
      mode: 'add',
      parentKey: node.key,
      initialValue: '',
    });
  };

  const handleEditTextbook = (node: TreeNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    setInlineEdit({
      key: node.key,
      mode: 'edit',
      initialValue: node.title,
      description: node.description,
    });
  };

  const handleDeleteTextbook = (node: TreeNodeData, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除知识节点 "${node.title}" 吗？`,
      onOk: async () => {
        const res = await deleteTextbookChapter(String(node.key), {
          version: selectedVersion,
          subject: selectedSubject,
        });
        if (res.success) {
          message.success('删除成功');
          fetchChapters();
        } else {
          message.error('删除失败');
        }
      },
    });
  };

  const allowTextbookDrop = useCallback<NonNullable<TreeProps['allowDrop']>>(
    ({ dragNode, dropNode }) =>
      allowCrossParentTreeDrop(chapterTreeData, dragNode.key, dropNode.key),
    [chapterTreeData],
  );

  const handleDropTextbook: TreeProps['onDrop'] = async (info) => {
    if (!arrangeMode || !selectedVersion) return;

    const moveRequest = getTreeMoveRequest(chapterTreeData, info);

    const res = await moveTextbookChapter({
      id: String(info.dragNode.key),
      targetId: String(moveRequest.targetId),
      position: moveRequest.position,
      version: selectedVersion,
      subject: selectedSubject,
    });

    if (res.success) {
      message.success('移动成功');
      fetchChapters();
    } else {
      message.error(res.message || '移动失败');
    }
  };

  const handleCancelInlineEdit = () => {
    setInlineEdit(null);
  };

  const handleInlineEditSubmit = async (title: string) => {
    if (!inlineEdit) return;
    if (!title) {
      message.warning('请输入知识节点名称');
      return;
    }

    setInlineEdit({ ...inlineEdit, saving: true });
    const res =
      inlineEdit.mode === 'add'
        ? await addTextbookChapter({
            title,
            parentId: inlineEdit.parentKey
              ? String(inlineEdit.parentKey)
              : null,
            version: selectedVersion,
            subject: selectedSubject,
          })
        : await updateTextbookChapter({
            id: String(inlineEdit.key),
            title,
            version: selectedVersion,
            subject: selectedSubject,
            description: inlineEdit.description,
          });

    if (res.success) {
      message.success(inlineEdit.mode === 'add' ? '添加成功' : '修改成功');
      setInlineEdit(null);
      fetchChapters();
    } else {
      message.error(res.message || '保存失败');
      setInlineEdit({ ...inlineEdit, saving: false });
    }
  };

  return (
    <>
      <Card
        className={`tag-system-tree-panel tag-system-tree-panel-no-title${
          arrangeMode ? ' tag-system-tree-panel-arranging' : ''
        }`}
        variant="borderless"
        extra={
          <div className="tag-system-tree-card-extra">
            {arrangeMode ? null : (
              <div className="tag-system-tree-subject-filter">
                <span className="tag-system-tree-subject-label">学科</span>
                <Select
                  size="small"
                  value={selectedSubject}
                  onChange={onSubjectChange}
                  className="tag-system-tree-subject-select"
                  options={subjectOptions}
                  aria-label="选择学科"
                />
              </div>
            )}
            <div className="tag-system-tree-actions">
              <Button
                type={arrangeMode ? 'primary' : 'default'}
                size="small"
                onClick={handleToggleArrangeMode}
              >
                {arrangeMode ? '完成整理' : '整理'}
              </Button>
              {arrangeMode ? null : (
                <Button
                  type="primary"
                  size="small"
                  onClick={handleAddTextbookRoot}
                  disabled={!selectedVersion}
                >
                  添加根节点
                </Button>
              )}
            </div>
          </div>
        }
      >
        <Input
          name="knowledgeNodeSearch"
          autoComplete="off"
          prefix={<SearchOutlined style={{ color: '#ccc' }} />}
          allowClear
          style={{ marginBottom: 8 }}
          placeholder="搜索知识节点…"
          onChange={textbookSearch.onSearch}
        />
        {displayChapterTree.length > 0 ? (
          <Tree
            key={selectedSubject}
            treeData={displayChapterTree}
            onExpand={textbookSearch.onExpand}
            expandedKeys={textbookSearch.expandedKeys}
            autoExpandParent={textbookSearch.autoExpandParent}
            draggable={
              arrangeMode
                ? {
                    icon: (
                      <Tooltip title="拖拽移动">
                        <HolderOutlined className="tag-system-tree-drag-icon" />
                      </Tooltip>
                    ),
                  }
                : undefined
            }
            allowDrop={arrangeMode ? allowTextbookDrop : undefined}
            onDrop={arrangeMode ? handleDropTextbook : undefined}
            showLine
            blockNode
            titleRender={(node: TreeNodeData) => (
              <TreeNodeTitle
                nodeData={node}
                searchValue={textbookSearch.searchValue}
                inlineEdit={
                  inlineEdit?.key === node.key
                    ? {
                        initialValue: inlineEdit.initialValue,
                        placeholder: '请输入知识节点名称…',
                        saving: inlineEdit.saving,
                        onSubmit: handleInlineEditSubmit,
                        onCancel: handleCancelInlineEdit,
                      }
                    : undefined
                }
                actionsVisible={!arrangeMode}
                onAddChild={handleAddTextbookChild}
                onEdit={handleEditTextbook}
                onDelete={handleDeleteTextbook}
              />
            )}
            fieldNames={{
              title: 'title',
              key: 'key',
              children: 'children',
            }}
            height={600}
          />
        ) : (
          <div
            style={{
              padding: 20,
              textAlign: 'center',
              color: '#999',
            }}
          >
            暂无数据
          </div>
        )}
      </Card>
    </>
  );
};

export default KnowledgeTreePanel;
