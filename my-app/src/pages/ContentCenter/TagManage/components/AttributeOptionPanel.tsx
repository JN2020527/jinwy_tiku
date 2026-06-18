import type { AttributeItem, TagCategory } from '@/services/tagSystem';
import {
  DeleteOutlined,
  EditOutlined,
  HolderOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, Empty, Input, Modal, Segmented, Space } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import type { AttributeOptionFormValues } from './AttributeOptionModal';
import AttributeOptionModal from './AttributeOptionModal';
import AttributeStatusPill from './AttributeStatusPill';
import {
  getApplicableSubjectOptions,
  getOptionList,
  reorder,
} from './attributeSettingsHelpers';

interface AttributeOptionPanelProps {
  category?: TagCategory;
  selectedSubject: string;
  onSelectedSubjectChange: (subject: string) => void;
  onAddOption: (name: string) => Promise<void>;
  onUpdateOption: (
    option: AttributeItem,
    values: AttributeOptionFormValues,
  ) => Promise<void>;
  onDeleteOption: (option: AttributeItem) => Promise<void>;
  onReorderOptions: (nextOptions: AttributeItem[]) => Promise<void>;
}

const shouldShowSubjectRange = (category?: TagCategory) =>
  category?.target === 'question' && category.optionAddMode === 'bySubject';

