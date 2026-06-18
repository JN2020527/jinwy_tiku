import type {
  AttributeItem,
  AttributeOptionAddMode,
  AttributeTarget,
  TagCategory,
} from '@/services/tagSystem';
import {
  addAttribute,
  addTagCategory,
  deleteAttribute,
  deleteTagCategory,
  updateAttribute,
  updateTagCategory,
} from '@/services/tagSystem';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, message, Modal, Segmented } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import AttributeDefinitionList from './AttributeDefinitionList';
import type { AttributeDefinitionFormValues } from './AttributeDefinitionModal';
import AttributeDefinitionModal from './AttributeDefinitionModal';
import type { AttributeOptionFormValues } from './AttributeOptionModal';
import AttributeOptionPanel from './AttributeOptionPanel';
import { ATTRIBUTE_TARGET_OPTIONS } from './attributeSettingsConstants';
import { sortBySort, withOptionList } from './attributeSettingsHelpers';

interface AttributeDefinitionWorkspaceProps {
  activeTarget: AttributeTarget;
  tagCategories: TagCategory[];
  onActiveTargetChange: (target: AttributeTarget) => void;
  onRefresh: () => void | Promise<void>;
}

type DefinitionModalMode = 'add' | 'edit';
type UpdateTagCategoryPayload = Parameters<typeof updateTagCategory>[0];

const normalizeOptionAddMode = (
  target: AttributeTarget,
  optionAddMode?: AttributeOptionAddMode,
) => (target === 'question' ? optionAddMode || 'unified' : 'unified');

const getCategoryUpdatePayload = (
  category: TagCategory,
): UpdateTagCategoryPayload => {
  if (
    category.target === 'question' &&
    category.optionAddMode === 'bySubject'
  ) {
    const { tags: _viewTags, ...payload } = category;
    return payload;
  }

  return category;
};

const AttributeDefinitionWorkspace: React.FC<
  AttributeDefinitionWorkspaceProps
> = (props) => {
  const { activeTarget, tagCategories, onActiveTargetChange, onRefresh } =
    props;
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

  const getNextSortForTarget = (target: AttributeTarget) => {
    const targetCategoriesForSort = tagCategories.filter(
      (category) => category.target === target,
    );

    if (!targetCategoriesForSort.length) {
      return 0;
    }

    return (
      Math.max(
        ...targetCategoriesForSort.map(
          (category, index) => category.sort ?? index,
        ),
      ) + 1
    );
  };

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

  const getSubjectForOptionMutation = (category: TagCategory) =>
    category.target === 'question' && category.optionAddMode === 'bySubject'
      ? selectedSubject
      : undefined;

  const handleAddOption = async (name: string) => {
    if (!selectedCategory) {
      message.error('请选择属性');
      throw new Error('请选择属性');
    }

    let notified = false;
    try {
      const res = await addAttribute({
        categoryId: selectedCategory.id,
        name,
        subject: getSubjectForOptionMutation(selectedCategory),
        status: 'enabled',
      });

      if (res.success) {
        message.success('枚举值已添加');
        await onRefresh();
        return;
      }

      notified = true;
      message.error(res.message || '枚举值添加失败');
      throw new Error(res.message || '枚举值添加失败');
    } catch (error: unknown) {
      if (!notified) {
        message.error('枚举值添加失败');
      }
      throw error;
    }
  };

  const handleUpdateOption = async (
    option: AttributeItem,
    values: AttributeOptionFormValues,
  ) => {
    if (!selectedCategory) {
      message.error('请选择属性');
      throw new Error('请选择属性');
    }

    let notified = false;
    try {
      const res = await updateAttribute({
        id: option.id,
        categoryId: selectedCategory.id,
        subject: getSubjectForOptionMutation(selectedCategory),
        name: values.name,
        status: values.status,
      });

      if (res.success) {
        message.success('枚举值已保存');
        await onRefresh();
        return;
      }

      notified = true;
      message.error(res.message || '枚举值保存失败');
      throw new Error(res.message || '枚举值保存失败');
    } catch (error: unknown) {
      if (!notified) {
        message.error('枚举值保存失败');
      }
      throw error;
    }
  };

  const handleDeleteOption = async (option: AttributeItem) => {
    if (!selectedCategory) {
      message.error('请选择属性');
      throw new Error('请选择属性');
    }

    let notified = false;
    try {
      const res = await deleteAttribute(option.id, selectedCategory.id, {
        subject: getSubjectForOptionMutation(selectedCategory),
      });

      if (res.success) {
        message.success('枚举值已删除');
        await onRefresh();
        return;
      }

      notified = true;
      message.error(res.message || '枚举值删除失败');
      throw new Error(res.message || '枚举值删除失败');
    } catch (error: unknown) {
      if (!notified) {
        message.error('枚举值删除失败');
      }
      throw error;
    }
  };

  const handleReorderOptions = async (nextOptions: AttributeItem[]) => {
    if (!selectedCategory) {
      message.error('请选择属性');
      throw new Error('请选择属性');
    }

    const nextCategory = withOptionList(
      selectedCategory,
      nextOptions,
      selectedSubject,
    );

    let notified = false;
    try {
      const res = await updateTagCategory(
        getCategoryUpdatePayload(nextCategory),
      );

      if (res.success) {
        message.success('枚举值排序已保存');
        await onRefresh();
        return;
      }

      notified = true;
      message.error(res.message || '排序保存失败');
      throw new Error(res.message || '排序保存失败');
    } catch (error: unknown) {
      if (!notified) {
        message.error('排序保存失败');
      }
      throw error;
    }
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
      <Card
        className="tag-system-tree-panel tag-system-tree-panel-no-title attribute-settings-panel"
        variant="borderless"
        extra={
          <div className="tag-system-tree-card-extra attribute-settings-card-extra">
            <div className="attribute-settings-toolbar-filters">
              <Segmented
                aria-label="属性类型"
                value={activeTarget}
                options={ATTRIBUTE_TARGET_OPTIONS}
                onChange={(value) => {
                  onActiveTargetChange(value as AttributeTarget);
                }}
              />
            </div>
            <div className="tag-system-tree-actions">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="small"
                onClick={openAddDefinitionModal}
              >
                新增属性
              </Button>
            </div>
          </div>
        }
      >
        <div className="attribute-tags-panel">
          <AttributeDefinitionList
            activeCategoryId={activeCategoryId}
            categories={targetCategories}
            onSelectCategory={setActiveCategoryId}
            onEditCategory={openEditDefinitionModal}
            onDeleteCategory={handleDeleteCategory}
          />
          <AttributeOptionPanel
            category={selectedCategory}
            selectedSubject={selectedSubject}
            onSelectedSubjectChange={setSelectedSubject}
            onAddOption={handleAddOption}
            onUpdateOption={handleUpdateOption}
            onDeleteOption={handleDeleteOption}
            onReorderOptions={handleReorderOptions}
          />
        </div>
      </Card>

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
