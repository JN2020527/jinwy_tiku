import type {
  AttributeOptionAddMode,
  AttributeTarget,
  AttributeUsageRule,
  TagCategory,
} from '@/services/tagSystem';
import {
  addTagCategory,
  deleteTagCategory,
  updateTagCategory,
} from '@/services/tagSystem';
import { message, Modal } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import AttributeDefinitionList from './AttributeDefinitionList';
import type { AttributeDefinitionFormValues } from './AttributeDefinitionModal';
import AttributeDefinitionModal from './AttributeDefinitionModal';
import AttributeOptionPanel from './AttributeOptionPanel';
import AttributeSummaryPanel from './AttributeSummaryPanel';
import { sortBySort } from './attributeSettingsHelpers';

interface AttributeDefinitionWorkspaceProps {
  activeTarget: AttributeTarget;
  tagCategories: TagCategory[];
  usageRules: AttributeUsageRule[];
  onActiveTargetChange: (target: AttributeTarget) => void;
  onRefresh: () => void | Promise<void>;
  onSaveUsageRules: (rules: AttributeUsageRule[]) => Promise<boolean>;
}

type DefinitionModalMode = 'add' | 'edit';

const normalizeOptionAddMode = (
  target: AttributeTarget,
  optionAddMode?: AttributeOptionAddMode,
) => (target === 'question' ? optionAddMode || 'unified' : 'unified');

const AttributeDefinitionWorkspace: React.FC<
  AttributeDefinitionWorkspaceProps
> = (props) => {
  const {
    activeTarget,
    tagCategories,
    usageRules,
    onActiveTargetChange,
    onRefresh,
  } = props;
  const [activeCategoryId, setActiveCategoryId] = useState<string>();
  const [selectedSubject, setSelectedSubject] = useState<string>('math');
  const [definitionModalOpen, setDefinitionModalOpen] =
    useState<boolean>(false);
  const [definitionModalMode, setDefinitionModalMode] =
    useState<DefinitionModalMode>('add');

  const targetCategories = useMemo(
    () =>
      sortBySort(
        tagCategories.filter((category) => category.target === activeTarget),
      ),
    [activeTarget, tagCategories],
  );
  const selectedCategory = useMemo(
    () => targetCategories.find((category) => category.id === activeCategoryId),
    [activeCategoryId, targetCategories],
  );

  useEffect(() => {
    if (!targetCategories.length) {
      setActiveCategoryId(undefined);
      return;
    }

    if (
      !activeCategoryId ||
      !targetCategories.some((category) => category.id === activeCategoryId)
    ) {
      setActiveCategoryId(targetCategories[0].id);
    }
  }, [activeCategoryId, targetCategories]);

  const openAddDefinitionModal = () => {
    setDefinitionModalMode('add');
    setDefinitionModalOpen(true);
  };

  const openEditDefinitionModal = (category: TagCategory) => {
    setActiveCategoryId(category.id);
    setDefinitionModalMode('edit');
    setDefinitionModalOpen(true);
  };

  const getNextSortForTarget = (target: AttributeTarget) =>
    tagCategories.filter((category) => category.target === target).length;

  const handleDefinitionFinish = async (
    values: AttributeDefinitionFormValues,
  ) => {
    if (definitionModalMode === 'edit' && !selectedCategory) {
      message.error('未找到要编辑的属性');
      return false;
    }

    const target =
      definitionModalMode === 'edit' && selectedCategory
        ? selectedCategory.target
        : values.target;
    const optionAddMode = normalizeOptionAddMode(target, values.optionAddMode);

    try {
      const res =
        definitionModalMode === 'edit' && selectedCategory
          ? await updateTagCategory({
              ...selectedCategory,
              id: selectedCategory.id,
              name: values.name,
              target: selectedCategory.target,
              status: values.status,
              optionAddMode,
              tags: selectedCategory.tags || [],
              subjectTags: selectedCategory.subjectTags || {},
            })
          : await addTagCategory({
              name: values.name,
              target,
              status: values.status,
              optionAddMode,
              sort: getNextSortForTarget(target),
              tags: [],
              subjectTags: {},
            });

      if (res.success) {
        message.success(
          definitionModalMode === 'edit' ? '属性已保存' : '属性已新增',
        );
        if (definitionModalMode === 'add') {
          onActiveTargetChange(target);
        }
        await onRefresh();
        if (definitionModalMode === 'add') {
          setActiveCategoryId(res.data.id);
        }
        return true;
      }

      message.error(
        res.message ||
          (definitionModalMode === 'edit' ? '属性保存失败' : '属性新增失败'),
      );
      return false;
    } catch {
      message.error(
        definitionModalMode === 'edit' ? '属性保存失败' : '属性新增失败',
      );
      return false;
    }
  };

  const handleDeleteCategory = (category: TagCategory) => {
    Modal.confirm({
      title: '删除属性',
      content: `确认删除“${category.name}”吗？删除后该属性定义将不可用。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await deleteTagCategory(category.id);

          if (res.success) {
            const nextCategory = targetCategories.find(
              (item) => item.id !== category.id,
            );
            message.success('属性已删除');
            setActiveCategoryId(nextCategory?.id);
            await onRefresh();
            return;
          }

          message.error(res.message || '属性删除失败');
        } catch {
          message.error('属性删除失败');
        }
      },
    });
  };

  const handleOpenUsageDrawer = () => {
    message.info('使用规则配置将在下一步接入');
  };

  const modalInitialValues: Partial<AttributeDefinitionFormValues> =
    definitionModalMode === 'edit' && selectedCategory
      ? {
          target: selectedCategory.target,
          name: selectedCategory.name,
          optionAddMode: normalizeOptionAddMode(
            selectedCategory.target,
            selectedCategory.optionAddMode,
          ),
          status: selectedCategory.status || 'enabled',
        }
      : {
          target: activeTarget,
          optionAddMode: 'unified',
          status: 'enabled',
        };

  return (
    <>
      <div className="attribute-tags-panel">
        <AttributeDefinitionList
          activeTarget={activeTarget}
          activeCategoryId={activeCategoryId}
          categories={targetCategories}
          selectedSubject={selectedSubject}
          onActiveTargetChange={onActiveTargetChange}
          onSelectCategory={setActiveCategoryId}
          onAddCategory={openAddDefinitionModal}
        />
        <AttributeOptionPanel
          category={selectedCategory}
          selectedSubject={selectedSubject}
          onSelectedSubjectChange={setSelectedSubject}
          onEditCategory={openEditDefinitionModal}
        />
        <AttributeSummaryPanel
          category={selectedCategory}
          selectedSubject={selectedSubject}
          usageRules={usageRules}
          onOpenUsageDrawer={handleOpenUsageDrawer}
          onEditCategory={openEditDefinitionModal}
          onDeleteCategory={handleDeleteCategory}
        />
      </div>

      <AttributeDefinitionModal
        open={definitionModalOpen}
        mode={definitionModalMode}
        activeTarget={activeTarget}
        initialValues={modalInitialValues}
        onOpenChange={setDefinitionModalOpen}
        onFinish={handleDefinitionFinish}
      />
    </>
  );
};

export default AttributeDefinitionWorkspace;