const AttributeOptionPanel: React.FC<AttributeOptionPanelProps> = ({
  category,
  selectedSubject,
  onSelectedSubjectChange,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  onReorderOptions,
}) => {
  const [optionName, setOptionName] = useState<string>('');
  const [adding, setAdding] = useState<boolean>(false);
  const [reorderingOptionId, setReorderingOptionId] = useState<string>();
  const [draggingOptionId, setDraggingOptionId] = useState<string>();
  const [dragOverOptionId, setDragOverOptionId] = useState<string>();
  const [editingOption, setEditingOption] = useState<AttributeItem>();
  const [optionModalOpen, setOptionModalOpen] = useState<boolean>(false);
  const [optionNameError, setOptionNameError] = useState<string>();

  const options = useMemo(
    () => getOptionList(category, selectedSubject),
    [category, selectedSubject],
  );
  const applicableSubjectOptions = useMemo(
    () => getApplicableSubjectOptions(category),
    [category],
  );
  const showSubjectRange = shouldShowSubjectRange(category);
  const reordering = Boolean(reorderingOptionId);

  useEffect(() => {
    setOptionName('');
    setOptionNameError(undefined);
  }, [category?.id, selectedSubject]);

  useEffect(() => {
    if (!showSubjectRange || !applicableSubjectOptions.length) {
      return;
    }

    const selectedSubjectAvailable = applicableSubjectOptions.some(
      (subject) => subject.value === selectedSubject,
    );

    if (!selectedSubjectAvailable) {
      onSelectedSubjectChange(applicableSubjectOptions[0].value);
    }
  }, [
    applicableSubjectOptions,
    onSelectedSubjectChange,
    selectedSubject,
    showSubjectRange,
  ]);

  const handleAddOption = async () => {
    if (adding) {
      return;
    }

    const name = optionName.trim();

    if (!name) {
      setOptionNameError('请输入枚举值名称');
      return;
    }

    setOptionNameError(undefined);
    setAdding(true);
    try {
      await onAddOption(name);
      setOptionName('');
    } catch {
      // Error feedback is owned by the workspace callback.
    } finally {
      setAdding(false);
    }
  };

  const openEditOptionModal = (option: AttributeItem) => {
    setEditingOption(option);
    setOptionModalOpen(true);
  };

  const handleOptionModalOpenChange = (open: boolean) => {
    setOptionModalOpen(open);
    if (!open) {
      setEditingOption(undefined);
    }
  };

  const handleUpdateOption = async (values: AttributeOptionFormValues) => {
    if (!editingOption) {
      return false;
    }

    try {
      await onUpdateOption(editingOption, values);
      return true;
    } catch {
      return false;
    }
  };

  const confirmDeleteOption = (option: AttributeItem) => {
    Modal.confirm({
      title: '删除枚举值',
      content: `确认删除“${option.name}”吗？删除后该枚举值将不可用。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await onDeleteOption(option);
        } catch {
          return Promise.reject();
        }
      },
    });
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLElement>,
    option: AttributeItem,
  ) => {
    if (reordering) {
      event.preventDefault();
      return;
    }

    const dragPreview = event.currentTarget.closest(
      '.attribute-option-item',
    ) as HTMLElement | null;

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', option.id);
    if (dragPreview) {
      event.dataTransfer.setDragImage(
        dragPreview,
        24,
        dragPreview.offsetHeight / 2,
      );
    }
    setDraggingOptionId(option.id);
  };

  const handleKeyboardReorder = async (
    event: React.KeyboardEvent<HTMLElement>,
    option: AttributeItem,
    fromIndex: number,
  ) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return;
    }

    event.preventDefault();

    if (reordering) {
      return;
    }

    const toIndex = event.key === 'ArrowUp' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= options.length) {
      return;
    }

    setReorderingOptionId(option.id);
    try {
      await onReorderOptions(reorder(options, fromIndex, toIndex));
    } catch {
      // Error feedback is owned by the workspace callback.
    } finally {
      setReorderingOptionId(undefined);
    }
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    option: AttributeItem,
  ) => {
    if (!draggingOptionId || draggingOptionId === option.id) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverOptionId(option.id);
  };

  const handleDragEnd = () => {
    setDraggingOptionId(undefined);
    setDragOverOptionId(undefined);
  };

  const dropOption = async (
    event: React.DragEvent<HTMLDivElement>,
    toIndex: number,
  ) => {
    event.preventDefault();

    const fromId = event.dataTransfer.getData('text/plain') || draggingOptionId;
    const fromIndex = options.findIndex((option) => option.id === fromId);

    if (fromIndex < 0 || fromIndex === toIndex || reordering) {
      handleDragEnd();
      return;
    }

    setReorderingOptionId(fromId);
    try {
      await onReorderOptions(reorder(options, fromIndex, toIndex));
    } catch {
      // Error feedback is owned by the workspace callback.
    } finally {
      setReorderingOptionId(undefined);
      handleDragEnd();
    }
  };

  if (!category) {
    return (
      <main className="attribute-option-panel">
        <div className="attribute-panel-header">
          <div>
            <div className="attribute-panel-title">枚举值列表</div>
          </div>
        </div>
        <div className="attribute-workspace-empty">
          <Empty description="请选择属性" />
        </div>
      </main>
    );
  }

  return (
    <main className="attribute-option-panel">
      <div className="attribute-option-workspace">
        <div className="attribute-option-toolbar">
          <div className="attribute-option-toolbar-heading">
            <div className="attribute-option-toolbar-title">枚举值列表</div>
          </div>
          <div className="attribute-option-create">
            <Space.Compact block>
              <Input
                aria-label="枚举值名称"
                autoComplete="off"
                disabled={adding}
                status={optionNameError ? 'error' : undefined}
                value={optionName}
                placeholder="输入枚举值名称…"
                onChange={(event) => {
                  setOptionName(event.target.value);
                  if (optionNameError) {
                    setOptionNameError(undefined);
                  }
                }}
                onPressEnter={() => {
                  if (!adding) {
                    void handleAddOption();
                  }
                }}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                loading={adding}
                disabled={adding}
                onClick={handleAddOption}
              >
                添加
              </Button>
            </Space.Compact>
            <div className="attribute-option-create-error" aria-live="polite">
              {optionNameError}
            </div>
          </div>
        </div>

        {showSubjectRange && (
          <div className="attribute-subject-switcher">
            <Segmented
              value={selectedSubject}
              options={applicableSubjectOptions}
              onChange={(value) => onSelectedSubjectChange(String(value))}
            />
          </div>
        )}

        <div className="attribute-option-list">
          {options.length ? (
            <>
              <div className="attribute-option-table-header">
                <span>序号</span>
                <span>枚举值</span>
                <span>状态</span>
                <span>操作</span>
              </div>
              {options.map((option, index) => {
                const dragging = draggingOptionId === option.id;
                const dragOver =
                  dragOverOptionId === option.id &&
                  draggingOptionId !== option.id;

                return (
                  <div
                    key={option.id}
                    className={[
                      'attribute-option-item',
                      dragging ? 'dragging' : '',
                      dragOver ? 'drag-over' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onDragOver={(event) => handleDragOver(event, option)}
                    onDragLeave={() => {
                      if (dragOverOptionId === option.id) {
                        setDragOverOptionId(undefined);
                      }
                    }}
                    onDrop={(event) => {
                      void dropOption(event, index);
                    }}
                  >
                    <span className="attribute-option-leading">
                      <Button
                        type="text"
                        icon={<HolderOutlined />}
                        title="拖拽排序"
                        aria-label={`拖拽排序${option.name}`}
                        className="attribute-option-drag-handle"
                        draggable={!reordering}
                        disabled={reordering}
                        loading={reorderingOptionId === option.id}
                        onDragStart={(event) => handleDragStart(event, option)}
                        onDragEnd={handleDragEnd}
                        onKeyDown={(event) => {
                          void handleKeyboardReorder(event, option, index);
                        }}
                      />
                      <span className="attribute-option-sort">{index + 1}</span>
                    </span>
                    <span className="attribute-option-name">{option.name}</span>
                    <span className="attribute-option-status">
                      <AttributeStatusPill status={option.status} />
                    </span>
                    <Space size={2} className="attribute-option-actions">
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        title="编辑"
                        aria-label={`编辑${option.name}`}
                        className="attribute-option-edit-button"
                        onClick={() => openEditOptionModal(option)}
                      />
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        title="删除"
                        aria-label={`删除${option.name}`}
                        className="attribute-option-delete-button"
                        onClick={() => confirmDeleteOption(option)}
                      />
                    </Space>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="attribute-workspace-empty">
              <Empty description="暂无枚举值" />
            </div>
          )}
        </div>
      </div>

      <AttributeOptionModal
        open={optionModalOpen}
        option={editingOption}
        onOpenChange={handleOptionModalOpenChange}
        onFinish={handleUpdateOption}
      />
    </main>
  );
};

export default AttributeOptionPanel;
