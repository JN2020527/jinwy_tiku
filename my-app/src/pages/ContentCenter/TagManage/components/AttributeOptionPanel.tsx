import type { AttributeItem, TagCategory } from '@/services/tagSystem';
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  PlusOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { Button, Empty, Input, Modal, Segmented, Space } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import type { AttributeOptionFormValues } from './AttributeOptionModal';
import AttributeOptionModal from './AttributeOptionModal';
import AttributeStatusPill from './AttributeStatusPill';
import { SUBJECT_LABELS, SUBJECT_OPTIONS } from './attributeSettingsConstants';
import { getOptionList, reorder } from './attributeSettingsHelpers';

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
  const [editingOption, setEditingOption] = useState<AttributeItem>();
  const [optionModalOpen, setOptionModalOpen] = useState<boolean>(false);

  const options = useMemo(
    () => getOptionList(category, selectedSubject),
    [category, selectedSubject],
  );
  const showSubjectRange = shouldShowSubjectRange(category);
  const optionCountText = showSubjectRange
    ? `${SUBJECT_LABELS[selectedSubject] || selectedSubject} ${
        options.length
      }项`
    : `${options.length}项`;
  const reordering = Boolean(reorderingOptionId);

  useEffect(() => {
    setOptionName('');
  }, [category?.id, selectedSubject]);

  const handleAddOption = async () => {
    if (adding) {
      return;
    }

    const name = optionName.trim();

    if (!name) {
      return;
    }

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

  const moveOption = async (fromIndex: number, toIndex: number) => {
    if (reordering) {
      return;
    }

    const option = options[fromIndex];

    if (!option) {
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

  if (!category) {
    return (
      <main className="attribute-option-panel">
        <div className="attribute-panel-header">
          <div>
            <div className="attribute-panel-title">枚举值</div>
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
          <div>
            <div className="attribute-option-toolbar-title">枚举值</div>
            <div className="attribute-option-toolbar-meta">
              {optionCountText}
            </div>
          </div>
          <div className="attribute-option-create">
            <Space.Compact block>
              <Input
                disabled={adding}
                value={optionName}
                placeholder="输入枚举值名称"
                onChange={(event) => setOptionName(event.target.value)}
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
                disabled={adding || !optionName.trim()}
                onClick={handleAddOption}
              >
                添加
              </Button>
            </Space.Compact>
          </div>
        </div>

        {showSubjectRange && (
          <div className="attribute-subject-switcher">
            <div className="attribute-option-subtitle">枚举值范围</div>
            <Segmented
              block
              value={selectedSubject}
              options={SUBJECT_OPTIONS}
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
              {options.map((option, index) => (
                <div key={option.id} className="attribute-option-item">
                  <span className="attribute-option-sort">{index + 1}</span>
                  <span className="attribute-option-name">{option.name}</span>
                  <span className="attribute-option-status">
                    <AttributeStatusPill status={option.status} />
                  </span>
                  <Space size={4} className="attribute-option-actions">
                    <Button
                      type="text"
                      icon={<UpOutlined />}
                      title="上移"
                      aria-label="上移"
                      loading={reorderingOptionId === option.id}
                      disabled={reordering || index === 0}
                      onClick={() => moveOption(index, index - 1)}
                    />
                    <Button
                      type="text"
                      icon={<DownOutlined />}
                      title="下移"
                      aria-label="下移"
                      loading={reorderingOptionId === option.id}
                      disabled={reordering || index === options.length - 1}
                      onClick={() => moveOption(index, index + 1)}
                    />
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      title="编辑"
                      aria-label="编辑"
                      onClick={() => openEditOptionModal(option)}
                    />
                    <Button
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      title="删除"
                      aria-label="删除"
                      onClick={() => confirmDeleteOption(option)}
                    />
                  </Space>
                </div>
              ))}
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
