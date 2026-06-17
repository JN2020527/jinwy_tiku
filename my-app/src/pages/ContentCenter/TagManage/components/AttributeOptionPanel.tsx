import type { AttributeItem, TagCategory } from '@/services/tagSystem';
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  PlusOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { Button, Empty, Input, Modal, Segmented, Space } from 'antd';
import React, { useMemo, useState } from 'react';
import AttributeOptionModal from './AttributeOptionModal';
import type { AttributeOptionFormValues } from './AttributeOptionModal';
import AttributeStatusPill from './AttributeStatusPill';
import { SUBJECT_OPTIONS } from './attributeSettingsConstants';
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
  onEditCategory: () => void;
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
  onEditCategory,
}) => {
  const [optionName, setOptionName] = useState<string>('');
  const [adding, setAdding] = useState<boolean>(false);
  const [editingOption, setEditingOption] = useState<AttributeItem>();
  const [optionModalOpen, setOptionModalOpen] = useState<boolean>(false);

  const options = useMemo(
    () => getOptionList(category, selectedSubject),
    [category, selectedSubject],
  );
  const showSubjectRange = shouldShowSubjectRange(category);

  const handleAddOption = async () => {
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
      title: '删除选项',
      content: `确认删除“${option.name}”吗？删除后该选项值将不可用。`,
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

  const handleReorderOption = async (fromIndex: number, toIndex: number) => {
    await onReorderOptions(reorder(options, fromIndex, toIndex));
  };

  if (!category) {
    return (
      <main className="attribute-option-panel">
        <div className="attribute-panel-header">
          <div>
            <div className="attribute-panel-title">选项值</div>
            <div className="attribute-panel-meta">请选择属性</div>
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
      <div className="attribute-panel-header">
        <div>
          <div className="attribute-panel-title">选项值</div>
          <div className="attribute-panel-meta">
            {category.name} / {options.length} 个选项
          </div>
        </div>
        <Button icon={<EditOutlined />} onClick={onEditCategory}>
          编辑属性
        </Button>
      </div>

      <div className="attribute-option-list">
        {showSubjectRange && (
          <div>
            <div className="attribute-option-subtitle">选项值范围</div>
            <Segmented
              block
              value={selectedSubject}
              options={SUBJECT_OPTIONS}
              onChange={(value) => onSelectedSubjectChange(String(value))}
            />
            <div className="attribute-option-subtitle">
              切换范围只切换选项值，不切换属性定义
            </div>
          </div>
        )}

        <div className="attribute-option-create">
          <Space.Compact block>
            <Input
              value={optionName}
              placeholder="输入选项名称"
              onChange={(event) => setOptionName(event.target.value)}
              onPressEnter={handleAddOption}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={adding}
              disabled={!optionName.trim()}
              onClick={handleAddOption}
            >
              添加
            </Button>
          </Space.Compact>
        </div>

        {options.length ? (
          options.map((option, index) => (
            <div key={option.id} className="attribute-option-item">
              <div className="attribute-option-main">
                <span className="attribute-option-sort">{index + 1}</span>
                <span className="attribute-option-content">
                  <span className="attribute-option-name">{option.name}</span>
                </span>
              </div>
              <span className="attribute-option-status">
                <AttributeStatusPill status={option.status} />
              </span>
              <Space size={4} className="attribute-option-actions">
                <Button
                  type="text"
                  icon={<UpOutlined />}
                  disabled={index === 0}
                  onClick={() => handleReorderOption(index, index - 1)}
                />
                <Button
                  type="text"
                  icon={<DownOutlined />}
                  disabled={index === options.length - 1}
                  onClick={() => handleReorderOption(index, index + 1)}
                />
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openEditOptionModal(option)}
                />
                <Button
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={() => confirmDeleteOption(option)}
                />
              </Space>
            </div>
          ))
        ) : (
          <div className="attribute-workspace-empty">
            <Empty description="暂无选项值" />
          </div>
        )}
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
